# Publicación del juego

Leer `docs/publicacion-hostinger.md` antes de preparar una publicación o afirmar que un cambio está online.

El sitio principal es https://3dbat.com.ar/batbox/juego/ en Hostinger. Un push a GitHub no lo actualiza. La copia local usada por `../web-3dbat/scripts/build-full.mjs` también debe estar sincronizada, sin perder trabajo sin publicar.

No usar `Compress-Archive` para paquetes Hostinger: sus separadores Windows rompieron una publicación. Validar rutas ZIP POSIX y verificar todos los recursos del HTML y los módulos dinámicos en el dominio real.
