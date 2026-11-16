// Pruebas de precios, cupones y delivery. Ejecutar: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const CONFIG = require('../assets/js/config.js');
const P = require('../assets/js/precios.js');

const lima = (iso) => Date.parse(iso + '-05:00');
const CAMPANIA = lima('2026-11-20T12:00:00');
const VENCIDO = lima('2026-12-16T00:00:00');
const fuerte = CONFIG.productos.find((p) => p.id === 'fuerte');
const hass = CONFIG.productos.find((p) => p.id === 'hass');
const conCupones = (cupones) => ({ ...CONFIG, cupones });
const SAN_BORJA = 0, VECINOS = 1, OTROS = 2;
const resumen = (cantidades, extra = {}) =>
  P.resumenPedido(CONFIG, {
    cantidades,
    codigoCupon: 'INTRO',
    ahora: CAMPANIA,
    modo: 'delivery',
    zonaIndice: SAN_BORJA,
    ...extra,
  });

test('configuración: productos completos y precios de la campaña', () => {
  for (const p of CONFIG.productos)
    for (const k of ['id', 'nombre', 'unidad', 'precioRegular', 'precioLanzamiento', 'disponible'])
      assert.ok(k in p, `${p.id} sin ${k}`);
  assert.equal(fuerte.precioRegular, 16);
  assert.equal(fuerte.precioLanzamiento, 12);
  assert.equal(hass.precioRegular, 14);
  assert.equal(hass.precioLanzamiento, 10.5);
  assert.equal(CONFIG.tienda.whatsapp, '51993273537');
});

test('descuento calculado: 25 % en ambas variedades', () => {
  assert.equal(P.porcentajeDescuento(fuerte), 25);
  assert.equal(P.porcentajeDescuento(hass), 25);
  assert.equal(P.formatoPorcentaje(25), '25%');
  assert.equal(P.formatoPorcentaje(22.58), '22.58%');
  assert.equal(P.porcentajeDescuento({ precioRegular: 10, precioLanzamiento: 12 }), 0);
});

test('dinero en céntimos sin errores de coma flotante', () => {
  assert.equal(P.aCentimos(10.5), 1050);
  assert.equal(P.aCentimos(14.3), 1430); // 14.3*100 = 1430.0000000000002 en float
  assert.equal(P.formatoSoles(6750), 'S/ 67.50');
  assert.equal(P.formatoSoles(-1050), '−S/ 10.50');
  assert.equal(P.formatoSoles(5), 'S/ 0.05');
});

test('ejemplo del negocio: 3 kg Fuerte + 3 kg Hass = S/ 67.50, delivery gratis', () => {
  const r = resumen({ fuerte: 3, hass: 3 });
  const [f, h] = r.lineas;
  assert.deepEqual([f.kg, f.precioUnitario, f.importe], [3, 1200, 3600]);
  assert.deepEqual([h.kg, h.precioUnitario, h.importe], [3, 1050, 3150]);
  assert.equal(r.entrega.gratis, true);
  assert.equal(r.entrega.centimos, 0);
  assert.equal(r.totalFinal, 6750);
  assert.equal(r.descuentoPedido, 0); // no hay línea de descuento en el resumen
  assert.equal(r.ahorro, 2250); // solo para la nota del mensaje: 48 + 42 − 67.50
});

test('kg × precio unitario = importe, para muchas cantidades', () => {
  const cupon = P.cuponPublicoVigente(CONFIG, CAMPANIA);
  for (const p of CONFIG.productos) {
    const u = P.precioUnitario(p, cupon);
    for (let kg = 0; kg <= CONFIG.maxKgPorProducto; kg++) {
      const r = resumen({ [p.id]: kg });
      const l = r.lineas.find((x) => x.id === p.id);
      assert.equal(l.precioUnitario, u.final, 'catálogo = carrito');
      assert.equal(l.importe, l.precioUnitario * l.kg);
      assert.equal(r.total, l.importe);
      assert.equal(r.totalFinal, r.total + r.entrega.centimos);
    }
  }
});

test('delivery San Borja: gratis solo si el total SUPERA 3 kg', () => {
  const casos = [
    [{ fuerte: 2 }, false, 500, 2],
    [{ fuerte: 3 }, false, 500, 1],
    [{ fuerte: 3, hass: 1 }, true, 0, 0],
    [{ fuerte: 2, hass: 2 }, true, 0, 0],
    [{ hass: 4 }, true, 0, 0],
  ];
  for (const [cant, gratis, centimos, faltan] of casos) {
    const e = resumen(cant).entrega;
    assert.equal(e.gratis, gratis, JSON.stringify(cant));
    assert.equal(e.centimos, centimos, JSON.stringify(cant));
    assert.equal(e.faltanParaGratis, faltan, JSON.stringify(cant));
  }
  assert.equal(resumen({ fuerte: 3 }).totalFinal, 3600 + 500);
});

test('otras zonas conservan sus reglas', () => {
  const v = resumen({ fuerte: 5 }, { zonaIndice: VECINOS }).entrega;
  assert.deepEqual([v.gratis, v.centimos, v.coordinar], [false, 800, false]);
  const o = resumen({ fuerte: 5 }, { zonaIndice: OTROS });
  assert.deepEqual([o.entrega.coordinar, o.entrega.centimos], [true, 0]);
  assert.equal(o.totalFinal, 6000);
});

test('mínimos: delivery 2 kg, recojo 1 kg; recojo siempre gratis', () => {
  assert.equal(resumen({ fuerte: 1 }).entrega.minimoOk, false);
  assert.equal(resumen({ fuerte: 2 }).entrega.minimoOk, true);
  const rec = resumen({ hass: 1 }, { modo: 'recojo' });
  assert.deepEqual([rec.entrega.minimoOk, rec.entrega.gratis, rec.entrega.centimos], [true, true, 0]);
  assert.equal(rec.totalFinal, 1050);
  assert.throws(() => resumen({ fuerte: 2 }, { zonaIndice: 99 }));
});

test('INTRO: vigencia en hora de Lima', () => {
  const v = (iso) => P.validarCupon(CONFIG, 'INTRO', lima(iso)).estado;
  assert.equal(v('2026-10-31T23:59:59'), 'pendiente');
  assert.equal(v('2026-11-01T00:00:00'), 'valido');
  assert.equal(v('2026-12-15T23:59:59'), 'valido');
  assert.equal(v('2026-12-16T00:00:00'), 'vencido');
  assert.equal(P.validarCupon(CONFIG, 'INTRO', Date.parse('2026-12-16T04:59:59Z')).estado, 'valido');
  assert.equal(P.validarCupon(CONFIG, 'INTRO', Date.parse('2026-12-16T05:00:00Z')).estado, 'vencido');
});

test('después del vencimiento se cobra el precio de referencia', () => {
  const r = resumen({ fuerte: 3, hass: 1 }, { ahora: VENCIDO });
  assert.equal(r.cupon.estado, 'vencido');
  assert.match(r.cupon.mensaje, /promoción terminó el 15 de diciembre de 2026/);
  assert.equal(r.lineas[0].precioUnitario, 1600);
  assert.equal(r.totalFinal, 3 * 1600 + 1400);
  assert.equal(r.ahorro, 0);
  assert.equal(P.cuponPublicoVigente(CONFIG, VENCIDO), null);
});

test('validación de códigos y mensaje sin montos de ahorro', () => {
  assert.equal(P.validarCupon(CONFIG, '  intro ', CAMPANIA).estado, 'valido');
  assert.equal(P.validarCupon(CONFIG, '', CAMPANIA).estado, 'vacio');
  assert.equal(P.validarCupon(CONFIG, 'NOEXISTE', CAMPANIA).estado, 'inexistente');
  assert.equal(P.validarCupon(CONFIG, 'INTRO INTRO', CAMPANIA).estado, 'inexistente');
  const inactivo = conCupones([{ ...CONFIG.cupones[0], activo: false }]);
  assert.equal(P.validarCupon(inactivo, 'INTRO', CAMPANIA).estado, 'inactivo');
  const m = resumen({ fuerte: 3 }).cupon.mensaje;
  assert.match(m, /Cupón INTRO aplicado: precio de lanzamiento hasta el 15 de diciembre de 2026/);
  assert.doesNotMatch(m, /S\//);
  assert.match(P.validarCupon(CONFIG, 'INTRO', lima('2026-10-01T00:00:00')).mensaje, /desde el 1 de noviembre de 2026/);
});

test('sin cupón se cobra el precio de referencia', () => {
  const r = resumen({ fuerte: 3 }, { codigoCupon: '' });
  assert.equal(r.lineas[0].precioUnitario, 1600);
  assert.equal(r.total, 4800);
});

test('un cupón no se aplica dos veces y el cálculo es idempotente', () => {
  assert.deepEqual(resumen({ fuerte: 3, hass: 2 }), resumen({ fuerte: 3, hass: 2 }));
  for (const l of resumen({ fuerte: 3, hass: 2 }).lineas)
    assert.ok(l.importe >= 0 && l.importe <= l.importeRegular);
});

test('cupón que no aplica a los productos del pedido', () => {
  const soloHass = conCupones([{ ...CONFIG.cupones[0], codigo: 'HASS', productos: ['hass'] }]);
  const r = P.calcularPedido(soloHass, { fuerte: 2 }, 'HASS', CAMPANIA);
  assert.equal(r.cupon.estado, 'no_aplica');
  assert.equal(r.total, 3200);
  assert.equal(P.calcularPedido(soloHass, { fuerte: 1, hass: 1 }, 'HASS', CAMPANIA).total, 1600 + 1050);
});

test('arquitectura para cupones futuros: porcentaje y monto fijo', () => {
  const base = { activo: true, publico: false, inicio: '2026-11-01', fin: '2027-12-31', productos: null };
  const cfg = conCupones([
    { ...base, codigo: 'AMIGA10', descripcion: 'Cliente frecuente', tipo: 'porcentaje', valor: 10 },
    { ...base, codigo: 'GRACIAS5', descripcion: 'Gracias', tipo: 'monto_fijo', valor: 5 },
  ]);
  const pct = P.calcularPedido(cfg, { fuerte: 3 }, 'amiga10', CAMPANIA);
  assert.equal(pct.lineas[0].precioUnitario, 1440);
  assert.equal(pct.total, 4320);
  const fijo = P.calcularPedido(cfg, { hass: 1 }, 'GRACIAS5', CAMPANIA);
  assert.deepEqual([fijo.descuentoPedido, fijo.total], [500, 900]);
  const grande = conCupones([{ ...base, codigo: 'X', tipo: 'monto_fijo', valor: 999 }]);
  assert.equal(P.calcularPedido(grande, { hass: 1 }, 'X', CAMPANIA).total, 0);
  assert.equal(P.cuponPublicoVigente(cfg, CAMPANIA), null);
});

test('cantidades saneadas: enteros, sin negativos, máximo y agotados', () => {
  const r = P.calcularPedido(CONFIG, { fuerte: 2.7, hass: -4 }, '', CAMPANIA);
  assert.deepEqual(r.lineas.map((l) => l.kg), [2, 0]);
  assert.equal(P.calcularPedido(CONFIG, { fuerte: 99 }, '', CAMPANIA).kg, CONFIG.maxKgPorProducto);
  const agotada = { ...CONFIG, productos: CONFIG.productos.map((p) => (p.id === 'hass' ? { ...p, disponible: false } : p)) };
  assert.equal(P.calcularPedido(agotada, { hass: 3 }, 'INTRO', CAMPANIA).total, 0);
});
