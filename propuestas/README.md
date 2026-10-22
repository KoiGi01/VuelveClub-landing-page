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

## Iteración de Ritmo: registro con QR

El botón **Registrar cliente** en Clientes y **Nuevo cliente** en Mostrador abre
el QR escaneable del negocio. Permite copiar el enlace, abrir el registro y
descargar el QR en SVG para imprimirlo. El QR se genera localmente con la copia
licenciada de `qrcode-generator` en `vendor/`; no utiliza un servicio de imágenes.

`/tarjeta/cafe-buen-dia` muestra el registro público del negocio de ejemplo.
Solicita nombre, correo, celular y aceptación expresa de términos y aviso de
privacidad. No solicita cuenta ni contraseña. Después permite revisar la tarjeta
en las propuestas de Apple Wallet y Google Wallet. Los documentos legales son
borradores identificados como tales; la emisión y descarga de pases no están
conectadas.

`registro-compartido.js` conserva el identificador del negocio y añade al enlace
únicamente los cambios visuales del programa. No incluye datos del consumidor.
Solo existe un negocio de ejemplo: esta ruta no implementa un sistema multiempresa.
Los enlaces con otros identificadores muestran una pantalla de enlace no disponible.

Para demostrar el recorrido, `BroadcastChannel` comunica el registro a un panel
abierto en otra pestaña **del mismo navegador**. El panel añade el cliente a su
`sessionStorage` y evita duplicados por correo o identificador del registro.
El formulario público mantiene sus datos solo en memoria. Un registro desde otro
dispositivo no se sincroniza: faltan autenticación del negocio, base de datos,
registro y consentimiento en servidor, y emisión real de pases de Wallet.

Mostrador y Clientes buscan por nombre, correo o celular, ignorando acentos y
separadores de teléfono. `/` enfoca la búsqueda de Mostrador cuando se está en
esa vista. La barra lateral se colapsa en escritorio y conserva la preferencia
durante la sesión; en móvil conserva el menú completo. Su desplazamiento sigue
funcionando con la barra de scroll oculta. Ritmo usa el logo de corazón blanco.

Validación de esta iteración: decodificación del QR renderizado, copia y descarga,
validación del formulario y consentimiento, registro entre pestañas y duplicados,
búsqueda, visita y canje, persistencia del menú, 120 combinaciones de vista/ancho
y análisis WCAG A/AA de las vistas móviles y del registro. No hubo llamadas a APIs
de leads/soporte, autenticación o Wallet durante estas pruebas.

## Bienvenida de Ritmo: hora y clima

El componente `vc-welcome` en `clima.js` muestra la fecha y hora reales del
dispositivo. Conserva el ciruela, lima y tipografía de Ritmo; su escena SVG cambia
entre sol, luna, nubes, lluvia, tormenta, nieve y neblina. El saludo acompaña el
día o la noche. La transición de amanecer/atardecer se actualiza con el reloj,
sin esperar otra consulta de clima.

`/api/weather` usa la ubicación aproximada que aporta Vercel. **Usar mi ubicación**
consulta la ubicación del navegador solo después de pulsar el botón, o cuando el
permiso ya está concedido. Las coordenadas se redondean a dos decimales. El reloj
no depende del permiso de ubicación. Si faltan coordenadas o falla el servicio,
se conserva la hora sin presentar temperaturas ni condiciones ficticias.

Este endpoint sí consulta un servicio real: el pronóstico del periodo más cercano
de [MET Norway](https://api.met.no/weatherapi/locationforecast/2.0/documentation),
con identificación de VuelveClub, caché por coordenadas redondeadas, respeto de
`Expires` y revalidación con `If-Modified-Since`. No reenvía la IP del visitante
al proveedor. La respuesta al navegador es privada y no se almacena en la CDN.
El panel de información del clima incluye la atribución y licencia CC BY 4.0.
`suncalc` 2.1.1 calcula la posición solar y los horarios de salida y puesta del sol.
No se necesita una clave de API adicional.

El componente actualiza el pronóstico cada 15 minutos, reutiliza los datos al
navegar y libera sus temporizadores al salir de Inicio. Incluye pausa de animación
que se conserva durante la navegación; también respeta `prefers-reduced-motion`
y pausa el movimiento cuando la pestaña está oculta.

Validación: ocho pruebas del endpoint (coordenadas, día/noche, símbolos, caché y
fallos), 50 combinaciones de clima/ancho en navegador, reloj y atardecer sin
recarga, permiso de ubicación y rechazo, actualización automática, limpieza de
temporizadores, pausa persistente y análisis WCAG A/AA. El pronóstico real también
se verificó contra el proveedor. El resto del negocio y de Wallet sigue siendo
un prototipo con datos de ejemplo.
