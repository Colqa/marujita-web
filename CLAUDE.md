# CLAUDE.md — Paltas Marujita (marujita-web)

Landing estática de venta de paltas (HTML, CSS y JS vanilla, sin build ni backend).
GitHub Pages publica desde `main`. La estructura y los comandos están en `README.md`.

## Reglas de negocio

Reflejarlas en todo texto de la página, en el mensaje de WhatsApp y en los cambios futuros.

- **Público:** venta solo al por menor, a hogares. No hay venta por mayor ni a restaurantes.
- **Origen:** chacra familiar de Andahuaylas, Apurímac. **No somos una exportadora.** El negocio busca ser el canal entre chacras y hogares, con trato justo para quien cultiva.
- **Cultivo:**
  - Texto principal: "cultivadas de forma natural, sin aditivos químicos".
  - El término "orgánicas" va **solo** en `CONFIG.cultivo.termino`, que aparece en un único lugar de la página.
  - Aún no hay certificación orgánica: no repetir el término en otros textos ni en las meta etiquetas.
  - Si se ven más pequeñas es porque crecen de forma natural. Se presenta como un valor, nunca como disculpa.
- **Calidad:**
  - Se garantizan la **textura y el sabor**: cremosas, tipo mantequilla, sin hebras.
  - **Nunca prometer la fecha de maduración**: es un proceso natural y no se puede predecir.
  - Consejos permitidos: en refrigeración duran más; en su bolsita de papel, en un lugar oscuro y fresco, maduran más rápido.
- **Empaque:** bolsa de papel, sin plástico, para que la palta respire.
- **Venta:**
  - Por kilo entero (1, 2, 3… kg), sin decimales.
  - Precios, cupones y vigencias se cambian solo en `assets/js/config.js`, nunca escritos a mano en el HTML.
- **Precios ante el cliente:**
  - Catálogo y selector: precio de venta grande y precio de referencia pequeño, tachado, rojo y en cursiva, con el % de descuento.
  - Resumen y mensaje de WhatsApp: solo `kg × precio = importe`, la entrega y el TOTAL, sin líneas de descuento ni precios de referencia.
  - El ahorro aparece solo en la nota final del mensaje.
- **Delivery:**
  - Tarifas por zona en `CONFIG.delivery`.
  - Gratis en San Borja y San Luis cuando el total **supera** 3 kg. Se explica **por cercanía** al punto de reparto, no por favoritismo.
  - Los distritos vecinos tienen tarifa fija y los demás se coordinan.
- **Recojo:** gratis en Supermercado Royal (Calle San Miguel). El día y la hora se coordinan por WhatsApp.
- **Pago:** anticipado por Yape o Plin, después de que el negocio confirma el pedido.
- **Lotes:** el próximo lote se anuncia conforme llegan pedidos y consultas.
- **Testimonios:**
  - Publicar solo comentarios reales de clientes, con su permiso. Nunca inventarlos.
  - La sección queda oculta (`CONFIG.testimonios.activo: false`) hasta tenerlos.
- **Diseño:**
  - Paleta de marca en variables de `:root` (`assets/css/styles.css`), sin colores fuera de ahí.
  - Contraste WCAG AA.
  - Prioridad móvil, porque casi todo el tráfico llega desde WhatsApp.

## Forma de trabajar en este repo

- Las issues se nombran con el código `PAMA-US26NN` y se mencionan por ese código, no por el número de GitHub.
- **Flujo:** issue → rama `feature/`, `fix/` o `chore/` desde `develop` → commits claros → PR a `develop` → merge y borrar la rama → PR `develop` → `main` con merge commit y `Closes #N` → fast-forward de `develop` → issue cerrada.
- En este repo se ejecuta sin pedir confirmación en cada paso. Si el pedido dice "solo PR" o "no publiques", se deja el PR abierto.
- Antes de integrar a `main`, revisar `gh pr list`: a veces el merge se hace a mano.
- Antes de cada PR: `npm run verificar`, que valida la configuración y corre las pruebas.
- Revisar en móvil (375px) y en escritorio, y confirmar que el mensaje de WhatsApp sigue saliendo igual.
- No se usa Docker ni CI: el merge a `main` es la publicación.
