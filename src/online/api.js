// Conexión con Supabase (la misma base y la misma cuenta de Google que BATBOX).
// La librería se descarga aparte, después de que el juego ya está en pantalla.
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config.js';

let clientP = null;
export function getClient() {
  if (!clientP) {
    clientP = import('@supabase/supabase-js').then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      // Sin storageKey propio: en el mismo sitio comparte la sesión con BATBOX y el Cotizador PRO.
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }));
  }
  return clientP;
}

// Error "la función no existe": la migración 026 todavía no está en la base.
export const isMissing = (e) => !!e && (e.code === 'PGRST202' || e.code === '42883' || /Could not find the function/i.test(e.message || ''));

export class OnlineError extends Error {
  constructor(e) { super(e?.message || 'Error de conexión'); this.code = e?.code; this.missing = isMissing(e); }
}

export async function rpc(fn, args) {
  const sb = await getClient();
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new OnlineError(error);
  return data;
}

// Identificador al azar de este navegador para el contador de "en línea" (lo comparte con BATBOX).
export function clientId() {
  const KEY = 'bb_live_id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      id = crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16));
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch { return null; }
}

// Guardado de último momento al cerrar la pestaña: fetch con keepalive (supabase-js no lo permite).
export function saveOnExit(session, body) {
  try {
    if (!session?.access_token) return;
    const json = JSON.stringify(body);
    if (json.length > 60000) return; // keepalive tiene un tope de 64 KB
    fetch(`${SUPABASE_URL}/rest/v1/rpc/bb_mt_save_put`, {
      method: 'POST', keepalive: true, body: json,
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {});
  } catch { /* nada */ }
}

// Partida "recién empezada": si en la nube hay una, se usa esa sin preguntar.
export function isFreshSave(s) {
  return !s || s.tutorial?.active || ((s.stats?.pieces || 0) < 25 && (s.prestige?.moves || 0) === 0 && (s.totalEarned || 0) < 60000);
}

// Resumen para mostrar al elegir entre dos partidas.
export function summaryOf(s) {
  return {
    name: s.name || '', space: s.space || 0, money: s.money || 0, totalEarned: s.totalEarned || 0,
    machines: s.machines?.length || 0, moves: s.prestige?.moves || 0, pieces: s.stats?.pieces || 0, rep: s.rep || 0,
  };
}
export const sameProgress = (a, b) => !!a && !!b && Math.round(a.pieces) === Math.round(b.pieces)
  && Math.abs((a.totalEarned || 0) - (b.totalEarned || 0)) <= Math.max(1, (a.totalEarned || 0) * 1e-6) && a.machines === b.machines;

// Qué hacer al conectar la cuenta (función pura, probada en scripts/test.mjs).
//   meta: { uid, rev } = de qué versión de la nube viene esta partida local.
export function decideSync({ uid, cloud, meta, local }) {
  if (!cloud) return { action: 'upload' };
  if (meta && meta.uid === uid && meta.rev === cloud.rev) return { action: 'inSync' };
  // Se cerró la pestaña con un guardado de salida que no llegó: la de acá es la más nueva.
  if (meta && meta.uid === uid && meta.pending && meta.rev - 1 === cloud.rev) return { action: 'inSync', fixRev: cloud.rev };
  if (isFreshSave(local)) return { action: 'useCloud', silent: true };
  if (sameProgress(summaryOf(local), cloud.summary)) return { action: 'adopt' };
  if (meta && meta.uid === uid && meta.rev < cloud.rev) return { action: 'ask', reason: 'cloudNewer' };
  return { action: 'ask', reason: 'different' };
}

// Configuración pública de BATBOX (por ejemplo los destacados de Filacolor que carga el equipo).
export async function getSetting(key) {
  const sb = await getClient();
  const { data, error } = await sb.from('bb_settings').select('value').eq('key', key).maybeSingle();
  if (error) throw new OnlineError(error);
  return data?.value ?? null;
}
