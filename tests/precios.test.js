// Pruebas de la lógica de precios y cupones. Ejecutar: npm test (o node --test)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const CONFIG = require('../assets/js/config.js');
const P = require('../assets/js/precios.js');

const lima = (iso) => Date.parse(iso + '-05:00');
const CAMPANIA = lima('2026-11-20T12:00:00');
const fuerte = CONFIG.productos.find((p) => p.id === 'fuerte');
const hass = CONFIG.productos.find((p) => p.id === 'hass');
const conCupones = (cupones) => ({ ...CONFIG, cupones });

test('configuración de productos', () => {
  for (const p of CONFIG.productos) {
    for (const k of ['id', 'nombre', 'unidad', 'precioRegular', 'precioLanzamiento', 'disponible'])
      assert.ok(k in p, `${p.id} sin ${k}`);
    assert.equal(p.unidad, 'kg');
  }
  assert.equal(fuerte.precioRegular, 15.5);
  assert.equal(fuerte.precioLanzamiento, 12);
  assert.equal(hass.precioRegular, 14.3);
  assert.equal(hass.precioLanzamiento, 11);
});

test('porcentajes de descuento calculados', () => {
  assert.equal(P.porcentajeDescuento(fuerte), 22.58);
  assert.equal(P.porcentajeDescuento(hass), 23.08);
  assert.equal(P.formatoPorcentaje(22.58), '22.58%');
  assert.equal(P.porcentajeDescuento({ precioRegular: 10, precioLanzamiento: 12 }), 0);
});

test('formato monetario en céntimos sin errores de coma flotante', () => {
  assert.equal(P.aCentimos(14.3), 1430); // 14.3*100 = 1430.0000000000002 en float
  assert.equal(P.formatoSoles(4650), 'S/ 46.50');
  assert.equal(P.formatoSoles(-1050), '−S/ 10.50');
  assert.equal(P.formatoSoles(5), 'S/ 0.05');
});

test('ejemplo del negocio: 3 kg de Fuerte con INTRO', () => {
  const r = P.calcularPedido(CONFIG, { fuerte: 3, hass: 0 }, 'INTRO', CAMPANIA);
  assert.equal(r.subtotalRegular, 4650);
  assert.equal(r.descuento, 1050);
  assert.equal(r.total, 3600);
  assert.equal(r.cupon.estado, 'valido');
  assert.match(r.cupon.mensaje, /Ahorras S\/ 10\.50/);
});

test('catálogo, carrito y total coinciden', () => {
  const cupon = P.cuponPublicoVigente(CONFIG, CAMPANIA);
  for (const p of CONFIG.productos) {
    const u = P.precioUnitario(p, cupon);
    for (const kg of [1, 2, 7, 20]) {
      const r = P.calcularPedido(CONFIG, { [p.id]: kg }, cupon.codigo, CAMPANIA);
      const l = r.lineas.find((x) => x.id === p.id);
      assert.equal(l.importe, u.final * kg, `${p.id} ${kg} kg`);
      assert.equal(u.final, P.aCentimos(p.precioLanzamiento));
      assert.equal(r.total, l.importe);
    }
  }
  const mixto = P.calcularPedido(CONFIG, { fuerte: 2, hass: 3 }, 'INTRO', CAMPANIA);
  assert.equal(mixto.subtotalRegular, 2 * 1550 + 3 * 1430); // 7390
  assert.equal(mixto.total, 2 * 1200 + 3 * 1100); // 5700
  assert.equal(mixto.descuento, 1690);
});

test('INTRO: vigencia en hora de Lima', () => {
  const v = (iso) => P.validarCupon(CONFIG, 'INTRO', lima(iso)).estado;
  assert.equal(v('2026-10-31T23:59:59'), 'pendiente');
  assert.equal(v('2026-11-01T00:00:00'), 'valido');
  assert.equal(v('2026-12-15T23:59:59'), 'valido');
  assert.equal(v('2026-12-16T00:00:00'), 'vencido');
  // 16/12 00:00 Lima = 16/12 05:00 UTC: a las 04:59 UTC sigue vigente
  assert.equal(P.validarCupon(CONFIG, 'INTRO', Date.parse('2026-12-16T04:59:59Z')).estado, 'valido');
  assert.equal(P.validarCupon(CONFIG, 'INTRO', Date.parse('2026-12-16T05:00:00Z')).estado, 'vencido');
});

test('después del vencimiento se cobra el precio regular', () => {
  const despues = lima('2026-12-16T00:00:00');
  const r = P.calcularPedido(CONFIG, { fuerte: 3 }, 'INTRO', despues);
  assert.equal(r.cupon.estado, 'vencido');
  assert.match(r.cupon.mensaje, /promoción terminó el 15 de diciembre de 2026/);
  assert.equal(r.descuento, 0);
  assert.equal(r.total, 4650);
  assert.equal(P.cuponPublicoVigente(CONFIG, despues), null);
  assert.equal(P.precioUnitario(fuerte, null).final, 1550);
});

test('validación de códigos', () => {
  assert.equal(P.validarCupon(CONFIG, '  intro ', CAMPANIA).estado, 'valido');
  assert.equal(P.validarCupon(CONFIG, '', CAMPANIA).estado, 'vacio');
  assert.equal(P.validarCupon(CONFIG, 'NOEXISTE', CAMPANIA).estado, 'inexistente');
  assert.equal(P.validarCupon(CONFIG, 'INTRO INTRO', CAMPANIA).estado, 'inexistente');
  const inactivo = conCupones([{ ...CONFIG.cupones[0], activo: false }]);
  assert.equal(P.validarCupon(inactivo, 'INTRO', CAMPANIA).estado, 'inactivo');
  assert.equal(P.calcularPedido(inactivo, { fuerte: 1 }, 'INTRO', CAMPANIA).total, 1550);
});

test('un cupón no se aplica dos veces y el cálculo es idempotente', () => {
  const a = P.calcularPedido(CONFIG, { fuerte: 3 }, 'INTRO', CAMPANIA);
  const b = P.calcularPedido(CONFIG, { fuerte: 3 }, 'INTRO', CAMPANIA);
  assert.deepEqual(a, b);
  for (const l of a.lineas) assert.ok(l.descuento <= l.importeRegular);
});

test('cupón que no aplica a los productos del pedido', () => {
  const soloHass = conCupones([{ ...CONFIG.cupones[0], codigo: 'HASS', productos: ['hass'] }]);
  const r = P.calcularPedido(soloHass, { fuerte: 2 }, 'HASS', CAMPANIA);
  assert.equal(r.cupon.estado, 'no_aplica');
  assert.equal(r.total, 3100);
  const mixto = P.calcularPedido(soloHass, { fuerte: 1, hass: 1 }, 'HASS', CAMPANIA);
  assert.equal(mixto.descuento, 330); // solo la Hass
});

test('arquitectura para cupones futuros: porcentaje y monto fijo', () => {
  const base = { activo: true, publico: false, inicio: '2026-11-01', fin: '2027-12-31', productos: null };
  const cfg = conCupones([
    { ...base, codigo: 'AMIGA10', descripcion: 'Cliente frecuente', tipo: 'porcentaje', valor: 10 },
    { ...base, codigo: 'GRACIAS5', descripcion: 'Gracias', tipo: 'monto_fijo', valor: 5 },
  ]);
  assert.equal(P.calcularPedido(cfg, { fuerte: 3 }, 'amiga10', CAMPANIA).total, 4185); // 46.50 − 4.65
  assert.equal(P.calcularPedido(cfg, { hass: 1 }, 'GRACIAS5', CAMPANIA).total, 930);
  // el monto fijo nunca deja el total negativo
  const grande = conCupones([{ ...base, codigo: 'X', tipo: 'monto_fijo', valor: 999 }]);
  assert.equal(P.calcularPedido(grande, { hass: 1 }, 'X', CAMPANIA).total, 0);
  // privado: no se precarga
  assert.equal(P.cuponPublicoVigente(cfg, CAMPANIA), null);
});

test('cantidades saneadas: enteros, sin negativos, máximo y agotados', () => {
  const r = P.calcularPedido(CONFIG, { fuerte: 2.7, hass: -4 }, '', CAMPANIA);
  assert.equal(r.lineas.find((l) => l.id === 'fuerte').kg, 2);
  assert.equal(r.lineas.find((l) => l.id === 'hass').kg, 0);
  assert.equal(P.calcularPedido(CONFIG, { fuerte: 99 }, '', CAMPANIA).kg, CONFIG.maxKgPorProducto);
  const agotada = { ...CONFIG, productos: CONFIG.productos.map((p) => (p.id === 'hass' ? { ...p, disponible: false } : p)) };
  assert.equal(P.calcularPedido(agotada, { hass: 3 }, 'INTRO', CAMPANIA).total, 0);
});

test('mensajes para el cliente', () => {
  assert.match(P.calcularPedido(CONFIG, {}, 'INTRO', CAMPANIA).cupon.mensaje, /válido hasta el 15 de diciembre de 2026/);
  assert.match(P.validarCupon(CONFIG, 'INTRO', lima('2026-10-01T00:00:00')).mensaje, /desde el 1 de noviembre de 2026/);
});
