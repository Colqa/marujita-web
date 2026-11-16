/* ================================================================
   MENSAJE Y ENLACES DE WHATSAPP — Paltas Marujita
   Construye el texto a partir del mismo resumen que muestra la web
   (Precios.resumenPedido), así los importes son siempre idénticos.
   ================================================================ */
(function (raiz, fabrica) {
  const api = fabrica(
    typeof module === 'object' && module.exports
      ? require('./precios.js')
      : raiz.Precios,
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.WhatsApp = api;
})(typeof self !== 'undefined' ? self : this, function (Precios) {
  const fmt = Precios.formatoSoles;

  /** https://wa.me/51XXXXXXXXX?text=... */
  const enlace = (numero, texto) =>
    `https://wa.me/${numero}` +
    (texto ? `?text=${encodeURIComponent(texto)}` : '');

  /** 51993273537 → +51 993 273 537 */
  const numeroVisible = (numero) =>
    String(numero).replace(/^(\d{2})(\d{3})(\d{3})(\d{3})$/, '+$1 $2 $3 $4');

  /** Texto del costo de entrega: GRATIS | S/ 5.00 | a coordinar */
  const textoEntrega = (e) =>
    e.coordinar ? 'a coordinar' : e.gratis ? 'GRATIS' : fmt(e.centimos);

  /**
   * Mensaje del pedido.
   * resumen: Precios.resumenPedido(...)
   * datos:   { nombre, distrito, comentario }
   */
  function mensajePedido(config, resumen, datos) {
    const { tienda, recojo } = config;
    const e = resumen.entrega;
    const l = [];

    l.push(
      `Hola, ${tienda.nombre}.` +
        (datos.nombre ? ` Soy ${datos.nombre}.` : '') +
        ' ¡Quisiera realizar el siguiente pedido!',
    );
    l.push('');
    l.push('🥑 *MI PEDIDO*');
    resumen.lineas
      .filter((x) => x.kg > 0)
      .forEach((x) =>
        l.push(
          `- ${x.nombre}: ${x.kg} ${x.unidad} × ${fmt(x.precioUnitario)} = ${fmt(x.importe)}`,
        ),
      );
    if (resumen.descuentoPedido)
      l.push(
        `- ${resumen.cupon.cupon.descripcion}: ${fmt(-resumen.descuentoPedido)}`,
      );
    l.push('');
    l.push(
      e.modo === 'recojo'
        ? `🏪 Recojo: ${textoEntrega(e)}`
        : `🚚 Delivery: ${textoEntrega(e)}`,
    );
    l.push(
      `*TOTAL: ${fmt(resumen.totalFinal)}${e.coordinar ? ' + envío a coordinar' : ''}*`,
    );
    l.push('');
    l.push('📍 *Modalidad de entrega:*');
    if (e.modo === 'recojo') {
      l.push(`- Recojo local en ${recojo.lugar} (${recojo.direccion}).`);
      l.push('- Coordinemos el día y la hora de recojo.');
    } else {
      l.push(`- Delivery a ${datos.distrito}.`);
      l.push('- Les envío mi dirección completa y una referencia.');
    }
    if (datos.comentario) {
      l.push('');
      l.push(`💬 Comentario: ${datos.comentario}`);
    }
    l.push('');
    l.push('💳 Pago anticipado por Yape o Plin.');
    l.push('Por favor, confirmar disponibilidad y horario de entrega.');
    l.push('¡Muchas gracias!');

    // Nota de campaña: el ahorro solo aparece aquí, nunca en la lista.
    const c = resumen.cupon;
    if (c.estado === 'valido' && resumen.ahorro > 0) {
      l.push('');
      l.push(
        `_Precio especial por nuestra campaña de lanzamiento. ¡Gracias por probar ${tienda.nombre}!_`,
      );
      l.push(`_Cupón ${c.codigo} · Ahorro total: ${fmt(resumen.ahorro)}_`);
    }
    return l.join('\n');
  }

  return { enlace, numeroVisible, textoEntrega, mensajePedido };
});
