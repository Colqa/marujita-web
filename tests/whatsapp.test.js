// Pruebas del mensaje y enlaces de WhatsApp. Ejecutar: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const CONFIG = require('../assets/js/config.js');
const P = require('../assets/js/precios.js');
const W = require('../assets/js/whatsapp.js');

const CAMPANIA = Date.parse('2026-11-20T12:00:00-05:00');
const VENCIDO = Date.parse('2026-12-16T00:00:00-05:00');
const resumen = (cantidades, extra = {}) =>
  P.resumenPedido(CONFIG, {
    cantidades, codigoCupon: 'INTRO', ahora: CAMPANIA, modo: 'delivery', zonaIndice: 0, ...extra,
  });

test('enlaces con el número nuevo en formato internacional', () => {
  assert.equal(W.enlace(CONFIG.tienda.whatsapp), 'https://wa.me/51993273537');
  assert.equal(W.enlace('51993273537', 'Hola ×'), 'https://wa.me/51993273537?text=Hola%20%C3%97');
  assert.equal(W.numeroVisible('51993273537'), '+51 993 273 537');
});

test('mensaje delivery: formato completo del ejemplo del negocio', () => {
  const txt = W.mensajePedido(CONFIG, resumen({ fuerte: 3, hass: 3 }), {
    nombre: 'Ana', distrito: 'San Borja', comentario: '',
  });
  assert.equal(
    txt,
    [
      'Hola, Paltas Marujita. Soy Ana. ¡Quisiera realizar el siguiente pedido!',
      '',
      '🥑 *MI PEDIDO*',
      '- Palta Fuerte: 3 kg × S/ 12.00 = S/ 36.00',
      '- Palta Hass: 3 kg × S/ 10.50 = S/ 31.50',
      '',
      '🚚 Delivery: GRATIS',
      '*TOTAL: S/ 67.50*',
      '',
      '📍 *Modalidad de entrega:*',
      '- Delivery a San Borja.',
      '- Les envío mi dirección completa y una referencia.',
      '',
      '💳 Pago anticipado por Yape o Plin.',
      'Por favor, confirmar disponibilidad y horario de entrega.',
      '¡Muchas gracias!',
      '',
      '_Precio especial por nuestra campaña de lanzamiento. ¡Gracias por probar Paltas Marujita!_',
      '_Cupón INTRO · Ahorro total: S/ 22.50_',
    ].join('\n'),
  );
});

test('el mensaje nunca muestra precios de referencia ni líneas de descuento', () => {
  const txt = W.mensajePedido(CONFIG, resumen({ fuerte: 2, hass: 5 }), { nombre: 'Luis', distrito: 'San Luis' });
  assert.doesNotMatch(txt, /16\.00|14\.00|−S\/|Descuento/);
  // el ahorro solo aparece en la nota final (última línea)
  const lineas = txt.split('\n');
  assert.equal(lineas.findIndex((l) => l.includes('Ahorro')), lineas.length - 1);
});

test('mensaje con delivery pagado y zona a coordinar', () => {
  const pagado = W.mensajePedido(CONFIG, resumen({ fuerte: 3 }), { nombre: 'Ana', distrito: 'San Borja' });
  assert.match(pagado, /🚚 Delivery: S\/ 5\.00\n\*TOTAL: S\/ 41\.00\*/);
  const vecino = W.mensajePedido(CONFIG, resumen({ hass: 2 }, { zonaIndice: 1 }), { nombre: 'Ana', distrito: 'Miraflores' });
  assert.match(vecino, /🚚 Delivery: S\/ 8\.00\n\*TOTAL: S\/ 29\.00\*/);
  const otro = W.mensajePedido(CONFIG, resumen({ hass: 2 }, { zonaIndice: 2 }), { nombre: 'Ana', distrito: 'Otro distrito' });
  assert.match(otro, /🚚 Delivery: a coordinar\n\*TOTAL: S\/ 21\.00 \+ envío a coordinar\*/);
});

test('mensaje recojo: punto configurado, sin pedir dirección', () => {
  const txt = W.mensajePedido(CONFIG, resumen({ hass: 1 }, { modo: 'recojo' }), {
    nombre: 'Ana', distrito: 'San Borja', comentario: 'Muy ricas la vez pasada',
  });
  assert.match(txt, /🏪 Recojo: GRATIS\n\*TOTAL: S\/ 10\.50\*/);
  assert.match(txt, /- Recojo local en Supermercado Royal \(Calle San Miguel\)\./);
  assert.match(txt, /Coordinemos el día y la hora de recojo/);
  assert.doesNotMatch(txt, /dirección|Delivery a/);
  assert.match(txt, /💬 Comentario: Muy ricas la vez pasada/);
});

test('sin campaña vigente no hay nota de ahorro', () => {
  const txt = W.mensajePedido(CONFIG, resumen({ fuerte: 4 }, { ahora: VENCIDO }), { nombre: 'Ana', distrito: 'San Borja' });
  assert.match(txt, /- Palta Fuerte: 4 kg × S\/ 16\.00 = S\/ 64\.00/);
  assert.doesNotMatch(txt, /Ahorro|campaña/);
});

test('mismos importes en resumen y mensaje para muchas combinaciones', () => {
  for (let f = 0; f <= 6; f++)
    for (let h = 0; h <= 6; h++) {
      if (!f && !h) continue;
      const r = resumen({ fuerte: f, hass: h });
      const txt = W.mensajePedido(CONFIG, r, { nombre: 'X', distrito: 'San Borja' });
      for (const l of r.lineas.filter((x) => x.kg))
        assert.ok(txt.includes(`${l.kg} kg × ${P.formatoSoles(l.precioUnitario)} = ${P.formatoSoles(l.importe)}`));
      assert.ok(txt.includes(`*TOTAL: ${P.formatoSoles(r.totalFinal)}*`));
    }
});
