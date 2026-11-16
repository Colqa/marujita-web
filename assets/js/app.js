/* ================================================================
   INTERFAZ — Paltas Marujita
   Solo DOM y eventos. Ninguna cifra ni dato comercial se escribe aquí:
   todo sale de CONFIG (config.js), Precios (precios.js) y WhatsApp (whatsapp.js).
   ================================================================ */
const $ = (id) => document.getElementById(id);
const P = Precios;
const fmt = P.formatoSoles;
const fmtKg = (n) => n + ' kg';
const cap = (id) => id[0].toUpperCase() + id.slice(1);
// Reloj del navegador del cliente (ver limitaciones en el README).
const ahora = () => Date.now();
const { tienda, delivery, recojo } = CONFIG;

const estado = {};
CONFIG.productos.forEach((p) => (estado[p.id] = 0));
let avisoMax = '';

// ---------- Textos comerciales desde la configuración ----------
const zonaConGratis = delivery.zonas.find((z) => z.gratisMasDe != null);
const textosCfg = {
  zonaGratis: zonaConGratis ? zonaConGratis.distritos.join(' y ') : '',
  reglaGratis: zonaConGratis ? P.textoGratis(zonaConGratis) : '',
  recojoLugar: recojo.lugar,
};
document.querySelectorAll('[data-cfg]').forEach((el) => {
  if (el.dataset.cfg === 'recojoMapa') {
    el.href = recojo.mapa;
    el.textContent = `${recojo.lugar} (${recojo.direccion})`;
  } else {
    el.textContent = textosCfg[el.dataset.cfg] || '';
  }
});
$('faqMinimo').textContent =
  `Para delivery, el mínimo es ${delivery.minimoKg} kg. Para recojo en ${recojo.lugar} puedes pedir desde ${recojo.minimoKg} kg.`;
$('anio').textContent = new Date().getFullYear();

// ---------- Catálogo y selector ----------
const campania = P.cuponPublicoVigente(CONFIG, ahora());
const tachado = (centimos) =>
  `<s class="ref"><span class="sr-only">Precio de referencia </span>${fmt(centimos)}</s>`;

CONFIG.productos.forEach((p) => {
  const C = cap(p.id);
  const card = $('prod' + C);
  card.querySelector('h3').textContent = p.nombre;
  if (p.imagen) {
    const img = document.createElement('img');
    img.src = p.imagen;
    img.alt = p.nombre;
    img.className = 'prod-img';
    card.querySelector('svg').replaceWith(img);
  }
  if (!p.disponible) {
    card.classList.add('agotado');
    $('precio' + C).innerHTML = '<div class="precio">Agotada por ahora</div>';
    $('lbl' + C).textContent = 'Agotada por ahora';
    document
      .querySelectorAll(`[data-prod="${p.id}"]`)
      .forEach((b) => (b.disabled = true));
    return;
  }
  const u = P.precioUnitario(p, campania);
  const precioVenta = `<div class="precio">${fmt(u.final)} <span>/ ${p.unidad}</span></div>`;
  if (u.final < u.regular) {
    $('precio' + C).innerHTML =
      `<p class="precio-reg">${tachado(u.regular)}</p>` +
      `<div class="precio-fila">${precioVenta}` +
      `<span class="badge-desc">−${P.formatoPorcentaje(u.porcentaje)}</span></div>` +
      `<p class="vigencia">Precio de lanzamiento hasta el ${P.formatoFecha(campania.fin)}.</p>`;
    $('lbl' + C).innerHTML =
      `<strong class="precio-sel">${fmt(u.final)}</strong> por ${p.unidad} ${tachado(u.regular)}`;
  } else {
    $('precio' + C).innerHTML = `<div class="precio-fila">${precioVenta}</div>`;
    $('lbl' + C).innerHTML =
      `<strong class="precio-sel">${fmt(u.final)}</strong> por ${p.unidad}`;
  }
});

// ---------- Campaña: caja del cupón y FAQ ----------
const lanz = CONFIG.cupones.find(
  (c) => c.publico && c.tipo === 'precio_lanzamiento',
);
const listaPrecios = (campo) =>
  CONFIG.productos
    .map((p) => `${p.nombre} ${fmt(P.aCentimos(p[campo]))}`)
    .join(' y ');
if (campania) {
  $('cupon').value = campania.codigo;
  $('cuponBox').hidden = false;
  $('cuponBox').innerHTML =
    `Usa el cupón <code>${campania.codigo}</code> válido hasta el ${P.formatoFecha(campania.fin)}`;
}
if (lanz) {
  const st = P.validarCupon(CONFIG, lanz.codigo, ahora()).estado;
  $('faqLanzamiento').textContent =
    st === 'vencido'
      ? `Nuestra campaña de lanzamiento terminó el ${P.formatoFecha(lanz.fin)}. Precios actuales por kg: ${listaPrecios('precioRegular')}.`
      : `Del ${P.formatoFecha(lanz.inicio)} al ${P.formatoFecha(lanz.fin)} (hora de Lima), con el cupón ${lanz.codigo}. Precios por kg: ${listaPrecios('precioLanzamiento')}. Desde el día siguiente rige el precio regular: ${listaPrecios('precioRegular')}.`;
} else {
  $('faqLanzamiento').closest('details').hidden = true;
}

// ---------- Select de distritos + tarjetas de zonas ----------
const sel = $('distrito');
delivery.zonas.forEach((z, i) => {
  const og = document.createElement('optgroup');
  og.label = z.grupo;
  z.distritos.forEach((d) => {
    const o = document.createElement('option');
    o.value = i + '|' + d;
    o.textContent = d;
    og.appendChild(o);
  });
  sel.appendChild(og);

  const tarifaTxt = z.tarifa == null ? 'A coordinar' : fmt(P.aCentimos(z.tarifa));
  const minimo = `Mínimo ${delivery.minimoKg} kg`;
  const extra =
    z.gratisMasDe != null
      ? `${minimo} · <b>Gratis ${P.textoGratis(z)}</b>`
      : z.tarifa == null
        ? `${minimo} · Escríbenos y vemos la mejor opción`
        : minimo;
  $('zonas').insertAdjacentHTML(
    'beforeend',
    `<div class="card zona"><h3>${z.grupo}</h3><div class="p">${tarifaTxt}</div><p>${extra}</p><p style="margin-top:6px;font-size:.85rem">${z.distritos.join(', ')}</p></div>`,
  );
});

// ---------- Cálculo del pedido ----------
const modoEntrega = () =>
  document.querySelector('input[name="entrega"]:checked').value;

function calcular() {
  const modo = modoEntrega();
  const [zi, distrito] = sel.value.split('|');
  const r = P.resumenPedido(CONFIG, {
    cantidades: estado,
    codigoCupon: $('cupon').value,
    ahora: ahora(),
    modo,
    zonaIndice: +zi,
  });
  const e = r.entrega;
  let ok = r.kg > 0,
    msg = '',
    err = false;

  $('campoDistrito').style.display = modo === 'delivery' ? '' : 'none';
  $('notaRecojo').hidden = modo !== 'recojo';

  if (modo === 'delivery') {
    const z = e.zona;
    $('notaDistrito').textContent = e.coordinar
      ? 'Te confirmamos el costo por WhatsApp.'
      : e.gratis
        ? `Delivery gratis ${P.textoGratis(z)}.`
        : `Delivery ${fmt(e.centimos)}.` +
          (z.gratisMasDe != null ? ` Gratis ${P.textoGratis(z)}.` : '');
    if (e.faltanParaGratis > 0 && r.kg > 0)
      msg = `Agrega ${fmtKg(e.faltanParaGratis)} más y el delivery es gratis 🎉`;
  }
  if (r.kg > 0 && !e.minimoOk) {
    ok = false;
    err = true;
    msg = `El mínimo para ${modo === 'recojo' ? 'recojo' : 'delivery'} es ${fmtKg(e.minimoKg)} (te faltan ${fmtKg(e.minimoKg - r.kg)}).`;
  }
  if (r.kg === 0) msg = 'Agrega kilos para empezar.';
  if (avisoMax && !err) msg = avisoMax;
  if (ok && !$('nombre').value.trim()) {
    ok = false;
    msg = 'Escribe tu nombre para enviar el pedido.';
  }

  // Resumen: solo kg × precio de venta = importe. Sin líneas de descuento.
  r.lineas.forEach((l) => {
    const C = cap(l.id);
    $('kg' + C).textContent = fmtKg(l.kg);
    $('r' + C + 'Lbl').textContent = l.kg
      ? `${l.nombre} (${fmtKg(l.kg)} × ${fmt(l.precioUnitario)})`
      : l.nombre;
    $('r' + C).textContent = fmt(l.importe);
  });
  $('lineaDesc').hidden = r.descuentoPedido === 0;
  if (r.descuentoPedido) {
    $('rDescLbl').textContent = r.cupon.cupon.descripcion;
    $('rDesc').textContent = fmt(-r.descuentoPedido);
  }
  $('rEntregaLbl').textContent = modo === 'recojo' ? 'Recojo' : 'Delivery';
  $('rDelivery').textContent = WhatsApp.textoEntrega(e).replace(
    /^a coordinar$/,
    'A coordinar',
  );
  $('rTotal').textContent = fmt(r.totalFinal) + (e.coordinar ? ' + envío' : '');

  // Mensaje del cupón (sin montos de ahorro)
  const c = r.cupon;
  let msgCupon = c.mensaje;
  if (c.estado === 'vacio' && campania)
    msgCupon = `Escribe ${campania.codigo} para obtener el precio de lanzamiento.`;
  $('msgCupon').textContent = msgCupon;
  $('msgCupon').className =
    'msg-cupon' +
    (c.estado === 'valido' ? ' ok' : c.estado === 'vacio' ? '' : ' err');

  $('msg').textContent = msg;
  $('msg').className = 'msg' + (err ? ' err' : '');
  $('btnEnviar').disabled = !ok;

  return { resumen: r, distrito };
}

document.querySelectorAll('.stepper button').forEach((b) =>
  b.addEventListener('click', () => {
    const p = b.dataset.prod;
    const d = parseInt(b.dataset.d, 10);
    const nuevo = estado[p] + d;
    avisoMax =
      d > 0 && nuevo > CONFIG.maxKgPorProducto
        ? `El máximo por web es ${CONFIG.maxKgPorProducto} kg por variedad. Para más, escríbenos por WhatsApp.`
        : '';
    estado[p] = Math.min(CONFIG.maxKgPorProducto, Math.max(0, nuevo));
    calcular();
  }),
);
document
  .querySelectorAll('input[name="entrega"]')
  .forEach((r) => r.addEventListener('change', calcular));
sel.addEventListener('change', calcular);
$('nombre').addEventListener('input', calcular);
$('cupon').addEventListener('input', calcular);

$('btnEnviar').addEventListener('click', () => {
  const { resumen, distrito } = calcular();
  if ($('btnEnviar').disabled) return;
  const texto = WhatsApp.mensajePedido(CONFIG, resumen, {
    nombre: $('nombre').value.trim(),
    distrito,
    comentario: $('nota').value.trim(),
  });
  window.open(WhatsApp.enlace(tienda.whatsapp, texto), '_blank', 'noopener');
});

// ---------- Enlaces de contacto ----------
const linkInfo = WhatsApp.enlace(
  tienda.whatsapp,
  `¡Hola ${tienda.nombre}! 🥑 Quisiera información sobre las paltas.`,
);
$('waFloat').href = linkInfo;
$('waFooter').href = linkInfo;
$('waFooter').textContent = WhatsApp.numeroVisible(tienda.whatsapp);

// Oculta el botón flotante mientras se ve el formulario de pedido,
// para que no tape el botón "Enviar pedido".
if ('IntersectionObserver' in window) {
  new IntersectionObserver(
    ([e]) => $('waFloat').classList.toggle('oculto', e.isIntersecting),
    { threshold: 0.15 },
  ).observe($('pedido'));
}
calcular();
