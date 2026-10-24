# 3DBAT: Maker Tycoon

Juego idle/tycoon de **3DBAT IMPRESIONES**. Arrancás con una Creality Ender-3 en el escritorio y la hacés
crecer hasta una planta de producción con impresoras 3D, resina, láser y CNC. BATI, la mascota de 3DBAT, guía al jugador.

- **Jugar:** https://3dbatimpresiones.github.io/maker-tycoon/
- Sin login: la partida se guarda en el navegador (`localStorage`, clave `mt3dbat.save.v1`, con respaldo en `mt3dbat.save.bak`).
  Al abrir una partida de una versión anterior se guarda una copia intacta en `mt3dbat.save.v1.v<versión>` antes de convertirla.
- Se puede pasar la partida a otro dispositivo con un código (Ajustes → Tu partida).
- Las marcas y modelos mencionados pertenecen a sus dueños; el juego no está afiliado ni patrocinado (solo nombres, sin logos).

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
| `src/ui/` | Pantallas en React. `Scene3D.jsx` monta el 3D con los carteles de cada máquina; `Bati.jsx` es la mascota en SVG. |
| `src/styles/base.css` | CSS base del **Design System 3DBAT** (copiado tal cual). |
| `scripts/` | `test.mjs` (pruebas) y `sim.mjs` (balance). |

## Balance (bot que juega sin parar, semilla 12345)

Cuarto ≈ 25 min · Garage ≈ 2 h · Local ≈ 5 h 30 · Taller industrial ≈ 8 h · Nave ≈ 17 h · Planta ≈ 31 h.
Una persona real juega en sesiones cortas (más el tiempo offline), así que son semanas. Después siguen las mejoras
infinitas, la experiencia por producto, la reputación y las Mudanzas.

## Publicación

Cada push a `main` corre las pruebas, compila y publica en GitHub Pages (`.github/workflows/deploy.yml`).
El build usa rutas relativas, así que también funciona dentro de una subcarpeta (por ejemplo en BATBOX).
El código 3D se carga aparte, después de que aparece la pantalla.

## Próximo

- Guardado en la nube con la cuenta de BATBOX (Supabase) y ranking de los desafíos semanales.
- Terminaciones (lijado, pintura) y diseños propios.
- App instalable (PWA).
