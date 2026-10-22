# Propuestas de plataforma

Tres prototipos estáticos del producto, publicados junto a la landing sin modificarla:

- `/propuestas`: galería con capturas reales de las propuestas.
- `/propuestas/pulso`: navegación lateral clara y resumen equilibrado.
- `/propuestas/ritmo`: navegación ciruela y bienvenida más expresiva.
- `/propuestas/mesa`: navegación superior y prioridad a la actividad.

Comparten las vistas de inicio, clientes, tarjeta, sellos, equipo, configuración,
mostrador y acceso. Conservan la paleta y las fuentes de la landing.

Las interacciones usan exclusivamente datos ficticios y estado de la pestaña en
`sessionStorage`; no llaman a las APIs de leads, soporte, autenticación o Wallet.
La barra superior identifica el prototipo y permite restablecer los datos.
El acceso es una vista de diseño y no autentica usuarios. La invitación al equipo
no envía correos. La prueba del sello simula una visita y no se conecta al hardware.

`propuestas.js` controla navegación por hash, filtros, modales, edición de tarjeta,
visitas y canjes. Todo contenido editable se escapa al renderizar. Las animaciones
respetan `prefers-reduced-motion`.

Revisión de navegador: recorrer las ocho vistas en las tres propuestas y en móvil;
buscar clientes; registrar la décima visita y canjear; editar color/recompensa;
añadir cliente y comprobar duplicados; probar la lectura simulada y pausar el sello;
crear invitación de ejemplo; navegar con teclado y cerrar los modales con Escape.

Las imágenes en `previews/` son capturas del prototipo a 1440 × 1000.
