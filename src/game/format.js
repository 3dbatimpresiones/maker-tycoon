// Formato de números y tiempos en español rioplatense.
const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

// $ 12.500 · $ 1,5 M · $ 3,2 mil M · $ 4,1 B (billón)
export function num(n) {
  if (!isFinite(n)) return '∞';
  const a = Math.abs(n);
  if (a < 10) return nf1.format(n);
  if (a < 1e6) return nf0.format(n);
  if (a < 1e9) return nf2.format(n / 1e6) + ' M';
  if (a < 1e12) return nf2.format(n / 1e9) + ' mil M';
  if (a < 1e15) return nf2.format(n / 1e12) + ' B';
  if (a < 1e18) return nf2.format(n / 1e15) + ' mil B';
  if (a < 1e21) return nf2.format(n / 1e18) + ' Tr';
  if (a < 1e24) return nf2.format(n / 1e21) + ' mil Tr';
  const e = Math.floor(Math.log10(a));
  return nf2.format(n / Math.pow(10, e)) + 'e' + e;
}
// Moneda: la economía es en AR$; en USD solo cambia cómo se muestra (cotización fija por temporada).
export const CURRENCIES = {
  ARS: { id: 'ARS', prefix: 'AR$ ', flag: '🇦🇷', label: 'ARS' },
  USD: { id: 'USD', prefix: 'US$ ', flag: '🌎', label: 'USD' },
};
export const SEASON = { name: 'Temporada 1', usdRate: 1600 }; // US$ 1 = AR$ 1.600
let currency = 'ARS';
export function setCurrency(c) { currency = CURRENCIES[c] ? c : 'ARS'; }
export const getCurrency = () => currency;
const conv = (n) => (currency === 'USD' ? n / SEASON.usdRate : n);

export function money(n) {
  const v = conv(n);
  const c = CURRENCIES[currency];
  if (currency === 'USD' && Math.abs(v) < 1000) return c.prefix + nf2.format(Math.round(v * 100) / 100);
  return c.prefix + num(v);
}
export const full = (n) => CURRENCIES[currency].prefix + nf0.format(Math.round(conv(n)));

export function rate(n) {
  return money(n) + '/s';
}
// Reemplaza {$:1234} por el importe formateado en la moneda elegida.
export const fmtText = (str) => (typeof str === 'string' ? str.replace(/\{\$:([\d.e+]+)\}/g, (_, v) => money(Number(v))) : str);

// 45 s · 3 min 20 s · 1 h 20 min
export function dur(sec) {
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return s && m < 10 ? `${m} min ${s} s` : `${m} min`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h} h ${mm} min` : `${h} h`;
}
// 4:05 para cuentas regresivas
export function clock(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
export function kg(g) {
  if (g < 1000) return `${Math.floor(g)} g`;
  return `${nf1.format(g / 1000)} kg`;
}
