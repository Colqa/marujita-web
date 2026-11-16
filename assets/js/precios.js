/* ================================================================
   LÓGICA DE PRECIOS Y CUPONES — Paltas Marujita
   Única fuente de cálculo para catálogo, selector, resumen y WhatsApp.
   Todos los importes internos van en CÉNTIMOS (enteros) para evitar
   errores de redondeo; solo se convierten a soles al mostrarlos.

   ⚠ Se ejecuta en el navegador: no es segura frente a manipulación.
   El control definitivo es la confirmación del pedido por WhatsApp
   antes del pago anticipado (ver README).
   ================================================================ */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Precios = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const DIA_MS = 24 * 60 * 60 * 1000;
  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];

  /* ---------- Dinero ---------- */
  const aCentimos = (soles) => Math.round(Number(soles) * 100);

  function formatoSoles(centimos) {
    const signo = centimos < 0 ? '−' : '';
    const abs = Math.abs(centimos);
    const enteros = Math.floor(abs / 100);
    const cent = String(abs % 100).padStart(2, '0');
    return `${signo}S/ ${enteros}.${cent}`;
  }

  /** % de descuento de lanzamiento de un producto, con 2 decimales (22.58). */
  function porcentajeDescuento(producto) {
    const reg = aCentimos(producto.precioRegular);
    const lan = aCentimos(producto.precioLanzamiento);
    if (!(reg > 0) || lan >= reg) return 0;
    return Math.round(((reg - lan) * 10000) / reg) / 100;
  }

  const formatoPorcentaje = (p) =>
    (Number.isInteger(p) ? String(p) : p.toFixed(2)) + '%';

  /* ---------- Fechas (hora de Lima, independiente del reloj local) ---------- */
  function formatoFecha(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    return `${d} de ${MESES[m - 1]} de ${a}`;
  }

  /** Rango de vigencia en ms: [desde, hasta) — hasta = 00:00 del día siguiente a `fin`. */
  function vigencia(cupon, offset) {
    return {
      desde: Date.parse(`${cupon.inicio}T00:00:00${offset}`),
      hasta: Date.parse(`${cupon.fin}T00:00:00${offset}`) + DIA_MS,
    };
  }

  /* ---------- Cupones ---------- */
  const normalizarCodigo = (texto) =>
    String(texto || '').replace(/\s+/g, '').toUpperCase();

  const buscarCupon = (config, codigo) =>
    config.cupones.find((c) => normalizarCodigo(c.codigo) === codigo) || null;

  const aplicaA = (cupon, productoId) =>
    !cupon.productos || cupon.productos.includes(productoId);

  /**
   * Valida un código. No calcula importes.
   * estado: 'vacio' | 'inexistente' | 'inactivo' | 'pendiente' | 'vencido'
   *         | 'no_aplica' | 'valido'
   */
  function validarCupon(config, codigoIngresado, ahora, cantidades) {
    const codigo = normalizarCodigo(codigoIngresado);
    if (!codigo) return { estado: 'vacio', codigo, cupon: null, mensaje: '' };

    const cupon = buscarCupon(config, codigo);
    if (!cupon)
      return {
        estado: 'inexistente',
        codigo,
        cupon: null,
        mensaje: `El cupón ${codigo} no existe. Revisa que esté bien escrito.`,
      };
    if (!cupon.activo)
      return {
        estado: 'inactivo',
        codigo,
        cupon,
        mensaje: `El cupón ${codigo} ya no está disponible.`,
      };

    const { desde, hasta } = vigencia(cupon, config.zonaHoraria.offset);
    if (ahora < desde)
      return {
        estado: 'pendiente',
        codigo,
        cupon,
        mensaje: `El cupón ${codigo} estará disponible desde el ${formatoFecha(cupon.inicio)}.`,
      };
    if (ahora >= hasta)
      return {
        estado: 'vencido',
        codigo,
        cupon,
        mensaje: `La promoción terminó el ${formatoFecha(cupon.fin)}: el cupón ${codigo} ya no es válido.`,
      };

    if (cantidades) {
      const conKg = Object.keys(cantidades).filter((id) => cantidades[id] > 0);
      if (conKg.length && !conKg.some((id) => aplicaA(cupon, id)))
        return {
          estado: 'no_aplica',
          codigo,
          cupon,
          mensaje: `El cupón ${codigo} no aplica a los productos de tu pedido.`,
        };
    }
    return { estado: 'valido', codigo, cupon, mensaje: '' };
  }

  /** Cupón público vigente (para precargarlo y mostrarlo en el catálogo). */
  function cuponPublicoVigente(config, ahora) {
    const c = config.cupones.find(
      (x) =>
        x.publico && validarCupon(config, x.codigo, ahora).estado === 'valido',
    );
    return c || null;
  }

  /** Descuento por kg (céntimos) de un producto con un cupón. Se redondea por
   *  kg para que siempre se cumpla: kg × precio unitario = importe de la línea. */
  function descuentoPorKg(producto, cupon) {
    if (!cupon || !aplicaA(cupon, producto.id)) return 0;
    const reg = aCentimos(producto.precioRegular);
    let d = 0;
    if (cupon.tipo === 'precio_lanzamiento')
      d = reg - aCentimos(producto.precioLanzamiento);
    else if (cupon.tipo === 'porcentaje')
      d = Math.round((reg * Number(cupon.valor)) / 100);
    return Math.min(Math.max(0, d), reg); // nunca negativo ni mayor que el precio
  }

  /** Precio unitario por kg (céntimos) que ve el cliente en el catálogo. */
  function precioUnitario(producto, cupon) {
    const regular = aCentimos(producto.precioRegular);
    const final = regular - descuentoPorKg(producto, cupon);
    return {
      regular,
      final,
      porcentaje:
        cupon && cupon.tipo === 'precio_lanzamiento'
          ? porcentajeDescuento(producto)
          : regular > 0
            ? Math.round(((regular - final) * 10000) / regular) / 100
            : 0,
    };
  }

  /**
   * Calcula el pedido completo (sin delivery).
   * Un solo cupón por pedido; cada línea recibe su descuento una sola vez.
   */
  function calcularPedido(config, cantidades, codigoCupon, ahora) {
    const kgDe = (p) => {
      const n = Math.trunc(Number(cantidades[p.id]) || 0);
      return p.disponible
        ? Math.min(Math.max(0, n), config.maxKgPorProducto)
        : 0;
    };
    const limpias = {};
    config.productos.forEach((p) => (limpias[p.id] = kgDe(p)));

    const cupon = validarCupon(config, codigoCupon, ahora, limpias);
    const activo = cupon.estado === 'valido' ? cupon.cupon : null;

    const lineas = config.productos.map((p) => {
      const kg = limpias[p.id];
      const precioRegular = aCentimos(p.precioRegular);
      const precioUnit = precioRegular - descuentoPorKg(p, activo);
      return {
        id: p.id,
        nombre: p.nombre,
        unidad: p.unidad,
        kg,
        precioRegular,
        precioUnitario: precioUnit, // precio de venta por kg (lo que ve el cliente)
        importeRegular: precioRegular * kg,
        descuento: (precioRegular - precioUnit) * kg,
        importe: precioUnit * kg,
      };
    });

    const kg = lineas.reduce((s, l) => s + l.kg, 0);
    const subtotalRegular = lineas.reduce((s, l) => s + l.importeRegular, 0);
    const subtotal = lineas.reduce((s, l) => s + l.importe, 0);

    // Descuento a nivel de pedido (solo cupones 'monto_fijo').
    let descuentoPedido = 0;
    if (activo && activo.tipo === 'monto_fijo') {
      const base = lineas
        .filter((l) => aplicaA(activo, l.id))
        .reduce((s, l) => s + l.importe, 0);
      descuentoPedido = Math.min(aCentimos(activo.valor), base);
    }

    const total = subtotal - descuentoPedido;
    const ahorro = subtotalRegular - total;

    if (activo) {
      cupon.mensaje =
        activo.tipo === 'precio_lanzamiento'
          ? `Cupón ${cupon.codigo} aplicado: precio de lanzamiento hasta el ${formatoFecha(activo.fin)}.`
          : `Cupón ${cupon.codigo} aplicado.`;
    }

    return {
      lineas,
      kg,
      subtotalRegular,
      subtotal,
      descuentoPedido,
      total,
      ahorro, // solo para la nota final del mensaje; no se muestra en el resumen
      cupon,
    };
  }

  /* ---------- Delivery ---------- */

  /** Regla de delivery gratis de una zona como texto ("por más de 3 kg"). */
  const textoGratis = (zona) =>
    zona.gratisMasDe == null ? '' : `por más de ${zona.gratisMasDe} kg`;

  /**
   * Costo de entrega.
   * modo: 'delivery' | 'recojo'; zonaIndice: índice en config.delivery.zonas.
   */
  function calcularEntrega(config, modo, zonaIndice, kg) {
    if (modo === 'recojo')
      return {
        modo,
        centimos: 0,
        gratis: true,
        coordinar: false,
        minimoOk: kg >= config.recojo.minimoKg,
        minimoKg: config.recojo.minimoKg,
        faltanParaGratis: 0,
        zona: null,
      };
    const zona = config.delivery.zonas[zonaIndice];
    if (!zona) throw new Error(`Zona de delivery inexistente: ${zonaIndice}`);
    const minimoKg = config.delivery.minimoKg;
    const base = { modo, zona, minimoKg, minimoOk: kg >= minimoKg };
    if (zona.tarifa == null)
      return { ...base, centimos: 0, gratis: false, coordinar: true, faltanParaGratis: 0 };
    const gratis = zona.gratisMasDe != null && kg > zona.gratisMasDe;
    return {
      ...base,
      centimos: gratis ? 0 : aCentimos(zona.tarifa),
      gratis,
      coordinar: false,
      faltanParaGratis:
        !gratis && zona.gratisMasDe != null ? zona.gratisMasDe + 1 - kg : 0,
    };
  }

  /**
   * Resumen completo: única fuente para el resumen de la web, el total y el
   * mensaje de WhatsApp.
   * opciones: { cantidades, codigoCupon, ahora, modo, zonaIndice }
   */
  function resumenPedido(config, o) {
    const pedido = calcularPedido(config, o.cantidades, o.codigoCupon, o.ahora);
    const entrega = calcularEntrega(config, o.modo, o.zonaIndice, pedido.kg);
    return { ...pedido, entrega, totalFinal: pedido.total + entrega.centimos };
  }

  return {
    aCentimos,
    formatoSoles,
    formatoPorcentaje,
    formatoFecha,
    porcentajeDescuento,
    normalizarCodigo,
    vigencia,
    validarCupon,
    cuponPublicoVigente,
    precioUnitario,
    calcularPedido,
    textoGratis,
    calcularEntrega,
    resumenPedido,
  };
});
