/* Interfaz: toda cifra sale de CONFIG + Precios (sin precios escritos aquí). */
const $ = (id) => document.getElementById(id);
const P = Precios;
const fmt = P.formatoSoles;
const fmtKg = (n) => n + ' kg';
const cap = (id) => id[0].toUpperCase() + id.slice(1);
// Reloj del navegador del cliente (ver limitaciones en el README).
const ahora = () => Date.now();
const estado = {};
CONFIG.productos.forEach((p) => (estado[p.id] = 0));
let avisoMax = '';

// ---------- Catálogo y selector ----------
const campania = P.cuponPublicoVigente(CONFIG, ahora());
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
    $('precio' + C).innerHTML =
      '<div class="precio">Agotada por ahora</div>';
    $('lbl' + C).textContent = 'Agotada por ahora';
    document
      .querySelectorAll(`[data-prod="${p.id}"]`)
      .forEach((b) => (b.disabled = true));
    return;
  }
  const u = P.precioUnitario(p, campania);
  if (u.final < u.regular) {
    $('precio' + C).innerHTML =
      `<span class="etiqueta-lanz">Precio de lanzamiento</span>` +
      `<p class="precio-reg">Precio regular <s>${fmt(u.regular)}</s></p>` +
      `<div class="precio-fila"><div class="precio">${fmt(u.final)} <span>/ ${p.unidad}</span></div>` +
      `<span class="badge-desc">${P.formatoPorcentaje(u.porcentaje)} de descuento</span></div>` +
      `<p class="vigencia">Con el cupón ${campania.codigo}, hasta el ${P.formatoFecha(campania.fin)}.</p>`;
    $('lbl' + C).innerHTML =
      `${fmt(u.final)} por ${p.unidad} · <s>${fmt(u.regular)}</s>`;
  } else {
    $('precio' + C).innerHTML =
      `<div class="precio">${fmt(u.regular)} <span>/ ${p.unidad}</span></div>`;
    $('lbl' + C).textContent = `${fmt(u.regular)} por ${p.unidad}`;
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
      : `Con el cupón ${lanz.codigo}, del ${P.formatoFecha(lanz.inicio)} al ${P.formatoFecha(lanz.fin)} (hora de Lima). Precios de lanzamiento por kg: ${listaPrecios('precioLanzamiento')}. Desde el día siguiente rige el precio regular: ${listaPrecios('precioRegular')}.`;
} else {
  $('faqLanzamiento').closest('details').hidden = true;
}

$('faqMinimo').textContent =
  `Para delivery, el mínimo es ${CONFIG.minimoDelivery} kg. Para recojo en el Supermercado Royal puedes pedir desde 1 kg.`;
$('anio').textContent = new Date().getFullYear();

// ---------- Select de distritos + tarjetas de zonas ----------
const sel = $('distrito');
CONFIG.zonas.forEach((z, i) => {
  const og = document.createElement('optgroup');
  og.label = z.grupo;
  z.distritos.forEach((d) => {
    const o = document.createElement('option');
    o.value = i + '|' + d;
    o.textContent = d;
    og.appendChild(o);
  });
  sel.appendChild(og);

  const tarifaTxt = z.tarifa == null ? 'A coordinar' : 'S/ ' + z.tarifa;
  const minimo = `Mínimo ${CONFIG.minimoDelivery} kg`;
  const extra = z.gratisDesde
    ? `${minimo} · <b>Gratis desde ${z.gratisDesde} kg</b>`
    : z.tarifa == null
      ? `${minimo} · Escríbenos y vemos la mejor opción`
      : minimo;
  $('zonas').insertAdjacentHTML(
    'beforeend',
    `<div class="card zona"><h3>${z.grupo}</h3><div class="p">${tarifaTxt}</div><p>${extra}</p><p style="margin-top:6px;font-size:.85rem">${z.distritos.join(', ')}</p></div>`,
  );
});

// ---------- Cálculo del pedido ----------
function calcular() {
  const pedido = P.calcularPedido(CONFIG, estado, $('cupon').value, ahora());
  const kg = pedido.kg;
  const entrega = document.querySelector(
    'input[name="entrega"]:checked',
  ).value;
  let delivery = 0,
    deliveryTxt = 'Gratis (recojo)',
    ok = kg > 0,
    msg = '',
    err = false,
    coordinar = false;

  $('campoDistrito').style.display = entrega === 'delivery' ? '' : 'none';
  $('notaRecojo').hidden = entrega !== 'recojo';

  if (entrega === 'delivery') {
    const [zi] = sel.value.split('|');
    const z = CONFIG.zonas[+zi];
    if (z.tarifa == null) {
      coordinar = true;
      deliveryTxt = 'A coordinar';
      $('notaDistrito').textContent =
        'Te confirmamos el costo por WhatsApp.';
    } else if (z.gratisDesde && kg >= z.gratisDesde) {
      deliveryTxt = '¡Gratis!';
      $('notaDistrito').textContent =
        `Delivery gratis desde ${z.gratisDesde} kg.`;
    } else {
      delivery = P.aCentimos(z.tarifa);
      deliveryTxt = fmt(delivery);
      $('notaDistrito').textContent = z.gratisDesde
        ? `Delivery S/ ${z.tarifa}. Gratis desde ${z.gratisDesde} kg.`
        : `Delivery S/ ${z.tarifa}.`;
      if (z.gratisDesde && kg > 0 && kg < z.gratisDesde)
        msg = `Agrega ${fmtKg(z.gratisDesde - kg)} más y el delivery es gratis 🎉`;
    }
    if (kg > 0 && kg < CONFIG.minimoDelivery) {
      ok = false;
      err = true;
      msg = `El mínimo para delivery es ${CONFIG.minimoDelivery} kg (te faltan ${fmtKg(CONFIG.minimoDelivery - kg)}).`;
    }
  }
  if (kg === 0) msg = 'Agrega kilos para empezar.';
  if (avisoMax && !err) msg = avisoMax;
  if (ok && !$('nombre').value.trim()) {
    ok = false;
    msg = 'Escribe tu nombre para enviar el pedido.';
  }

  // Líneas del resumen
  pedido.lineas.forEach((l) => {
    const C = cap(l.id);
    $('kg' + C).textContent = fmtKg(l.kg);
    $('r' + C + 'Lbl').textContent =
      l.kg ? `${l.nombre} (${fmtKg(l.kg)})` : l.nombre;
    $('r' + C).textContent = fmt(l.importeRegular);
  });
  $('lineaDesc').hidden = pedido.descuento === 0;
  if (pedido.descuento) {
    $('rDescLbl').textContent = pedido.cupon.cupon.descripcion;
    $('rDesc').textContent = fmt(-pedido.descuento);
  }
  $('rDelivery').textContent = deliveryTxt;
  $('rTotal').textContent =
    fmt(pedido.total + delivery) + (coordinar ? ' + envío' : '');

  // Mensaje del cupón
  const c = pedido.cupon;
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

  return { pedido, delivery, deliveryTxt, entrega, coordinar };
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

function waLink(texto) {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
}

$('btnEnviar').addEventListener('click', () => {
  const c = calcular();
  if ($('btnEnviar').disabled) return;
  const { pedido } = c;
  const nombre = $('nombre').value.trim();
  const nota = $('nota').value.trim();
  const distrito = sel.value.split('|')[1];
  const l = [];
  l.push(`¡Hola Paltas Marujita! 🥑 Soy ${nombre} y quiero hacer un pedido:`);
  l.push('');
  pedido.lineas
    .filter((x) => x.kg)
    .forEach((x) =>
      l.push(`• ${x.nombre}: ${fmtKg(x.kg)} — ${fmt(x.importeRegular)}`),
    );
  if (pedido.descuento)
    l.push(
      `• ${pedido.cupon.cupon.descripcion} (cupón ${pedido.cupon.codigo}): ${fmt(-pedido.descuento)}`,
    );
  l.push(
    c.entrega === 'delivery'
      ? `• Entrega: Delivery a ${distrito} (${c.deliveryTxt})`
      : '• Entrega: Recojo gratis en Supermercado Royal (Calle San Miguel). Coordinemos fecha y hora.',
  );
  l.push('');
  l.push(
    `*Total: ${fmt(pedido.total + c.delivery)}${c.coordinar ? ' + envío a coordinar' : ''}*`,
  );
  l.push(
    'Pago anticipado por Yape o Plin: por favor confírmenme el pedido y los datos para pagar.',
  );
  if (nota) {
    l.push('');
    l.push(`Comentario: ${nota}`);
  }
  window.open(waLink(l.join('\n')), '_blank', 'noopener');
});

const linkInfo = waLink(
  '¡Hola Paltas Marujita! 🥑 Quisiera información sobre las paltas.',
);
$('waFloat').href = linkInfo;
$('waFooter').href = linkInfo;
// 51987264842 → +51 987 264 842
$('waFooter').textContent = CONFIG.whatsapp.replace(
  /^(\d{2})(\d{3})(\d{3})(\d{3})$/,
  '+$1 $2 $3 $4',
);

// Oculta el botón flotante mientras se ve el formulario de pedido,
// para que no tape el botón "Enviar pedido".
if ('IntersectionObserver' in window) {
  new IntersectionObserver(
    ([e]) => $('waFloat').classList.toggle('oculto', e.isIntersecting),
    { threshold: 0.15 },
  ).observe($('pedido'));
}
calcular();
