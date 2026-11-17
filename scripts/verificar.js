// Verificación antes de publicar: configuración coherente y archivos referenciados.
// Uso: npm run verificar   (también corre las pruebas)
const fs = require('node:fs');
const path = require('node:path');
const CONFIG = require('../assets/js/config.js');
const P = require('../assets/js/precios.js');

const RAIZ = path.resolve(__dirname, '..');
const errores = [];
const avisos = [];
const error = (m) => errores.push(m);
const fecha = /^\d{4}-\d{2}-\d{2}$/;

// --- Tienda ---
if (!CONFIG.tienda || !CONFIG.tienda.nombre) error('tienda.nombre vacío');
if (!/^51\d{9}$/.test(CONFIG.tienda.whatsapp))
  error(`tienda.whatsapp debe ser 51 + 9 dígitos (es "${CONFIG.tienda.whatsapp}")`);

// --- Productos ---
const ids = new Set();
for (const p of CONFIG.productos) {
  if (ids.has(p.id)) error(`producto repetido: ${p.id}`);
  ids.add(p.id);
  if (!(p.precioRegular > 0)) error(`${p.id}: precioRegular debe ser > 0`);
  if (!(p.precioLanzamiento > 0)) error(`${p.id}: precioLanzamiento debe ser > 0`);
  if (p.precioLanzamiento > p.precioRegular)
    error(`${p.id}: precioLanzamiento mayor que precioRegular`);
  for (const k of ['precioRegular', 'precioLanzamiento'])
    if (Math.abs(p[k] * 100 - Math.round(p[k] * 100)) > 1e-6)
      error(`${p.id}: ${k} tiene más de 2 decimales`);
  if (p.imagen && !fs.existsSync(path.join(RAIZ, p.imagen)))
    error(`${p.id}: no existe la imagen ${p.imagen}`);
}

// --- Cupones ---
const codigos = new Set();
for (const c of CONFIG.cupones) {
  const cod = P.normalizarCodigo(c.codigo);
  if (codigos.has(cod)) error(`cupón repetido: ${cod}`);
  codigos.add(cod);
  if (!fecha.test(c.inicio) || !fecha.test(c.fin)) error(`${cod}: fechas inválidas`);
  else if (c.fin < c.inicio) error(`${cod}: fin anterior a inicio`);
  if (!['precio_lanzamiento', 'porcentaje', 'monto_fijo'].includes(c.tipo))
    error(`${cod}: tipo desconocido "${c.tipo}"`);
  if (c.tipo === 'porcentaje' && !(c.valor > 0 && c.valor < 100))
    error(`${cod}: porcentaje fuera de rango`);
  if (c.tipo === 'monto_fijo' && !(c.valor > 0)) error(`${cod}: monto inválido`);
  for (const id of c.productos || [])
    if (!ids.has(id)) error(`${cod}: producto inexistente "${id}"`);
  const st = P.validarCupon(CONFIG, cod, Date.now()).estado;
  if (c.activo && st === 'vencido') avisos.push(`${cod} está vencido (fin ${c.fin})`);
}

// --- Delivery y recojo ---
const d = CONFIG.delivery;
if (!(d.minimoKg >= 1)) error('delivery.minimoKg debe ser ≥ 1');
d.zonas.forEach((z, i) => {
  if (!z.grupo || !z.distritos || !z.distritos.length) error(`zona ${i}: sin grupo o distritos`);
  if (z.tarifa != null && !(z.tarifa >= 0)) error(`zona ${z.grupo}: tarifa inválida`);
  if (z.gratisMasDe != null && !(z.gratisMasDe >= 0)) error(`zona ${z.grupo}: gratisMasDe inválido`);
});
const r = CONFIG.recojo;
if (!r.lugar || !r.direccion) error('recojo.lugar y recojo.direccion son obligatorios');
if (!/^https:\/\//.test(r.mapa || '')) error('recojo.mapa debe ser un enlace https');

// --- Cultivo ---
const cu = CONFIG.cultivo || {};
if (!cu.descripcion) error('cultivo.descripcion es obligatorio');
if (cu.termino)
  avisos.push(
    `cultivo.termino = "${cu.termino}": verifica que puedas usar ese término (certificación).`,
  );

// --- Testimonios ---
const te = CONFIG.testimonios || { activo: false, lista: [] };
const reales = (te.lista || []).filter((t) => !t.ejemplo);
for (const t of te.lista || []) {
  if (!t.texto || !t.nombre) error(`testimonio sin texto o nombre: ${JSON.stringify(t)}`);
  if (t.foto && !fs.existsSync(path.join(RAIZ, t.foto)))
    error(`testimonio de ${t.nombre}: no existe la foto ${t.foto}`);
}
if (te.activo && !reales.length)
  error('testimonios.activo es true pero no hay testimonios reales (todos tienen ejemplo: true)');
if (te.activo && reales.length < te.lista.length)
  avisos.push(`${te.lista.length - reales.length} testimonio(s) de ejemplo no se mostrarán`);

// --- Archivos que carga index.html ---
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
for (const [, ref] of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) {
  if (ref.startsWith('//')) continue;
  if (!fs.existsSync(path.join(RAIZ, ref))) error(`index.html referencia un archivo inexistente: ${ref}`);
}

avisos.forEach((a) => console.warn('⚠ ' + a));
if (errores.length) {
  errores.forEach((e) => console.error('✗ ' + e));
  console.error(`\n${errores.length} error(es) en la configuración.`);
  process.exit(1);
}
const lista = CONFIG.productos
  .map((p) => `${p.nombre} ${P.formatoSoles(P.aCentimos(p.precioLanzamiento))} (ref. ${P.formatoSoles(P.aCentimos(p.precioRegular))}, −${P.porcentajeDescuento(p)}%)`)
  .join(' · ');
console.log(`✓ Configuración válida — WhatsApp ${CONFIG.tienda.whatsapp} — ${lista}`);
