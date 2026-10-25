// BATI como encargado de planta: consejos según el estado del taller, respuestas a "@BATI…",
// capítulos de historia con decisiones y accesorios. Todo funciona sin conexión.
import * as E from './engine.js';
import { MACHINES, PRODUCTS, MATERIALS, ZONES, RIVALS, SPACES } from './data.js';
import { money } from './format.js';

// ---------- Accesorios de BATI (premios de historia, liga, Expo…) ----------
export const BATI_ACCS = {
  gorra: { name: 'Gorrita 3DBAT', icon: '🧢', from: 'Capítulo 1 de la historia' },
  lentes: { name: 'Lentes protectores', icon: '🥽', from: 'Capítulo 2 de la historia' },
  mate: { name: 'Mate', icon: '🧉', from: 'Capítulo 3 de la historia' },
  casco: { name: 'Casco CNC', icon: '⛑️', from: 'Capítulo 4 de la historia' },
  antiparras: { name: 'Antiparras láser', icon: '🕶️', from: 'Capítulo 5 de la historia' },
  capa: { name: 'Capa de campeón', icon: '🦸', from: 'Capítulo 6 de la historia' },
  mascara: { name: 'Máscara de resina', icon: '😷', from: 'Ganar una Expo Maker' },
  corona: { name: 'Corona de liga', icon: '👑', from: 'Ascender en la Liga Maker' },
};
export const batiOf = (s) => ({ accs: [], wear: null, ...(s.bati || {}) });
export function giveAcc(s, k) {
  const b = batiOf(s);
  if (!BATI_ACCS[k] || b.accs.includes(k)) return false;
  s.bati = { ...b, accs: [...b.accs, k], wear: b.wear || k };
  return true;
}

// ---------- Historia de BATI: capítulos con diálogos, decisión y premio ----------
// done(s): ¿se cumplió el objetivo? (con contadores que el motor ya lleva)
export const CHAPTERS = [
  { id: 'dificil', title: 'El primer cliente difícil', rep: 3, acc: 'gorra',
    intro: ['BATI: Che, hoy viene un cliente exigente. De esos que miran la pieza con lupa.', 'Cliente: «Quiero lo mejor. Pago lo que sea, pero que sea perfecto.»', 'BATI: Para este tipo de clientes está el presupuesto 💎 Premium.'],
    goal: 'Entregá un pedido con presupuesto 💎 Premium.', done: (s) => (s.stats.premDone || 0) >= 1,
    choice: [['🎟️ 4 fichas', { tokens: 4 }], ['⭐ +4 reputación', { rep: 4 }]],
    end: 'Cliente: «Impecable. Le voy a hablar de vos a todo el barrio.»' },
  { id: 'feria', title: 'La feria del barrio', rep: 2, acc: 'lentes',
    intro: ['BATI: El sábado hay feria en la plaza. Llaveros, posavasos, tablas… lo que pidan los eventos.', 'BATI: Mirá el mapa de la Ciudad: cuando Eventos está 🔥, se vende mucho mejor.'],
    goal: 'Fabricá 40 piezas de productos de la zona 🎉 Eventos.', done: (s) => (s.stats.zone?.eventos || 0) >= 40,
    choice: [['🎟️ 4 fichas', { tokens: 4 }], ['💰 10 minutos de ingreso', { cashMin: 10 }]],
    end: 'BATI: Se agotó todo. Hasta la vecina se llevó tres llaveros.' },
  { id: 'imposible', title: 'El pedido imposible', rep: 3, acc: 'mate',
    intro: ['Cliente: «¿Lo podés tener para mañana temprano? Es para una presentación.»', 'BATI: Con el presupuesto ⚡ Rápido cobrás más, pero el plazo es corto. Cebá un mate y que no se corte la luz.'],
    goal: 'Entregá a tiempo un pedido con presupuesto ⚡ Rápido.', done: (s) => (s.stats.fastDone || 0) >= 1,
    choice: [['🎟️ 5 fichas', { tokens: 5 }], ['⭐ +5 reputación', { rep: 5 }]],
    end: 'Cliente: «No sé cómo hiciste, pero llegó perfecto.» BATI: Yo sí sé: mate y oficio.' },
  { id: 'rival', title: 'Competencia contra el taller rival', rep: 2, acc: 'casco',
    intro: ['BATI: ¿Viste a esos de enfrente? Dicen que son el mejor taller de la ciudad.', 'BATI: La fama se gana entregando pedidos, haciendo proyectos y yendo a las Expos. Superá a uno.'],
    goal: 'Superá en fama a un taller rival (mirá Ciudad → Rivales).', done: (s) => Object.values(s.city?.rivals || {}).some((r) => r.beaten),
    choice: [['🎟️ 5 fichas', { tokens: 5 }], ['💰 15 minutos de ingreso', { cashMin: 15 }]],
    end: 'BATI: Pasaron a saludar. Con cara de pocos amigos, pero saludaron.' },
  { id: 'expo', title: 'La primera Expo Maker', rep: 6, acc: 'antiparras',
    intro: ['BATI: Se viene la Expo Maker. Medio país maker va a estar ahí.', 'BATI: Elegí productos caros, llevá variedad y, si podés, un stand con luces. Vamos por el podio.'],
    goal: 'Quedá entre los 3 primeros de una Expo Maker.', done: (s) => (s.stats.expoPodium || 0) >= 1,
    choice: [['🎟️ 6 fichas', { tokens: 6 }], ['⭐ +6 reputación', { rep: 6 }]],
    end: 'BATI: ¡Podio! Ya nos conocen en toda la ciudad.' },
  { id: 'planta', title: 'La inauguración de la Planta 3DBAT', rep: 1, acc: 'capa',
    intro: ['BATI: Arrancamos con una impresora en el escritorio del cuarto. ¿Te acordás?', 'BATI: El sueño es la Planta 3DBAT: cuatro pisos, robots y contratos especiales.'],
    goal: 'Llegá a la Planta 3DBAT.', done: (s) => s.space >= 6 || (s.stats.maxSpace || 0) >= 6,
    choice: [['🎟️ 10 fichas', { tokens: 10 }], ['⭐ +10 reputación', { rep: 10 }]],
    end: 'BATI: Cortamos la cinta. Esto ya es una empresa de verdad. Gracias por traerme hasta acá.' },
];
export function storyOf(s) { return { i: 0, started: false, ...(s.story || {}) }; }
export function currentChapter(s) {
  const st = storyOf(s);
  const ch = CHAPTERS[st.i];
  if (!ch) return null;
  return { ch, st, locked: E.repLevel(s) < ch.rep, ready: st.started && ch.done(s) };
}
export function startChapter(s) {
  const c = currentChapter(s);
  if (!c || c.locked) return false;
  s.story = { ...c.st, started: true };
  return true;
}
export function finishChapter(s, pick = 0, out = []) {
  const c = currentChapter(s);
  if (!c || !c.ready) return false;
  const [, r] = c.ch.choice[pick] || c.ch.choice[0];
  if (r.tokens) s.tokens += r.tokens;
  if (r.rep) s.rep += r.rep;
  if (r.cashMin) { const x = Math.round(Math.max(E.incomeRate(s), 50) * 60 * r.cashMin); s.money += x; s.totalEarned += x; }
  giveAcc(s, c.ch.acc);
  s.story = { i: c.st.i + 1, started: false };
  out.push({ type: 'chapterDone', title: c.ch.title, acc: c.ch.acc });
  return true;
}

// ---------- Consejos según el estado del taller ----------
// Devuelve el consejo más útil ahora (o null). help: 'principiante' | 'normal' | 'experto'
export function batiTips(s) {
  const tips = [];
  const worn = s.machines.filter((m) => E.wearPct(m) >= 60).sort((a, b) => E.wearPct(b) - E.wearPct(a))[0];
  if (worn) tips.push({ id: 'worn', crit: E.wearPct(worn) >= 80, text: `Che, tu ${MACHINES[worn.model].name} está gastada (${E.wearPct(worn)} %). Si seguís así, te la juega: repárala en Tienda → Mejoras.`, ctas: ['reparar'] });
  const nofil = s.machines.find((m) => m.state === 'nofil' && m.product);
  if (nofil) tips.push({ id: 'nofil', crit: true, text: `Hay máquinas paradas por falta de ${MATERIALS[PRODUCTS[nofil.product]?.mat]?.name || 'material'}. Comprá en Tienda → Materiales.` });
  const idle = s.machines.filter((m) => m.state === 'idle' && !m.event).length;
  if (idle >= 2) tips.push({ id: 'idle', text: `Tenés ${idle} máquinas sin trabajo. Tocá una y elegí qué fabrica.` });
  // Pedido que conviene más que el que estás haciendo
  if (s.orders.active.length && s.orders.offers.length) {
    const rate = (o) => o.reward / Math.max(60, o.time);
    const best = [...s.orders.offers].sort((a, b) => rate(b) - rate(a))[0];
    const worst = [...s.orders.active].sort((a, b) => rate(a) - rate(b))[0];
    if (best && worst && rate(best) > rate(worst) * 1.8) tips.push({ id: 'order', text: `Te llegó «${best.title}»: paga bastante mejor por minuto que «${worst.title}». Fijate si te conviene sumarle máquinas.` });
  }
  // Oportunidad en el mapa
  if (s.city?.hot?.length) {
    const z = ZONES.find((x) => x.id === s.city.hot[0]);
    const can = z && z.products.filter((p) => E.productUnlocked(s, p) && s.machines.some((m) => E.canPrint(s, m, p)));
    const using = s.machines.filter((m) => m.product && E.demandMult(s, m.product) > 1).length;
    if (can?.length && using < Math.ceil(s.machines.length / 3)) tips.push({ id: 'map', text: `Hay oportunidad en el mapa: ${z.icon} ${z.name} está 🔥 (×1,4). Por ejemplo: ${PRODUCTS[can[0]].name}.`, ctas: ['ciudad'] });
  }
  // Rival que te pasó
  if (E.cityUnlocked(s)) {
    const t = E.fameTable(s);
    const me = t.findIndex((x) => x.me);
    if (me > 0) { const r = t[me - 1]; tips.push({ id: 'rival', text: `${r.icon} ${r.name} está justo arriba tuyo en fama (${r.fame} contra ${t[me].fame}). Un par de pedidos más y lo pasás.` }); }
  }
  if (s.city?.expo?.state === 'open') tips.push({ id: 'expo', crit: true, text: '¡La Expo Maker está abierta! Inscribite antes de que cierre.', ctas: ['expo'] });
  const c = currentChapter(s);
  if (c && !c.locked && !c.st.started) tips.push({ id: 'story', text: `Tengo una historia para contarte: «${c.ch.title}». Mirala en 📖 Historia.` });
  return tips;
}
export function pickTip(s, help = 'normal', seen = {}) {
  const list = batiTips(s).filter((t) => (help === 'experto' ? t.crit : true) && !(seen[t.id] && seen[t.id] > Date.now() - 20 * 60000));
  return list[0] || null;
}

// ---------- @BATI en el chat (respuestas locales, sin IA) ----------
const TECH_TIPS = {
  fdm: ['Limpiá la cama con alcohol isopropílico: la mitad de los problemas de adherencia se van.', 'Si la Ender hace ruido raro, no mires para otro lado. Te conozco.', 'PETG con ventilador al 30 %, PLA al 100 %. De nada.', 'El mod de gabinete cerrado baja las fallas un 30 %. Los gatos lo odian.'],
  resin: ['La resina tibia fluye mejor: el calefactor de cuba es plata bien invertida.', 'Guantes y anteojos siempre. La resina no perdona.', 'El film FEP gastado es fábrica de fallas: cambialo o poné el mod premium.'],
  laser: ['El air assist hace cortes más limpios y más rápidos.', 'MDF de 3 mm: pasadas rápidas y potencia alta. Acrílico: lento y parejo.', 'Extractor siempre prendido. Tus pulmones te lo agradecen.'],
  cnc: ['Fresas premium = mejor terminación y menos desperdicio.', 'La aspiración de virutas evita que se trabe todo. Literal.', 'Medí dos veces, fresá una.'],
};
export function batiAnswer(s, q, extra = {}) {
  const t = (q || '').toLowerCase();
  const tech = /fdm|filamento|impres/.test(t) ? 'fdm' : /resin/.test(t) ? 'resin' : /laser|láser/.test(t) ? 'laser' : /cnc|fresa/.test(t) ? 'cnc' : null;
  if (/tip|consejo|truco/.test(t) || tech) {
    const list = TECH_TIPS[tech || ['fdm', 'resin', 'laser', 'cnc'][Math.floor(Math.random() * 4)]];
    return `💡 ${list[Math.floor(Math.random() * list.length)]}`;
  }
  if (/liga/.test(t)) return extra.league || '🏅 La Liga Maker se juega por semana: sumás puntos entregando pedidos, haciendo contratos, resolviendo fallas y aportando a tu granja. Los mejores de tu grupo suben de división.';
  if (/reto|desaf/.test(t)) return extra.reto || '🎯 Los retos de la comunidad están en el botón Ranking → Retos.';
  if (/granja/.test(t)) return extra.granja || '🏭 Con una granja jugás en equipo: los puntos de todos suman. Mirá Ranking → Granja.';
  if (/rival|fama/.test(t)) { const r = E.fameTable(s); const me = r.findIndex((x) => x.me); return `🏁 Vas #${me + 1} en fama local de ${r.length}. ${me > 0 ? `Arriba tuyo: ${r[me - 1].icon} ${r[me - 1].name}.` : '¡Sos el más famoso de la ciudad!'}`; }
  if (/expo/.test(t)) return s.city?.expo ? '🎪 ¡Hay una Expo en marcha! Abrí Ciudad → Expo Maker.' : `🎪 La próxima Expo Maker se anuncia en unos ${Math.max(1, Math.round((s.city?.expoT || 0) / 60))} minutos de juego.`;
  // "¿qué hago ahora?" y cualquier otra cosa: el mejor consejo del momento
  const tip = batiTips(s)[0];
  if (tip) return `🦇 ${tip.text}`;
  const next = SPACES[s.space + 1];
  return next ? `🦇 Todo en orden. Juntá para el próximo taller: ${next.name} (${money(next.cost)}).` : '🦇 Todo en orden, jefe. La planta funciona como un reloj.';
}
export { RIVALS };
