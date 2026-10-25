// =====================================================================
// CONTENIDO DEL JUEGO (datos puros). Para balancear, se toca acá.
// Tiempos en segundos de juego (a velocidad ×1), precios en $,
// materiales en "unidades" (1000 = 1 bobina / 1 litro / 1 plancha / 1 tabla / 1 barra).
// Las marcas y modelos mencionados pertenecen a sus dueños; el juego no está afiliado a ninguna.
// =====================================================================

export const UNIT = 1000;
export const SPOOL_GRAMS = UNIT;

// tech: con qué tecnología se trabaja · unitName: cómo se compra
export const MATERIALS = {
  PLA: { id: 'PLA', name: 'PLA', tech: 'fdm', price: 22000, unitName: 'bobina', color: '#5DDADB', brand: 'Grilon3 · Bambu Lab · Elegoo', desc: 'El de todos los días. Fácil de imprimir.' },
  PETG: { id: 'PETG', name: 'PETG', tech: 'fdm', price: 26000, unitName: 'bobina', color: '#7c83ff', brand: 'Grilon3 · Bambu Lab · Elegoo', desc: 'Más resistente y aguanta el sol.', upgrade: 'petg' },
  TPU: { id: 'TPU', name: 'TPU', tech: 'fdm', price: 38000, unitName: 'bobina', color: '#F78EB6', brand: 'Elegoo TPU 95A', desc: 'Flexible como goma. Pide extrusor directo.', upgrade: 'directo' },
  ASA: { id: 'ASA', name: 'ABS / ASA', tech: 'fdm', price: 34000, unitName: 'bobina', color: '#f2f2f2', brand: 'Grilon3 ABS', desc: 'Técnico y resistente al calor. Solo en impresoras cerradas.', upgrade: 'abs', enclosed: true },
  PACF: { id: 'PACF', name: 'Nylon + fibra de carbono', tech: 'fdm', price: 120000, unitName: 'bobina', color: '#3b3f4a', brand: 'Bambu Lab PAHT-CF', desc: 'Durísimo. Necesita impresora cerrada y boquilla de acero.', upgrade: 'nylon', enclosed: true },
  RESINA: { id: 'RESINA', name: 'Resina', tech: 'resin', price: 45000, unitName: 'litro', color: '#9be7c4', brand: 'Elegoo / Anycubic', desc: 'Detalle extremo. Con guantes y ventilación.', upgrade: 'resina' },
  MDF: { id: 'MDF', name: 'MDF 3 mm', tech: 'laser', price: 9000, unitName: 'plancha', color: '#b98a5a', brand: 'Corralón del barrio', desc: 'Se corta y se graba con láser.', upgrade: 'laser' },
  ACRILICO: { id: 'ACRILICO', name: 'Acrílico', tech: 'laser', price: 38000, unitName: 'plancha', color: '#f7a8c9', brand: 'Acrílicos Once', desc: 'Corte prolijo y canto brillante.', upgrade: 'laser' },
  MADERA: { id: 'MADERA', name: 'Madera maciza', tech: 'cnc', price: 55000, unitName: 'tabla', color: '#a0703f', brand: 'Aserradero', desc: 'Algarrobo, pino o guatambú.', upgrade: 'cnc' },
  ALU: { id: 'ALU', name: 'Aluminio', tech: 'cnc', price: 140000, unitName: 'barra', color: '#c9d1dc', brand: 'Distribuidora de metales', desc: 'Mecanizado de precisión.', upgrade: 'cnc' },
};
export const MATERIAL_ORDER = Object.keys(MATERIALS);

export const TECHS = {
  fdm: { id: 'fdm', name: 'Impresión 3D (FDM)', short: 'FDM' },
  resin: { id: 'resin', name: 'Resina', short: 'Resina', upgrade: 'resina' },
  laser: { id: 'laser', name: 'Corte y grabado láser', short: 'Láser', upgrade: 'laser' },
  cnc: { id: 'cnc', name: 'Fresado CNC', short: 'CNC', upgrade: 'cnc' },
};

export const SIZES = { S: 1, M: 2, L: 3, XL: 4 };
export const SIZE_NAME = { S: 'Chica', M: 'Mediana', L: 'Grande', XL: 'Gigante' };

// Calidad: multiplicador de precio por estrella (★1 a ★5).
export const STAR_MULT = [1, 1, 1.15, 1.3, 1.45, 1.6];

export const SPACES = [
  { id: 'escritorio', name: 'Escritorio del cuarto', slots: 2, cost: 0, rep: 1, blurb: 'Una impresora, una lámpara y el mate al lado.' },
  { id: 'cuarto', name: 'Cuarto maker', slots: 4, cost: 600000, rep: 2, blurb: 'Estantería de bobinas y tira LED. Ya es un taller.' },
  { id: 'garage', name: 'Garage taller', slots: 8, cost: 12e6, rep: 5, blurb: 'Panel de herramientas, zona de packing y espacio para crecer.' },
  { id: 'local', name: 'Local con vidriera', slots: 12, cost: 150e6, rep: 7, blurb: 'Vidriera a la calle y cartel de neón. Sos un emprendimiento.' },
  { id: 'industrial', name: 'Taller industrial', slots: 16, cost: 1.6e9, rep: 10, blurb: 'Galpón con racks, puente grúa y luz de fábrica.' },
  { id: 'nave', name: 'Nave de producción', slots: 80, floors: true, cost: 8e9, rep: 13, blurb: 'Cuatro pisos, uno por tecnología: FDM, Resina, Láser y CNC (20 máquinas cada uno).' },
  { id: 'planta', name: 'Planta 3DBAT', slots: 80, floors: true, cost: 4.8e10, rep: 16, blurb: 'La fábrica maker definitiva: cuatro pisos premium y automatizados, contratos de alto valor.' },
];

// art: cómo se dibuja en 3D (ver src/three/machines.js)
// size: tamaño máximo de pieza · multi: multicolor de fábrica · amsable: admite sistema multicolor
export const MACHINES = {
  // ---------- FDM ---------- (precios de referencia en AR$: ver docs/precios-referencia.md)
  ender3: { brand: 'Creality', name: 'Ender-3 V3 SE', tech: 'fdm', size: 'M', speed: 1, stars: 1, fail: 0.06, cost: 400000, rep: 1, space: 0,
    flavor: 'La escuela de todos. Todos empezamos con una de estas.', art: { type: 'ender', frame: '#1d1f24', accent: '#c9ced8', bed: '#2a2d33' } },
  a1mini: { brand: 'Bambu Lab', name: 'A1 mini', tech: 'fdm', size: 'S', speed: 2.2, stars: 3, fail: 0.025, cost: 580000, rep: 2, space: 0, autolevel: true, amsable: true,
    flavor: 'Chiquita, silenciosa y rapidísima. Eso sí: cama de 18 cm.', art: { type: 'mini', frame: '#e3e5ea', accent: '#00ae42', bed: '#2b2b2b' } },
  magna: { brand: 'Hellbot', name: 'Magna SE', tech: 'fdm', size: 'M', speed: 1.3, stars: 2, fail: 0.045, cost: 520000, rep: 2, space: 0,
    flavor: 'Industria nacional. Repuestos a la vuelta de la esquina.', art: { type: 'bed', frame: '#202227', accent: '#e63946', bed: '#30333a', top: true } },
  a1: { brand: 'Bambu Lab', name: 'A1', tech: 'fdm', size: 'M', speed: 2.4, stars: 3, fail: 0.02, cost: 960000, rep: 3, space: 1, autolevel: true, amsable: true,
    flavor: 'La hermana grande de la A1 mini: cama de 25 cm y AMS lite opcional.', art: { type: 'a1', frame: '#e3e5ea', accent: '#00ae42', bed: '#2b2b2b' } },
  k1c: { brand: 'Creality', name: 'K1C', tech: 'fdm', size: 'M', speed: 3.2, stars: 3, fail: 0.022, cost: 1150000, rep: 3, space: 1, enclosed: true, autolevel: true,
    flavor: 'CoreXY cerrada que imprime fibra de carbono de fábrica.', art: { type: 'cube', frame: '#222428', accent: '#9aa3b2', glass: '#9fb4d8', model: 'k1c' } },
  kobra3: { brand: 'Anycubic', name: 'Kobra 3', tech: 'fdm', size: 'M', speed: 2, stars: 2, fail: 0.035, cost: 750000, rep: 3, space: 1, autolevel: true, amsable: true,
    flavor: 'Rápida y con el ACE Pro imprime a varios colores.', art: { type: 'bed', frame: '#17181c', accent: '#2b6cff', bed: '#3a3a3a', top: true } },
  neptune: { brand: 'Elegoo', name: 'Neptune 4 Max', tech: 'fdm', size: 'L', speed: 1.8, stars: 2, fail: 0.04, cost: 1100000, rep: 4, space: 1, autolevel: true,
    flavor: 'Cama de 42 cm. Entra un casco entero.', art: { type: 'bed', frame: '#e6e7ea', accent: '#1d1f24', bed: '#2b2b2b', big: 1.35, top: true } },
  p1s: { brand: 'Bambu Lab', name: 'P1S Combo (AMS)', tech: 'fdm', size: 'M', speed: 3.6, stars: 4, fail: 0.015, cost: 2000000, rep: 4, space: 2, enclosed: true, autolevel: true, multi: true,
    flavor: 'La que más se ve en los talleres. Con el AMS arriba imprime a 4 colores.', art: { type: 'cube', frame: '#1b1c1f', accent: '#00ae42', glass: '#8fa3c2', ams: true, model: 'p1s' } },
  mk4s: { brand: 'Prusa', name: 'MK4S', tech: 'fdm', size: 'M', speed: 2.8, stars: 4, fail: 0.012, cost: 2200000, rep: 5, space: 2, autolevel: true, amsable: true,
    flavor: 'Checa, confiable y naranja. Le das imprimir y te olvidás.', art: { type: 'bed', frame: '#fa6831', accent: '#16171a', bed: '#b8943d', top: true } },
  sidewinder: { brand: 'Artillery', name: 'Sidewinder X4 Plus', tech: 'fdm', size: 'L', speed: 2.4, stars: 3, fail: 0.03, cost: 1300000, rep: 5, space: 2, autolevel: true,
    flavor: 'Grandota y silenciosa. Para piezas de 30 × 30 cm.', art: { type: 'bed', frame: '#16171a', accent: '#1e90ff', bed: '#30323a', big: 1.45, top: true } },
  k2plus: { brand: 'Creality', name: 'K2 Pro Combo (CFS)', tech: 'fdm', size: 'L', speed: 4.5, stars: 4, fail: 0.015, cost: 1900000, rep: 6, space: 3, enclosed: true, multi: true, autolevel: true,
    flavor: 'Volumen de 30 cm, cerrada, cámara doble y CFS para varios colores.', art: { type: 'cube', frame: '#2a2c31', accent: '#9aa3b2', glass: '#a2b2cc', big: 1.2, ams: 'cfs', model: 'k2' } },
  h2s: { brand: 'Bambu Lab', name: 'H2S Combo (AMS)', tech: 'fdm', size: 'L', speed: 4.2, stars: 5, fail: 0.01, cost: 4700000, rep: 6, space: 3, enclosed: true, multi: true, autolevel: true, lidar: true,
    flavor: 'Gran formato de Bambu: 34 cm de cama, cerrada y con AMS.', art: { type: 'cube', frame: '#e3e5ea', accent: '#00ae42', glass: '#8fa3c2', big: 1.3, ams: true, model: 'h2' } },
  u1: { brand: 'Snapmaker', name: 'U1', tech: 'fdm', size: 'M', speed: 4, stars: 4, fail: 0.015, cost: 2450000, rep: 7, space: 3, multi: true, autolevel: true,
    flavor: 'Cuatro cabezales que se cambian solos: multicolor sin purgar.', art: { type: 'u1', frame: '#2b2e35', accent: '#f5a623' } },
  x1c: { brand: 'Bambu Lab', name: 'X1 Carbon', tech: 'fdm', size: 'M', speed: 4.8, stars: 5, fail: 0.01, cost: 3000000, rep: 7, space: 3, enclosed: true, autolevel: true, amsable: true, lidar: true,
    flavor: 'Lidar, cámara con IA y velocidad absurda.', art: { type: 'cube', frame: '#111214', accent: '#00ae42', glass: '#7f93b5', model: 'p1s' } },
  coreone: { brand: 'Prusa', name: 'Core One', tech: 'fdm', size: 'M', speed: 4.6, stars: 5, fail: 0.008, cost: 3200000, rep: 8, space: 4, enclosed: true, autolevel: true, amsable: true,
    flavor: 'La CoreXY cerrada de Prusa. Naranja, obvio.', art: { type: 'cube', frame: '#fa6831', accent: '#16171a', glass: '#9fb4d8' } },
  voron: { brand: 'Voron', name: '2.4 (kit armado)', tech: 'fdm', size: 'L', speed: 6, stars: 5, fail: 0.03, cost: 2800000, rep: 8, space: 4, enclosed: true, autolevel: true,
    flavor: 'No se compra: se arma. Tres fines de semana y 400 tornillos.', art: { type: 'cube', frame: '#141416', accent: '#d22630', glass: '#9aa8c0', big: 1.2 } },
  h2d: { brand: 'Bambu Lab', name: 'H2D', tech: 'fdm', size: 'L', speed: 6, stars: 5, fail: 0.008, cost: 6500000, rep: 9, space: 4, enclosed: true, multi: true, autolevel: true, lidar: true,
    flavor: 'Doble boquilla y volumen grande. La bestia de escritorio.', art: { type: 'cube', frame: '#e3e5ea', accent: '#00ae42', glass: '#8fa3c2', big: 1.35, ams: true, model: 'h2' } },
  prusaxl: { brand: 'Prusa', name: 'XL 5 cabezales', tech: 'fdm', size: 'L', speed: 5.5, stars: 5, fail: 0.008, cost: 9000000, rep: 10, space: 5, multi: true, autolevel: true,
    flavor: 'Cinco cabezales que se cambian solos. Multicolor sin desperdicio.', art: { type: 'pxl', frame: '#fa6831', accent: '#16171a', big: 1.5 } },
  giga: { brand: 'Elegoo', name: 'OrangeStorm Giga', tech: 'fdm', size: 'XL', speed: 3, stars: 4, fail: 0.02, cost: 7000000, rep: 10, space: 5, autolevel: true,
    flavor: '80 × 80 × 100 cm. Imprimís muebles enteros.', art: { type: 'giga', frame: '#1b1c20', accent: '#ff7a1a' } },
  rack: { brand: 'Bambu Lab', name: 'Rack de granja 8× A1 mini', tech: 'fdm', size: 'S', speed: 16, stars: 3, fail: 0.02, cost: 5500000, rep: 11, space: 5, autolevel: true,
    flavor: 'Ocho A1 mini en un rack. Una granja en un metro cuadrado.', art: { type: 'rack', frame: '#3a3f4a', accent: '#00ae42', n: 8 } },
  rackpro: { brand: 'Bambu Lab', name: 'Rack Pro 6× P1S', tech: 'fdm', size: 'M', speed: 21, stars: 4, fail: 0.012, cost: 14000000, rep: 13, space: 6, enclosed: true, autolevel: true,
    flavor: 'Seis P1S apiladas con cambio automático de placas.', art: { type: 'rack', frame: '#2b2f38', accent: '#00ae42', n: 6, pro: true } },
  // ---------- Resina ----------
  mars: { brand: 'Elegoo', name: 'Mars 5 Ultra', tech: 'resin', size: 'S', speed: 1, stars: 4, fail: 0.04, cost: 975000, rep: 6, space: 3,
    flavor: 'La puerta de entrada a la resina. Detalle que el FDM no tiene.', art: { type: 'resin', frame: '#18191c', lid: '#ff3b30' } },
  photon: { brand: 'Anycubic', name: 'Photon Mono M7 Pro', tech: 'resin', size: 'M', speed: 1.6, stars: 4, fail: 0.03, cost: 1300000, rep: 7, space: 3,
    flavor: 'Calefacción de resina incluida: chau piezas frías en invierno.', art: { type: 'resin', frame: '#1c1d21', lid: '#ffb000', big: 1.15 } },
  saturn: { brand: 'Elegoo', name: 'Saturn 4 Ultra 16K', tech: 'resin', size: 'M', speed: 2.2, stars: 5, fail: 0.02, cost: 2500000, rep: 8, space: 4,
    flavor: '16K de resolución. Las miniaturas parecen reales.', art: { type: 'resin', frame: '#17181b', lid: '#ffcf33', big: 1.25 } },
  form4: { brand: 'Formlabs', name: 'Form 4', tech: 'resin', size: 'M', speed: 4, stars: 5, fail: 0.006, cost: 12000000, rep: 10, space: 5,
    flavor: 'Resina profesional. Dentistas y joyeros la aman.', art: { type: 'resin', frame: '#e7e8ea', lid: '#ff7a00', big: 1.4, pro: true } },
  // ---------- Láser ----------
  falcon: { brand: 'Creality', name: 'Falcon2 22W', tech: 'laser', size: 'L', speed: 1, stars: 3, fail: 0.04, cost: 2050000, rep: 8, space: 4,
    flavor: 'Láser de diodo abierto. Gafas puestas, siempre.', art: { type: 'laser', frame: '#1b1c20', accent: '#3a86ff' } },
  xtools1: { brand: 'xTool', name: 'S1 40W', tech: 'laser', size: 'L', speed: 2, stars: 4, fail: 0.02, cost: 4500000, rep: 9, space: 4,
    flavor: 'Cerrada, con filtro y cámara. Corta acrílico de 10 mm.', art: { type: 'laserbox', frame: '#e9eaee', lid: '#ff8a1a' } },
  xtoolp2: { brand: 'xTool', name: 'P2S CO₂ 55W', tech: 'laser', size: 'XL', speed: 4, stars: 5, fail: 0.01, cost: 9500000, rep: 11, space: 5,
    flavor: 'Láser de CO₂ con alimentador. Corta MDF como manteca.', art: { type: 'laserbox', frame: '#2a2d33', lid: '#ff8a1a', big: 1.45 } },
  // ---------- CNC ----------
  g3018: { brand: 'Genmitsu', name: '3018-PROVer', tech: 'cnc', size: 'M', speed: 1, stars: 2, fail: 0.05, cost: 450000, rep: 9, space: 5,
    flavor: '«La 3018». Chiquita, ruidosa y valiente.', art: { type: 'cnc', frame: '#2a6fd6', accent: '#c9d1dc' } },
  artisan: { brand: 'Snapmaker', name: 'Artisan 3 en 1', tech: 'cnc', size: 'L', speed: 2, stars: 4, fail: 0.02, cost: 4500000, rep: 11, space: 5,
    flavor: 'Imprime, graba y fresa. Acá trabaja de fresadora.', art: { type: 'cncbox', frame: '#2b2e35', lid: '#ffb000' } },
  shapeoko: { brand: 'Carbide 3D', name: 'Shapeoko 5 Pro', tech: 'cnc', size: 'XL', speed: 4, stars: 5, fail: 0.01, cost: 9000000, rep: 12, space: 6,
    flavor: 'Fresadora de 1,2 m. Hace muebles y moldes.', art: { type: 'cnc', frame: '#1a1b1f', accent: '#c9d1dc', big: 1.5 } },
};
for (const [id, m] of Object.entries(MACHINES)) { m.id = id; m.growth = m.growth || 1.06; }
export const MACHINE_ORDER = Object.keys(MACHINES);
export const fullName = (M) => `${M.brand} ${M.name}`;

// shape = modelo 3D/2D de la pieza · multi: necesita multicolor · enclosed: necesita impresora cerrada
export const PRODUCTS = {
  // FDM
  llavero: { name: 'Llavero con nombre', tech: 'fdm', mat: 'PLA', size: 'S', time: 12, price: 3500, use: 8, rep: 1, shape: 'llavero', color: '#F78EB6' },
  // Plano exclusivo del juego online: se ve distinto pero paga IGUAL que el llavero común.
  llaverobati: { name: 'Llavero BATI', tech: 'fdm', mat: 'PLA', size: 'S', time: 12, price: 3500, use: 8, rep: 1, shape: 'llavero', color: '#5b6cf0', reward: 'p_bati',
    tip: 'Plano exclusivo: la mascota de 3DBAT en tu llavero.' },
  benchy: { name: 'Benchy de exhibición', tech: 'fdm', mat: 'PLA', size: 'S', time: 25, price: 8000, use: 15, rep: 2, shape: 'benchy', color: '#ff7f50', tip: 'El barquito de prueba más famoso del mundo maker.' },
  soporte: { name: 'Soporte de celular', tech: 'fdm', mat: 'PLA', size: 'M', time: 28, price: 9500, use: 40, rep: 3, shape: 'soporte', color: '#5DDADB' },
  maceta: { name: 'Maceta geométrica', tech: 'fdm', mat: 'PLA', size: 'M', time: 42, price: 15000, use: 90, rep: 1, space: 1, shape: 'maceta', color: '#9ae6b4' },
  gancho: { name: 'Gancho de pared reforzado', tech: 'fdm', mat: 'PETG', size: 'M', time: 16, price: 6000, use: 30, rep: 1, shape: 'gancho', color: '#7c83ff' },
  figura: { name: 'Figura de colección', tech: 'fdm', mat: 'PLA', size: 'M', time: 62, price: 25000, use: 60, rep: 4, minStars: 3, shape: 'figura', color: '#c4b5fd' },
  engranaje: { name: 'Engranaje de repuesto', tech: 'fdm', mat: 'PETG', size: 'S', time: 45, price: 20000, use: 20, rep: 1, minStars: 3, shape: 'engranaje', color: '#a5b4fc' },
  topes: { name: 'Topes y fundas flexibles', tech: 'fdm', mat: 'TPU', size: 'S', time: 29, price: 12000, use: 15, rep: 1, shape: 'topes', color: '#F78EB6' },
  organizador: { name: 'Organizador modular', tech: 'fdm', mat: 'PETG', size: 'M', time: 65, price: 30000, use: 150, rep: 1, space: 2, shape: 'organizador', color: '#5DDADB' },
  llaveromulti: { name: 'Llavero multicolor', tech: 'fdm', mat: 'PLA', size: 'S', time: 18, price: 9000, use: 12, rep: 1, multi: true, shape: 'llavero', color: '#ffd166', colors: ['#ffd166', '#F78EB6', '#5DDADB'] },
  carcasa: { name: 'Carcasa para electrónica', tech: 'fdm', mat: 'ASA', size: 'M', time: 62, price: 35000, use: 120, rep: 1, enclosed: true, shape: 'carcasa', color: '#e8e8e8' },
  casco: { name: 'Casco cosplay', tech: 'fdm', mat: 'PLA', size: 'L', time: 185, price: 120000, use: 600, rep: 5, shape: 'casco', color: '#e2e8f0' },
  lampara: { name: 'Lámpara multicolor', tech: 'fdm', mat: 'PLA', size: 'M', time: 73, price: 45000, use: 120, rep: 6, multi: true, shape: 'lampara', color: '#F78EB6', colors: ['#F78EB6', '#5DDADB', '#c4b5fd'] },
  maqueta: { name: 'Maqueta de arquitectura', tech: 'fdm', mat: 'PLA', size: 'L', time: 312, price: 250000, use: 400, rep: 7, minStars: 4, shape: 'maqueta', color: '#f1f1f1' },
  figurapintada: { name: 'Figura multicolor premium', tech: 'fdm', mat: 'PLA', size: 'M', time: 141, price: 120000, use: 100, rep: 8, minStars: 4, multi: true, shape: 'figura', color: '#ffd166', colors: ['#ffd166', '#3437A2', '#F78EB6'] },
  dron: { name: 'Frame de dron', tech: 'fdm', mat: 'PACF', size: 'M', time: 189, price: 180000, use: 150, rep: 9, minStars: 4, enclosed: true, shape: 'dron', color: '#3b3f4a' },
  armadura: { name: 'Armadura cosplay completa', tech: 'fdm', mat: 'PLA', size: 'XL', time: 750, price: 900000, use: 3000, rep: 9, minStars: 4, shape: 'armadura', color: '#c9d1dc' },
  silla: { name: 'Silla impresa de diseño', tech: 'fdm', mat: 'PETG', size: 'XL', time: 857, price: 1200000, use: 6000, rep: 11, minStars: 4, shape: 'silla', color: '#5DDADB' },
  industrial: { name: 'Repuesto industrial', tech: 'fdm', mat: 'PACF', size: 'L', time: 882, price: 1500000, use: 500, rep: 12, minStars: 5, enclosed: true, shape: 'engranaje', color: '#2b2f38' },
  // Resina
  miniatura: { name: 'Miniatura de rol 32 mm', tech: 'resin', mat: 'RESINA', size: 'S', time: 20, price: 12000, use: 20, rep: 1, shape: 'miniatura', color: '#9aa3b2' },
  joya: { name: 'Prototipo de joyería', tech: 'resin', mat: 'RESINA', size: 'S', time: 67, price: 60000, use: 10, rep: 7, minStars: 5, shape: 'anillo', color: '#ffd166' },
  dental: { name: 'Modelo dental', tech: 'resin', mat: 'RESINA', size: 'S', time: 109, price: 120000, use: 40, rep: 9, minStars: 5, shape: 'dental', color: '#f4efe6' },
  busto: { name: 'Busto de colección', tech: 'resin', mat: 'RESINA', size: 'M', time: 300, price: 450000, use: 300, rep: 10, minStars: 5, shape: 'busto', color: '#cfd6e0' },
  // Láser
  llaveroacr: { name: 'Llavero de acrílico grabado', tech: 'laser', mat: 'ACRILICO', size: 'S', time: 7, price: 4600, use: 50, rep: 1, shape: 'placa', color: '#f7a8c9' },
  posavasos: { name: 'Set de 6 posavasos para cervecería', tech: 'laser', mat: 'MDF', size: 'S', time: 19, price: 15000, use: 60, rep: 1, shape: 'posavasos', color: '#b98a5a' },
  caja: { name: 'Caja de MDF encastrable', tech: 'laser', mat: 'MDF', size: 'M', time: 39, price: 35000, use: 300, rep: 1, shape: 'caja', color: '#b98a5a' },
  cartel: { name: 'Cartel de acrílico con LED', tech: 'laser', mat: 'ACRILICO', size: 'M', time: 138, price: 180000, use: 400, rep: 9, minStars: 4, shape: 'cartel', color: '#5DDADB' },
  mural: { name: 'Mural de MDF calado', tech: 'laser', mat: 'MDF', size: 'XL', time: 1091, price: 2400000, use: 4000, rep: 11, minStars: 5, shape: 'mural', color: '#b98a5a' },
  // CNC
  tabla: { name: 'Tabla de asado grabada', tech: 'cnc', mat: 'MADERA', size: 'M', time: 60, price: 60000, use: 400, rep: 1, shape: 'tabla', color: '#a0703f' },
  cartelmad: { name: 'Cartel tallado en madera', tech: 'cnc', mat: 'MADERA', size: 'L', time: 267, price: 400000, use: 900, rep: 10, shape: 'cartelmad', color: '#8a5a2b' },
  alu: { name: 'Pieza de aluminio mecanizada', tech: 'cnc', mat: 'ALU', size: 'S', time: 409, price: 900000, use: 200, rep: 11, minStars: 5, shape: 'alu', color: '#c9d1dc' },
  mueble: { name: 'Mueble de diseño fresado', tech: 'cnc', mat: 'MADERA', size: 'XL', time: 2000, price: 6000000, use: 6000, rep: 12, minStars: 5, shape: 'mueble', color: '#a0703f' },
};
for (const [id, p] of Object.entries(PRODUCTS)) p.id = id;
export const PRODUCT_ORDER = Object.keys(PRODUCTS);

// Experiencia por producto (no se pierde con la Mudanza): cada nivel, +12 % de precio.
export const MASTERY_BASE = 25;
export const MASTERY_GROWTH = 3;
export const MASTERY_BONUS = 1.12;

// ---------- Mejoras ----------
// max: niveles (sin max = infinita) · growth: multiplicador de costo por nivel
export const UPGRADES = {
  slicer: { name: 'Perfiles en Orca Slicer', cat: 'Velocidad', cost: 12000, growth: 3.2, desc: '+5 % de velocidad en impresión 3D por nivel.', tip: 'El slicer corta el modelo en capas y decide cómo se imprime.' },
  pei: { name: 'Cama PEI texturada', cat: 'Confiabilidad', cost: 35000, max: 1, desc: 'Las piezas pegan mejor: la mitad de spaghetti, warping y primeras capas fallidas.' },
  sobrino: { name: 'Sobrino ayudante', cat: 'Automatización', cost: 60000, max: 1, desc: 'Retira una pieza terminada cada 8 s. Con la Expulsión automática asciende a logística.', flavor: 'Sabe de compus. Más o menos.' },
  termo: { name: 'Termo Stanley', cat: 'Mate', cost: 80000, max: 1, desc: 'El mate dura 90 s en vez de 60 s.' },
  calibracion: { name: 'Calibración de flujo', cat: 'Calidad', cost: 40000, rep: 2, max: 1, desc: '+1★ en las impresoras de ★1 y ★2.' },
  bulk: { name: 'Compra por mayor', cat: 'Materiales', cost: 150000, rep: 2, max: 1, desc: '−20 % en el precio de todos los materiales.' },
  petg: { name: 'Kit PETG', cat: 'Tecnología', cost: 120000, rep: 3, max: 1, desc: 'Cama a 80 °C y hotend all-metal: desbloquea el PETG.' },
  proveedor: { name: 'Proveedor oficial: Filacolor', cat: 'Automatización', cost: 300000, rep: 3, max: 1, desc: 'Te repone solo el material cuando se acaba (con 10 % de recargo por el envío).', flavor: 'Filacolor es el proveedor oficial de la Comunidad Makers 3DBAT.' },
  retraccion: { name: 'Ajuste de retracción', cat: 'Calidad', cost: 50000, rep: 3, max: 1, desc: 'Chau hilos: elimina el stringing.', tip: 'La retracción tira el filamento para atrás para que no gotee.' },
  yerba: { name: 'Yerba de la buena', cat: 'Mate', cost: 15000, rep: 3, max: 1, desc: 'El mate se recarga en 3 min en vez de 5.', flavor: 'Con palo, obvio.' },
  instagram: { name: 'Ventas por Instagram', cat: 'Marca', cost: 200000, growth: 4, rep: 4, desc: '+10 % a la paga de los pedidos por nivel.', flavor: 'Fotos lindas, historias y respuestas rápidas.' },
  hotend: { name: 'Hotend de alto flujo', cat: 'Velocidad', cost: 180000, growth: 4, max: 3, rep: 4, desc: '+10 % de velocidad en impresión 3D por nivel.' },
  tablero: { name: 'Tablero de pedidos ampliado', cat: 'Capacidad', cost: 250000, rep: 4, max: 1, desc: 'Hasta 5 pedidos a la vez (en vez de 3).' },
  secador: { name: 'Secador de filamento', cat: 'Confiabilidad', cost: 120000, rep: 4, max: 1, desc: 'Elimina el filamento húmedo.' },
  directo: { name: 'Extrusor directo', cat: 'Tecnología', cost: 150000, rep: 4, max: 1, desc: 'Desbloquea el TPU.', flavor: 'Con bowden, ni lo intentes.' },
  marca: { name: 'Marca personal', cat: 'Marca', cost: 500000, growth: 4, rep: 5, desc: '+8 % al precio de todo lo que vendés por nivel.' },
  boquilla: { name: 'Boquilla de acero endurecido', cat: 'Calidad', cost: 60000, rep: 5, max: 1, desc: '+1★ en impresión 3D y −70 % de boquillas tapadas.' },
  camara: { name: 'Cámara con detección de spaghetti', cat: 'Confiabilidad', cost: 250000, rep: 5, max: 1, desc: 'Detecta el spaghetti y limpia sola en 3 s.' },
  abs: { name: 'Extractor y gabinete: ABS/ASA', cat: 'Tecnología', cost: 450000, rep: 5, max: 1, desc: 'Desbloquea ABS/ASA (solo en impresoras cerradas).' },
  input: { name: 'Input shaping y Klipper', cat: 'Velocidad', cost: 300000, rep: 5, max: 1, desc: '+20 % de velocidad en las impresoras CoreXY cerradas.', tip: 'El firmware compensa las vibraciones para imprimir rápido sin "fantasmas".' },
  remota: { name: 'Cámara remota', cat: 'Automatización', cost: 400000, rep: 6, max: 1, desc: 'Mientras no estás: hasta 6 h y 80 % de rendimiento.' },
  ams: { name: 'Sistema multicolor (AMS lite / ACE / MMU)', cat: 'Tecnología', cost: 900000, rep: 5, max: 1, desc: 'Las impresoras compatibles imprimen piezas multicolor.' },
  expulsion: { name: 'Expulsión automática', cat: 'Automatización', cost: 1500000, rep: 6, max: 1, desc: 'Las piezas se retiran solas al instante. Si tenés al sobrino, asciende: ordena las bobinas y despacha los pedidos (+5 % en pedidos).' },
  resina: { name: 'Rincón de resina', cat: 'Tecnología', cost: 900000, rep: 6, space: 3, max: 1, desc: 'Estación de lavado y curado, guantes y ventilación: desbloquea la resina.' },
  ups: { name: 'UPS: recuperación ante cortes', cat: 'Confiabilidad', cost: 800000, rep: 6, max: 1, desc: 'Un corte de luz ya no reinicia las piezas.' },
  gestor: { name: 'Gestor de pedidos', cat: 'Automatización', cost: 2000000, rep: 7, max: 1, desc: 'Acepta los pedidos que podés cumplir y les asigna máquinas.' },
  exposicion: { name: 'Exposición calibrada', cat: 'Velocidad', cost: 500000, growth: 4, rep: 7, req: 'resina', desc: '+15 % de velocidad en resina por nivel.' },
  nylon: { name: 'Kit fibra de carbono', cat: 'Tecnología', cost: 1200000, rep: 8, max: 1, desc: 'Desbloquea el nylon con fibra de carbono.' },
  laser: { name: 'Sala de láser', cat: 'Tecnología', cost: 3500000, rep: 8, space: 4, max: 1, desc: 'Extractor, gafas y matafuego: desbloquea el corte y grabado láser.' },
  potencia: { name: 'Potencia y asistencia de aire', cat: 'Velocidad', cost: 2000000, growth: 4, rep: 8, req: 'laser', desc: '+15 % de velocidad en láser por nivel.' },
  cnc: { name: 'Taller de CNC', cat: 'Tecnología', cost: 6000000, rep: 9, space: 5, max: 1, desc: 'Aspiradora, fresas y sujeciones: desbloquea el fresado CNC.' },
  fresas: { name: 'Fresas de metal duro', cat: 'Velocidad', cost: 3000000, growth: 4, rep: 9, req: 'cnc', desc: '+15 % de velocidad en CNC por nivel.' },
  granja: { name: 'Software de granja', cat: 'Automatización', cost: 50000000, growth: 5, rep: 11, desc: '+10 % de velocidad en todas las máquinas por nivel.' },
};
for (const [id, u] of Object.entries(UPGRADES)) { u.id = id; u.growth = u.growth || 1; u.rep = u.rep || 1; }
export const UPGRADE_ORDER = Object.keys(UPGRADES);

// Reputación: puntos necesarios para cada nivel (después del 10, sigue creciendo sin techo).
export const REP_TABLE = [0, 0, 3, 10, 24, 50, 95, 160, 250, 380, 560];
export function repNeeded(level) {
  if (level < REP_TABLE.length) return REP_TABLE[level];
  return Math.round(560 * Math.pow(1.45, level - 10));
}
export const REP_PRICE_BONUS = 0.03;

// ---------- Pedidos ----------
export const ORDER_TEMPLATES = [
  { id: 'vecina', client: 'Doña Marta, la vecina', title: 'Un regalito para la nieta', items: [['llavero', 5]], time: 240, mult: 2, rep: 1, weight: 3 },
  { id: 'cumple', client: 'Mamá de Martina', title: 'Llaveros para el cumple de Martina', items: [['llavero', 12]], time: 480, mult: 1.5, rep: 1, weight: 3, flavor: 'Con los nombres de los 12 invitados. Sí, todos distintos.' },
  { id: 'tio', client: 'Tu tío', title: 'Soporte para el celu del tío', items: [['soporte', 1]], time: 240, mult: 3, rep: 1, weight: 2 },
  { id: 'club', client: 'Club de modelismo', title: 'Benchys para la exposición', items: [['benchy', 10]], time: 600, mult: 2, rep: 2, weight: 2 },
  { id: 'exposicion', client: 'Un influencer', title: '«Te lo pago con exposición»', items: [['benchy', 6]], time: 420, mult: 0, rep: 4, weight: 1, flavor: 'No paga nada, pero te nombra en sus historias. ¿Vale la pena?' },
  { id: 'vivero', client: 'Vivero «El Ceibo»', title: 'Macetas para el vivero', items: [['maceta', 8]], time: 1200, mult: 2, rep: 3, weight: 2, frequent: true },
  { id: 'dorado', client: 'Clienta indecisa', title: '«¿Y si lo hacemos en dorado?»', items: [['maceta', 4]], time: 600, mult: 3, rep: 2, weight: 1 },
  { id: 'ferreteria', client: 'Ferretería del barrio', title: 'Ganchos para la ferretería', items: [['gancho', 15]], time: 900, mult: 2, rep: 2, weight: 2, frequent: true },
  { id: 'lavarropas', client: 'Don Rubén', title: 'Repuesto del lavarropas', items: [['engranaje', 2]], time: 600, mult: 4, rep: 3, weight: 2, minStars: 3, flavor: 'El original sale una fortuna y tarda tres meses.' },
  { id: 'streamer', client: 'Un streamer', title: 'Merch para el stream', items: [['figura', 10]], time: 1500, mult: 2, rep: 3, weight: 2, minStars: 3 },
  { id: 'muebleria', client: 'Mueblería «La Esquina»', title: 'Topes para sillas', items: [['topes', 20]], time: 1200, mult: 2.5, rep: 3, weight: 2 },
  { id: 'escuela', client: 'Escuela técnica', title: 'Kit de robótica para el taller', items: [['gancho', 12], ['engranaje', 4]], time: 1800, mult: 2.5, rep: 5, weight: 2, minStars: 3 },
  { id: 'emprendedora', client: 'Emprendedora de bijou', title: 'Organizadores para el local', items: [['organizador', 4]], time: 1800, mult: 2.5, rep: 4, weight: 2, frequent: true },
  { id: 'colores', client: 'Jardín de infantes', title: 'Llaveros multicolor para fin de año', items: [['llaveromulti', 25]], time: 1800, mult: 2.5, rep: 5, weight: 2 },
  { id: 'robotica', client: 'Club de robótica', title: 'Carcasas para los robots', items: [['carcasa', 6]], time: 2400, mult: 2.5, rep: 6, weight: 2 },
  { id: 'cosplay', client: 'Grupo de cosplay', title: 'Cascos para la convención', items: [['casco', 2]], time: 2700, mult: 3, rep: 6, weight: 2 },
  { id: 'deco', client: 'Tienda de deco', title: 'Lámparas para la vidriera', items: [['lampara', 4]], time: 2400, mult: 2.5, rep: 7, weight: 2, frequent: true },
  { id: 'arquitecta', client: 'Estudio de arquitectura', title: 'Maqueta para la presentación', items: [['maqueta', 1]], time: 2400, mult: 3, rep: 8, weight: 2, minStars: 4 },
  { id: 'rol', client: 'Club de rol «El Dado»', title: 'Miniaturas para la campaña', items: [['miniatura', 12]], time: 3600, mult: 2.5, rep: 8, weight: 2, frequent: true },
  { id: 'coleccion', client: 'Tienda de coleccionables', title: 'Figuras premium edición limitada', items: [['figurapintada', 6]], time: 3600, mult: 2.5, rep: 9, weight: 2, minStars: 4 },
  { id: 'joyeria', client: 'Joyería del centro', title: 'Prototipos de anillos', items: [['joya', 6]], time: 3600, mult: 3, rep: 9, weight: 2, minStars: 5 },
  { id: 'drones', client: 'Startup de drones', title: 'Frames para la serie 1', items: [['dron', 6]], time: 3600, mult: 3, rep: 10, weight: 2, minStars: 4 },
  { id: 'cerveceria', client: 'Cervecería artesanal', title: 'Posavasos con el logo', items: [['posavasos', 60]], time: 2400, mult: 2.5, rep: 9, weight: 2, frequent: true },
  { id: 'parrilla', client: 'Parrilla «Don Carlos»', title: 'Tablas de asado grabadas', items: [['tabla', 10]], time: 4800, mult: 2.5, rep: 11, weight: 2, frequent: true },
  { id: 'dentista', client: 'Clínica dental', title: 'Modelos para alineadores', items: [['dental', 10]], time: 4800, mult: 3, rep: 11, weight: 2, minStars: 5 },
  { id: 'marca', client: 'Agencia de publicidad', title: 'Carteles para una marca', items: [['cartel', 8], ['caja', 20]], time: 4800, mult: 3, rep: 12, weight: 2, minStars: 4 },
  { id: 'cine', client: 'Productora de cine', title: 'Armaduras para una película', items: [['armadura', 2], ['casco', 4]], time: 7200, mult: 3.5, rep: 13, weight: 2, minStars: 4 },
  { id: 'autopartes', client: 'Fábrica de autopartes', title: 'Repuestos para la línea', items: [['industrial', 6], ['alu', 4]], time: 9000, mult: 3.5, rep: 15, weight: 2, minStars: 5 },
  { id: 'hotel', client: 'Hotel boutique', title: 'Muebles y murales para el lobby', items: [['mueble', 2], ['silla', 4], ['mural', 2]], time: 14400, mult: 4, rep: 18, weight: 2, minStars: 5 },
];
export const ORDER_OFFER_LIFE = 240;
export const ORDER_SPAWN_EVERY = 40;

// Contratos de empresa: pedidos grandes que además dan fichas.
// Mods por máquina: 3 ranuras en cada una. Efectos: speed (×), fail (×), stars (+), use (× material).
// cost = fracción del precio base de la máquina.
export const MOD_SLOTS = 3;
export const MODS = {
  hotend: { tech: 'fdm', name: 'Hotend de alto flujo', icon: '🔥', speed: 1.2, cost: 0.18, blurb: '+20 % de velocidad.' },
  boq06: { tech: 'fdm', name: 'Boquilla 0.6', icon: '🎯', speed: 1.35, stars: -1, cost: 0.08, blurb: '+35 % de velocidad, pero −1 ★ de calidad.' },
  gabinete: { tech: 'fdm', name: 'Gabinete cerrado', icon: '📦', fail: 0.7, cost: 0.15, blurb: '−30 % de fallas (sin corrientes de aire ni gatos).' },
  pei: { tech: 'fdm', name: 'Placa PEI texturada', icon: '🧲', use: 0.9, fail: 0.9, cost: 0.1, blurb: '−10 % de material y −10 % de fallas de adherencia.' },
  endurecida: { tech: 'fdm', name: 'Boquilla endurecida', icon: '💎', stars: 1, cost: 0.25, blurb: '+1 ★ de calidad.' },
  fep: { tech: 'resin', name: 'Film FEP premium', icon: '🎞️', fail: 0.7, cost: 0.15, blurb: '−30 % de fallas.' },
  calefactor: { tech: 'resin', name: 'Calefactor de cuba', icon: '♨️', speed: 1.2, cost: 0.15, blurb: '+20 % de velocidad (la resina tibia fluye mejor).' },
  lcd16k: { tech: 'resin', name: 'Pantalla 16K', icon: '🖥️', stars: 1, cost: 0.3, blurb: '+1 ★ de calidad.' },
  airassist: { tech: 'laser', name: 'Air assist', icon: '💨', speed: 1.25, fail: 0.9, cost: 0.15, blurb: '+25 % de velocidad y −10 % de fallas.' },
  extractor: { tech: 'laser', name: 'Extractor de humo', icon: '🌀', fail: 0.7, cost: 0.12, blurb: '−30 % de fallas.' },
  lente: { tech: 'laser', name: 'Lente premium', icon: '🔍', stars: 1, cost: 0.25, blurb: '+1 ★ de calidad.' },
  husillo: { tech: 'cnc', name: 'Husillo reforzado', icon: '⚙️', speed: 1.25, cost: 0.2, blurb: '+25 % de velocidad.' },
  aspiracion: { tech: 'cnc', name: 'Aspiración de virutas', icon: '🧹', fail: 0.7, cost: 0.12, blurb: '−30 % de fallas.' },
  fresas: { tech: 'cnc', name: 'Fresas premium', icon: '🪛', stars: 1, use: 0.95, cost: 0.25, blurb: '+1 ★ de calidad y −5 % de material.' },
};

// Proyectos grandes de varias etapas (desde Reputación 7). Cada etapa usa una tecnología;
// si todavía no la tenés, esa etapa se hace con lo que tengas.
export const PROJECTS = [
  { id: 'cafeteria', client: 'Café «La Boquilla»', name: 'Cafetería maker', icon: '☕',
    stages: [['fdm', 'Macetas y soportes para el salón'], ['laser', 'Carteles y posavasos'], ['cnc', 'Tablas y mesas de madera'], ['resin', 'Figuras para la vitrina']] },
  { id: 'feria', client: 'Feria Gamer del Sur', name: 'Feria gamer', icon: '🎮',
    stages: [['resin', 'Figuras de colección para el stand'], ['fdm', 'Soportes y accesorios gamer'], ['laser', 'Credenciales y carteles']] },
  { id: 'stand', client: 'Estudio Kimbo', name: 'Stand empresarial', icon: '🏢',
    stages: [['laser', 'Cartelería del stand'], ['cnc', 'Mostrador fresado'], ['fdm', 'Regalos empresariales']] },
  { id: 'robotica', client: 'Escuela técnica N.º 3', name: 'Laboratorio de robótica', icon: '🤖',
    stages: [['fdm', 'Piezas para los robots'], ['laser', 'Cajas y chasis'], ['cnc', 'Bases mecanizadas']] },
  { id: 'museo', client: 'Museo interactivo', name: 'Sala del museo', icon: '🏛️',
    stages: [['resin', 'Réplicas de piezas históricas'], ['cnc', 'Pedestales de madera'], ['laser', 'Placas descriptivas'], ['fdm', 'Maquetas para tocar']] },
];
export const PROJECT_BONUS = 0.5; // al terminar todas las etapas: +50 % de lo cobrado

// ---------- Ciudad: mapa de demanda, talleres rivales y Expo Maker ----------
// Zonas de la ciudad: cada 30 minutos de juego cambia cuáles piden más (×1,4) y cuál está floja (×0,85).
export const ZONES = [
  { id: 'escuelas', name: 'Escuelas', icon: '🏫', blurb: 'Material didáctico, robótica y maquetas.', products: ['engranaje', 'maqueta', 'dron', 'caja', 'llavero', 'carcasa'] },
  { id: 'comercios', name: 'Comercios', icon: '🏪', blurb: 'Locales que necesitan exhibir y ordenar.', products: ['soporte', 'organizador', 'maceta', 'cartel', 'gancho', 'llaveroacr'] },
  { id: 'industria', name: 'Industria', icon: '🏭', blurb: 'Repuestos y piezas técnicas, sin vueltas.', products: ['industrial', 'engranaje', 'alu', 'carcasa', 'topes', 'dental'] },
  { id: 'eventos', name: 'Eventos', icon: '🎉', blurb: 'Cumpleaños, casamientos y fiestas de empresa.', products: ['llavero', 'llaveromulti', 'llaverobati', 'posavasos', 'tabla', 'cartelmad'] },
  { id: 'gamers', name: 'Gamers', icon: '🎮', blurb: 'Figuras, cosplay y coleccionables.', products: ['figura', 'figurapintada', 'miniatura', 'casco', 'armadura', 'busto', 'benchy'] },
  { id: 'diseno', name: 'Diseño y deco', icon: '📐', blurb: 'Estudios, arquitectos y tiendas de diseño.', products: ['lampara', 'silla', 'mueble', 'maqueta', 'mural', 'joya'] },
];
export const DEMAND_HOT = 1.4, DEMAND_COLD = 0.85, DEMAND_EVERY = 1800;
// Talleres rivales (NPC): compiten por fama, a veces se quedan con un pedido que dejaste esperando y van a la Expo.
export const RIVALS = [
  { id: 'barato', name: 'TodoBarato3D', icon: '💸', pace: 0.85, zone: 'comercios', style: 'Hace todo barato y rápido. La calidad… otro día.', quote: '«¿Para qué pagar más?»' },
  { id: 'premium', name: 'Premium Prints', icon: '💎', pace: 1.15, zone: 'diseno', style: 'Solo trabajos premium, con precios de joyería.', quote: '«La calidad no se negocia.»' },
  { id: 'rompe', name: 'RompeTodo Makers', icon: '💥', pace: 0.7, zone: 'industria', style: 'Vive rompiendo máquinas, pero no se rinde nunca.', quote: '«¡Se trabó otra vez!»' },
  { id: 'cosplay', name: 'Cosplay Factory', icon: '🦸', pace: 1.0, zone: 'gamers', style: 'Cascos, armaduras y figuras para la Comic-Con.', quote: '«Si no brilla, no sirve.»' },
];
// Expo Maker: el gran evento. 15 minutos para producir lo que vas a mostrar.
export const EXPO_PREP = 900, EXPO_EVERY = 5400, EXPO_REP = 6;
export const EXPO_STANDS = [
  { id: 0, name: 'Mesa simple', icon: '🪑', mult: 1, cost: 0 },
  { id: 1, name: 'Stand decorado', icon: '🎪', mult: 1.3, cost: 0.4 },   // cost × ingreso de 10 min
  { id: 2, name: 'Stand premium con luces', icon: '✨', mult: 1.6, cost: 1.2 },
];

// Pisos de la Nave y la Planta (uno por tecnología, 20 lugares cada uno).
export const FLOORS = [
  { id: 'fdm', name: 'FDM', long: 'FDM Lab', icon: '🖨️', blurb: 'El corazón de la granja: volumen y velocidad.' },
  { id: 'resin', name: 'Resina', long: 'Resin Lab', icon: '🧪', blurb: 'Laboratorio oscuro y prolijo: piezas premium y detalladas.' },
  { id: 'laser', name: 'Láser', long: 'Laser Workshop', icon: '🔥', blurb: 'Trabajos rápidos y personalizados, de alta rotación.' },
  { id: 'cnc', name: 'CNC', long: 'CNC Factory', icon: '⚙️', blurb: 'Lo más pesado: piezas grandes y contratos industriales.' },
];
export const FLOOR_SLOTS = 20;
export const COMBO_CLIENTS = ['Estudio de arquitectura', 'Agencia de eventos', 'Marca de indumentaria', 'Museo interactivo', 'Cervecería artesanal', 'Escuela técnica'];
export const CONTRACT_CLIENTS = [
  'Municipalidad', 'Estudio de diseño', 'Cadena de jugueterías', 'Museo de ciencias', 'Feria de la Comunidad Makers',
  'Fábrica de electrodomésticos', 'Escuela de arquitectura', 'Productora de eventos', 'Universidad tecnológica', 'Club de fútbol',
];

// ---------- Problemas de máquina ----------
// tech: en qué tecnologías aparece
export const MACHINE_EVENTS = {
  spaghetti: { tech: ['fdm'], name: 'Spaghetti', icon: '🍝', weight: 3, text: 'La pieza se despegó y la impresora está haciendo un nido de filamento.',
    options: [{ label: 'Limpiar y reintentar', act: 'taps', n: 3, effect: 'restart' }], prevent: 'Cama PEI (menos chance) · Cámara con detección (se limpia sola)' },
  warping: { tech: ['fdm'], name: 'Warping', icon: '🥨', weight: 2, text: 'Se levantaron las esquinas de la pieza.',
    options: [{ label: 'Entregarla igual (−1★)', effect: 'penalty' }, { label: 'Reimprimir con brim (+20 % de tiempo)', effect: 'brim' }], prevent: 'Cama PEI · impresoras cerradas (inmunes)' },
  tapada: { tech: ['fdm'], name: 'Boquilla tapada', icon: '🪡', weight: 2, text: 'Clac, clac, clac. El extrusor empuja pero no sale nada.',
    options: [{ label: 'Mantené apretado para destapar', act: 'hold', effect: 'resume' }], prevent: 'Boquilla de acero endurecido' },
  primeracapa: { tech: ['fdm'], name: 'Primera capa que no pega', icon: '📏', weight: 2, text: 'Las líneas de la primera capa salen sueltas. Hay que nivelar la cama.',
    options: [{ label: 'Ajustá los 3 tornillos', act: 'taps', n: 3, effect: 'restart', free: true }], prevent: 'Impresoras con autonivelado' },
  humedo: { tech: ['fdm'], name: 'Filamento húmedo', icon: '💧', weight: 2, text: '«Pop, pop, pop». El filamento chupó humedad y la pieza sale con burbujas.',
    options: [{ label: 'Secar la bobina (pausa 30 s)', effect: 'pause' }, { label: 'Seguir igual (−1★)', effect: 'penalty' }], prevent: 'Secador de filamento' },
  orientacion: { tech: ['fdm', 'resin'], name: 'Pieza mal orientada', icon: '🧭', weight: 2, text: 'La pieza quedó mal orientada y está llena de soportes.',
    options: [{ label: 'Seguir (tarda el doble)', effect: 'slow' }, { label: 'Reorientar en el slicer (reinicia, 30 % más rápida)', effect: 'reorient' }], prevent: 'Perfiles en Orca Slicer nivel 3' },
  stringing: { tech: ['fdm'], name: 'Hilos por todos lados', icon: '🕸️', weight: 2, text: 'La pieza parece una telaraña.',
    options: [{ label: 'Pasarle el pistolón de calor', act: 'tap', effect: 'resume' }, { label: 'Entregarla así (−1★)', effect: 'penalty' }], prevent: 'Ajuste de retracción' },
  layershift: { tech: ['fdm'], name: 'Correa floja', icon: '🪜', weight: 1, text: 'Las capas se corrieron: la pieza salió «escalonada».',
    options: [{ label: 'Tensar la correa y reimprimir', act: 'taps', n: 2, effect: 'restart' }], prevent: 'Máquinas de gama media en adelante' },
  gato: { tech: ['fdm'], name: 'El gato se subió a la impresora', icon: '🐈‍⬛', weight: 1, cute: true, text: 'Encontró la cama caliente y no piensa moverse.',
    options: [{ label: 'Bajar al gato', act: 'tap', effect: 'resume' }], prevent: 'Ninguna. El gato es parte del equipo.' },
  fep: { tech: ['resin'], name: 'Pieza pegada al FEP', icon: '🫠', weight: 3, text: 'La pieza quedó pegada al fondo de la cubeta en vez de a la plataforma.',
    options: [{ label: 'Limpiar la cubeta y reintentar', act: 'taps', n: 3, effect: 'restart' }], prevent: 'Exposición calibrada nivel 2' },
  fria: { tech: ['resin'], name: 'Resina fría', icon: '🥶', weight: 2, text: 'Es invierno y la resina está espesa. Las capas no curan bien.',
    options: [{ label: 'Calentar la resina (pausa 30 s)', effect: 'pause' }, { label: 'Seguir igual (−1★)', effect: 'penalty' }], prevent: 'Resinas con calefacción (Photon M7 Pro en adelante)' },
  ipa: { tech: ['resin'], name: 'Sin alcohol isopropílico', icon: '🧴', weight: 1, text: 'Te quedaste sin IPA para lavar las piezas.',
    options: [{ label: 'Ir a la farmacia (pausa 30 s)', effect: 'pause' }], prevent: 'Proveedor oficial: Filacolor' },
  foco: { tech: ['laser'], name: 'Láser mal enfocado', icon: '🎯', weight: 3, text: 'El corte no atraviesa el material: quedó todo a medias.',
    options: [{ label: 'Enfocar de nuevo', act: 'taps', n: 2, effect: 'resume' }, { label: 'Entregarlo así (−1★)', effect: 'penalty' }], prevent: 'Láseres cerrados con autofoco' },
  llama: { tech: ['laser'], name: 'Llama en el corte', icon: '🔥', weight: 2, text: '¡Se prendió fuego el MDF! Tranquilo: es chiquita.',
    options: [{ label: 'Mantené apretado para apagarla', act: 'hold', effect: 'restart' }], prevent: 'Potencia y asistencia de aire' },
  humo: { tech: ['laser'], name: 'Extractor tapado', icon: '🌫️', weight: 1, text: 'El taller está lleno de humo y huele a asado de MDF.',
    options: [{ label: 'Limpiar el extractor (pausa 30 s)', effect: 'pause' }], prevent: 'Láseres cerrados con filtro' },
  fresa: { tech: ['cnc'], name: 'Fresa rota', icon: '🪛', weight: 2, text: '¡Crac! Se partió la fresa en plena pasada.',
    options: [{ label: 'Cambiar la fresa y reintentar', act: 'taps', n: 3, effect: 'restart' }], prevent: 'Fresas de metal duro nivel 2' },
  sujecion: { tech: ['cnc'], name: 'Se soltó la pieza', icon: '🗜️', weight: 2, text: 'La madera se movió de la cama y el corte salió torcido.',
    options: [{ label: 'Ajustar las mordazas y reintentar', act: 'taps', n: 2, effect: 'restart' }], prevent: 'CNC de gama alta' },
  viruta: { tech: ['cnc'], name: 'Viruta por todos lados', icon: '🪵', weight: 2, text: 'La aspiradora no da abasto. No se ve ni la pieza.',
    options: [{ label: 'Aspirar', act: 'tap', effect: 'resume' }], prevent: 'CNC cerradas' },
};

// ---------- Eventos globales ----------
export const GLOBAL_EVENTS = {
  corte: { name: 'Se cortó la luz en el barrio', icon: '🔌', neg: true, weight: 1, text: 'Se apagó todo el taller. Esperá que vuelva la luz y reanudá.' },
  cambio: { name: 'El cliente cambió el diseño', icon: '✏️', weight: 2, text: '«¿Y si le agregamos el logo?» Tu cliente quiere un 30 % más de piezas.' },
  favor: { name: '«Una cosita rápida»', icon: '🤝', weight: 2, text: 'Un amigo te pide un favor: un llavero para su llavero. Gratis, obvio.' },
  viral: { name: 'Tu timelapse se hizo viral', icon: '📈', weight: 2, pos: true, text: 'El video de una impresión explotó en redes. ¡Aprovechá la ola!' },
  misteriosa: { name: 'Bobina misteriosa en oferta', icon: '🎁', weight: 1, text: 'Un vendedor te ofrece 2 bobinas de PLA «sin marca» a precio regalado.' },
  urgente: { name: 'Pedido urgente', icon: '⚡', weight: 2, pos: true, text: '«Lo necesito para mañana». Paga x5 si llegás a tiempo.' },
  feria: { name: 'Feria maker en el barrio', icon: '🎪', weight: 1, pos: true, text: 'Hay feria este finde. Si armás un stand, vendés todo un 50 % más caro por 5 min.' },
};

// ---------- Desafíos de maestría (se juegan como una Mudanza con reglas especiales) ----------
export const MASTERY_CHALLENGES = {
  sinmate: { name: 'Sin mate', rule: 'No se puede cebar mate.', goalText: 'Llegá al Garage taller.', goal: { space: 2 },
    reward: 'El mate da +100 % de velocidad (en vez de +50 %).' },
  amano: { name: 'Todo a mano', rule: 'Sin sobrino, sin expulsión, sin proveedor ni gestor.', goalText: 'Llegá al Garage taller.', goal: { space: 2 },
    reward: 'El sobrino retira cada 4 s.' },
  soloender: { name: 'Solo Ender', rule: 'Solo podés comprar Creality Ender-3 V3 SE.', goalText: 'Juntá {$:3000000} en el Cuarto maker.', goal: { space: 1, earned: 3e6 },
    reward: 'Las Ender-3 van ×3 más rápido para siempre.' },
  verano: { name: 'Verano porteño', rule: 'Se corta la luz cada 6 minutos.', goalText: 'Abrí el Local con vidriera.', goal: { space: 3 },
    reward: 'Los cortes de luz nunca más reinician piezas.' },
  exigente: { name: 'Cliente exigente', rule: 'Todos los pedidos piden ★3 y tienen 30 % menos de plazo.', goalText: 'Completá 25 pedidos.', goal: { orders: 25 },
    reward: 'Los pedidos pagan +25 % para siempre.' },
  lluvias: { name: 'Temporada de lluvias', rule: 'Los problemas aparecen el triple.', goalText: 'Llegá al Garage taller.', goal: { space: 2 },
    reward: '−30 % de problemas para siempre.' },
  bobina: { name: 'Bobina contada', rule: 'Los materiales cuestan ×5.', goalText: 'Abrí el Local con vidriera.', goal: { space: 3 },
    reward: 'Materiales −30 % para siempre.' },
  mostrador: { name: 'Solo mostrador', rule: 'No llegan pedidos: solo venta suelta.', goalText: 'Ganá {$:50000000} en la partida.', goal: { earned: 5e7 },
    reward: 'La venta suelta paga +25 % para siempre.' },
};

// ---------- Tienda de fichas ----------
export const TOKEN_SHOP = {
  turbo: { name: 'Turbo de producción', desc: 'Todo vale el doble durante 20 minutos.', cost: 3 },
  salto: { name: 'Salto temporal', desc: 'Cobrás ya mismo 1 hora de producción.', cost: 5 },
  vip: { name: 'Contrato VIP', desc: 'Llega un contrato de empresa ahora.', cost: 2 },
  materiales: { name: 'Caja de materiales', desc: '5 unidades de cada material que tengas desbloqueado.', cost: 1 },
};

// ---------- Prestigio ----------
export const PERKS = {
  sobrino: { name: 'Sobrino de confianza', cost: 1, desc: 'El sobrino ayudante está desde el principio.' },
  termo: { name: 'Termo grande', cost: 1, desc: 'El mate dura 30 s más.' },
  mesa: { name: 'Mesa armada', cost: 1, desc: 'Arrancás con una Hellbot Magna SE además de la Ender, y {$:150000} en la caja.' },
  proveedor: { name: 'Proveedor amigo', cost: 2, desc: 'Proveedor automático desde el inicio y −10 % en materiales.' },
  contactos: { name: 'Contactos', cost: 2, desc: '+1 lugar en el tablero de pedidos y pedidos ×1,2.' },
  duermo: { name: 'Duermo tranquilo', cost: 2, desc: 'Mientras no estás: +3 h de tope y +20 % de rendimiento.' },
  manos: { name: 'Manos de mecánico', cost: 2, desc: 'Los problemas se resuelven solos a los 15 s si no los tocás.' },
  ojo: { name: 'Ojo clínico', cost: 3, desc: '−25 % de problemas en las máquinas.' },
  mirada: { name: 'Mirada de slicer', cost: 3, desc: '+1★ en todas las máquinas.' },
  reputacion: { name: 'Reputación que te precede', cost: 3, desc: 'Arrancás con Reputación 3.' },
  cuarto: { name: 'Dueño del cuarto', cost: 5, desc: 'Arrancás con el Cuarto maker ya armado.' },
  saberpetg: { name: 'Saber de materiales', cost: 8, desc: 'PETG y TPU desbloqueados desde el inicio.' },
  garage: { name: 'Dueño del garage', cost: 20, desc: 'Arrancás con el Garage taller ya armado.' },
  fieles: { name: 'Clientes fieles', cost: 25, desc: 'Al mudarte conservás el 25 % de tu reputación.' },
  saberresina: { name: 'Saber de resina', cost: 30, desc: 'El Rincón de resina queda armado para siempre.' },
  saberlaser: { name: 'Saber de láser', cost: 60, desc: 'La Sala de láser queda armada para siempre.' },
  sabercnc: { name: 'Saber de CNC', cost: 120, desc: 'El Taller de CNC queda armado para siempre.' },
  fieles2: { name: 'Clientela de toda la vida', cost: 200, desc: 'Al mudarte conservás el 50 % de tu reputación.' },
  local: { name: 'Dueño del local', cost: 400, desc: 'Arrancás con el Local con vidriera ya abierto.' },
};
export const MAKER_TITLES = [
  [0, 'Curioso'], [1, 'Aprendiz'], [5, 'Maker'], [15, 'Maker Pro'], [35, 'Maestro Maker'], [75, 'Leyenda 3DBAT'],
  [200, 'Referente nacional'], [600, 'Ícono maker'], [2000, 'Leyenda viviente'], [10000, 'Mito del filamento'],
];
export const OFICIO_BONUS = 0.5; // ver oficioMultOf en engine.js

// LEDs del taller (cosméticos)
export const LED_COLORS = {
  cyan: { name: 'Turquesa', color: '#5DDADB' },
  rosa: { name: 'Rosa', color: '#F78EB6', unlock: 'pedidos10' },
  violeta: { name: 'Violeta', color: '#8b8ff7', unlock: 'mudanza' },
  blanco: { name: 'Blanco cálido', color: '#ffe8c7', unlock: 'local' },
  verde: { name: 'Verde granja', color: '#34D399', unlock: 'mil' },
  naranja: { name: 'Naranja checo', color: '#fa6831', unlock: 'industrial' },
};

export const BRAND_DISCLAIMER = 'Las marcas y modelos mencionados pertenecen a sus respectivos dueños. Este juego no está afiliado ni patrocinado por ninguna de ellas.';
