import { useEffect, useRef, useState } from 'react';
import { useGame } from './useGame.js';
import { Header, Hud } from './Header.jsx';
import Workshop from './Workshop.jsx';
import Orders from './Orders.jsx';
import Shop from './Shop.jsx';
import { BatiGuide } from './Bati.jsx';
import Icon from './Icon.jsx';
import { MachinePanel, EventModal, OfflineModal, AchievementsModal, OficioModal, CommunityModal, SettingsModal, MorePanel, ChallengesModal } from './Panels.jsx';
import { readyClaims } from './Header.jsx';
import { currentMission } from '../game/progress.js';
import { TAGLINE } from '../config.js';
import { useOnline } from '../online/useOnline.js';
import { useMarket } from '../online/useMarket.js';
import { useChat } from '../online/useChat.js';
import { ChatPanel } from './Chat.jsx';
import { OnlineModal, ConflictModal, LockedOverlay, WelcomeGate, ProfileSetup, useGate, FeedbackModal } from './Online.jsx';
import { VisitModal } from './Visit.jsx';
import { SpotifyDock } from './Spotify.jsx';
import { BRAND_DISCLAIMER } from '../game/data.js';

const TAB_OF = { machine: 'taller', mate: 'taller', orders: 'pedidos', 'shop-machines': 'tienda', 'shop-upgrades': 'tienda', 'shop-space': 'tienda', oficio: 'mas', desafios: 'desafios' };
const NAV = [['taller', 'Taller', 'factory'], ['pedidos', 'Pedidos', 'clipboard'], ['tienda', 'Tienda', 'cart'], ['desafios', 'Desafíos', 'target'], ['mas', 'Más', 'more']];

export default function App() {
  const { s, actions, floats, toasts, bati, offline, locked, getState } = useGame();
  const online = useOnline({ getState, adoptSave: actions.adoptSave, toast: actions.toast, say: actions.say, isLocked: () => locked });
  const gate = useGate(online);
  const mk = useMarket({ online, getState, actions, isLocked: () => locked });
  const chat = useChat({ online, toast: actions.toast });
  const [usedPick, setUsedPick] = useState(null); // máquina elegida para vender en Usados
  const [tab, setTab] = useState('taller');
  const [shopTab, setShopTab] = useState('machines');
  const [modal, setModal] = useState(null); // { kind, mid, tab }
  const mission = currentMission(s);
  const glow = mission.target;
  const glowTab = TAB_OF[glow];

  const actRef = useRef(actions);
  actRef.current = actions;
  const open = (kind, mid, tab) => setModal({ kind, mid, tab });
  const close = () => setModal(null);
  const goShop = (t) => { setShopTab(t); setTab('tienda'); };
  const m = modal?.mid != null ? s.machines.find((x) => x.id === modal.mid) : null;

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey) actRef.current.mate();
    };
    // Sin menú de clic derecho fuera de los campos de texto (como en las demás apps 3DBAT).
    const onCtx = (e) => { const tag = (e.target?.tagName || '').toLowerCase(); if (tag !== 'input' && tag !== 'textarea') e.preventDefault(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('contextmenu', onCtx);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('contextmenu', onCtx); };
  }, []);

  // Si el problema se resolvió solo, se cierra su ventana.
  useEffect(() => { if (modal?.kind === 'event' && (!m || !m.event)) setModal(null); }, [modal, m, m?.event]);

  const offersCount = s.orders.offers.length;

  return (
    <div className={`app anim-${s.settings.anim}${chat.open ? ' chat-on' : ''}`}>
      <Header s={s} actions={actions} open={open} online={online} chat={chat} />
      <Hud s={s} onFilament={() => goShop('filament')} onTokens={() => open('desafios')} />
      <main className={`layout tab-${tab}`}>
        <div className="col col-orders" data-tab="pedidos">
          <Orders s={s} actions={actions} glow={glow} />
        </div>
        <Workshop s={s} actions={actions} floats={floats} glow={glow} podium={online.available === true ? online.podium : null} gifts={online.gifts}
          onMachine={(mm) => open('machine', mm.id)} onEvent={(mm) => open('event', mm.id)} goShop={goShop} open={open} />
        <div className="col col-shop" data-tab="tienda">
          <Shop s={s} actions={actions} tab={shopTab} setTab={setShopTab} glow={glow} online={online} mk={mk} open={open}
            usedPick={usedPick} clearUsedPick={() => setUsedPick(null)} />
        </div>
        <div className="col col-more" data-tab="mas">
          <MorePanel s={s} open={open} online={online} />
        </div>
      </main>
      <footer className="foot">
        3DBAT IMPRESIONES · {TAGLINE}
        <span className="foot-disc">{BRAND_DISCLAIMER}</span>
        <span className="foot-links"> · <button className="link-btn" onClick={() => open('comunidad')}>Comunidad</button></span>
      </footer>

      <nav className="bottom-nav" aria-label="Secciones">
        {NAV.map(([k, label, icon]) => (
          <button key={k} className={'bn' + (tab === k ? ' active' : '')} onClick={() => (k === 'desafios' ? open('desafios') : setTab(k))}>
            <Icon name={icon} size={20} /><span>{label}</span>
            {k === 'pedidos' && offersCount > 0 && <em className="badge">{offersCount}</em>}
            {k === 'desafios' && readyClaims(s) > 0 && <em className="badge">{readyClaims(s)}</em>}
            {glowTab === k && tab !== k && <em className="dot-attn" />}
          </button>
        ))}
      </nav>

      <BatiGuide tutorial={s.tutorial.active} mission={mission} queue={bati}
        onDismiss={actions.dismissBati} onSkip={actions.skipTutorial}
        onPoke={() => { if (!s.tutorial.active && bati.length === 0) open('comunidad'); }} onCta={(k) => { if (k === 'online') open('online', null, 'perfil'); if (k === 'reparar') goShop('upgrades'); if (k === 'usados') goShop('used'); }} />

      <SpotifyDock s={s} actions={actions} />
      {chat.open && <ChatPanel chat={chat} online={online} open={open} />}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={'toast t-' + t.kind}>{t.text}</div>)}
      </div>

      {modal?.kind === 'machine' && m && <MachinePanel s={s} m={m} actions={actions} onClose={close}
        onSellUsed={online.available === true && mk.available !== false ? () => { setUsedPick(m.id); goShop('used'); close(); } : null} />}
      {modal?.kind === 'event' && m && <EventModal s={s} m={m} actions={actions} onClose={close} />}
      {modal?.kind === 'logros' && <AchievementsModal s={s} onClose={close} />}
      {modal?.kind === 'oficio' && <OficioModal s={s} actions={actions} onClose={close} />}
      {modal?.kind === 'comunidad' && <CommunityModal s={s} onClose={close} />}
      {modal?.kind === 'desafios' && <ChallengesModal s={s} actions={actions} onClose={close} />}
      {modal?.kind === 'ajustes' && <SettingsModal s={s} actions={actions} onClose={close} online={online} open={open} />}
      {modal?.kind === 'sugerencias' && <FeedbackModal s={s} online={online} onClose={close} />}
      {modal?.kind === 'visita' && <VisitModal nick={modal.tab} s={s} online={online} onClose={() => { close(); online.loadGifts?.(); }} />}
      {modal?.kind === 'online' && <OnlineModal s={s} actions={actions} online={online} tab={modal.tab} onClose={close} open={open} />}
      {online.conflict && !locked && <ConflictModal conflict={online.conflict} onChoose={online.resolveConflict} />}
      {gate.login && !locked && !modal && <WelcomeGate online={online} onSkip={gate.skipLogin} />}
      {gate.profile && !locked && !online.conflict && !modal && <ProfileSetup online={online} onSkip={gate.skipProfile} />}
      {locked && <LockedOverlay onTakeOver={actions.takeOver} />}
      {offline && !modal && !online.conflict && !locked && !gate.login && !gate.profile && <OfflineModal r={offline} onClose={actions.closeOffline} />}
    </div>
  );
}
