/* Builds a balanced session: warm-up -> main poses -> cool-down -> final rest.
 * Poses are ordered by body position so you move standing -> kneeling -> seated -> floor,
 * recently used poses are de-prioritized, and hold times are tuned so the total
 * lands on the length you picked.
 */
(function () {
  const { POSES } = window.YogaData;

  const FOCI = {
    full:       { label: 'Full body',         tg: null },
    lowBack:    { label: 'Low back',          tg: ['lowBack', 'core', 'glutes', 'spine'] },
    hips:       { label: 'Hips',              tg: ['hips', 'glutes', 'quads'] },
    hamstrings: { label: 'Legs & hamstrings', tg: ['hamstrings', 'calves', 'quads'] },
    upper:      { label: 'Shoulders & neck',  tg: ['shoulders', 'neck', 'chest'] }
  };

  // Every major area the head-to-toe routine touches at least once.
  const REGIONS = ['neck', 'shoulders', 'chest', 'spine', 'sideBody', 'lowBack', 'core', 'hips', 'glutes', 'quads', 'hamstrings', 'calves'];

  const ORDER = {
    warm: ['supine', 'seat', 'kneel', 'stand'],
    main: ['stand', 'kneel', 'seat', 'prone', 'supine'],
    cool: ['kneel', 'seat', 'prone', 'supine']
  };

  const SWITCH = 5;      // seconds to change sides
  const FIRST_EXTRA = 3; // a little more time to settle in before the first pose

  const ADVANCED = POSES.filter(p => p.lvl === 'a').sort((a, b) => a.unlock - b.unlock);

  const readyTime = level => (level === 'b' ? 10 : 8);
  function baseHold(p, level, light) {
    let h = p.lvl === 'a' || level === 'b' ? p.hold : Math.round((p.hold * 1.3) / 5) * 5;
    if (light) h = Math.min(h, 30); // head-to-toe routine: lighter holds, more areas
    return h;
  }
  const cost = (p, hold, ready) => ready + (p.sides ? hold * 2 + SWITCH : hold);

  function matchesFocus(p, focus) {
    const tg = FOCI[focus] && FOCI[focus].tg;
    return !tg || p.tg.some(t => tg.includes(t));
  }

  /**
   * opts: minutes, focus, level ('b' | 'i' | 'a'), lastUsed { id: timestamp },
   *       unlocked [advanced ids], fresh [newest unlocked ids], coverage (head-to-toe)
   */
  function build(opts) {
    const minutes = opts.minutes || 15;
    const focus = FOCI[opts.focus] ? opts.focus : 'full';
    const level = ['b', 'i', 'a'].includes(opts.level) ? opts.level : 'b';
    const lastUsed = opts.lastUsed || {};
    const unlocked = new Set(opts.unlocked || []);
    const fresh = new Set(opts.fresh || []);
    const light = !!opts.coverage;
    const target = minutes * 60 - FIRST_EXTRA;
    const ready = readyTime(level);
    const now = Date.now();
    const advCap = level === 'a' ? (minutes >= 20 ? 3 : 2) : 0;

    const allowed = p => p.lvl === 'b' || (p.lvl === 'i' && level !== 'b') || (p.lvl === 'a' && level === 'a' && unlocked.has(p.id));
    const pool = POSES.filter(p => allowed(p) && !p.use.includes('final'));
    const chosen = new Set();

    const recency = p => {
      const t = lastUsed[p.id];
      if (!t) return 0;
      const days = (now - t) / 864e5;
      return days < 1.5 ? 0.7 : days < 3.5 ? 0.35 : 0;
    };

    function score(p, phase, picked) {
      let s = Math.random();
      if (focus !== 'full' && matchesFocus(p, focus)) s += 1;
      s -= recency(p);
      s -= 0.4 * picked.filter(q => q.tg[0] === p.tg[0]).length;
      s -= 0.15 * picked.filter(q => q.pos === p.pos).length;
      if (level !== 'b' && p.lvl === 'i') s += 0.25;
      if (fresh.has(p.id)) s += 1.5;
      if (phase === 'warm' && p.br === 'steady') s += 0.2;
      return s;
    }

    const best = (cands, phase, picked) => {
      let top = null, topS = -Infinity;
      cands.forEach(p => { const s = score(p, phase, picked); if (s > topS) { topS = s; top = p; } });
      return top;
    };

    function pickN(phase, n) {
      const picked = [];
      for (let i = 0; i < n; i++) {
        const p = best(pool.filter(q => q.use.includes(phase) && !chosen.has(q.id)), phase, picked);
        if (!p) break;
        picked.push(p);
        chosen.add(p.id);
      }
      return picked;
    }

    const final = POSES.find(p => p.use.includes('final'));
    const finalHold = 60 + (minutes - 10) * 4;

    const warm = pickN('warm', minutes <= 10 ? 2 : minutes <= 20 ? 3 : 4);
    const cool = pickN('cool', minutes <= 15 ? 2 : 3);

    let used = cost(final, finalHold, ready);
    [...warm, ...cool].forEach(p => { used += cost(p, baseHold(p, level, light), ready); });

    const main = [];
    const advCount = () => main.filter(p => p.lvl === 'a').length;
    const mainCands = () => pool.filter(p => p.use.includes('main') && !chosen.has(p.id) && (p.lvl !== 'a' || advCount() < advCap));
    const add = p => { main.push(p); chosen.add(p.id); used += cost(p, baseHold(p, level, light), ready); };
    const fits = p => cost(p, baseHold(p, level, light), ready) <= target - used + 20;

    // Newly unlocked advanced poses go into every session until the next unlock.
    ADVANCED.filter(p => fresh.has(p.id) && unlocked.has(p.id) && level === 'a').forEach(p => {
      if (advCount() < advCap && fits(p)) add(p);
    });

    // Head-to-toe: make sure every major area gets some attention.
    if (opts.coverage) {
      const covered = new Set([...warm, ...cool, ...main].flatMap(p => p.tg));
      REGIONS.forEach(r => {
        if (covered.has(r)) return;
        const p = best(mainCands().filter(q => q.tg.includes(r) && fits(q)), 'main', main);
        if (p) { add(p); p.tg.forEach(t => covered.add(t)); }
      });
    }

    // Fill the rest of the time.
    for (;;) {
      if (target - used < 35) break;
      const cands = mainCands().filter(fits);
      if (!cands.length) break;
      add(best(cands, 'main', main));
    }

    const sortBy = (list, order) => list
      .map((p, i) => ({ p, i }))
      .sort((a, b) => (order.indexOf(a.p.pos) - order.indexOf(b.p.pos)) || (a.i - b.i))
      .map(x => x.p);

    const items = [
      ...sortBy(warm, ORDER.warm).map(p => ({ pose: p, phase: 'warm' })),
      ...sortBy(main, ORDER.main).map(p => ({ pose: p, phase: 'main' })),
      ...sortBy(cool, ORDER.cool).map(p => ({ pose: p, phase: 'cool' }))
    ];
    items.forEach(it => { it.hold = baseHold(it.pose, level, light); });

    // Stretch or shrink holds so the session lands on the chosen length.
    const fixed = items.reduce((s, it) => s + ready + (it.pose.sides ? SWITCH : 0), 0) + ready;
    const holdSum = items.reduce((s, it) => s + it.hold * (it.pose.sides ? 2 : 1), 0);
    const factor = Math.max(0.8, Math.min(1.35, (target - fixed - finalHold) / holdSum));
    items.forEach(it => { it.hold = Math.max(15, Math.round(it.hold * factor)); });
    const usedNow = items.reduce((s, it) => s + cost(it.pose, it.hold, ready), 0);
    const fin = Math.max(45, Math.min(180, target - usedNow - ready));
    items.push({ pose: final, phase: 'final', hold: fin });

    const total = FIRST_EXTRA + items.reduce((s, it) => s + cost(it.pose, it.hold, ready), 0);
    return { items, total, ready, minutes, focus, level, coverage: light };
  }

  /** Expands a routine into a flat timeline of steps the player walks through. */
  function steps(routine) {
    const out = [];
    routine.items.forEach((it, i) => {
      const sides = it.pose.sides ? ['Right side', 'Left side'] : [null];
      sides.forEach((side, si) => {
        out.push({ kind: si === 0 ? 'ready' : 'switch', item: i, side, dur: si === 0 ? routine.ready + (i === 0 ? FIRST_EXTRA : 0) : SWITCH });
        out.push({ kind: 'hold', item: i, side, dur: it.hold });
      });
    });
    return out;
  }

  window.Routine = { build, steps, FOCI, REGIONS, ADVANCED };
})();
