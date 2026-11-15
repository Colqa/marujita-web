# Paltas Marujita — web

Landing de venta al por menor de paltas de Andahuaylas. Sitio **estático** (HTML, CSS y JavaScript, sin backend) publicado en GitHub Pages desde `main`:
https://colqa.github.io/marujita-web/

El pedido se arma en la web y se envía por **WhatsApp**; el pago es anticipado (Yape o Plin) **después** de que el negocio confirma el pedido.

## Estructura

| Archivo | Qué contiene |
|---|---|
| `index.html` | Página, estilos e interfaz (no contiene precios). |
| `js/config.js` | **Lo único que hay que editar**: WhatsApp, productos y precios, cupones, zonas de delivery. |
| `js/precios.js` | Lógica de precios y cupones (cálculo en céntimos). Única fuente para catálogo, selector, resumen y mensaje de WhatsApp. |
| `tests/precios.test.js` | Pruebas automatizadas de la lógica. |

## Cambiar precios

En `js/config.js`, dentro de `productos`:

- `precioRegular`: precio comercial de referencia (propuesto por el negocio, editable). Se muestra tachado como **"Precio regular"** mientras haya un cupón de lanzamiento vigente.
- `precioLanzamiento`: precio que aplica el cupón de tipo `precio_lanzamiento`.
- `disponible: false` marca el producto como agotado.
- `imagen`: ruta a una foto (por ejemplo `img/palta-fuerte.jpg`); con `null` se muestra la ilustración.

Los porcentajes de descuento se calculan solos (Fuerte 22.58 %, Hass 23.08 %).

> El precio regular es un valor comercial propuesto, no un precio de mercado verificado. Al terminar la campaña es el precio que se cobra, por eso se rotula "Precio regular" y no "antes".

## Cupones

Cada cupón en `js/config.js` → `cupones` tiene: `codigo`, `descripcion`, `activo`, `publico`, `inicio`, `fin`, `tipo`, `valor` y `productos`.

| `tipo` | Efecto |
|---|---|
| `precio_lanzamiento` | Cada producto aplicable pasa a su `precioLanzamiento`. |
| `porcentaje` | `valor` = % de descuento sobre los productos aplicables. |
| `monto_fijo` | `valor` = soles de descuento sobre el pedido (nunca deja el total negativo). |

- **Vigencia**: `inicio` y `fin` son fechas incluidas en hora de Lima (UTC−05:00, sin horario de verano). El cupón vence a las **00:00 del día siguiente a `fin`**.
- `publico: true`: se precarga en el campo "Cupón de descuento" y el catálogo muestra el precio con descuento.
- `productos: null` aplica a todos los productos.
- Un solo cupón por pedido.

**INTRO** (configurado): `precio_lanzamiento`, del 1/11/2026 al 15/12/2026. Desde el 16/12/2026 00:00 (Lima) deja de ser válido, el catálogo muestra solo el precio regular y la web cobra ese precio.

## ⚠ Limitaciones de seguridad

La validación de cupones y el cálculo de precios se ejecutan **en el navegador del cliente**. Por lo tanto:

1. **No es segura frente a manipulación.** Cualquiera puede editar el JavaScript, cambiar el reloj de su equipo o modificar el texto del mensaje de WhatsApp antes de enviarlo.
2. **Todos los códigos de cupón son visibles** en `js/config.js` para quien mire el código fuente. Un cupón "exclusivo" para clientes frecuentes no es secreto mientras viva aquí.
3. La vigencia depende del **reloj del dispositivo** del cliente.

**Control real:** el pedido no se cobra en la web. Antes de enviar los datos de pago por WhatsApp, el negocio debe **revisar el mensaje** (productos, kilos, cupón y total) y recalcularlo con los precios vigentes. El mensaje incluye el desglose (importe regular, cupón aplicado y descuento) para facilitar esa revisión.

**Si más adelante se necesitan cupones personalizados de verdad** (de un solo uso, por cliente), hará falta validarlos en un servidor (por ejemplo, una función serverless o un pequeño backend) que reciba el pedido y devuelva el total. La estructura de `cupones` y la API de `js/precios.js` (`calcularPedido`) están pensadas para moverse a ese servidor sin cambiar las reglas.

## Pruebas

Requiere Node.js 18 o superior (no hay dependencias).

```bash
npm test
```

## Flujo de trabajo

issue `PAMA-USYYNN` → rama desde `develop` → commits → PR a `develop` → borrar la rama → PR de `develop` a `main` (despliegue) → cerrar el issue.
