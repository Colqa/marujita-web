# Paltas Marujita — web

Web de venta al por menor de paltas de Andahuaylas. Sitio **estático** (HTML, CSS y JavaScript, sin backend ni build) publicado en GitHub Pages desde `main`:
https://colqa.github.io/marujita-web/

El pedido se arma en la web y se envía por **WhatsApp**; el pago es anticipado (Yape o Plin) **después** de que el negocio confirma el pedido.

## Estructura

```text
marujita-web/
├── index.html               Estructura de la página (sin precios ni datos comerciales)
├── assets/
│   ├── css/styles.css       Estilos (paleta y fuentes en :root)
│   └── js/
│       ├── config.js        ★ DATOS DEL NEGOCIO: tienda, WhatsApp, productos, precios,
│       │                      cupones, delivery y recojo. Lo único que se edita a diario.
│       ├── precios.js       Lógica pura: precios, cupones, delivery y totales (en céntimos)
│       ├── whatsapp.js      Lógica pura: enlaces y mensaje del pedido
│       ├── testimonios.js   Carrusel de testimonios (beta)
│       └── app.js           Interfaz: muestra los datos y responde a los clics
├── scripts/
│   ├── servidor.js          Servidor local de desarrollo (sin dependencias)
│   └── verificar.js         Revisa la configuración y los archivos antes de publicar
├── tests/                   Pruebas automatizadas (node --test)
├── favicon.svg / .png, apple-touch-icon.png, og-image.png
│                            En la raíz a propósito: ahí los buscan navegadores y WhatsApp
└── package.json             Comandos (sin dependencias que instalar)
```

Orden de carga en `index.html`: `config.js` → `precios.js` → `whatsapp.js` → `testimonios.js` → `app.js`.
`precios.js` y `whatsapp.js` no tocan la página, por eso se prueban en Node y son la **única fuente** de los importes que ven el catálogo, el selector, el resumen y el mensaje de WhatsApp.

## Cambiar datos del negocio (`assets/js/config.js`)

| Qué | Dónde |
|---|---|
| Nombre y número de WhatsApp | `tienda.nombre`, `tienda.whatsapp` (`51` + 9 dígitos) |
| Precios | `productos[].precioLanzamiento` (venta) y `precioRegular` (referencia tachada) |
| Agotar un producto | `productos[].disponible: false` |
| Foto de un producto | `productos[].imagen` (por ejemplo `assets/images/palta-fuerte.jpg`) |
| Cupones y vigencias | `cupones[]` |
| Mínimo, tarifas y delivery gratis | `delivery.minimoKg`, `delivery.zonas[]` (`tarifa`, `gratisMasDe`) |
| Término de cultivo | `cultivo.termino` (hoy "orgánicas"; `''` lo oculta) y `cultivo.descripcion` |
| Testimonios | `testimonios.activo`, `testimonios.lista[]` (ver abajo) |
| Punto de recojo | `recojo.lugar`, `recojo.direccion`, `recojo.mapa`, `recojo.minimoKg` |

Ejemplo: para pasar la Fuerte de S/ 12 a S/ 13 se cambia `precioLanzamiento: 13.0` y nada más. El porcentaje de descuento se recalcula solo.

**Delivery gratis:** `gratisMasDe: 3` significa gratis cuando el total del pedido **supera** 3 kg (desde 4 kg). Se evalúa sobre la suma de todas las variedades.

**Término "orgánicas":** aparece en un solo lugar de la página (bloque "Crecen a su ritmo"). El texto principal en todo el sitio, incluidas las meta etiquetas, es "cultivadas de forma natural, sin aditivos químicos". Mientras no haya certificación orgánica, conviene evaluar cambiar el término (por ejemplo, `'naturales'`) o dejarlo vacío.

### Testimonios (beta)

La sección está **oculta** mientras `testimonios.activo` sea `false`. Para activarla:

1. Reemplaza los ejemplos de `testimonios.lista` por comentarios **reales** de clientes, con su permiso.
2. Borra `ejemplo: true` de cada uno. Los que lo tengan nunca se muestran.
3. Opcional: agrega la foto en `assets/images/testimonios/` y pon su ruta en `foto`. Sin foto se muestran las iniciales.
4. Cambia `activo: true` y corre `npm run verificar`. Falla si está activo y no hay testimonios reales.

### Colores y tipografía

Todos los colores están en variables CSS en `:root` de `assets/css/styles.css`. La paleta de marca está en el bloque "Paleta de marca". Si cambia `--verde-palta`, actualiza también `<meta name="theme-color">` en `index.html`. Las fuentes son Baloo 2 (títulos, 700 y 800) y Nunito Sans (texto, 400, 600 y 700), cargadas desde Google Fonts con `display=swap`.

### Cómo se presentan los precios

- **Catálogo y selector:** precio de venta grande; precio de referencia pequeño, tachado, rojo y en cursiva; etiqueta con el % de descuento.
- **Resumen y mensaje de WhatsApp:** solo `kg × precio de venta = importe`, delivery y total. **Sin** líneas de descuento ni precios de referencia.
- El ahorro solo aparece en la nota final del mensaje de WhatsApp.

## Cupones

| `tipo` | Efecto |
|---|---|
| `precio_lanzamiento` | Cada producto aplicable pasa a su `precioLanzamiento`. |
| `porcentaje` | `valor` = % de descuento por kg sobre los productos aplicables. |
| `monto_fijo` | `valor` = soles de descuento sobre el pedido (es el único tipo que agrega una línea "Descuento" en el resumen). |

- `inicio` y `fin` son fechas incluidas en hora de Lima (UTC−05:00, sin horario de verano). El cupón vence a las **00:00 del día siguiente a `fin`**.
- `publico: true` lo precarga en la web. `productos: null` lo aplica a todo. Un solo cupón por pedido.

**INTRO:** `precio_lanzamiento`, del 1/11/2026 al 15/12/2026. Desde el 16/12/2026 00:00 (Lima) deja de ser válido y la web cobra el precio de referencia (`precioRegular`). Para extender la campaña, cambia `fin`.

## Desarrollo y publicación

Requiere Node.js 18 o superior. No hay dependencias que instalar ni paso de build: los archivos del repositorio son exactamente lo que se publica.

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor local en http://localhost:8080 (`PUERTO=3000 npm run dev` para otro puerto). |
| `npm test` | Pruebas automatizadas. |
| `npm run verificar` | Revisa la configuración (precios, WhatsApp, fechas, zonas, archivos referenciados) y corre las pruebas. **Ejecutarlo antes de cada PR.** |

**Publicar:** GitHub Pages publica automáticamente la rama `main`. El flujo es:

issue `PAMA-USYYNN` → rama desde `develop` → commits → `npm run verificar` → PR a `develop` → borrar la rama → PR de `develop` a `main` (**esto publica**) → cerrar el issue.

Al integrar `develop` en `main` usar **"Create a merge commit"** (no "Squash") para que ambas ramas no se separen.

## ⚠ Limitaciones de seguridad

Los precios y cupones se calculan **en el navegador del cliente**:

1. **No es seguro frente a manipulación.** Cualquiera puede editar el JavaScript, cambiar el reloj de su equipo o modificar el texto del mensaje de WhatsApp antes de enviarlo.
2. **Todos los códigos de cupón son visibles** en `assets/js/config.js`. Un cupón "exclusivo" no es secreto mientras viva aquí.
3. La vigencia depende del **reloj del dispositivo** del cliente.

**Control real:** antes de enviar los datos de pago, revisar el pedido recibido por WhatsApp y recalcularlo con los precios vigentes.

**Si más adelante se necesitan cupones personalizados de verdad** (de un solo uso, por cliente), hará falta validarlos en un servidor (por ejemplo una función serverless). `precios.js` no depende de la página, así que puede ejecutarse allí sin cambiar las reglas.
