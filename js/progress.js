/* Practice history, streaks and advanced-pose unlocks.
 * Pure functions (no DOM, no storage) so they can be tested with any "now".
 */
(function () {
  const DAYS_PER_UNLOCK = 7;   // a "week" = 7 practice days (they don't have to be in a row)
  const POSES_PER_UNLOCK = 2;
  const MIN_SECONDS = 300;     // 5 minutes of stretching counts as a practice day

  const pad = n => String(n).padStart(2, '0');
  const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const keyDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const isDayKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && dayKey(keyDate(k)) === k;
  const num = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

  /** Drops anything malformed so a corrupted store can never crash the app. */
  function sanitize(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.filter(h => h && typeof h === 'object' && isDayKey(h.d)).map(h => {
      const rec = {
        d: h.d,
        ts: num(h.ts, 0, 8.64e15, 0),
        min: num(h.min, 0, 600, 0),
        n: num(h.n, 0, 500, 0),
        focus: typeof h.focus === 'string' ? h.focus : 'full',
        level: ['b', 'i', 'a'].includes(h.level) ? h.level : 'b'
      };
      if (h.partial) rec.partial = true;
      return rec;
    });
  }

  const practiceDays = history => Array.from(new Set(history.map(h => h.d))).sort();

  function streaks(history, now) {
    const days = practiceDays(history);
    const set = new Set(days);
    let best = 0, run = 0, prev = null;
    days.forEach(k => {
      const d = keyDate(k);
      // Math.round absorbs 23/25-hour days around daylight-saving changes
      run = prev && Math.round((d - prev) / 864e5) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    });
    const cur = new Date((now || new Date()).getTime());
    if (!set.has(dayKey(cur))) cur.setDate(cur.getDate() - 1); // today isn't over yet
    let current = 0;
    while (set.has(dayKey(cur))) { current++; cur.setDate(cur.getDate() - 1); }
    return { current, best };
  }

  function unlocks(history, total) {
    const days = practiceDays(history).length;
    const weeks = Math.floor(days / DAYS_PER_UNLOCK);
    const count = Math.min(total, weeks * POSES_PER_UNLOCK);
    const complete = count >= total;
    return {
      days, count, total, complete,
      week: weeks + 1,                                   // the practice week you're in now
      intoWeek: days % DAYS_PER_UNLOCK,                  // practice days done this week
      daysToNext: complete ? 0 : DAYS_PER_UNLOCK - (days % DAYS_PER_UNLOCK)
    };
  }

  const qualifies = seconds => seconds >= MIN_SECONDS;

  window.Progress = { dayKey, keyDate, isDayKey, sanitize, practiceDays, streaks, unlocks, qualifies,
    DAYS_PER_UNLOCK, POSES_PER_UNLOCK, MIN_SECONDS };
})();
