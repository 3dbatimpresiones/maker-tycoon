// Ventana del chat en vivo (Global, Granja y Grupos). Ver online/useChat.js.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { Avatar } from './Online.jsx';
import { LINK_RE } from '../online/useChat.js';

const hhmm = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
const dayOf = (iso) => new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
const ROOM_ICON = { global: '🌎', farm: '🏭', group: '👥' };

// Texto del mensaje: resalta @menciones; los links solo se activan en mensajes del equipo de BATBOX.
function Body({ text, staff }) {
  const parts = String(text || '').split(/(@[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ_.-]+|https?:\/\/[^\s<>"]+)/g);
  return parts.map((p, i) => {
    if (/^@/.test(p)) return <b key={i} className="ch-at">{p}</b>;
    if (/^https?:\/\//.test(p)) return staff ? <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow">{p}</a> : <span key={i}>{p}</span>;
    return <span key={i}>{p}</span>;
  });
}

function Message({ m, prev, chat, onNick, staff }) {
  const [menu, setMenu] = useState(false);
  const grouped = prev && !prev.deleted && prev.nick === m.nick && Date.parse(m.at) - Date.parse(prev.at) < 180000;
  const newDay = !prev || dayOf(prev.at) !== dayOf(m.at);
  return (
    <>
      {newDay && <div className="ch-day">{dayOf(m.at)}</div>}
      <div className={'ch-msg' + (m.mine ? ' mine' : '') + (m.me_mentioned ? ' me' : '') + (m.staff ? ' staff' : '') + (grouped && !newDay ? ' grouped' : '')}>
        {!(grouped && !newDay) && (
          <button className="ch-av" onClick={() => setMenu((x) => !x)} title={m.nick}><Avatar name={m.nick} frame={m.frame} src={m.avatar} size={30} /></button>
        )}
        <div className="ch-bubble">
          {!(grouped && !newDay) && (
            <div className="ch-head">
              <button className="ch-nick" onClick={() => setMenu((x) => !x)}>{m.mine ? 'Vos' : m.nick}</button>
              {m.staff && <span className="ch-staff">EQUIPO 3DBAT</span>}
              <time>{hhmm(m.at)}</time>
            </div>
          )}
          {m.deleted ? <p className="ch-text del">Mensaje borrado</p> : <p className="ch-text"><Body text={m.body} staff={m.staff} /></p>}
          {!m.deleted && (m.mine || staff) && (
            <button className="ch-del" onClick={() => chat.remove(m.id).catch((e) => chat.onError?.(e.message))} title="Borrar mensaje"><Icon name="trash" size={12} /></button>
          )}
          {menu && !m.mine && (
            <div className="ch-menu" onMouseLeave={() => setMenu(false)}>
              <button onClick={() => { onNick(m.nick); setMenu(false); }}>@ Mencionar</button>
              <button onClick={() => { chat.onVisit?.(m.nick); setMenu(false); }}>🏭 Ver su taller</button>
              <button onClick={() => { chat.muteLocal(m.nick, true); setMenu(false); }}>🔇 No ver sus mensajes</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Lista de apodos al escribir @
function useMentionBox(chat, text, caret, room) {
  const [list, setList] = useState([]);
  const m = text.slice(0, caret).match(/(^|\s)@([^\s@]{0,20})$/);
  const q = m ? m[2] : null;
  useEffect(() => {
    if (q == null) { setList([]); return undefined; }
    const t = setTimeout(() => chat.people(q, room).then((l) => setList(Array.isArray(l) ? l.slice(0, 6) : [])), 180);
    return () => clearTimeout(t);
  }, [q, room]); // eslint-disable-line react-hooks/exhaustive-deps
  return { q, list };
}

function NewGroup({ chat, onDone }) {
  const [name, setName] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [picked, setPicked] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.trim().length < 1) { setFound([]); return undefined; }
    const t = setTimeout(() => chat.people(q, 'global').then((l) => setFound(Array.isArray(l) ? l : [])), 200);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = async () => {
    setBusy(true); setErr('');
    try { await chat.createGroup(name, picked); onDone(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="ch-panel">
      <div className="ch-panel-head"><b>Nuevo grupo</b><button className="icon-btn sm" onClick={onDone}><Icon name="x" size={16} /></button></div>
      <label className="ch-field"><span>Nombre del grupo</span><input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="Ej: Los del nozzle" /></label>
      <label className="ch-field"><span>Sumá makers por su apodo</span><input value={q} maxLength={20} onChange={(e) => setQ(e.target.value)} placeholder="Escribí un apodo…" /></label>
      {found.length > 0 && (
        <div className="ch-found">
          {found.filter((p) => !picked.includes(p.nick)).map((p) => (
            <button key={p.nick} onClick={() => { setPicked((x) => [...x, p.nick].slice(0, 19)); setQ(''); }}><Avatar name={p.nick} frame={p.frame} src={p.avatar} size={22} /> {p.nick}</button>
          ))}
        </div>
      )}
      {picked.length > 0 && <div className="ch-chips">{picked.map((n) => <button key={n} onClick={() => setPicked((x) => x.filter((y) => y !== n))}>{n} ✕</button>)}</div>}
      {err && <p className="ol-err">{err}</p>}
      <button className="btn-center" disabled={busy || name.trim().length < 2} onClick={go}>{busy ? 'Armando…' : 'Armar el grupo'}</button>
      <p className="hint">Hasta 20 personas. Cualquiera del grupo puede sumar gente; quien lo arma puede sacar.</p>
    </div>
  );
}

function GroupInfo({ chat, r, onDone }) {
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [name, setName] = useState(r.name);
  const [err, setErr] = useState('');
  const [sure, setSure] = useState(false);
  const load = () => chat.groupMembers(r.room).then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [r.room]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (q.trim().length < 1) { setFound([]); return undefined; }
    const t = setTimeout(() => chat.people(q, 'global').then((l) => setFound(Array.isArray(l) ? l : [])), 200);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (fn) => { setErr(''); try { await fn(); await load(); } catch (e) { setErr(e.message); } };
  const inGroup = new Set((list || []).map((x) => x.nick));
  return (
    <div className="ch-panel">
      <div className="ch-panel-head"><b>👥 {r.name}</b><button className="icon-btn sm" onClick={onDone}><Icon name="x" size={16} /></button></div>
      {r.owner && (
        <div className="ch-row"><input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
          <button className="chip-btn" disabled={name.trim() === r.name || name.trim().length < 2} onClick={() => run(() => chat.groupRename(r.room, name))}>Renombrar</button></div>
      )}
      <div className="section-label">INTEGRANTES {list ? `(${list.length}/20)` : ''}</div>
      <div className="ch-members">
        {(list || []).map((p) => (
          <div key={p.nick} className="ch-member">
            <Avatar name={p.nick} frame={p.frame} src={p.avatar} size={24} /><span>{p.me ? 'Vos' : p.nick}{p.owner && <em> · armó el grupo</em>}</span>
            {r.owner && !p.me && <button className="chip-btn" onClick={() => run(() => chat.groupRemove(r.room, p.nick))}>Sacar</button>}
          </div>
        ))}
      </div>
      <label className="ch-field"><span>Sumar a alguien</span><input value={q} maxLength={20} onChange={(e) => setQ(e.target.value)} placeholder="Apodo…" /></label>
      {found.length > 0 && (
        <div className="ch-found">
          {found.filter((p) => !inGroup.has(p.nick)).map((p) => (
            <button key={p.nick} onClick={() => { setQ(''); run(() => chat.groupAdd(r.room, p.nick)); }}><Avatar name={p.nick} frame={p.frame} src={p.avatar} size={22} /> {p.nick}</button>
          ))}
        </div>
      )}
      {err && <p className="ol-err">{err}</p>}
      {!sure
        ? <button className="danger-btn" onClick={() => setSure(true)}>Salir del grupo</button>
        : <div className="confirm-row"><span>¿Salir de «{r.name}»?</span><button className="danger-btn solid" onClick={() => chat.groupLeave(r.room).then(onDone).catch((e) => setErr(e.message))}>Sí, salir</button><button className="chip-btn" onClick={() => setSure(false)}>No</button></div>}
    </div>
  );
}

export function ChatPanel({ chat, online, open }) {
  const [text, setText] = useState('');
  const [caret, setCaret] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState(null); // 'new' | 'group' | 'opts'
  const [atBottom, setAtBottom] = useState(true);
  const [pick, setPick] = useState(0);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const nextCaret = useRef(null); // dónde dejar el cursor después de insertar un @apodo
  const cur = chat.rooms.find((x) => x.room === chat.room) || { room: 'global', kind: 'global', name: 'Global' };
  const muted = chat.prefs.muted || [];
  const shown = chat.messages.filter((m) => m.mine || !muted.includes((m.nick || '').toLowerCase()));
  const box = useMentionBox(chat, text, caret, chat.room);
  const hasLink = !chat.info.staff && LINK_RE.test(text);
  chat.onError = setErr;
  chat.onVisit = (nick) => open('visita', null, nick);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && atBottom) el.scrollTop = el.scrollHeight;
  }, [shown.length, chat.room]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPick(0); }, [box.q]);
  // El cursor se acomoda antes de que el navegador dibuje (así la próxima letra cae en su lugar).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el && nextCaret.current != null) { el.focus(); el.setSelectionRange(nextCaret.current, nextCaret.current); setCaret(nextCaret.current); nextCaret.current = null; }
  }, [text]);
  useEffect(() => { setErr(''); setPanel(null); setAtBottom(true); }, [chat.room]);

  const insertNick = (nick) => {
    const head = text.slice(0, caret);
    const at = box.q != null ? head.replace(/@[^\s@]{0,20}$/, `@${nick} `) : `${head}${head && !/\s$/.test(head) ? ' ' : ''}@${nick} `;
    const next = at + text.slice(caret);
    nextCaret.current = Math.min(at.length, 500);
    setText(next.slice(0, 500));
  };
  const send = async () => {
    if (!text.trim() || busy || hasLink) return;
    setBusy(true); setErr('');
    try { await chat.send(text); setText(''); setCaret(0); setAtBottom(true); } catch (e) { setErr(e.message); } finally { setBusy(false); inputRef.current?.focus(); }
  };
  const onKey = (e) => {
    if (box.list.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPick((p) => (p + 1) % box.list.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setPick((p) => (p - 1 + box.list.length) % box.list.length); return; }
      if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); insertNick(box.list[pick]?.nick || box.list[0].nick); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  let content;
  if (!online.session) {
    content = (
      <div className="ch-gate"><Icon name="message" size={34} /><b>Chat de la comunidad</b>
        <p>Para chatear con los makers que están jugando iniciá sesión con tu cuenta de Google.</p>
        <button className="btn-center" onClick={() => online.signIn()}>Ingresar con Google</button></div>
    );
  } else if (chat.available === false) {
    content = <div className="ch-gate"><Icon name="message" size={34} /><b>Chat en vivo</b><p>Se está terminando de instalar. ¡Muy pronto!</p></div>;
  } else if (!online.me?.player || chat.info.profile === false) {
    content = (
      <div className="ch-gate"><Icon name="message" size={34} /><b>Chat de la comunidad</b>
        <p>Primero creá tu perfil de jugador: tu apodo es lo que ven los demás en el chat.</p>
        <button className="btn-center" onClick={() => open('online', null, 'perfil')}>Crear mi perfil</button></div>
    );
  } else {
    const mutedUntil = chat.info.muted_until;
    content = (
      <>
        <div className="ch-rooms">
          {(chat.rooms.length ? chat.rooms : [cur]).map((r) => (
            <button key={r.room} className={'ch-room' + (r.room === chat.room ? ' active' : '')} onClick={() => chat.setRoom(r.room)}>
              {ROOM_ICON[r.kind]} {r.kind === 'farm' ? 'Granja' : r.name}
              {r.room !== chat.room && r.unread > 0 && <em className={r.mentions ? 'men' : ''}>{r.mentions ? '@' : ''}{r.unread > 98 ? '99+' : r.unread}</em>}
            </button>
          ))}
          <button className="ch-room add" onClick={() => setPanel(panel === 'new' ? null : 'new')} title="Armar un grupo">+ Grupo</button>
        </div>
        <div className="ch-sub">
          <span>{ROOM_ICON[cur.kind]} <b>{cur.kind === 'farm' ? `Granja ${cur.name}` : cur.name}</b>{cur.kind === 'global' && <small> · todos los que están jugando</small>}</span>
          {cur.kind === 'group' && <button className="chip-btn" onClick={() => setPanel(panel === 'group' ? null : 'group')}>Integrantes</button>}
          <button className="chip-btn" onClick={() => setPanel(panel === 'opts' ? null : 'opts')} title="Avisos y silenciados">⚙</button>
        </div>
        {panel === 'new' && <NewGroup chat={chat} onDone={() => setPanel(null)} />}
        {panel === 'group' && cur.kind === 'group' && <GroupInfo chat={chat} r={cur} onDone={() => setPanel(null)} />}
        {panel === 'opts' && (
          <div className="ch-panel">
            <div className="ch-panel-head"><b>Avisos</b><button className="icon-btn sm" onClick={() => setPanel(null)}><Icon name="x" size={16} /></button></div>
            <p className="hint">Cuando alguien te menciona con <b>@{online.me.player.nick}</b> te aviso en el juego. Si querés, también con un aviso de la compu o el celular cuando no estás mirando el juego.</p>
            {typeof Notification === 'undefined' ? <p className="hint">Este navegador no permite avisos.</p>
              : chat.prefs.notify && Notification.permission === 'granted'
                ? <button className="chip-btn" onClick={() => chat.setPrefs({ notify: false })}>🔔 Avisos del navegador: activados (desactivar)</button>
                : <button className="chip-btn" onClick={() => chat.enableNotify()}>🔔 Activar avisos del navegador</button>}
            {muted.length > 0 && (
              <>
                <div className="section-label">NO VES LOS MENSAJES DE</div>
                <div className="ch-chips">{muted.map((n) => <button key={n} onClick={() => chat.muteLocal(n, false)}>{n} ✕</button>)}</div>
              </>
            )}
          </div>
        )}
        <div className="ch-list" ref={listRef} onScroll={(e) => { const el = e.currentTarget; setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60); }}>
          {shown.length === 0 && <p className="ch-empty">{chat.messages.length ? 'No hay mensajes para mostrar.' : 'Todavía no hay mensajes. ¡Saludá!'}</p>}
          {shown.map((m, i) => <Message key={m.id} m={m} prev={shown[i - 1]} chat={chat} staff={chat.info.staff} onNick={insertNick} />)}
        </div>
        {!atBottom && <button className="ch-down" onClick={() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; setAtBottom(true); }}>↓ Mensajes nuevos</button>}
        {mutedUntil ? (
          <p className="ch-muted">🔇 El equipo de BATBOX te silenció en el chat hasta las {hhmm(mutedUntil)} del {new Date(mutedUntil).toLocaleDateString('es-AR')}{chat.info.mute_reason ? ` (${chat.info.mute_reason})` : ''}.</p>
        ) : (
          <div className="ch-input">
            {box.list.length > 0 && (
              <div className="ch-suggest">
                {box.list.map((p, i) => (
                  <button key={p.nick} className={i === pick ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); insertNick(p.nick); }}><Avatar name={p.nick} frame={p.frame} src={p.avatar} size={22} /> {p.nick}</button>
                ))}
              </div>
            )}
            {hasLink && <p className="ch-warn">🔒 Por seguridad no se pueden mandar links: solo el equipo de BATBOX puede.</p>}
            {err && <p className="ol-err">{err}</p>}
            <div className="ch-row">
              <textarea ref={inputRef} rows={1} value={text} maxLength={500} placeholder={`Escribí en ${cur.kind === 'farm' ? 'tu granja' : cur.name}… (@ para mencionar)`}
                onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart); setErr(''); }}
                onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)} onClick={(e) => setCaret(e.currentTarget.selectionStart)} onKeyDown={onKey} />
              <button className="ch-send" disabled={busy || !text.trim() || hasLink} onClick={send} title="Mandar (Enter)"><Icon name="arrowLeft" size={18} /></button>
            </div>
            <small className="ch-foot">{text.length > 400 ? `${text.length}/500 · ` : ''}Buena onda siempre 🙌 · Links bloqueados por seguridad</small>
          </div>
        )}
      </>
    );
  }
  return (
    <aside className="chat-dock" role="dialog" aria-label="Chat en vivo">
      <div className="ch-top">
        <b><Icon name="message" size={18} /> Chat en vivo</b>
        <button className="icon-btn sm" onClick={() => chat.setOpen(false)} title="Cerrar el chat"><Icon name="x" size={18} /></button>
      </div>
      {content}
    </aside>
  );
}

// Botón del encabezado, con los no leídos (rojo si te mencionaron).
export function ChatButton({ chat, online }) {
  if (online.available !== true || chat.available === false) return null;
  return (
    <button className={'icon-btn lbl-btn chat-btn' + (chat.open ? ' on' : '')} onClick={chat.toggle} title="Chat en vivo con los que están jugando">
      <Icon name="message" /><span>Chat</span>
      {!chat.open && chat.unread > 0 && <em className={'ch-badge' + (chat.mentions ? ' men' : '')}>{chat.mentions ? '@' : chat.unread > 98 ? '99+' : chat.unread}</em>}
    </button>
  );
}
