// Pruebas de textos, cultivo y testimonios. Ejecutar: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const CONFIG = require('../assets/js/config.js');
const T = require('../assets/js/testimonios.js');

const raiz = path.resolve(__dirname, '..');
const leer = (r) => fs.readFileSync(path.join(raiz, r), 'utf8');
const html = leer('index.html');

test('"orgánicas" solo vive en CONFIG.cultivo.termino', () => {
  assert.equal(CONFIG.cultivo.termino, 'orgánicas');
  assert.equal(
    CONFIG.cultivo.descripcion,
    'cultivadas de forma natural, sin aditivos químicos',
  );
  for (const f of ['index.html', 'assets/js/app.js', 'assets/js/whatsapp.js', 'assets/js/testimonios.js'])
    assert.doesNotMatch(leer(f), /org[aá]nic/i, f);
});

test('meta description y og:description usan el texto principal', () => {
  const metas = [...html.matchAll(/<meta\s+(?:name|property)="(?:description|og:description)"\s+content="([^"]+)"/g)];
  assert.equal(metas.length, 2);
  for (const [, c] of metas) assert.match(c, /cultivadas de forma natural, sin aditivos químicos/);
});

test('ningún texto promete la fecha de maduración', () => {
  const prohibidos = [
    /te (decimos|avisamos) cu[aá]ndo/i,
    /listas? para comer/i,
    /madurar[aá]n? (el|en) \d/i,
    /garantiza\w* (la )?maduraci[oó]n/i,
    /de buen tamaño/i,
  ];
  for (const re of prohibidos) assert.doesNotMatch(html, re);
  assert.match(html, /no se puede predecir con fecha exacta/);
  assert.match(html, /id="cuidado"/);
});

test('testimonios: apagados por defecto y solo con datos de ejemplo', () => {
  assert.equal(CONFIG.testimonios.activo, false);
  assert.ok(CONFIG.testimonios.lista.length > 0);
  assert.ok(CONFIG.testimonios.lista.every((t) => t.ejemplo === true));
  assert.deepEqual(T.visibles(CONFIG.testimonios), []);
  assert.match(html, /id="testimonios"[^>]*\shidden/);
});

test('testimonios: los de ejemplo nunca se muestran, aunque se active', () => {
  const lista = [
    { ejemplo: true, texto: 'X', nombre: 'Ejemplo' },
    { texto: 'Riquísimas', nombre: 'Rosa Pérez', distrito: 'San Luis' },
    { texto: '   ', nombre: 'Vacío' },
  ];
  assert.deepEqual(
    T.visibles({ activo: true, lista }).map((t) => t.nombre),
    ['Rosa Pérez'],
  );
  assert.deepEqual(T.visibles({ activo: false, lista }), []);
});

test('testimonios: iniciales y procedencia', () => {
  assert.equal(T.iniciales('Consuelo'), 'C');
  assert.equal(T.iniciales('consuelo ramírez díaz'), 'CR');
  assert.equal(T.iniciales('Consuelo (EJEMPLO)'), 'C');
  assert.equal(T.iniciales(''), '');
  assert.equal(T.procedencia({ prefijo: 'vecina de', distrito: 'San Borja' }), 'vecina de San Borja');
  assert.equal(T.procedencia({ distrito: 'Surquillo' }), 'de Surquillo');
  assert.equal(T.procedencia({}), '');
});

test('estilos: colores solo en :root', () => {
  const css = leer('assets/css/styles.css');
  const fueraDeRoot = css.replace(/:root\s*\{[^}]*\}/, '');
  assert.doesNotMatch(fueraDeRoot, /#[0-9a-f]{3,8}\b|rgba?\(/i);
  for (const c of ['#244b2d', '#83a94b', '#f6c445', '#fff3d6', '#c94332', '#805333'])
    assert.match(css, new RegExp(c, 'i'), c);
});
