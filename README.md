# 3DBAT: Maker Tycoon

Juego idle/tycoon de **3DBAT IMPRESIONES**. Arrancás con una impresora 3D de kit en el escritorio
y la hacés crecer hasta un local con vidriera. BATI, la mascota de 3DBAT, guía al jugador.

- **Jugar:** https://3dbatimpresiones.github.io/maker-tycoon/
- Sin login: la partida se guarda en el navegador (`localStorage`, clave `mt3dbat.save.v1`, con respaldo en `mt3dbat.save.bak`).
- Se puede pasar la partida a otro dispositivo con un código (Ajustes → Tu partida).

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5180
npm test         # pruebas del motor (tutorial, pedidos, offline, guardado, mudanza)
npm run sim      # simulador de balance: un bot juega 5 h y muestra cuándo llega a cada hito
npm run build    # genera dist/
```

Parámetros **solo de desarrollo** (no existen en la versión publicada):

- `?demo=inicio|cuarto|garage|local` → partida de ejemplo (no guarda nada).
- `?speed=10` → el tiempo corre 10 veces más rápido.

## Estructura

| Carpeta / archivo | Qué hay |
|---|---|
| `src/game/data.js` | **Todo el contenido y el balance**: máquinas, productos, mejoras, espacios, pedidos, eventos, ventajas de Oficio. |
| `src/game/engine.js` | Motor puro (sin React): simulación, compras, pedidos, eventos, offline, Mudanza, guardado. |
| `src/game/progress.js` | Misiones (las 5 primeras son el tutorial), logros y el paso completo `step()`. |
| `src/game/format.js` | Números y tiempos en formato argentino ($1,5 M · 1 h 20 min). |
| `src/ui/useGame.js` | Bucle del juego, guardado automático, tiempo offline y avisos (sonidos, BATI, toasts). |
| `src/ui/*.jsx` | Pantallas: taller, pedidos, tienda, ventanas. `Bati.jsx` y `MachineArt.jsx` son el arte SVG. |
| `src/styles/base.css` | CSS base del **Design System 3DBAT** (copiado tal cual). |
| `scripts/` | `test.mjs` (pruebas) y `sim.mjs` (balance). |

## Balance (bot "atento", semilla 12345)

Cuarto maker ≈ 19 min · Garage ≈ 1 h 30 · Local ≈ 3 h · primera Mudanza posible ≈ 2 h 20.
Una persona real tarda más y juega en varias sesiones (más el tiempo offline). Después de mudarse,
la segunda partida llega al Garage en ≈ 1 h.

## Publicación

Cada push a `main` corre las pruebas, compila y publica en GitHub Pages (`.github/workflows/deploy.yml`).
El build usa rutas relativas, así que también funciona dentro de una subcarpeta (por ejemplo en BATBOX).

## Próximas fases (ver plan de diseño)

- **Fase 2:** multicolor, resina, terminaciones, diseños propios, misiones diarias, app instalable (PWA).
- **Fase 3:** láser y CNC, marca y comunidad, guardado en la nube con la cuenta de BATBOX, ranking y desafíos semanales.
