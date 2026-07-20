# Glow Studio — página "en construcción" + subida de videos

Este documento resume todo lo decidido. Se puede pegar directo en Claude Code como punto de partida.

## El proyecto
- Negocio: Glow Studio — uñas, pestañas y cejas en Atlanta, GA (perfil `glowstudiov`)
- Objetivo inmediato: página "en construcción", simple e informativa, con un botón para que la clienta suba videos de su trabajo
- Prioridad de diseño: verse bien en teléfono y tablet (los dispositivos que usa el personal de la clienta)
- Estilo visual: negro + dorado, tipografía serif elegante, minimalista, sin exceso — línea consistente con el perfil de `glowstudiov` (ver mockup de referencia)

## Arquitectura decidida
| Pieza | Decisión |
|---|---|
| Dominio | glowstudios.vip — ya comprado en Cloudflare |
| Hosting | Cloudflare Pages — gratis, dominio personalizado con SSL automático, sin límite de ancho de banda, mismo panel que el dominio |
| Recepción de videos | Google Drive, carpeta dedicada al proyecto |
| Plan de almacenamiento | Google One 100GB (~$1.99/mes) — cubre los ~50GB necesarios con margen |
| Sincronización local | Google Drive para escritorio, instalado en la computadora principal (Linux Mint), sincronizando solo esa carpeta — la misma máquina que ya corre la VPN del equipo |

No se necesita la laptop vieja ni la de Windows para nada de este proyecto — todo el hosting y almacenamiento corre en la nube.

## Cuentas que conviene tener a la mano antes de empezar
- Cloudflare (ya la tienes, ahí vive glowstudios.vip)
- Una cuenta de Google/Gmail para el Drive del proyecto — es distinta del correo de ProtonMail, Drive no funciona directo con Proton
- Opcional, no bloquea el lanzamiento: si más adelante se quiere un correo con el propio dominio (ej. hola@glowstudios.vip), Proton Mail lo permite agregando unos registros DNS en Cloudflare

## Contenido de la página "en construcción"
- Wordmark "GLOW STUDIO" en serif dorado sobre fondo oscuro
- Tagline: Uñas · Pestañas · Cejas
- Ubicación: Atlanta, GA
- Mensaje: sitio en construcción
- Botón principal: subir contenido (dispara la carga a la carpeta de Drive)
- Contacto visible: redes sociales (Instagram/TikTok) + teléfono de reservas — en vez de un formulario de correo, porque la marca ya tiene seguidores y reservas activas
- Diseño responsive, pensado primero para móvil/tablet

## Tareas para Claude Code
1. Crear el proyecto del sitio (una sola página; HTML/CSS simple o un framework ligero si conviene dejarlo listo para crecer después)
2. Construir la página "en construcción" con el contenido y estilo de arriba
3. Implementar la subida de archivos: el archivo debe llegar directo a la carpeta de Google Drive del proyecto, sin pasar por un servidor propio del usuario (evaluar Google Drive API con cuenta de servicio, o Google Apps Script como backend ligero)
4. Conectar el proyecto a Cloudflare Pages
5. Apuntar glowstudios.vip (ya en Cloudflare) al proyecto de Pages
6. Guiar la configuración de Google Drive para escritorio en la computadora principal, sincronizando solo la carpeta del proyecto
7. Probar de extremo a extremo: subir un archivo de prueba desde un teléfono y confirmar que aparece en la carpeta local

## Pendiente de definir (puede resolverse con Claude Code sobre la marcha)
- Copy final de los textos (el de arriba es un punto de partida)
- Si se quiere mostrar una fecha estimada de lanzamiento
- Logo en alta resolución, si se quiere usar el archivo original en vez de recrearlo
