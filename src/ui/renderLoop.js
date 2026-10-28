// A capped, visibility-aware visual clock. The economy uses its own wall clock.
export function sceneFps(settings = {}, busy = true) {
  if (settings.lite || settings.anim === 'min') return 15;
  if (!busy) return 15;
  return settings.quality === 'alta' ? 45 : 30;
}

export function startRenderLoop({ element, frame, fps = () => 30, paused = () => false, onPause, onResume }, env = {}) {
  const doc = env.document || document, win = env.window || window;
  const raf = env.requestAnimationFrame || requestAnimationFrame;
  const caf = env.cancelAnimationFrame || cancelAnimationFrame;
  const later = env.setTimeout || setTimeout, cancel = env.clearTimeout || clearTimeout;
  const clock = env.now || (() => performance.now());
  const Observer = env.IntersectionObserver ?? win.IntersectionObserver;
  let disposed = false, visible = true, active = false, request = null, timer = null, last = -Infinity;
  const stopPending = () => { if (request !== null) caf(request); if (timer !== null) cancel(timer); request = timer = null; };
  const canRun = () => !disposed && doc.visibilityState !== 'hidden' && visible && !paused();
  const queue = () => {
    if (!canRun() || request !== null || timer !== null) return;
    const delay = Math.max(0, 1000 / fps() - (clock() - last));
    if (delay > 1) timer = later(() => { timer = null; if (canRun()) request = raf(draw); }, delay);
    else request = raf(draw);
  };
  const draw = (now) => {
    request = null;
    if (!canRun()) { refresh(); return; }
    const dt = Number.isFinite(last) ? Math.min(.1, Math.max(0, (now - last) / 1000)) : 0;
    last = now;
    frame(now, dt);
    queue();
  };
  const refresh = () => {
    const next = canRun();
    if (next === active) return;
    active = next;
    stopPending();
    if (next) { last = -Infinity; onResume?.(); queue(); }
    else onPause?.();
  };
  const observer = Observer ? new Observer((entries) => { visible = entries[0]?.isIntersecting !== false; refresh(); }) : null;
  observer?.observe(element);
  doc.addEventListener('visibilitychange', refresh);
  win.addEventListener('mt-scene-pause', refresh);
  refresh();
  return () => {
    disposed = true;
    stopPending();
    observer?.disconnect();
    doc.removeEventListener('visibilitychange', refresh);
    win.removeEventListener('mt-scene-pause', refresh);
    if (active) onPause?.();
    active = false;
  };
}
