(function () {
  'use strict';

  const { POSES, BREATH, TARGETS } = window.YogaData;
  const { FOCI, ADVANCED } = window.Routine;
  const P = window.Progress;
  const byId = Object.fromEntries(POSES.map(p => [p.id, p]));

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ───────── Storage (everything lives on this device) ─────────
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sage.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('sage.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  let history = P.sanitize(store.get('history', []));                // [{ d: 'YYYY-MM-DD', ts, min, n, focus, level, partial? }]
  let lastUsed = isObj(store.get('lastUsed', {})) ? store.get('lastUsed', {}) : {}; // { poseId: timestamp }

  const DEFAULT_PREFS = { minutes: 15, focus: 'full', level: 'b', chime: true, voice: true, breathVoice: false };
  const prefs = Object.assign({}, DEFAULT_PREFS, isObj(store.get('prefs', {})) ? store.get('prefs', {}) : {});
  // Anything out of range (old versions, hand edits, corruption) falls back to the default.
  if (![10, 15, 20, 25].includes(prefs.minutes)) prefs.minutes = DEFAULT_PREFS.minutes;
  if (!FOCI[prefs.focus]) prefs.focus = DEFAULT_PREFS.focus;
  if (!['b', 'i', 'a'].includes(prefs.level)) prefs.level = DEFAULT_PREFS.level;
  ['chime', 'voice', 'breathVoice'].forEach(k => { if (typeof prefs[k] !== 'boolean') prefs[k] = DEFAULT_PREFS[k]; });
  const savePrefs = () => store.set('prefs', prefs);

  // ───────── Icons ─────────
  const ICONS = {
    leaf: '<path d="M5 19c0-8.5 5.5-14 15-14 0 9.5-5.5 15-14 15"/><path d="M5 19c2.5-4 6-7.2 10-9.2"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="2.2"/><rect x="13" y="4" width="7" height="7" rx="2.2"/><rect x="4" y="13" width="7" height="7" rx="2.2"/><rect x="13" y="13" width="7" height="7" rx="2.2"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="3.5"/><path d="M4 10.5h16M9 3.5v4M15 3.5v4"/>',
    sliders: '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2.2"/><circle cx="9" cy="16.5" r="2.2"/>',
    play: '<path d="M8.5 5.8v12.4a1 1 0 0 0 1.52.85l9.9-6.2a1 1 0 0 0 0-1.7l-9.9-6.2a1 1 0 0 0-1.52.85z"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    next: '<path d="M6 6.5l8.5 5.5L6 17.5z"/><path d="M18 6v12"/>',
    prev: '<path d="M18 6.5L9.5 12l8.5 5.5z"/><path d="M6 6v12"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    sound: '<path d="M4.5 10v4h3.5l5 4V6l-5 4z"/><path d="M16.5 9.2a4 4 0 0 1 0 5.6M19 6.8a7.5 7.5 0 0 1 0 10.4"/>',
    mute: '<path d="M4.5 10v4h3.5l5 4V6l-5 4z"/><path d="M17 10l4 4M21 10l-4 4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    shuffle: '<path d="M4 7h2.5c4.5 0 6.5 10 11 10H20M4 17h2.5c1.7 0 2.9-1.4 3.9-3.2M13.6 10.2C14.6 8.4 15.8 7 17.5 7H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    chevL: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    chevR: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.2l2.8 1.8"/>',
    wind: '<path d="M3.5 9h10a3 3 0 1 0-3-3M3.5 15h13a3 3 0 1 1-3 3M3.5 12h16"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    spark: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    f_full: '<circle cx="12" cy="4.8" r="2"/><path d="M12 8.2v6M4.5 9.5l7.5 1.6 7.5-1.6M12 14.2l-4 6M12 14.2l4 6"/>',
    f_lowBack: '<rect x="8.5" y="3" width="7" height="3.6" rx="1.8"/><rect x="8" y="8.4" width="8" height="3.6" rx="1.8"/><rect x="7.5" y="13.8" width="9" height="3.6" rx="1.8"/><path d="M10 20.5h4"/>',
    f_hips: '<path d="M12 6c-3.2 0-7 1.2-7 5 0 3 2 5.2 4.2 6.2L12 14.5l2.8 2.7C17 16.2 19 14 19 11c0-3.8-3.8-5-7-5z"/><circle cx="12" cy="10.5" r="1.4"/>',
    f_hamstrings: '<circle cx="6" cy="5.5" r="2"/><path d="M6 8.5l2.5 7.5h11M8.5 16 4 19.5M13 9.5l-4.5 2"/>',
    f_upper: '<circle cx="12" cy="6.5" r="2.6"/><path d="M4.5 18.5c0-4 3.2-7 7.5-7s7.5 3 7.5 7"/>'
  };
  const icon = (name, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  // ───────── Helpers ─────────
  const pad = n => String(n).padStart(2, '0');
  const { dayKey, keyDate } = P;
  const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  const holdText = (p, hold) => `${hold}s${p.sides ? ' each side' : ''}`;
  const levelName = l => (l === 'a' ? 'Advanced' : l === 'i' ? 'Intermediate' : 'Beginner');
  const listNames = ps => ps.map(p => p.name).join(' & ');
  const POS_NAME = { stand: 'Standing', kneel: 'Kneeling', seat: 'Seated', prone: 'On the belly', supine: 'On the back' };
  const PHASE_TAG = { warm: 'Warm-up', main: '', cool: 'Cool-down', final: 'Rest' };

  const figCache = new Map();
  function thumb(p) {
    if (!figCache.has(p.id)) figCache.set(p.id, window.Figure.svg(p, { frames: 'first' }));
    return figCache.get(p.id);
  }

  const streaks = () => P.streaks(history, new Date());

  /** Advanced unlock state: which hard poses are open, which are new this week, what's next. */
  function advanced() {
    const u = P.unlocks(history, ADVANCED.length);
    const open = ADVANCED.slice(0, u.count);
    return Object.assign(u, {
      open,
      fresh: open.slice(-P.POSES_PER_UNLOCK),
      next: ADVANCED.slice(u.count, u.count + P.POSES_PER_UNLOCK),
      isOpen: p => p.lvl !== 'a' || open.includes(p)
    });
  }
  // Advanced can only stay selected while something is unlocked (e.g. after a progress reset).
  if (prefs.level === 'a' && !advanced().count) prefs.level = 'i';

  // ───────── Tabs ─────────
  const ui = { tab: 'today', lib: { q: '', tg: 'all', lvl: 'all' }, cal: null };

  function setTab(tab) {
    ui.tab = tab;
    $$('.tab').forEach(b => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
    const v = $('#view');
    v.innerHTML = tab === 'library' ? viewLibrary() : tab === 'progress' ? viewProgress() : viewToday();
    v.style.animation = 'none'; void v.offsetHeight; v.style.animation = '';
    window.scrollTo(0, 0);
    if (tab === 'library') bindLibrary();
  }

  // ───────── Today ─────────
  const HERO = ['warrior2', 'tree', 'triangle', 'lowLunge', 'reverseWarrior', 'dancer', 'sideAngle', 'halfMoon', 'warrior1', 'chair'];

  function viewToday() {
    const now = new Date();
    const hr = now.getHours();
    const greet = hr >= 5 && hr < 12 ? 'Good morning' : hr >= 12 && hr < 17 ? 'Good afternoon' : 'Good evening';
    const today = dayKey(now);
    const done = new Set(history.map(h => h.d));
    const doneToday = done.has(today);
    const { current, best } = streaks();
    const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    const hero = byId[HERO[doy % HERO.length]];

    const start = new Date(now); start.setDate(now.getDate() - now.getDay());
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = dayKey(d);
      return `<span class="${done.has(k) ? 'on' : ''} ${k === today ? 'today' : ''}">${'SMTWTFS'[i]}</span>`;
    }).join('');

    const tiles = [['lowBack', 'Support & relief'], ['hips', 'Open & release'], ['hamstrings', 'Lengthen & loosen'], ['upper', 'Melt tension']];
    const adv = advanced();
    const advPct = adv.complete ? 100 : Math.round((adv.intoWeek / P.DAYS_PER_UNLOCK) * 100);

    return `
      <header class="top">
        <div>
          <p class="eyebrow">${greet}</p>
          <h1 class="display">${doneToday ? 'Nicely<br>done today.' : 'Time to<br>stretch.'}</h1>
        </div>
        <button class="icon-btn" data-act="settings" aria-label="Settings">${icon('sliders')}</button>
      </header>

      <section class="card hero">
        <div class="hero-art">${thumb(hero)}</div>
        <h2 class="h2">Daily stretch</h2>
        <p class="sub">${doneToday ? 'Go again any time. Your body will thank you.' : 'A calm routine for your back, hips and everyday flexibility.'}</p>
        <button class="hero-meta" data-act="setup" aria-label="Change session settings">
          <span class="chip">${icon('clock')}${prefs.minutes} min</span>
          <span class="chip">${FOCI[prefs.focus].label}</span>
          <span class="chip">${levelName(prefs.level)}</span>
          <span class="chip chip-edit">${icon('sliders')}Edit</span>
        </button>
        <button class="btn-primary" data-act="quick-start">${icon('play', 'fill')}${doneToday ? 'Start another session' : 'Start session'}</button>
      </section>

      <button class="card full25" data-act="full25">
        <span class="full25-ic">${icon('f_full')}</span>
        <span class="full25-txt"><b>Full Body · 25 min</b><span>Head to toe, a little of every major area</span></span>
        <span class="full25-go">${icon('play', 'fill')}</span>
      </button>

      <section class="card streak">
        <div class="streak-row">
          <div class="streak-num">${current}</div>
          <div class="streak-text">
            <b>${current ? `${current}-day streak` : 'Start a streak'}</b>
            <span>${best ? `Best: ${best} day${best > 1 ? 's' : ''}` : 'Stretch today to begin'}</span>
          </div>
        </div>
        <div class="week" aria-hidden="true">${week}</div>
      </section>

      <button class="card adv-card" data-act="adv-library">
        <div class="adv-head">
          <span class="adv-ic">${icon(adv.count ? 'spark' : 'lock')}</span>
          <div>
            <b>${adv.complete ? 'Every advanced pose unlocked' : adv.count ? `Advanced · ${adv.count} of ${adv.total} unlocked` : 'Advanced poses'}</b>
            <span>${adv.complete ? 'You\'ve unlocked the whole library.'
              : adv.count ? `Next 2 unlock in ${adv.daysToNext} practice day${adv.daysToNext === 1 ? '' : 's'}`
              : `Practice ${adv.daysToNext} more day${adv.daysToNext === 1 ? '' : 's'} to unlock your first 2`}</span>
          </div>
        </div>
        ${adv.complete ? '' : `
          <div class="adv-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${P.DAYS_PER_UNLOCK}" aria-valuenow="${adv.intoWeek}"><i style="width:${advPct}%"></i></div>
          <p class="adv-note">${adv.count ? `New this week: <b>${esc(listNames(adv.fresh))}</b>` : `Coming first: <b>${esc(listNames(adv.next))}</b>`}</p>`}
      </button>

      <h3 class="section-title">Choose a focus</h3>
      <div class="focus-tiles">
        ${tiles.map(([k, sub]) => `
          <button class="focus-tile" data-act="start" data-focus="${k}">
            <span class="focus-ic">${icon('f_' + k)}</span>
            <div><b>${FOCI[k].label}</b><span>${sub}</span></div>
          </button>`).join('')}
      </div>`;
  }

  // ───────── Sheets ─────────
  const sheetRoot = $('#sheet-root');
  const sheetEl = $('.sheet', sheetRoot);
  const sheetBody = $('.sheet-body', sheetRoot);

  function openSheet(html) {
    sheetBody.innerHTML = html;
    sheetBody.scrollTop = 0;
    sheetRoot.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => sheetRoot.classList.add('open')));
  }
  function closeSheet() {
    sheetRoot.classList.remove('open');
    sheetEl.style.transform = '';
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!sheetRoot.classList.contains('open')) { sheetRoot.hidden = true; sheetBody.innerHTML = ''; }
    }, 380);
  }
  function rerenderSheet(html) {
    const st = sheetBody.scrollTop;
    sheetBody.innerHTML = html;
    sheetBody.scrollTop = st;
  }

  // Swipe down to dismiss
  (function () {
    let y0 = null, dy = 0;
    sheetEl.addEventListener('touchstart', e => {
      y0 = sheetBody.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0;
    }, { passive: true });
    sheetEl.addEventListener('touchmove', e => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) { sheetEl.style.transition = 'none'; sheetEl.style.transform = `translateY(${dy}px)`; }
    }, { passive: true });
    sheetEl.addEventListener('touchend', () => {
      if (y0 == null) return;
      sheetEl.style.transition = '';
      if (dy > 110) closeSheet(); else sheetEl.style.transform = '';
      y0 = null;
    });
  })();

  // ───────── Session setup ─────────
  let draft = null;

  function openSetup(focus) {
    draft = { minutes: prefs.minutes, focus: focus || prefs.focus, level: prefs.level };
    draft.routine = buildRoutine();
    openSheet(setupHtml());
  }
  function routineFor(o) {
    const adv = advanced();
    return window.Routine.build(Object.assign({
      lastUsed, unlocked: adv.open.map(p => p.id), fresh: adv.fresh.map(p => p.id)
    }, o));
  }
  const buildRoutine = () => routineFor({ minutes: draft.minutes, focus: draft.focus, level: draft.level });

  function setupHtml() {
    const r = draft.routine;
    const adv = advanced();
    const seg = (act, opts, cur) => opts.map(([v, l, locked]) =>
      `<button data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}" ${locked ? 'disabled' : ''}>${locked ? icon('lock') : ''}${l}</button>`).join('');
    return `
      <div class="sheet-head"><h2 class="h2">Your session</h2>
        <button class="sheet-close" data-act="close-sheet" aria-label="Close">${icon('close')}</button></div>

      <span class="label">Length</span>
      <div class="seg">${seg('set-min', [[10, '10 min'], [15, '15 min'], [20, '20 min'], [25, '25 min']], draft.minutes)}</div>

      <span class="label">Focus</span>
      <div class="focus-grid">
        ${Object.entries(FOCI).map(([k, f]) => `
          <button class="focus-opt" data-act="set-focus" data-v="${k}" aria-pressed="${draft.focus === k}">
            <span class="focus-ic">${icon('f_' + k)}</span>${f.label}
          </button>`).join('')}
      </div>

      <span class="label">Level</span>
      <div class="seg">${seg('set-level', [['b', 'Beginner'], ['i', 'Intermediate'], ['a', 'Advanced', !adv.count]], draft.level)}</div>
      <p class="fine">${adv.count
        ? `Advanced adds your ${adv.count} unlocked hard pose${adv.count === 1 ? '' : 's'} to Intermediate${adv.complete ? '.' : `. Next 2 unlock in ${adv.daysToNext} practice day${adv.daysToNext === 1 ? '' : 's'}.`}`
        : `Advanced unlocks after ${P.DAYS_PER_UNLOCK} practice days (${adv.daysToNext} to go).`}</p>

      <div class="preview">
        <div class="preview-head">
          <div><b>${r.items.length} poses</b><span>About ${Math.round(r.total / 60)} minutes</span></div>
          <button class="btn-ghost" data-act="shuffle">${icon('shuffle')}Shuffle</button>
        </div>
        <ol class="plist">
          ${r.items.map(it => `
            <li>
              <div class="mini">${thumb(it.pose)}</div>
              <div><div class="pname">${esc(it.pose.name)}</div><div class="pmeta">${holdText(it.pose, it.hold)}</div></div>
              <span class="phase-tag">${it.pose.lvl === 'a' ? (adv.fresh.includes(it.pose) ? 'New' : 'Advanced') : PHASE_TAG[it.phase]}</span>
            </li>`).join('')}
        </ol>
      </div>
      <div class="sheet-cta"><button class="btn-primary" data-act="begin">${icon('play', 'fill')}Begin</button></div>`;
  }

  function updateDraft(k, v) {
    draft[k] = v;
    draft.routine = buildRoutine();
    rerenderSheet(setupHtml());
  }

  // ───────── Pose detail ─────────
  function openPose(id) {
    const p = byId[id];
    const b = BREATH[p.br];
    const adv = advanced();
    const lockedNote = adv.isOpen(p) ? '' : (() => {
      const weeksAway = Math.ceil(p.unlock / P.POSES_PER_UNLOCK) - Math.floor(adv.days / P.DAYS_PER_UNLOCK);
      const days = adv.daysToNext + (weeksAway - 1) * P.DAYS_PER_UNLOCK;
      return `<p class="lock-note">${icon('lock')}Unlocks after ${days} more practice day${days === 1 ? '' : 's'}</p>`;
    })();
    openSheet(`
      <div class="pd">
        <div class="sheet-head">
          <span class="chip lvl-${p.lvl}"><i class="dot ${p.lvl}"></i>${levelName(p.lvl)}</span>
          <button class="sheet-close" data-act="close-sheet" aria-label="Close">${icon('close')}</button>
        </div>
        <div class="pd-art">${window.Figure.svg(p).replace('<svg class="fig', '<svg class="fig anim')}</div>
        <div class="pd-title"><h2 class="h2">${esc(p.name)}</h2>${p.sk ? `<p class="pd-sk">${esc(p.sk)}</p>` : ''}</div>
        ${lockedNote}
        <div class="pd-badges">
          <span class="chip">${icon('clock')}${holdText(p, p.hold)}</span>
          <span class="chip">${POS_NAME[p.pos]}</span>
        </div>
        <div class="breath-card">
          <div class="bc-ic">${icon('wind')}</div>
          <div><b>${b.name}</b><span>${b.desc}</span></div>
        </div>
        <h3>How to</h3>
        <ol class="steps">${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
        <h3>Make it easier</h3>
        <p class="note">${esc(p.tip)}</p>
        <h3>Why it helps</h3>
        <p class="note">${esc(p.why)}</p>
        <h3>Targets</h3>
        <div class="targets">${p.tg.map(t => `<span class="chip">${TARGETS[t]}</span>`).join('')}</div>
      </div>`);
  }

  // ───────── Library ─────────
  const LIB_FILTERS = [['all', 'All'], ['lowBack', 'Low back'], ['hips', 'Hips'], ['hamstrings', 'Hamstrings'],
    ['shoulders', 'Shoulders'], ['neck', 'Neck'], ['core', 'Core'], ['spine', 'Spine'], ['sideBody', 'Side body'],
    ['chest', 'Chest'], ['quads', 'Quads'], ['glutes', 'Glutes'], ['balance', 'Balance']];

  function viewLibrary() {
    return `
      <header class="top"><div><p class="eyebrow">${POSES.length} poses</p><h1 class="display">Pose library</h1></div></header>
      <label class="search">${icon('search')}<input id="lib-q" type="search" placeholder="Search poses" value="${esc(ui.lib.q)}" autocomplete="off"></label>
      <div class="chip-row" id="lib-tg">
        ${LIB_FILTERS.map(([k, l]) => `<button class="chip" data-act="lib-tg" data-v="${k}" aria-pressed="${ui.lib.tg === k}">${l}</button>`).join('')}
      </div>
      <div class="seg small lib-level" id="lib-lvl">
        ${[['all', 'All'], ['b', 'Beginner'], ['i', 'Intermediate'], ['a', 'Advanced']].map(([k, l]) => `<button data-act="lib-lvl" data-v="${k}" aria-pressed="${ui.lib.lvl === k}">${l}</button>`).join('')}
      </div>
      <div class="pose-grid" id="lib-grid">${libGrid()}</div>`;
  }

  function libGrid() {
    const q = ui.lib.q.trim().toLowerCase();
    const list = POSES.filter(p =>
      (ui.lib.tg === 'all' || p.tg.includes(ui.lib.tg)) &&
      (ui.lib.lvl === 'all' || p.lvl === ui.lib.lvl) &&
      (!q || `${p.name} ${p.sk || ''} ${p.tg.map(t => TARGETS[t]).join(' ')}`.toLowerCase().includes(q)));
    if (!list.length) return '<p class="empty" style="grid-column: 1 / -1">No poses match. Try another filter.</p>';
    const adv = advanced();
    return list.map(p => {
      const locked = !adv.isOpen(p);
      return `
      <button class="pose-card${locked ? ' locked' : ''}" data-pose="${p.id}">
        <div class="pc-art">${thumb(p)}${locked ? `<span class="pc-lock">${icon('lock')}</span>` : ''}</div>
        <div class="pc-name">${esc(p.name)}</div>
        <div class="pc-meta"><i class="dot ${p.lvl}"></i>${locked ? `Unlocks in week ${Math.ceil(p.unlock / P.POSES_PER_UNLOCK)}` : TARGETS[p.tg[0]] + (p.sides ? ' · both sides' : '')}</div>
      </button>`;
    }).join('');
  }

  function bindLibrary() {
    const inp = $('#lib-q');
    inp.addEventListener('input', () => { ui.lib.q = inp.value; $('#lib-grid').innerHTML = libGrid(); });
  }

  function setLibFilter(kind, v) {
    ui.lib[kind] = v;
    $$(`#lib-${kind} button`).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
    $('#lib-grid').innerHTML = libGrid();
  }

  // ───────── Progress ─────────
  function viewProgress() {
    const { current, best } = streaks();
    const minutes = history.reduce((s, h) => s + h.min, 0);
    if (!ui.cal) { const n = new Date(); ui.cal = new Date(n.getFullYear(), n.getMonth(), 1); }
    const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    const recent = history.slice(-12).reverse();
    return `
      <header class="top"><div><p class="eyebrow">Your practice</p><h1 class="display">Progress</h1></div></header>
      <div class="stats">
        ${stat(current, 'Day streak')}${stat(best, 'Best streak')}${stat(history.length, 'Sessions')}${stat(minutes, 'Minutes')}
      </div>
      <h3 class="section-title">Calendar</h3>
      <section class="card" id="cal">${calendar()}</section>
      <h3 class="section-title">Recent sessions</h3>
      ${recent.length ? `<ul class="hist">${recent.map(h => `
        <li>
          <span class="h-ic">${icon('f_' + (FOCI[h.focus] ? h.focus : 'full'))}</span>
          <div><b>${h.focus === 'full25' ? 'Full Body 25' : (FOCI[h.focus] || FOCI.full).label}</b>
            <span>${keyDate(h.d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${h.n} poses${h.partial ? ' · partial' : ''}</span></div>
          <span class="h-min">${h.min} min</span>
        </li>`).join('')}</ul>`
        : '<p class="empty">Your sessions will appear here.<br>Start your first one from Today.</p>'}`;
  }

  function calendar() {
    const m = ui.cal, y = m.getFullYear(), mo = m.getMonth();
    const now = new Date();
    const today = dayKey(now);
    const isCurrent = y === now.getFullYear() && mo === now.getMonth();
    const days = new Set(history.map(h => h.d));
    const firstDow = new Date(y, mo, 1).getDay();
    const n = new Date(y, mo + 1, 0).getDate();
    let cells = 'SMTWTFS'.split('').map(c => `<div class="wd">${c}</div>`).join('');
    for (let i = 0; i < firstDow; i++) cells += '<div></div>';
    for (let d = 1; d <= n; d++) {
      const k = dayKey(new Date(y, mo, d));
      cells += `<div class="d ${days.has(k) ? 'on' : ''} ${k === today ? 'today' : ''} ${k > today ? 'future' : ''}"><span>${d}</span></div>`;
    }
    return `
      <div class="cal-head">
        <b>${m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b>
        <div class="cal-nav">
          <button data-act="cal-prev" aria-label="Previous month">${icon('chevL')}</button>
          <button data-act="cal-next" aria-label="Next month" ${isCurrent ? 'disabled style="opacity:.35"' : ''}>${icon('chevR')}</button>
        </div>
      </div>
      <div class="cal-grid">${cells}</div>`;
  }

  // ───────── Settings ─────────
  function settingsHtml() {
    const row = (k, title, sub) => `
      <button class="set-row" data-act="toggle" data-k="${k}" role="switch" aria-checked="${!!prefs[k]}">
        <div class="txt"><b>${title}</b><span>${sub}</span></div>
        <span class="switch" aria-checked="${!!prefs[k]}"></span>
      </button>`;
    return `
      <div class="sheet-head"><h2 class="h2">Settings</h2>
        <button class="sheet-close" data-act="close-sheet" aria-label="Close">${icon('close')}</button></div>
      <span class="label">Sound</span>
      <div class="set-group">
        ${row('chime', 'Chimes', 'A soft bell when each hold begins')}
        ${row('voice', 'Voice guidance', 'Announces each pose and side')}
        ${row('breathVoice', 'Spoken breath cues', 'Says “inhale”, “hold” and “exhale”')}
      </div>
      <p class="fine">On iPhone, sounds stay quiet while the silent switch is on.</p>

      <span class="label">Add to Home Screen</span>
      <div class="set-group"><div class="set-row"><div class="txt">
        <b>In Safari, tap Share, then “Add to Home Screen”.</b>
        <span>Sage then opens full screen like an app and works offline.</span>
      </div></div></div>

      <span class="label">Move safely</span>
      <div class="set-group"><div class="set-row"><div class="txt">
        <span>Stretch to a comfortable edge, never into pain, and keep breathing. If you have an injury, back condition or are pregnant, check with a doctor or physical therapist first.</span>
      </div></div></div>

      <span class="label">Data</span>
      <div class="set-group">
        <button class="set-row" data-act="reset"><div class="txt">
          <b style="color:#B4513E">Reset progress</b><span>Clears streaks and session history on this device.</span>
        </div></button>
      </div>`;
  }

  // ───────── Sound & voice ─────────
  let ac = null;
  function unlockAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !ac) ac = new AC();
      if (ac && ac.state === 'suspended') ac.resume();
      if (ac) { // iOS needs a sound started inside a tap
        const src = ac.createBufferSource();
        src.buffer = ac.createBuffer(1, 1, 22050);
        src.connect(ac.destination); src.start(0);
      }
    } catch (e) { ac = null; }
  }

  function chime(kind) {
    if (!prefs.chime || S.muted || !ac) return;
    const notes = kind === 'end' ? [523.25, 659.25, 783.99] : kind === 'soft' ? [587.33] : [659.25, 987.77];
    const t0 = ac.currentTime + 0.02;
    notes.forEach((f, i) => {
      [[1, 0.14, 2.4], [2.76, 0.03, 0.8]].forEach(([h, peak, len]) => { // bowl-like partials
        const o = ac.createOscillator(), g = ac.createGain();
        const st = t0 + i * 0.16;
        o.type = 'sine'; o.frequency.value = f * h;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(peak, st + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, st + len);
        o.connect(g); g.connect(ac.destination);
        o.start(st); o.stop(st + len + 0.1);
      });
    });
  }

  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let voice = null;
  function pickVoice() {
    if (!synth) return;
    const vs = synth.getVoices();
    const liked = ['Samantha', 'Ava', 'Allison', 'Karen', 'Moira', 'Serena', 'Jenny', 'Aria', 'Google US English'];
    voice = liked.map(n => vs.find(v => v.name.includes(n) && /^en/i.test(v.lang))).find(Boolean)
      || vs.find(v => /^en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  function speak(text, rate, interrupt) {
    if (!synth || S.muted) return;
    try {
      if (interrupt) synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'en-US';
      u.rate = rate; u.pitch = 1;
      synth.speak(u);
    } catch (e) { /* speech unavailable */ }
  }
  const say = text => { if (prefs.voice) speak(text, 0.92, true); };
  const sayBreath = word => { if (prefs.breathVoice && !(synth && synth.speaking)) speak(word, 0.8, false); };

  // ───────── Session player ─────────
  const sess = $('#session');
  const CIRC = 2 * Math.PI * 47;
  const S = { on: false, muted: false };
  const themeMetas = $$('meta[name="theme-color"]').map(m => [m, m.content]);
  const setTheme = c => themeMetas.forEach(([m, orig]) => { m.content = c || orig; });

  function startSession(routine) {
    unlockAudio();
    const steps = window.Routine.steps(routine);
    const span = routine.items.map(() => ({ start: -1, total: 0 }));
    steps.forEach((st, k) => { const s = span[st.item]; if (s.start < 0) s.start = k; s.total += st.dur; });
    Object.assign(S, {
      on: true, done: false, routine, steps, span, i: 0, t: 0, paused: false, item: -1,
      last: performance.now(), hz: 0, breathIdx: -1, elapsed: 0, frames: [],
      startedAt: new Date(), held: routine.items.map(() => 0) // seconds actually held, per pose
    });

    sess.className = 'session';
    sess.innerHTML = `
      <div class="glow glow-in"></div><div class="glow glow-hold"></div>
      <div class="s-top">
        <button class="s-btn" data-act="s-exit" aria-label="End session">${icon('close')}</button>
        <div class="s-bar">${routine.items.map(() => '<i><b></b></i>').join('')}</div>
        <button class="s-btn" data-act="s-mute" aria-label="Mute">${icon(S.muted ? 'mute' : 'sound')}</button>
      </div>
      <div class="s-main">
        <p class="s-phase"></p>
        <h2 class="s-name"></h2>
        <p class="s-side"></p>
        <div class="s-ring">
          <svg class="ring" viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="47"/>
            <circle class="prog" cx="50" cy="50" r="47" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/></svg>
          <div class="s-fig"></div>
        </div>
        <div class="s-time">0:00</div>
        <div class="s-breath"><span class="bd"></span><span class="txt"></span><span class="cnt"></span></div>
      </div>
      <div class="s-steps"></div>
      <div class="s-controls">
        <button class="s-btn" data-act="s-prev" aria-label="Previous pose">${icon('prev')}</button>
        <button class="s-play" data-act="s-toggle" aria-label="Pause">${icon('pause')}</button>
        <button class="s-btn" data-act="s-next" aria-label="Next pose">${icon('next')}</button>
      </div>`;
    sess.hidden = false;
    setTheme('#182018');

    S.el = {
      gIn: $('.glow-in', sess), gHold: $('.glow-hold', sess), phase: $('.s-phase', sess), name: $('.s-name', sess),
      side: $('.s-side', sess), prog: $('.ring .prog', sess), fig: $('.s-fig', sess), time: $('.s-time', sess),
      breath: $('.s-breath', sess), btxt: $('.s-breath .txt', sess), bcnt: $('.s-breath .cnt', sess),
      bdot: $('.s-breath .bd', sess), steps: $('.s-steps', sess), play: $('.s-play', sess), bars: $$('.s-bar b', sess)
    };
    enterStep(true);
    keepAwake();
    stopClock();
    S.raf = requestAnimationFrame(tick);
    S.backup = setInterval(backupTick, 250);
  }

  function stopClock() {
    cancelAnimationFrame(S.raf);
    clearInterval(S.backup);
  }

  function enterStep(first) {
    const st = S.steps[S.i], it = S.routine.items[st.item], p = it.pose, e = S.el;
    S.breathIdx = -1;
    if (st.item !== S.item) {
      S.item = st.item;
      e.name.textContent = p.name;
      e.fig.innerHTML = window.Figure.svg(p);
      S.frames = $$('.fig-frame', e.fig);
      e.steps.innerHTML = `<ol class="steps">${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><p class="s-tip">${esc(p.tip)}</p>`;
      e.steps.scrollTop = 0;
    }
    e.side.textContent = st.side || '';
    e.phase.textContent = st.kind === 'ready' ? (first ? 'First pose' : 'Up next')
      : st.kind === 'switch' ? 'Switch sides' : it.phase === 'final' ? 'Rest' : 'Hold';
    e.prog.classList.toggle('ready', st.kind !== 'hold');
    e.bars.forEach((b, k) => { b.style.width = k < st.item ? '100%' : k > st.item ? '0%' : b.style.width; });

    if (st.kind === 'ready') {
      const intro = first ? "Let's begin. " : it.phase === 'final' ? 'Finally, ' : 'Next, ';
      say(`${intro}${p.name}${st.side ? '. ' + st.side : ''}.`);
    } else if (st.kind === 'switch') {
      chime('soft');
      say(`Switch sides. ${st.side}.`);
    } else {
      chime('start');
    }
  }

  function breathAt(seq, t) {
    const cycle = seq.reduce((s, x) => s + x[1], 0);
    let x = t % cycle;
    const n = Math.floor(t / cycle);
    for (let k = 0; k < seq.length; k++) {
      const [kind, d] = seq[k];
      if (x < d) {
        const ease = 0.5 - 0.5 * Math.cos(Math.PI * (x / d));
        const v = kind === 'in' ? ease : kind === 'out' ? 1 - ease : kind === 'hold' ? 1 : 0;
        return { kind, v, left: d - x, idx: n * seq.length + k };
      }
      x -= d;
    }
    return { kind: 'rest', v: 0, left: 0, idx: -1 };
  }

  const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };

  /** Advances the session clock. Returns the elapsed seconds, or null once the session is over. */
  function advance(now) {
    if (!S.on || S.done) return null;
    const dt = Math.min(0.5, Math.max(0, (now - S.last) / 1000));
    S.last = now;
    if (!S.paused) {
      S.t += dt;
      S.elapsed += dt;
      if (S.steps[S.i].kind === 'hold') S.held[S.steps[S.i].item] += dt;
      if (S.t >= S.steps[S.i].dur) {
        S.t = 0;
        S.i++;
        if (S.i >= S.steps.length) { finish(); return null; }
        enterStep(false);
      }
    }
    return dt;
  }

  // Animation frames drive the smooth glow; a slow backup tick keeps the clock honest
  // whenever the browser throttles frames (e.g. Low Power Mode).
  function tick(now) {
    const dt = advance(now);
    if (dt == null) return;
    draw(dt, now);
    S.raf = requestAnimationFrame(tick);
  }
  function backupTick() {
    const now = performance.now();
    if (now - S.last < 240) return;
    const dt = advance(now);
    if (dt != null) draw(dt, now);
  }

  const BREATH_WORD = { in: 'Inhale', hold: 'Hold', out: 'Exhale', rest: 'Hold' };

  function draw(dt, now) {
    const st = S.steps[S.i], it = S.routine.items[st.item], e = S.el;
    let b, label, cnt = '', holding = false;
    if (st.kind === 'hold') {
      const br = breathAt(BREATH[it.pose.br].seq, S.t);
      b = br.v;
      holding = br.kind === 'hold' || br.kind === 'rest';
      label = BREATH_WORD[br.kind];
      cnt = String(Math.ceil(br.left));
      if (br.idx !== S.breathIdx) { S.breathIdx = br.idx; if (!S.paused) sayBreath(label); }
    } else {
      b = 0.28 + 0.1 * Math.sin((now / 1000) * Math.PI / 2);
      label = st.kind === 'switch' ? 'Change sides' : 'Get into position';
    }
    if (S.paused) { label = 'Paused'; cnt = ''; }

    // The edge glow: green swells on the inhale and fades on the exhale; it turns warm sand while you hold.
    S.hz += ((holding ? 1 : 0) - S.hz) * Math.min(1, dt * 6);
    e.gIn.style.opacity = ((0.1 + 0.9 * b) * (1 - S.hz)).toFixed(3);
    e.gHold.style.opacity = (S.hz * (0.25 + 0.75 * b)).toFixed(3);

    setText(e.time, fmtTime(st.dur - S.t));
    e.prog.style.strokeDashoffset = (CIRC * (1 - S.t / st.dur)).toFixed(2);
    setText(e.btxt, label);
    setText(e.bcnt, cnt);
    e.breath.classList.toggle('hold', holding);
    e.bdot.style.transform = `scale(${(0.8 + 0.7 * b).toFixed(3)})`;
    e.fig.style.transform = `scale(${(0.96 + 0.05 * b).toFixed(3)})`;
    if (S.frames.length > 1) {
      const v = st.kind === 'hold' ? b : 1;
      S.frames[0].style.opacity = v;
      S.frames[1].style.opacity = 1 - v;
    }
    const sp = S.span[st.item];
    let done = S.t;
    for (let k = sp.start; k < S.i; k++) done += S.steps[k].dur;
    e.bars[st.item].style.width = (Math.min(1, done / sp.total) * 100).toFixed(1) + '%';
  }

  function setPaused(p) {
    S.paused = p;
    S.el.play.innerHTML = icon(p ? 'play' : 'pause', p ? 'fill' : '');
    S.el.play.setAttribute('aria-label', p ? 'Resume' : 'Pause');
    sess.classList.toggle('paused', p);
    if (p && synth) synth.cancel();
  }

  function jumpTo(k) { S.i = k; S.t = 0; enterStep(false); draw(0, performance.now()); }
  function nextPose() {
    const cur = S.steps[S.i].item;
    if (cur + 1 >= S.routine.items.length) { finish(); return; }
    jumpTo(S.span[cur + 1].start);
  }
  function prevPose() {
    const cur = S.steps[S.i].item;
    const start = S.span[cur].start;
    jumpTo(S.i > start || S.t > 3 || cur === 0 ? start : S.span[cur - 1].start);
  }

  function askExit() {
    S.wasPaused = S.paused;
    setPaused(true);
    const saves = P.qualifies(S.elapsed);
    sess.insertAdjacentHTML('beforeend', `
      <div class="s-overlay"><div class="s-dialog">
        <h3>End session?</h3>
        <p>${saves ? 'You stretched long enough for today to count. It\'ll be saved.'
          : `Sessions count toward your streak after ${P.MIN_SECONDS / 60} minutes. Stay a little longer?`}</p>
        <div class="row"><button class="end" data-act="s-end">End</button><button class="keep" data-act="s-keep">Keep going</button></div>
      </div></div>`);
  }

  /** Saves the session. The day is the day you started, so a late-night stretch counts for that night. */
  function record(partial) {
    const done = S.held.map((s, i) => (s >= 5 ? i : -1)).filter(i => i >= 0);
    const rec = {
      d: dayKey(S.startedAt), ts: Date.now(),
      min: Math.max(1, Math.round(S.elapsed / 60)), n: done.length,
      focus: S.routine.coverage ? 'full25' : S.routine.focus, level: S.routine.level
    };
    if (partial) rec.partial = true;
    history.push(rec);
    store.set('history', history);
    done.forEach(i => { lastUsed[S.routine.items[i].pose.id] = Date.now(); });
    store.set('lastUsed', lastUsed);
    return rec;
  }

  function finish() {
    S.done = true;
    stopClock();
    const before = advanced().count;
    const counts = P.qualifies(S.elapsed);
    const rec = counts ? record(false) : null;
    const adv = advanced();
    const unlockedNow = adv.count > before ? adv.open.slice(before) : [];
    const { current } = streaks();
    chime('end');
    say(unlockedNow.length ? `Session complete. You unlocked ${listNames(unlockedNow)}.` : 'Session complete. Well done.');
    S.el.gHold.style.opacity = 0;
    S.el.gIn.style.opacity = 0.35;
    $$('.s-top, .s-main, .s-steps, .s-controls, .s-overlay', sess).forEach(n => n.remove());
    sess.classList.remove('paused');
    sess.insertAdjacentHTML('beforeend', `
      <div class="s-done">
        <div class="badge">${icon(unlockedNow.length ? 'spark' : 'check')}</div>
        <h2>${counts ? 'Beautifully done.' : 'That was quick.'}</h2>
        <p>${counts ? 'Take a moment to notice how your body feels.'
          : `Sessions count toward your streak after ${P.MIN_SECONDS / 60} minutes of stretching. This one wasn't saved.`}</p>
        ${counts ? `<div class="sum">
          <div><b>${rec.min}</b><span>minutes</span></div>
          <div><b>${rec.n}</b><span>poses</span></div>
          <div><b>${current}</b><span>day streak</span></div>
        </div>` : '<div class="sum-gap"></div>'}
        ${unlockedNow.length ? `
          <div class="unlock">
            <b>New poses unlocked</b>
            <div class="unlock-poses">${unlockedNow.map(p => `<div><span class="mini">${thumb(p)}</span>${esc(p.name)}</div>`).join('')}</div>
            ${prefs.level !== 'a' ? '<button class="btn-ghost" data-act="use-advanced">Add them to my routine</button>'
              : '<span class="fine-s">They\'ll appear in your sessions this week.</span>'}
          </div>` : ''}
        <button class="btn-primary" data-act="s-close">Done</button>
      </div>`);
    releaseWake();
  }

  function closeSession() {
    S.on = false;
    stopClock();
    if (synth) synth.cancel();
    releaseWake();
    sess.hidden = true;
    sess.innerHTML = '';
    setTheme(null);
    setTab(ui.tab);
  }

  async function keepAwake() {
    try {
      if ('wakeLock' in navigator && !S.wake) {
        S.wake = await navigator.wakeLock.request('screen');
        S.wake.addEventListener('release', () => { S.wake = null; });
      }
    } catch (e) { S.wake = null; }
  }
  function releaseWake() { try { if (S.wake) S.wake.release(); } catch (e) { /* already released */ } S.wake = null; }

  document.addEventListener('visibilitychange', () => {
    if (!S.on || S.done) return;
    if (document.hidden) setPaused(true);
    else { S.last = performance.now(); keepAwake(); }
  });

  // ───────── Events ─────────
  const actions = {
    'start': el => openSetup(el.dataset.focus),
    'settings': () => openSheet(settingsHtml()),
    'close-sheet': closeSheet,
    'setup': () => openSetup(),
    'quick-start': () => startSession(routineFor({ minutes: prefs.minutes, focus: prefs.focus, level: prefs.level })),
    'full25': () => startSession(routineFor({ minutes: 25, focus: 'full', level: prefs.level, coverage: true })),
    'adv-library': () => { ui.lib = { q: '', tg: 'all', lvl: 'a' }; setTab('library'); },
    'use-advanced': el => {
      prefs.level = 'a';
      savePrefs();
      el.outerHTML = '<span class="fine-s">Done. Advanced is now your level.</span>';
    },
    'set-min': el => updateDraft('minutes', Number(el.dataset.v)),
    'set-focus': el => updateDraft('focus', el.dataset.v),
    'set-level': el => updateDraft('level', el.dataset.v),
    'shuffle': () => updateDraft('minutes', draft.minutes),
    'begin': () => {
      Object.assign(prefs, { minutes: draft.minutes, focus: draft.focus, level: draft.level });
      savePrefs();
      closeSheet();
      startSession(draft.routine);
    },
    'lib-tg': el => setLibFilter('tg', el.dataset.v),
    'lib-lvl': el => setLibFilter('lvl', el.dataset.v),
    'cal-prev': () => { ui.cal = new Date(ui.cal.getFullYear(), ui.cal.getMonth() - 1, 1); $('#cal').innerHTML = calendar(); },
    'cal-next': () => { ui.cal = new Date(ui.cal.getFullYear(), ui.cal.getMonth() + 1, 1); $('#cal').innerHTML = calendar(); },
    'toggle': el => {
      const k = el.dataset.k;
      prefs[k] = !prefs[k];
      savePrefs();
      el.setAttribute('aria-checked', prefs[k]);
      $('.switch', el).setAttribute('aria-checked', prefs[k]);
    },
    'reset': () => {
      if (!window.confirm('Clear all streaks and session history on this device?')) return;
      history = []; lastUsed = {};
      store.set('history', history); store.set('lastUsed', lastUsed);
      if (prefs.level === 'a') { prefs.level = 'i'; savePrefs(); }
      closeSheet();
      setTab(ui.tab);
    },
    's-toggle': () => setPaused(!S.paused),
    's-next': nextPose,
    's-prev': prevPose,
    's-exit': askExit,
    's-keep': () => { $('.s-overlay', sess).remove(); setPaused(S.wasPaused); },
    's-end': () => { if (P.qualifies(S.elapsed)) record(true); closeSession(); },
    's-close': closeSession,
    's-mute': el => {
      S.muted = !S.muted;
      if (S.muted && synth) synth.cancel();
      el.innerHTML = icon(S.muted ? 'mute' : 'sound');
      el.setAttribute('aria-label', S.muted ? 'Unmute' : 'Mute');
    }
  };

  document.addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { setTab(tab.dataset.tab); return; }
    const pose = e.target.closest('[data-pose]');
    if (pose) { openPose(pose.dataset.pose); return; }
    const act = e.target.closest('[data-act]');
    if (act && actions[act.dataset.act]) actions[act.dataset.act](act, e);
  });

  document.addEventListener('keydown', e => {
    if (S.on && !S.done && e.key === ' ') { e.preventDefault(); setPaused(!S.paused); }
    else if (e.key === 'Escape' && !sheetRoot.hidden) closeSheet();
  });

  // ───────── Boot ─────────
  $$('.tab-ic[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  setTab('today');

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // Preview hook for screenshots: index.html?demo=setup | session | pose | library | progress
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo');
  if (demo === 'library' || demo === 'progress') setTab(demo);
  if (demo === 'setup') openSetup();
  if (demo === 'pose') openPose('catCow');
  if (demo === 'session' || demo === 'done') {
    draft = { minutes: 15, focus: 'lowBack', level: 'b' };
    startSession(buildRoutine());
    jumpTo(1); S.t = 1.2;
    if (params.has('breathhold')) { // jump to a moment where the breath is being held
      jumpTo(S.steps.findIndex(s => s.kind === 'hold' && BREATH[S.routine.items[s.item].pose.br].seq.some(x => x[0] === 'hold')));
      S.t = 5;
    }
    if (demo === 'done') { S.elapsed = 900; S.held = S.held.map(() => 30); finish(); }
  }
})();
