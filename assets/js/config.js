/* ================================================================
   CONFIGURACIÓN DE LA TIENDA — Paltas Marujita
   Único lugar para los datos comerciales: precios, teléfono, cupones,
   delivery y recojo. La web y el mensaje de WhatsApp se generan de aquí.
   Montos en soles (S/). Fechas AAAA-MM-DD en hora de Lima.
   Después de editar: npm run verificar
   ================================================================ */
(function (raiz, CONFIG) {
  if (typeof module === 'object' && module.exports) module.exports = CONFIG;
  else raiz.CONFIG = CONFIG;
})(typeof self !== 'undefined' ? self : this, {
  tienda: {
    nombre: 'Paltas Marujita',
    // WhatsApp en formato internacional: 51 (Perú) + 9 dígitos, sin "+" ni espacios.
    whatsapp: '51993273537',
  },

  // Perú no usa horario de verano: Lima es siempre UTC−05:00.
  zonaHoraria: { nombre: 'America/Lima', offset: '-05:00' },

  /* ---------------- PRODUCTOS ----------------
     precioRegular:      precio de referencia (se muestra tachado durante la campaña).
     precioLanzamiento:  precio de venta con el cupón de lanzamiento.
     El % de descuento se calcula solo (hoy 25 % en ambas).
     imagen: ruta a una foto (ej. 'assets/images/palta-fuerte.jpg'); null = ilustración. */
  productos: [
    {
      id: 'fuerte',
      nombre: 'Palta Fuerte',
      unidad: 'kg',
      precioRegular: 16.0,
      precioLanzamiento: 12.0,
      disponible: true,
      imagen: null,
    },
    {
      id: 'hass',
      nombre: 'Palta Hass',
      unidad: 'kg',
      precioRegular: 14.0,
      precioLanzamiento: 10.5,
      disponible: true,
      imagen: null,
    },
  ],
  maxKgPorProducto: 20,

  /* ---------------- CUPONES ----------------
     tipo: 'precio_lanzamiento' | 'porcentaje' (valor = %) | 'monto_fijo' (valor = S/)
     inicio / fin: fechas incluidas; vence a las 00:00 del día siguiente a `fin` (Lima).
     publico: true → se precarga en la web.  productos: null = todos.
     Ojo: todo lo que esté aquí es visible para cualquiera (ver README). */
  cupones: [
    {
      codigo: 'INTRO',
      descripcion: 'Campaña de lanzamiento',
      activo: true,
      publico: true,
      inicio: '2026-11-01',
      fin: '2026-12-15',
      tipo: 'precio_lanzamiento',
      valor: null,
      productos: ['fuerte', 'hass'],
    },
  ],

  /* ---------------- DELIVERY ----------------
     minimoKg:     kg mínimos para pedir delivery.
     tarifa:       S/ por envío (null = a coordinar por WhatsApp).
     gratisMasDe:  delivery gratis cuando el total de kg SUPERA este número
                   (3 → gratis desde 4 kg). null = nunca gratis. */
  delivery: {
    minimoKg: 2,
    zonas: [
      {
        grupo: 'San Borja y San Luis',
        distritos: ['San Borja', 'San Luis'],
        tarifa: 5,
        gratisMasDe: 3,
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
        gratisMasDe: null,
      },
      {
        grupo: 'Otros distritos',
        distritos: ['Otro distrito'],
        tarifa: null,
        gratisMasDe: null,
      },
    ],
  },

  /* ---------------- RECOJO ---------------- */
  recojo: {
    lugar: 'Supermercado Royal',
    direccion: 'Calle San Miguel',
    mapa: 'https://maps.app.goo.gl/fJwekLdzCbAUWTW96',
    minimoKg: 1,
  },
});
