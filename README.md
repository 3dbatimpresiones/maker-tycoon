# 3DBAT: Maker Tycoon

Juego idle/tycoon de **3DBAT IMPRESIONES**. Arrancás con una Creality Ender-3 en el escritorio y la hacés
crecer hasta una planta de producción con impresoras 3D, resina, láser y CNC. BATI, la mascota de 3DBAT, guía al jugador.

- **Jugar:** https://3dbat.com.ar/batbox/juego/ (dentro de BATBOX) · también https://3dbatimpresiones.github.io/maker-tycoon/
- Sin login: la partida se guarda en el navegador (`localStorage`, clave `mt3dbat.save.v1`, con respaldo en `mt3dbat.save.bak`).
- Con la cuenta de Google de BATBOX (cualquier cuenta, no hace falta el Makers Club): partida en la nube, ranking, granjas y retos.
  Al abrir una partida de una versión anterior se guarda una copia intacta en `mt3dbat.save.v1.v<versión>` antes de convertirla.
- Se puede pasar la partida a otro dispositivo con un código (Ajustes → Tu partida).
- Las marcas y modelos mencionados pertenecen a sus dueños; el juego no está afiliado ni patrocinado (solo nombres, sin logos).

## Novedades v0.4 (juego online)

- **Cuenta de Google** (la misma de BATBOX y el Cotizador) y **partida en la nube**: se sube sola cada minuto y al cerrar.
  Nunca se pisa una partida: si la del navegador y la de la nube tienen progreso distinto, el jugador elige y la otra
  queda como copia (`mt3dbat.save.v1.antes-nube` en el navegador o `prev_data` en la nube). Lógica en `src/online/api.js` (`decideSync`).
- **Perfil** (apodo, privacidad pública / solo granja / oculto, título y marco), **Puntos Maker** calculados por el servidor con topes
  diarios y de ritmo (ver `batbox/supabase/026_batbox_maker_tycoon.sql`), **rankings** de temporada, semanal, granjas y comunidad, y Hall de la Fama.
- **Granjas Maker** (hasta 6, roles fundador/encargado/miembro, código de invitación, nave de producción que sube de nivel y contratos cooperativos).
- **Retos** diarios, semanales, técnicos, de comunidad y de granja con **premios estéticos** (títulos, marcos, decoración del taller 3D,
  bases para las máquinas, efectos, banners y el plano «Llavero BATI», que paga igual que el común). Nada es pago para ganar.
- **Presencia en vivo** («N fabricando ahora»), sin datos personales.
- **Filacolor, proveedor oficial**: pestaña propia (comparador de materiales, servicio técnico, destacados que carga el equipo desde BATBOX),
  «En Filacolor» en las máquinas que venden, el proveedor automático del juego y avisos de falla con enlace al servicio técnico. Sin precios ni stock.
- Una sola pestaña juega a la vez (la otra se pausa y guarda) para que no se pisen.
- Requiere la migración `026` en Supabase; sin ella, el juego funciona igual que antes y lo online muestra «muy pronto».

## Novedades v0.3

- **Economía argentina realista en AR$** (nunca `$` solo), con precios relevados del mercado argentino: ver `docs/precios-referencia.md`.
- **Selector 🇦🇷 ARS | 🌎 USD** siempre visible: misma partida, solo cambia cómo se ven los importes (cotización fija por temporada en `src/game/format.js`).
- **Máquinas reconocibles** modeladas con proporciones reales: Ender-3 V3 SE, A1 mini, A1, K1C, P1S Combo con AMS, H2S, K2 Pro Combo con CFS, Snapmaker U1, y el resto del catálogo mejorado.
- **Gráficos PBR**: bordes redondeados, aluminio cepillado, vidrio, cama PEI texturada, piezas con líneas de capa y la capa caliente;
  oclusión ambiental, luz de ventana y antialias en modo Calidad (PC); modos Equilibrado y Rendimiento para celulares.
- **Efectos con lógica**: humo del láser, viruta de la CNC, curado UV de la resina, cajas de pedidos en la zona de packing, zonas que aparecen al desbloquear resina, láser y CNC.
- **Audio nuevo**: ambiente de taller, sonido ubicado por máquina (FDM, resina, láser, CNC), música electrónica adaptable y volúmenes separados.
- **Ver de cerca**: desde el panel de cada máquina, la cámara se acerca para inspeccionarla.
- Las partidas anteriores se convierten solas: la plata conserva los mismos minutos de producción y queda una copia intacta (`mt3dbat.save.v1.v2`).

## Qué tiene (v0.2)

- **Taller en 3D** (Three.js): 7 ambientes (escritorio, cuarto, garage, local, taller industrial, nave, planta), máquinas animadas,
  piezas que crecen capa por capa, sombras, reflejos y neón. Calidad gráfica Auto/Alta/Media/Baja y vista de lista alternativa.
- **28 máquinas de marcas reales** (Creality, Hellbot, Bambu Lab, Anycubic, Elegoo, Prusa, Artillery, Voron, Formlabs, xTool, Genmitsu, Snapmaker, Carbide 3D)
  con tamaño de cama, impresoras cerradas y multicolor.
- **4 tecnologías**: FDM, resina, láser y CNC · 10 materiales · 32 productos con experiencia propia (no se pierde).
- **Juego largo**: mejoras infinitas, reputación sin techo, Mudanza (prestigio) con 19 ventajas, contratos de empresa.
- **Desafíos**: 3 diarios + 1 semanal (dan fichas), 8 desafíos de maestría con reglas especiales y tienda de fichas.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5180
npm test         # pruebas del motor (tutorial, pedidos, offline, guardado, migración, mudanza, desafíos)
npm run sim      # simulador de balance: un bot juega N horas con Mudanzas (ej.: node scripts/sim.mjs 40)
npm run build    # genera dist/
```

Parámetros **solo de desarrollo** (no existen en la versión publicada):

- `?demo=inicio|cuarto|garage|local|industrial|planta` → partida de ejemplo (no guarda nada).
- `?speed=10` → el tiempo corre 10 veces más rápido.

## Estructura

| Carpeta / archivo | Qué hay |
|---|---|
| `src/game/data.js` | **Todo el contenido y el balance**: máquinas, productos, materiales, mejoras, espacios, pedidos, eventos, desafíos, ventajas. |
| `src/game/engine.js` | Motor puro (sin React): simulación, compras, pedidos, contratos, eventos, offline, Mudanza, desafíos, migración de partidas. |
| `src/game/progress.js` | Misiones (las 5 primeras son el tutorial), logros, desafíos diarios/semanales y el paso completo `step()`. |
| `src/three/` | Gráficos 3D: `Workshop3D.js` (escena), `machines.js`, `rooms.js`, `pieces.js`, `materials.js` (texturas por código), `thumbs.js` (renders para menús). |
| `src/ui/` | Pantallas en React. `Scene3D.jsx` monta el 3D con los carteles de cada máquina; `Bati.jsx` es la mascota en SVG; `Online.jsx` cuenta, ranking, retos, granjas y Filacolor. |
| `src/online/` | Juego online: `api.js` (Supabase, guardado de salida, decisión de qué partida usar), `useOnline.js` (sesión, nube, presencia), `rewards.js` (premios, emblemas, niveles de granja) y `filacolor.js` (datos del proveedor oficial). |
| `src/styles/base.css` | CSS base del **Design System 3DBAT** (copiado tal cual). |
| `scripts/` | `test.mjs` (pruebas), `sim.mjs` (balance largo con Mudanzas) y `early.mjs` (primeras horas con un jugador normal). |

## Balance (v0.3, economía en AR$)

Jugador eficiente (`scripts/early.mjs`): 2ª impresora ≈ 15–20 min · Cuarto ≈ 26 min · Garage ≈ 51 min · Local ≈ 2 h · Taller industrial ≈ 4 h.
Bot de largo plazo (`scripts/sim.mjs 40`): Nave ≈ 14 h; la Planta queda para jugadores dedicados (más de 40 h).
Una persona real juega en sesiones cortas (más el tiempo offline), así que son semanas. Después siguen las mejoras
infinitas, la experiencia por producto, la reputación y las Mudanzas.

## Publicación

Cada push a `main` corre las pruebas, compila y publica en GitHub Pages (`.github/workflows/deploy.yml`).
BATBOX compila este repo en `/batbox/juego/` en su propio deploy (GitHub Pages) y en `web-3dbat` (`npm run build:full`, dominio):
después de un cambio en el juego hay que volver a publicar BATBOX (`gh workflow run deploy.yml -R 3dbatimpresiones/batbox`).
El build usa rutas relativas, así que también funciona dentro de una subcarpeta (por ejemplo en BATBOX).
El código 3D se carga aparte, después de que aparece la pantalla.

## Próximo

- Amigos y perfil público de cada maker.
- Cosméticos del Makers Club (sin ventajas de juego).
- Terminaciones (lijado, pintura) y diseños propios.
- App instalable (PWA).
