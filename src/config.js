// Configuración pública del juego (va al navegador: nada secreto acá).
export const VERSION = '1.4';
export const SAVE_KEY = 'mt3dbat.save.v1';
export const BACKUP_KEY = 'mt3dbat.save.bak';

// Mismo proyecto Supabase que BATBOX y el Cotizador PRO: misma cuenta de Google para todo.
// Esta clave es la pública (publishable): la seguridad la ponen las funciones de la base.
export const SUPABASE_URL = 'https://llciggitqtseosfklbjl.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_du93qodYkSZRevJ-BgXUGw_BrFc6JMO';

// ¿El juego está dentro de BATBOX (…/batbox/juego/)? Ahí el login de Google vuelve solo.
const PATH = typeof window !== 'undefined' ? window.location.pathname : '';
export const INSIDE_BATBOX = /\/batbox\/juego\/?/.test(PATH);
// Raíz de BATBOX en este mismo sitio (para volver sin abrir otra pestaña).
export const BATBOX_HERE = INSIDE_BATBOX ? PATH.replace(/juego\/?(index\.html)?$/, '') : null;
// Copia del juego dentro de BATBOX en este mismo sitio (para iniciar sesión desde la versión suelta).
export const GAME_IN_BATBOX = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')
  ? window.location.origin + '/batbox/juego/' : 'https://3dbat.com.ar/batbox/juego/';

export const LINKS = {
  instagram: 'https://www.instagram.com/3dbat.impresiones/',
  batbox: 'https://3dbat.com.ar/batbox/',
  comunidad: 'https://3dbat.com.ar/batbox/#/community',
  herramientas: 'https://3dbat.com.ar/batbox/#/tools',
  wiki: 'https://3dbat.com.ar/batbox/#/wiki',
  web: 'https://3dbat.com.ar/',
  ranking: 'https://3dbat.com.ar/batbox/#/juego?ver=ranking',
};
export const IG_HANDLE = '@3dbat.impresiones';
export const TAGLINE = 'Todo lo que un maker necesita, en un solo lugar.';
