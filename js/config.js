/* ================================================================
   CONFIGURACIÓN DE LA TIENDA — Paltas Marujita
   Edita solo este archivo para cambiar precios, cupones o zonas.
   Montos en soles (S/). Fechas en formato AAAA-MM-DD, hora de Lima.
   ================================================================ */
(function (raiz, CONFIG) {
  if (typeof module === 'object' && module.exports) module.exports = CONFIG;
  else raiz.CONFIG = CONFIG;
})(typeof self !== 'undefined' ? self : this, {
  whatsapp: '51987264842', // ← 51 + 9 dígitos, sin espacios ni "+"
  minimoDelivery: 2, // kg mínimos para delivery
  maxKgPorProducto: 20,

  // Perú no usa horario de verano: Lima es siempre UTC−05:00.
  zonaHoraria: { nombre: 'America/Lima', offset: '-05:00' },

  /* ---------------- PRODUCTOS ----------------
     precioRegular:      precio comercial de referencia (propuesto, editable).
     precioLanzamiento:  precio que aplica el cupón de lanzamiento.
     El % de descuento se calcula solo; no lo escribas en ningún lado.
     imagen: ruta a una foto (ej. 'img/palta-fuerte.jpg'); null = ilustración. */
  productos: [
    {
      id: 'fuerte',
      nombre: 'Palta Fuerte',
      unidad: 'kg',
      precioRegular: 15.5,
      precioLanzamiento: 12.0,
      disponible: true,
      imagen: null,
    },
    {
      id: 'hass',
      nombre: 'Palta Hass',
      unidad: 'kg',
      precioRegular: 14.3,
      precioLanzamiento: 11.0,
      disponible: true,
      imagen: null,
    },
  ],

  /* ---------------- CUPONES ----------------
     tipo:
       'precio_lanzamiento' → cada producto aplicable pasa a su precioLanzamiento.
       'porcentaje'         → valor = % de descuento sobre los productos aplicables.
       'monto_fijo'         → valor = S/ de descuento sobre el pedido (tope: subtotal).
     inicio / fin: fechas incluidas (fin vence a las 00:00 del día siguiente, Lima).
     publico: true → se precarga en la web y se muestra en el catálogo.
     Ojo: todo lo que esté aquí es visible para cualquiera (ver README). */
  cupones: [
    {
      codigo: 'INTRO',
      descripcion: 'Descuento de lanzamiento',
      activo: true,
      publico: true,
      inicio: '2026-11-01',
      fin: '2026-12-15',
      tipo: 'precio_lanzamiento',
      valor: null,
      productos: ['fuerte', 'hass'],
    },
  ],

  /* ---------------- ZONAS DE DELIVERY ----------------
     tarifa: S/ (null = a coordinar) | gratisDesde: kg (null = nunca gratis) */
  zonas: [
    {
      grupo: 'San Borja y San Luis',
      distritos: ['San Borja', 'San Luis'],
      tarifa: 5,
      gratisDesde: 3,
    },
    {
      grupo: 'Distritos vecinos',
      distritos: [
        'Surquillo',
        'San Isidro',
        'Santiago de Surco',
        'La Victoria',
        'Miraflores',
      ],
      tarifa: 8,
      gratisDesde: null,
    },
    {
      grupo: 'Otros distritos',
      distritos: ['Otro distrito'],
      tarifa: null,
      gratisDesde: null,
    },
  ],
});
