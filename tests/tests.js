/* Sage test suite: logic, stored data, the real app in an iframe, and a UI audit. */
(async function () {
  const P = window.Progress, R = window.Routine, { POSES } = window.YogaData;
  const lines = [];
  const tally = { pass: 0, fail: 0, warn: 0 };
  const section = t => lines.push(`\n## ${t}`);
  const check = (name, ok, detail) => {
    tally[ok ? 'pass' : 'fail']++;
    lines.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  →  ${detail}` : ''}`);
  };
  const warn = (name, detail) => { tally.warn++; lines.push(`WARN  ${name}${detail ? `  →  ${detail}` : ''}`); };
  const note = t => lines.push(`      ${t}`);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const D = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi);
  const rec = (date, extra) => Object.assign({ d: P.dayKey(date), ts: date.getTime(), min: 15, n: 12, focus: 'full', level: 'b' }, extra);
  // n practice days ending on `end`, every `step` days
  const run = (end, n, step = 1) => Array.from({ length: n }, (_, i) => { const d = new Date(end); d.setDate(d.getDate() - i * step); return rec(d); });
  const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);

  // ─────────────── Streaks ───────────────
  section('Streaks');
  const now = D(2026, 10, 2, 9);
  let s = P.streaks([], now);
  check('No history → 0 current, 0 best', s.current === 0 && s.best === 0, JSON.stringify(s));
  check('Stretched today → 1-day streak', P.streaks(run(now, 1), now).current === 1);
  check('Stretched yesterday, not yet today → streak still alive', P.streaks(run(D(2026, 10, 1), 1), now).current === 1);
  check('Last stretched 2 days ago → streak broken', P.streaks(run(D(2026, 9, 30), 1), now).current === 0);
  s = P.streaks(run(now, 7), now);
  check('7 days in a row → current 7, best 7', s.current === 7 && s.best === 7, JSON.stringify(s));
  const triple = [...run(now, 1), ...run(now, 1), ...run(now, 1)];
  check('3 sessions on one day count as one day', P.streaks(triple, now).current === 1 && P.practiceDays(triple).length === 1);
  s = P.streaks([...run(D(2026, 9, 28), 3), ...run(now, 2)], now); // 26-28, then 1-2
  check('A missed day resets current but keeps best', s.current === 2 && s.best === 3, JSON.stringify(s));
  check('Order of history doesn\'t matter', P.streaks(shuffle(run(now, 10)), now).current === 10);
  check('Across New Year (Dec 30 → Jan 1)', P.streaks(run(D(2027, 1, 1), 3), D(2027, 1, 1, 20)).current === 3);
  check('Across leap day (Feb 28 → Mar 1, 2028)', P.streaks(run(D(2028, 3, 1), 3), D(2028, 3, 1)).current === 3);
  check('Across daylight-saving start (Mar 7–9, 2026)', P.streaks(run(D(2026, 3, 9), 3), D(2026, 3, 9)).current === 3);
  check('Across daylight-saving end (Oct 31–Nov 2, 2026)', P.streaks(run(D(2026, 11, 2), 3), D(2026, 11, 2)).current === 3);
  check('11:59 PM and 12:01 AM land on different days', P.dayKey(D(2026, 10, 2, 23, 59)) === '2026-10-02' && P.dayKey(D(2026, 10, 3, 0, 1)) === '2026-10-03');
  check('1-year streak', P.streaks(run(now, 365), now).current === 365);
  check('Every-other-day practice → streak of 1, best 1', (s = P.streaks(run(now, 20, 2), now)).current === 1 && s.best === 1, JSON.stringify(s));

  const big = [];
  for (let i = 0; i < 5000; i++) big.push(rec(new Date(now.getTime() - Math.floor(i / 4) * 864e5 - i * 1000)));
  let t0 = performance.now();
  s = P.streaks(big, now);
  const ms = performance.now() - t0;
  check(`5,000 sessions (≈3.4 years) computed in ${ms.toFixed(1)} ms`, ms < 100 && s.current === 1250, `current ${s.current}`);

  // ─────────────── Stored-data validation ───────────────
  section('Corrupted or old stored data');
  check('null / string / object instead of a list → empty history', [null, 'garbage', {}, 42].every(x => P.sanitize(x).length === 0));
  const junk = [null, 5, 'a', {}, { d: 'bad' }, { d: '2026-13-45' }, { d: '2026-02-30' }, { d: 20261002 }, rec(now)];
  check('Malformed records are dropped, valid ones kept', P.sanitize(junk).length === 1);
  const fixed = P.sanitize([{ d: '2026-10-02', min: 'abc', n: -5, level: 'zzz', focus: 7, ts: 'x' }])[0];
  check('Bad field values are repaired', fixed.min === 0 && fixed.n === 0 && fixed.level === 'b' && fixed.focus === 'full' && fixed.ts === 0, JSON.stringify(fixed));
  check('Leap day 2028-02-29 is valid, 2026-02-29 is not', P.isDayKey('2028-02-29') && !P.isDayKey('2026-02-29'));

  // ─────────────── Advanced unlocks ───────────────
  section('Advanced unlocks (2 poses per 7 practice days)');
  const u = n => P.unlocks(run(now, n, 2), R.ADVANCED.length); // every other day: not consecutive on purpose
  const exp = [[0, 0, 7], [6, 0, 1], [7, 2, 7], [13, 2, 1], [14, 4, 7], [55, 14, 1], [56, 16, 0], [200, 16, 0]];
  exp.forEach(([days, count, next]) => {
    const r = u(days);
    check(`${days} practice days → ${count} unlocked, ${next} days to next`, r.count === count && r.daysToNext === next, JSON.stringify(r));
  });
  check('Practice days don\'t need to be in a row', u(7).count === 2);
  check('7 sessions on the same day count as 1 day', P.unlocks(Array(7).fill(rec(now)), 16).count === 0);
  check('16 advanced poses, unlock order 1–16 with no gaps', R.ADVANCED.length === 16 && R.ADVANCED.every((p, i) => p.unlock === i + 1));
  check('Week 1 unlocks Side Plank & Warrior III', R.ADVANCED.slice(0, 2).map(p => p.id).join() === 'sidePlank,warrior3');
  check('All 16 unlocked after 8 practice weeks (56 days)', u(56).complete && !u(55).complete);

  // ─────────────── Pose data ───────────────
  section('Pose library data');
  const ids = new Set();
  const dataErrors = [];
  POSES.forEach(p => {
    if (ids.has(p.id)) dataErrors.push('duplicate ' + p.id);
    ids.add(p.id);
    if (!window.YogaData.BREATH[p.br]) dataErrors.push(p.id + ' breath');
    if (!p.tg.every(t => window.YogaData.TARGETS[t])) dataErrors.push(p.id + ' target');
    if (!(p.steps.length >= 3 && p.tip && p.why)) dataErrors.push(p.id + ' text');
    if (!['b', 'i', 'a'].includes(p.lvl)) dataErrors.push(p.id + ' level');
    try { if (!window.Figure.svg(p).includes('<svg')) dataErrors.push(p.id + ' figure'); } catch (e) { dataErrors.push(p.id + ' figure ' + e.message); }
  });
  const byLvl = l => POSES.filter(p => p.lvl === l).length;
  check(`${POSES.length} poses (${byLvl('b')} beginner, ${byLvl('i')} intermediate, ${byLvl('a')} advanced) all complete and drawable`, !dataErrors.length, dataErrors.join(', '));

  // ─────────────── Routine builder ───────────────
  section('Routine builder: every length × focus × level (40 builds each)');
  const UNLOCKED = R.ADVANCED.slice(0, 6).map(p => p.id), FRESH = UNLOCKED.slice(-2);
  const allowedFor = (lvl, p) => p.lvl === 'b' || (p.lvl === 'i' && lvl !== 'b') || (p.lvl === 'a' && lvl === 'a' && UNLOCKED.includes(p.id));
  let comboFails = 0, freshHits = 0, freshTotal = 0, combos = 0;
  for (const level of ['b', 'i', 'a']) for (const focus of Object.keys(R.FOCI)) for (const minutes of [10, 15, 20, 25]) {
    const problems = new Set();
    for (let k = 0; k < 40; k++) {
      const r = R.build({ minutes, focus, level, unlocked: UNLOCKED, fresh: FRESH });
      const steps = R.steps(r);
      const sum = steps.filter(x => x.kind !== 'ready').reduce((a, x) => a + x.dur, 0);
      const prep = steps.filter(x => x.kind === 'ready').reduce((a, x) => a + x.dur, 0);
      if (Math.abs(r.total - minutes * 60) > 1) problems.add(`total ${r.total}s`);
      if (Math.abs(sum - r.total) > 0.01) problems.add('steps≠total');
      if (Math.abs(prep - r.prep) > 0.01 || prep < r.items.length * 35) problems.add('prep time');
      if (new Set(r.items.map(it => it.pose.id)).size !== r.items.length) problems.add('duplicate pose');
      if (r.items.some(it => !allowedFor(level, it.pose))) problems.add('wrong level pose');
      if (r.items[r.items.length - 1].pose.id !== 'savasana') problems.add('final rest not last');
      if (r.items.some(it => it.hold < 15)) problems.add('hold < 15s');
      if (steps.some(x => !(x.dur > 0))) problems.add('bad step');
      const adv = r.items.filter(it => it.pose.lvl === 'a');
      if (adv.length > (minutes >= 20 ? 3 : 2)) problems.add('too many advanced');
      if (level === 'a') { freshTotal += 2; freshHits += adv.filter(it => FRESH.includes(it.pose.id)).length; }
    }
    combos++;
    if (problems.size) { comboFails++; check(`${level} · ${focus} · ${minutes} min`, false, [...problems].join(', ')); }
  }
  check(`${combos} combinations × 40 builds: exact stretching length (prep on top), no duplicates, right levels, final rest last`, comboFails === 0);
  check(`Advanced: this week's 2 new poses appear in sessions (${(freshHits / freshTotal * 100).toFixed(0)}%)`, freshHits / freshTotal > 0.95);
  check('Advanced with nothing unlocked falls back to no hard poses', [10, 25].every(m => R.build({ minutes: m, level: 'a' }).items.every(it => it.pose.lvl !== 'a')));
  const tired = Object.fromEntries(POSES.map(p => [p.id, Date.now()]));
  check('Still fills the full time when every pose was used today', R.build({ minutes: 25, level: 'b', lastUsed: tired }).total === 1500);

  section('Full Body · 25 min (300 builds per level)');
  for (const level of ['b', 'i', 'a']) {
    const hits = Object.fromEntries(R.REGIONS.map(r => [r, 0]));
    let exact = 0, maxHold = 0, minPoses = 99;
    for (let k = 0; k < 300; k++) {
      const r = R.build({ minutes: 25, focus: 'full', level, coverage: true, unlocked: UNLOCKED, fresh: FRESH });
      if (r.total === 1500) exact++;
      const tg = new Set(r.items.flatMap(it => it.pose.tg));
      R.REGIONS.forEach(x => { if (tg.has(x)) hits[x]++; });
      maxHold = Math.max(maxHold, ...r.items.filter(it => it.phase !== 'final').map(it => it.hold));
      minPoses = Math.min(minPoses, r.items.length);
    }
    const weakest = Object.entries(hits).sort((a, b) => a[1] - b[1])[0];
    check(`${{ b: 'Beginner', i: 'Intermediate', a: 'Advanced' }[level]}: every one of 12 body areas covered (weakest: ${weakest[0]} ${(weakest[1] / 3).toFixed(0)}%)`, weakest[1] >= 297);
    check(`${{ b: 'Beginner', i: 'Intermediate', a: 'Advanced' }[level]}: always exactly 25:00, ${minPoses}+ poses, holds ≤ ${maxHold}s (light)`, exact === 300 && maxHold <= 40);
  }

  // ─────────────── The real app ───────────────
  section('Real app: memory, history, streaks, unlocks');
  const frames = document.getElementById('frames');
  const today = new Date();
  const KEYS = ['history', 'prefs', 'lastUsed'];
  const clear = () => KEYS.forEach(k => localStorage.removeItem('sage.' + k));
  const stored = k => JSON.parse(localStorage.getItem('sage.' + k) || 'null');
  const seed = (k, v) => localStorage.setItem('sage.' + k, typeof v === 'string' ? v : JSON.stringify(v));

  async function app(query, w = 390, h = 844) {
    frames.innerHTML = '';
    const f = document.createElement('iframe');
    f.style.width = w + 'px'; f.style.height = h + 'px';
    const errors = [];
    f.src = '../index.html' + (query || '') + (query ? '&' : '?') + 'r=' + Math.random();
    frames.appendChild(f);
    await new Promise(r => f.addEventListener('load', r, { once: true }));
    f.contentWindow.addEventListener('error', e => errors.push(e.message));
    await sleep(500);
    const doc = f.contentDocument, win = f.contentWindow;
    return { f, doc, win, errors, $: sel => doc.querySelector(sel), text: () => doc.body.innerText, click: async (sel, wait = 450) => { const el = typeof sel === 'string' ? doc.querySelector(sel) : sel; if (!el) throw new Error('missing ' + sel); el.click(); await sleep(wait); } };
  }
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  try {
    clear();
    let a = await app();
    check('Fresh install: home loads with "Start a streak" and no errors', /Start a streak/.test(a.text()) && !a.errors.length, a.errors.join());
    check('Fresh install: Advanced shows as locked with 7 days to go', /Practice 7 more days to unlock your first 2/.test(a.text()));

    seed('history', run(yesterday, 6));
    a = await app();
    check('6 practice days ending yesterday → home shows 6-day streak', a.$('.streak-num').textContent.trim() === '6' && /6-day streak/.test(a.text()));
    check('…and "1 more practice day" to unlock', /Practice 1 more day to unlock/.test(a.text()));

    a = await app('?demo=done');
    const h1 = stored('history');
    check('Finishing a session saves it to history (7 records)', Array.isArray(h1) && h1.length === 7);
    check('Saved record is dated today', h1[h1.length - 1].d === P.dayKey(today), h1[h1.length - 1].d);
    check('Done screen celebrates the unlock: Side Plank & Warrior III', /New poses unlocked/i.test(a.text()) && /Side Plank/.test(a.text()) && /Warrior III/.test(a.text()));
    await a.click('[data-act="use-advanced"]', 200);
    check('"Add them to my routine" switches level to Advanced and remembers it', stored('prefs').level === 'a');

    a = await app();
    check('After reload: 7-day streak persisted', a.$('.streak-num').textContent.trim() === '7');
    check('After reload: "Advanced · 2 of 16 unlocked"', /Advanced · 2 of 16 unlocked/.test(a.text()));
    check('After reload: hero shows Advanced level', /Advanced/.test(a.$('.hero-meta').textContent));
    await a.click('[data-act="adv-library"]');
    const cards = [...a.doc.querySelectorAll('.pose-card')];
    const locked = cards.filter(c => c.classList.contains('locked')).length;
    check(`Advanced library: 2 open, 14 locked (${cards.length - locked} open, ${locked} locked)`, cards.length === 16 && locked === 14);
    await a.click('.pose-card.locked');
    check('Locked pose explains when it unlocks ("7 more practice days")', /Unlocks after 7 more practice days/.test(a.text()));

    // Session preferences are remembered
    a = await app();
    await a.click('[data-act="setup"]');
    await a.click('[data-act="set-min"][data-v="20"]', 150);
    await a.click('[data-act="set-focus"][data-v="hips"]', 150);
    check('Setup: Advanced level is selectable once unlocked', !a.$('[data-act="set-level"][data-v="a"]').disabled);
    const planned = a.$('.preview-head b').textContent;
    await a.click('[data-act="begin"]', 300);
    check(`Begin starts the session (${planned})`, !a.$('#session').hidden && a.$('.s-name').textContent.length > 0);
    await a.click('[data-act="s-exit"]', 150);
    check('Ending after a few seconds warns it won\'t count yet', /count toward your streak after 5 minutes/.test(a.text()));
    await a.click('[data-act="s-end"]', 300);
    check('…and does not save it (still 7 records)', stored('history').length === 7);
    a = await app();
    const meta = a.$('.hero-meta').textContent;
    check('Length, focus and level remembered after reload (20 min · Hips · Advanced)', /20 min/.test(meta) && /Hips/.test(meta) && /Advanced/.test(meta), meta.replace(/\s+/g, ' '));

    // Timer engine: counts down in real time, pause freezes it, skip/back move between poses
    await a.click('[data-act="quick-start"]', 300);
    const secs = () => { const [m, s2] = a.$('.s-time').textContent.split(':').map(Number); return m * 60 + s2; };
    let t1 = secs(); await sleep(3000); let t2 = secs();
    check(`Timer counts down in real time (${t1}s → ${t2}s after 3s)`, t1 - t2 >= 2 && t1 - t2 <= 4);
    await a.click('[data-act="s-toggle"]', 50); t1 = secs(); await sleep(2000); t2 = secs();
    check('Pause freezes the timer and shows "Paused"', t1 === t2 && /Paused/.test(a.$('.s-breath').textContent));
    await a.click('[data-act="s-toggle"]', 1500);
    check('Resume continues counting', secs() < t2);
    const first = a.$('.s-name').textContent;
    await a.click('[data-act="s-next"]', 100);
    const second = a.$('.s-name').textContent;
    await a.click('[data-act="s-prev"]', 100);
    check(`Skip, then back right away, moves between poses (${first} → ${second} → ${a.$('.s-name').textContent})`, second !== first && a.$('.s-name').textContent === first);
    await a.click('[data-act="s-next"]', 100);
    t1 = secs(); await sleep(4000); t2 = secs();
    await a.click('[data-act="s-prev"]', 100);
    check(`Back after a few seconds restarts the current pose (${t1}s → ${t2}s → ${secs()}s, still ${a.$('.s-name').textContent})`,
      a.$('.s-name').textContent === second && t2 < t1 && secs() >= t1 - 1);
    const pill = () => a.$('.s-breath');
    check(`Prep shows "Get into position" with a Start pose button (${secs()}s)`,
      /Get into position/i.test(a.$('.s-phase').textContent) && pill().classList.contains('go') && /Start pose/.test(pill().textContent) && secs() >= 30);
    await a.click('[data-act="s-ready"]', 150);
    const phaseNow = a.$('.s-phase').textContent;
    check(`"Start pose" skips the prep and starts holding the same pose (${phaseNow}, ${a.$('.s-name').textContent})`,
      /Hold/i.test(phaseNow) && a.$('.s-name').textContent === second && !pill().classList.contains('go'));
    await a.click('[data-act="s-ready"]', 150);
    check('Tapping it again mid-hold does nothing', a.$('.s-phase').textContent === phaseNow && a.$('.s-name').textContent === second);
    await a.click('[data-act="s-exit"]', 100); await a.click('[data-act="s-end"]', 300);

    // Skipping through doesn't count
    await a.click('[data-act="quick-start"]', 300);
    const segs = a.doc.querySelectorAll('.s-bar i').length;
    check(`One tap on "Start session" begins immediately (${segs} poses)`, !a.$('#session').hidden && segs > 5);
    for (let k = 0; k < segs + 2 && a.$('[data-act="s-next"]'); k++) a.$('[data-act="s-next"]').click();
    await sleep(300);
    check('Skipping straight to the end isn\'t counted ("That was quick", still 7 records)', /That was quick/.test(a.text()) && stored('history').length === 7);
    await a.click('[data-act="s-close"]', 300);

    await a.click('[data-act="full25"]', 300);
    check('Full Body 25 starts in one tap', !a.$('#session').hidden && a.doc.querySelectorAll('.s-bar i').length >= 14);
    await a.click('[data-act="s-exit"]', 100); await a.click('[data-act="s-end"]', 300);

    // Progress tab
    await a.click('[data-tab="progress"]');
    const stats = [...a.doc.querySelectorAll('.stat b')].map(b => b.textContent);
    check(`Progress tab: streak 7, best 7, 7 sessions (got ${stats.join(' / ')})`, stats[0] === '7' && stats[1] === '7' && stats[2] === '7');
    check('Calendar marks today', !!a.$('.cal-grid .d.on.today'));

    // Reset
    a.win.confirm = () => true;
    await a.click('[data-tab="today"]');
    await a.click('[data-act="settings"]');
    await a.click('[data-act="reset"]', 500);
    check('Reset clears history and drops level back from Advanced', stored('history').length === 0 && stored('prefs').level === 'i');

    // Corruption
    seed('history', '{not json'); seed('prefs', '"x"'); seed('lastUsed', '[1,2]');
    a = await app();
    check('Corrupted storage: app still loads cleanly with defaults', !a.errors.length && /Start a streak/.test(a.text()) && /15 min/.test(a.$('.hero-meta').textContent), a.errors.join());
    seed('history', []); seed('prefs', { minutes: 999, focus: 'nope', level: 'a', chime: 'yes' });
    a = await app();
    check('Out-of-range settings fall back (15 min · Full body · Intermediate since nothing is unlocked)', /15 min/.test(a.$('.hero-meta').textContent) && /Full body/.test(a.$('.hero-meta').textContent) && /Intermediate/.test(a.$('.hero-meta').textContent), a.$('.hero-meta').textContent.replace(/\s+/g, ' '));
    await a.click('[data-act="quick-start"]', 300);
    check('…and a session still starts', !a.$('#session').hidden && !a.errors.length);
  } catch (e) {
    check('App flow completed without exceptions', false, e.message);
  }

  // ─────────────── UI audit ───────────────
  section('UI audit at iPhone sizes (SE 1st gen, SE/8, 14, 15 Pro Max)');
  const SIZES = [[320, 568, 'SE 1st gen'], [375, 667, 'SE / 8'], [390, 844, 'iPhone 14'], [430, 932, 'Pro Max']];
  const SCREENS = [['Today', ''], ['Setup', '?demo=setup'], ['Library', '?demo=library'], ['Progress', '?demo=progress'], ['Pose detail', '?demo=pose'], ['Session', '?demo=session'], ['Done', '?demo=done']];
  const small = new Map(), tiny = new Map();
  let overflowFails = [], sessionFails = [];
  clear();
  seed('history', run(yesterday, 9)); // some unlocked content so every state renders
  for (const [w, h, label] of SIZES) {
    for (const [name, q] of SCREENS) {
      const a = await app(q, w, h);
      const de = a.doc.documentElement;
      if (de.scrollWidth > w + 1) overflowFails.push(`${name} @${w}px (${de.scrollWidth}px wide)`);
      a.doc.querySelectorAll('button, input, [data-act], [data-tab], [data-pose]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || r.bottom < 0 || r.top > h) return;
        const cs = a.win.getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const id = `${name}: ${el.className || el.tagName} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 18)}"`;
        const m = Math.min(r.width, r.height);
        if (m < 24) tiny.set(id, `${Math.round(r.width)}×${Math.round(r.height)}`);
        else if (m < 40) small.set(id, `${Math.round(r.width)}×${Math.round(r.height)}`);
      });
      if (name === 'Session') {
        const ctr = a.$('.s-controls').getBoundingClientRect(), nm = a.$('.s-name'), ring = a.$('.s-ring').getBoundingClientRect();
        if (ctr.bottom > h + 1) sessionFails.push(`${label}: controls cut off`);
        if (nm.scrollWidth > nm.clientWidth + 1) sessionFails.push(`${label}: pose name overflows`);
        if (ring.height < 150) sessionFails.push(`${label}: timer ring only ${Math.round(ring.height)}px`);
      }
    }
    // Longest pose names must fit the session header
    const a = await app('?demo=session', w, h);
    const nm = a.$('.s-name');
    const longest = POSES.map(p => p.name).sort((x, y) => y.length - x.length).slice(0, 3);
    longest.forEach(n => { nm.textContent = n; if (nm.scrollWidth > nm.clientWidth + 1) sessionFails.push(`${label}: "${n}" overflows`); });
  }
  check('No sideways scrolling on any screen at any size', !overflowFails.length, overflowFails.join('; '));
  check('Session screen fits: controls visible, ring ≥150px, longest names fit', !sessionFails.length, sessionFails.join('; '));
  check('No tap target smaller than 24px (WCAG 2.2 minimum)', !tiny.size, [...tiny].map(([k, v]) => `${k} ${v}`).join('; '));
  if (small.size) warn(`${small.size} tap targets are 24–39px (Apple suggests 44px)`, [...small].slice(0, 8).map(([k, v]) => `${k} ${v}`).join('; '));
  else check('Every tap target is at least 40px', true);

  // Text size & contrast on Today
  {
    const a = await app();
    const smallText = [];
    a.doc.querySelectorAll('body *').forEach(el => {
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      const r = el.getBoundingClientRect(); if (!r.width) return;
      const fs = parseFloat(a.win.getComputedStyle(el).fontSize);
      if (fs < 12) smallText.push(`${el.className || el.tagName} ${fs}px`);
    });
    check('No text smaller than 12px on Today', !smallText.length, [...new Set(smallText)].join(', '));
    const lum = c => { const v = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const ratio = (f, b) => { const [x, y] = [lum(f), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const muted = a.win.getComputedStyle(a.$('.hero .sub')).color, bg = a.win.getComputedStyle(a.$('.hero')).backgroundColor;
    const cr = ratio(muted, bg);
    check(`Secondary text contrast ${cr.toFixed(2)}:1 (WCAG AA needs 4.5)`, cr >= 4.5);
  }

  // ─────────────── Simplicity metrics ───────────────
  section('Ease of use (measured)');
  clear();
  {
    const a = await app();
    const t0 = performance.now();
    await a.click('[data-act="quick-start"]', 0);
    const started = !a.$('#session').hidden;
    note(`Taps from opening the app to stretching: 1 (Start session), ${started ? 'confirmed' : 'NOT confirmed'}`);
    note('Taps for Full Body 25: 1 · Custom session: 3 (Edit → choose → Begin) · Focus tile: 2 (tile → Begin)');
    note('Taps during a session: 0. Poses, sides and rests advance on their own');
    const btns = [...a.doc.querySelectorAll('#view button')].filter(b => b.getBoundingClientRect().top < 844).length;
    note(`Buttons visible on the first screen: ${btns}`);
    check('Start session works in one tap', started);
  }
  {
    clear();
    const t1 = performance.now();
    const a = await app();
    note(`App ready in ${(performance.now() - t1 - 500).toFixed(0)} ms after load event (local)`);
  }
  clear();

  // ─────────────── Report ───────────────
  const summary = `${tally.fail ? '✗' : '✓'} ${tally.pass} passed · ${tally.fail} failed · ${tally.warn} warnings`;
  document.getElementById('summary').textContent = summary;
  document.getElementById('log').textContent = lines.join('\n');
  document.title = 'DONE ' + summary;
  frames.innerHTML = '';
})();
