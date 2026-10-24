// =====================================================================
// CONTENIDO DEL JUEGO (datos puros). Para balancear, se toca acá.
// Tiempos en segundos de juego, precios en $, filamento en gramos.
// =====================================================================

export const MATERIALS = {
  PLA: { id: 'PLA', name: 'PLA', spool: 60, color: '#5DDADB', desc: 'El de todos los días. Fácil de imprimir.' },
  PETG: { id: 'PETG', name: 'PETG', spool: 90, color: '#7c83ff', desc: 'Más resistente y aguanta el sol.', upgrade: 'petg' },
  TPU: { id: 'TPU', name: 'TPU', spool: 140, color: '#F78EB6', desc: 'Flexible como goma. Pide extrusor directo.', upgrade: 'directo' },
};
export const SPOOL_GRAMS = 1000;

// Calidad: multiplicador de precio por estrella (★1 a ★5).
export const STAR_MULT = [1, 1, 1.25, 1.6, 2, 2.5];

export const SPACES = [
  { id: 'escritorio', name: 'Escritorio del cuarto', slots: 2, cost: 0, rep: 1, cols: 2,
    blurb: 'Una impresora, una lámpara y el mate al lado.' },
  { id: 'cuarto', name: 'Cuarto maker', slots: 4, cost: 800, rep: 2, cols: 4,
    blurb: 'Estantería de bobinas y tira LED. Ya es un taller.' },
  { id: 'garage', name: 'Garage taller', slots: 8, cost: 60000, rep: 5, cols: 4,
    blurb: 'Panel de herramientas, extractor y espacio para crecer.' },
  { id: 'local', name: 'Local con vidriera', slots: 12, cost: 1500000, rep: 7, cols: 6,
    blurb: 'Vidriera a la calle y cartel de neón. Sos un emprendimiento.' },
];

// kind: bed = cama que va y viene · corexy = cubo, la cama baja · big = gran formato
export const MACHINES = {
  kit: { id: 'kit', name: 'Kit Inicial', nick: '«La Primera»', kind: 'bed', speed: 1, stars: 1, fail: 0.06,
    cost: 50, growth: 1.5, rep: 1, space: 0,
    flavor: 'Armada a medias. Sobraron tres tornillos y nadie sabe de dónde.' },
  cartesiana: { id: 'cartesiana', name: 'Cartesiana Autonivelante', nick: '', kind: 'bed', speed: 1.6, stars: 2, fail: 0.035,
    cost: 300, growth: 1.5, rep: 2, space: 0, autolevel: true,
    flavor: 'Nivela sola. Adiós al papelito debajo de la boquilla.' },
  rayo: { id: 'rayo', name: 'CoreXY Abierta', nick: '«Rayo»', kind: 'corexy', speed: 3, stars: 2, fail: 0.025,
    cost: 9000, growth: 1.5, rep: 4, space: 1, autolevel: true,
    flavor: 'Rapidísima. Vibra un poco, pero se arregla con input shaping.' },
  bunker: { id: 'bunker', name: 'CoreXY Cerrada', nick: '«Búnker»', kind: 'enclosed', speed: 3.5, stars: 3, fail: 0.012,
    cost: 75000, growth: 1.5, rep: 5, space: 2, autolevel: true, noWarp: true,
    flavor: 'Gabinete cerrado: el warping no entra.' },
  gigante: { id: 'gigante', name: 'Gran Formato', nick: '«Gigante»', kind: 'big', speed: 1.2, stars: 3, fail: 0.015,
    cost: 250000, growth: 1.5, rep: 6, space: 2, autolevel: true, xl: true,
    flavor: 'La única que imprime piezas XL. Tarda, pero cada pieza es un evento.' },
};
export const MACHINE_ORDER = ['kit', 'cartesiana', 'rayo', 'bunker', 'gigante'];

// shape = silueta SVG de la pieza (ver ui/Pieces.jsx)
export const PRODUCTS = {
  llavero: { id: 'llavero', name: 'Llavero con nombre', mat: 'PLA', time: 20, price: 5, grams: 8, rep: 1, shape: 'llavero', color: '#F78EB6' },
  benchy: { id: 'benchy', name: 'Benchy de exhibición', mat: 'PLA', time: 45, price: 14, grams: 15, rep: 2, shape: 'benchy', color: '#ff9f6b',
    tip: 'El barquito de prueba más famoso del mundo maker.' },
  soporte: { id: 'soporte', name: 'Soporte de celular', mat: 'PLA', time: 90, price: 35, grams: 40, rep: 3, shape: 'soporte', color: '#5DDADB' },
  maceta: { id: 'maceta', name: 'Maceta geométrica', mat: 'PLA', time: 180, price: 80, grams: 90, rep: 1, space: 1, shape: 'maceta', color: '#9ae6b4' },
  figura: { id: 'figura', name: 'Figura de colección', mat: 'PLA', time: 240, price: 140, grams: 60, rep: 4, minStars: 3, shape: 'figura', color: '#c4b5fd' },
  gancho: { id: 'gancho', name: 'Gancho de pared reforzado', mat: 'PETG', time: 60, price: 40, grams: 30, rep: 1, shape: 'gancho', color: '#7c83ff' },
  engranaje: { id: 'engranaje', name: 'Engranaje de repuesto', mat: 'PETG', time: 120, price: 120, grams: 20, rep: 1, minStars: 3, shape: 'engranaje', color: '#a5b4fc' },
  topes: { id: 'topes', name: 'Topes y fundas flexibles', mat: 'TPU', time: 120, price: 90, grams: 15, rep: 1, shape: 'topes', color: '#F78EB6' },
  organizador: { id: 'organizador', name: 'Organizador modular', mat: 'PETG', time: 360, price: 300, grams: 150, rep: 1, space: 2, shape: 'organizador', color: '#5DDADB' },
  xl: { id: 'xl', name: 'Casco cosplay XL', mat: 'PLA', time: 1200, price: 4000, grams: 800, rep: 1, xl: true, shape: 'casco', color: '#e2e8f0' },
};
export const PRODUCT_ORDER = ['llavero', 'benchy', 'soporte', 'maceta', 'gancho', 'figura', 'engranaje', 'topes', 'organizador', 'xl'];

// Mejoras globales. cost = primer nivel; growth = multiplicador por nivel.
export const UPGRADES = {
  slicer: { name: 'Perfil de slicer optimizado', cat: 'Velocidad', cost: 20, growth: 3, max: 5,
    desc: '+15 % de velocidad por nivel.', tip: 'El slicer es el programa que corta el modelo en capas.' },
  pei: { name: 'Cama PEI', cat: 'Confiabilidad', cost: 120, rep: 1,
    desc: 'Las piezas pegan mejor: la mitad de spaghetti, warping y primeras capas fallidas.' },
  sobrino: { name: 'Sobrino ayudante', cat: 'Automatización', cost: 150, rep: 1,
    desc: 'Retira una pieza terminada cada 8 s.', flavor: 'Sabe de compus. Más o menos.' },
  termo: { name: 'Termo grande', cat: 'Mate', cost: 300, rep: 1, desc: 'El mate dura 90 s en vez de 60 s.' },
  calibracion: { name: 'Calibración de flujo', cat: 'Calidad', cost: 500, rep: 2, desc: '+1★ en Kit Inicial y Cartesiana.' },
  bulk: { name: 'Compra por mayor', cat: 'Capacidad', cost: 1000, rep: 2, desc: '−20 % en el precio del filamento.' },
  petg: { name: 'Kit PETG', cat: 'Material', cost: 1200, rep: 3,
    desc: 'Cama a 80 °C y hotend all-metal: desbloquea los productos de PETG.' },
  proveedor: { name: 'Proveedor de filamento', cat: 'Automatización', cost: 3000, rep: 3,
    desc: 'Compra bobinas solo cuando se acaban (con 10 % de recargo).' },
  retraccion: { name: 'Ajuste de retracción', cat: 'Calidad', cost: 2000, rep: 3, desc: 'Chau hilos: elimina el stringing.',
    tip: 'La retracción tira el filamento para atrás para que no gotee entre movimientos.' },
  yerba: { name: 'Yerba de la buena', cat: 'Mate', cost: 4000, rep: 3, desc: 'El mate se recarga en 3 min en vez de 5.' },
  hotend: { name: 'Hotend de alto flujo', cat: 'Velocidad', cost: 6000, growth: 15, max: 2, rep: 4, desc: '+50 % de velocidad en todas las impresoras (por nivel).' },
  tablero: { name: 'Tablero de pedidos ampliado', cat: 'Capacidad', cost: 8000, rep: 4, desc: 'Hasta 5 pedidos a la vez (en vez de 3).' },
  secador: { name: 'Secador de filamento', cat: 'Confiabilidad', cost: 12000, rep: 4, desc: 'Elimina el filamento húmedo.' },
  directo: { name: 'Extrusor directo', cat: 'Material', cost: 15000, rep: 4, desc: 'Desbloquea el TPU.', flavor: 'Con bowden, ni lo intentes.' },
  marca: { name: 'Marca personal', cat: 'Marca', cost: 15000, growth: 4, max: 5, rep: 5,
    desc: '+20 % al precio de todas tus piezas por nivel.', flavor: 'Fotos lindas, packaging prolijo y redes activas.' },
  boquilla: { name: 'Boquilla de acero endurecido', cat: 'Calidad', cost: 25000, rep: 5, desc: '+1★ en todas y −70 % de boquillas tapadas.' },
  camara: { name: 'Cámara con detección de spaghetti', cat: 'Confiabilidad', cost: 40000, rep: 5,
    desc: 'Detecta el spaghetti y limpia sola en 3 s.' },
  input: { name: 'Input shaping', cat: 'Velocidad', cost: 90000, rep: 5, desc: '+50 % de velocidad en las CoreXY y +1★ en la Rayo.',
    tip: 'El firmware compensa las vibraciones para imprimir rápido sin "fantasmas".' },
  remota: { name: 'Cámara remota', cat: 'Automatización', cost: 120000, rep: 6,
    desc: 'Mientras no estás: hasta 6 h y 80 % de rendimiento.' },
  expulsion: { name: 'Expulsión automática', cat: 'Automatización', cost: 200000, rep: 6, desc: 'Las piezas se retiran solas al instante.' },
  ups: { name: 'Recuperación ante cortes', cat: 'Confiabilidad', cost: 300000, rep: 6, desc: 'Un corte de luz ya no reinicia las piezas.' },
  gestor: { name: 'Gestor de pedidos', cat: 'Automatización', cost: 700000, rep: 7,
    desc: 'Acepta solo los pedidos que podés cumplir y les asigna impresoras.' },
};
export const UPGRADE_ORDER = Object.keys(UPGRADES);

// Reputación: puntos necesarios para cada nivel (índice = nivel).
export const REP_LEVELS = [0, 0, 3, 8, 16, 30, 55, 90, 140, 220, 330];
export const REP_PRICE_BONUS = 0.05; // +5 % por nivel arriba del 1

// ---------- Pedidos ----------
// items: [[producto, cantidad]] · time: plazo · mult: bonus sobre el precio de lista · rep: reputación
export const ORDER_TEMPLATES = [
  { id: 'vecina', client: 'Doña Marta, la vecina', title: 'Un regalito para la nieta', items: [['llavero', 5]], time: 240, mult: 2, rep: 1, weight: 3 },
  { id: 'cumple', client: 'Mamá de Martina', title: 'Llaveros para el cumple de Martina', items: [['llavero', 12]], time: 480, mult: 1.5, rep: 1, weight: 3,
    flavor: 'Con los nombres de los 12 invitados. Sí, todos distintos.' },
  { id: 'tio', client: 'Tu tío', title: 'Soporte para el celu del tío', items: [['soporte', 1]], time: 240, mult: 3, rep: 1, weight: 2 },
  { id: 'club', client: 'Club de modelismo', title: 'Benchys para la exposición', items: [['benchy', 10]], time: 600, mult: 2, rep: 2, weight: 2 },
  { id: 'exposicion', client: 'Un influencer', title: '«Te lo pago con exposición»', items: [['benchy', 6]], time: 420, mult: 0, rep: 4, weight: 1,
    flavor: 'No paga nada, pero te nombra en sus historias. ¿Vale la pena?' },
  { id: 'vivero', client: 'Vivero «El Ceibo»', title: 'Macetas para el vivero', items: [['maceta', 8]], time: 1200, mult: 2, rep: 3, weight: 2, frequent: true },
  { id: 'dorado', client: 'Clienta indecisa', title: '«¿Y si lo hacemos en dorado?»', items: [['maceta', 4]], time: 600, mult: 3, rep: 2, weight: 1 },
  { id: 'ferreteria', client: 'Ferretería del barrio', title: 'Ganchos para la ferretería', items: [['gancho', 15]], time: 900, mult: 2, rep: 2, weight: 2, frequent: true },
  { id: 'lavarropas', client: 'Don Rubén', title: 'Repuesto del lavarropas', items: [['engranaje', 2]], time: 600, mult: 4, rep: 3, weight: 2, minStars: 3,
    flavor: 'El original sale una fortuna y tarda tres meses.' },
  { id: 'streamer', client: 'Un streamer', title: 'Merch para el stream', items: [['figura', 10]], time: 1500, mult: 2, rep: 3, weight: 2, minStars: 3 },
  { id: 'muebleria', client: 'Mueblería «La Esquina»', title: 'Topes para sillas', items: [['topes', 20]], time: 1200, mult: 2.5, rep: 3, weight: 2 },
  { id: 'escuela', client: 'Escuela técnica', title: 'Kit de robótica para el taller', items: [['gancho', 12], ['engranaje', 4]], time: 1800, mult: 2.5, rep: 5, weight: 2, minStars: 3 },
  { id: 'emprendedora', client: 'Emprendedora de bijou', title: 'Organizadores para el local', items: [['organizador', 4]], time: 1800, mult: 2.5, rep: 4, weight: 2, frequent: true },
  { id: 'arquitecta', client: 'Arquitecta', title: 'Maqueta para una presentación', items: [['xl', 1]], time: 1800, mult: 3, rep: 5, weight: 2, minStars: 4 },
  { id: 'cosplay', client: 'Grupo de cosplay', title: 'Casco para la convención', items: [['xl', 1], ['figura', 3]], time: 2700, mult: 4, rep: 6, weight: 2, minStars: 3 },
];
export const ORDER_OFFER_LIFE = 240;  // un pedido sin aceptar dura 4 min en el tablero
export const ORDER_SPAWN_EVERY = 40;

// ---------- Eventos de máquina ----------
// options: [{label, effect}] · effect: restart | resume | penalty | pause | slow | reorient | brim
// act: tipo de interacción para la opción principal: tap | hold | taps
export const MACHINE_EVENTS = {
  spaghetti: { name: 'Spaghetti', icon: '🍝', weight: 3, lose: true,
    text: 'La pieza se despegó y la impresora está haciendo un nido de filamento.',
    options: [{ label: 'Limpiar y reintentar', act: 'taps', n: 3, effect: 'restart' }],
    prevent: 'Cama PEI (menos chance) · Cámara con detección (se limpia sola)' },
  warping: { name: 'Warping', icon: '🥨', weight: 2,
    text: 'Se levantaron las esquinas de la pieza.',
    options: [{ label: 'Entregarla igual (−1★)', effect: 'penalty' }, { label: 'Reimprimir con brim (+20 % de tiempo)', effect: 'brim' }],
    prevent: 'Cama PEI · CoreXY Cerrada (inmune)' },
  tapada: { name: 'Boquilla tapada', icon: '🪡', weight: 2,
    text: 'Clac, clac, clac. El extrusor empuja pero no sale nada.',
    options: [{ label: 'Mantené apretado para destapar', act: 'hold', effect: 'resume' }],
    prevent: 'Boquilla de acero endurecido' },
  primeracapa: { name: 'Primera capa que no pega', icon: '📏', weight: 2, early: true,
    text: 'Las líneas de la primera capa salen sueltas. Hay que nivelar la cama.',
    options: [{ label: 'Ajustá los 3 tornillos', act: 'taps', n: 3, effect: 'restart', free: true }],
    prevent: 'Cartesiana Autonivelante o superior' },
  humedo: { name: 'Filamento húmedo', icon: '💧', weight: 2,
    text: '«Pop, pop, pop». El filamento chupó humedad y la pieza sale con burbujas.',
    options: [{ label: 'Secar la bobina (pausa 30 s)', effect: 'pause' }, { label: 'Seguir igual (−1★)', effect: 'penalty' }],
    prevent: 'Secador de filamento' },
  orientacion: { name: 'Pieza mal orientada', icon: '🧭', weight: 2,
    text: 'La pieza quedó acostada al revés y está llena de soportes.',
    options: [{ label: 'Seguir (tarda el doble)', effect: 'slow' }, { label: 'Reorientar en el slicer (reinicia, 30 % más rápida)', effect: 'reorient' }],
    prevent: 'Perfil de slicer nivel 3' },
  stringing: { name: 'Hilos por todos lados', icon: '🕸️', weight: 2,
    text: 'La pieza parece una telaraña.',
    options: [{ label: 'Pasarle el pistolón de calor', act: 'tap', effect: 'resume' }, { label: 'Entregarla así (−1★)', effect: 'penalty' }],
    prevent: 'Ajuste de retracción' },
  layershift: { name: 'Correa floja', icon: '🪜', weight: 1,
    text: 'Las capas se corrieron: la pieza salió «escalonada».',
    options: [{ label: 'Tensar la correa y reimprimir', act: 'taps', n: 2, effect: 'restart' }],
    prevent: 'Máquinas mejores (Cartesiana en adelante)' },
  gato: { name: 'El gato se subió a la impresora', icon: '🐈‍⬛', weight: 1, cute: true,
    text: 'Encontró la cama caliente y no piensa moverse.',
    options: [{ label: 'Bajar al gato', act: 'tap', effect: 'resume' }],
    prevent: 'Ninguna. El gato es parte del equipo.' },
};

// ---------- Eventos globales ----------
export const GLOBAL_EVENTS = {
  corte: { name: 'Se cortó la luz en el barrio', icon: '🔌', neg: true, weight: 1,
    text: 'Se apagó todo el taller. Esperá que vuelva la luz y reanudá.' },
  cambio: { name: 'El cliente cambió el diseño', icon: '✏️', weight: 2,
    text: '«¿Y si le agregamos el logo?» Tu cliente quiere un 30 % más de piezas.' },
  favor: { name: '«Una cosita rápida»', icon: '🤝', weight: 2,
    text: 'Un amigo te pide un favor: un llavero para su llavero. Gratis, obvio.' },
  viral: { name: 'Tu timelapse se hizo viral', icon: '📈', weight: 2, pos: true,
    text: 'El video de una impresión explotó en redes. ¡Aprovechá la ola!' },
  misteriosa: { name: 'Bobina misteriosa en oferta', icon: '🎁', weight: 1,
    text: 'Un vendedor te ofrece 2 bobinas de PLA «sin marca» a precio regalado.' },
  urgente: { name: 'Pedido urgente', icon: '⚡', weight: 2, pos: true,
    text: '«Lo necesito para mañana». Paga x5 si llegás a tiempo.' },
};

// ---------- Prestigio ----------
export const PERKS = {
  mesa: { name: 'Mesa armada', cost: 1, desc: 'Arrancás con una Cartesiana además de la Kit, y $200 en la caja.' },
  sobrino: { name: 'Sobrino de confianza', cost: 1, desc: 'El sobrino ayudante está desde el principio.' },
  termo: { name: 'Termo grande', cost: 1, desc: 'El mate dura 30 s más.' },
  proveedor: { name: 'Proveedor amigo', cost: 2, desc: 'Proveedor automático desde el inicio y −10 % en filamento.' },
  contactos: { name: 'Contactos', cost: 2, desc: '+1 lugar en el tablero de pedidos y pedidos x1,2.' },
  duermo: { name: 'Duermo tranquilo', cost: 2, desc: 'Mientras no estás: +3 h de tope y +20 % de rendimiento.' },
  manos: { name: 'Manos de mecánico', cost: 2, desc: 'Los problemas se resuelven solos a los 15 s si no los tocás.' },
  ojo: { name: 'Ojo clínico', cost: 3, desc: '−25 % de problemas en las máquinas.' },
  mirada: { name: 'Mirada de slicer', cost: 3, desc: '+1★ en todas las máquinas.' },
  reputacion: { name: 'Reputación que te precede', cost: 3, desc: 'Arrancás con Reputación 3.' },
  cuarto: { name: 'Dueño del cuarto', cost: 5, desc: 'Arrancás con el Cuarto maker ya armado.' },
};
export const MAKER_TITLES = [
  [0, 'Curioso'], [1, 'Aprendiz'], [5, 'Maker'], [15, 'Maker Pro'], [35, 'Maestro Maker'], [75, 'Leyenda 3DBAT'],
];
export const OFICIO_BONUS = 0.03;

// LEDs del taller (cosméticos)
export const LED_COLORS = {
  cyan: { name: 'Turquesa', color: '#5DDADB' },
  rosa: { name: 'Rosa', color: '#F78EB6', unlock: 'pedidos10' },
  violeta: { name: 'Violeta', color: '#8b8ff7', unlock: 'mudanza' },
  blanco: { name: 'Blanco cálido', color: '#ffe8c7', unlock: 'local' },
};
