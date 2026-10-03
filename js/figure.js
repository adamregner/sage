/* Draws a pose as a minimal line figure (inline SVG).
 *
 * A figure is described by joint angles in degrees, using screen coordinates:
 *   0 = right, 90 = down, 180 = left, -90 = up.
 *   t   torso direction (hip -> neck)          tl  torso length factor (foreshortening)
 *   hd  head direction from the neck            c   spine curve (+ arches, - rounds; sign is relative to torso direction)
 *   a1/a2  arms  [upper, forearm]               (a1 = near side, drawn darker)
 *   l1/l2  legs  [thigh, shin, foot?, shinLen?] (foot defaults to perpendicular to the shin)
 *   top  viewed from above (lying on a mat)     strap / wall  simple props
 * The figure is grounded automatically: its lowest point sits on the floor line.
 */
(function () {
  const L = { torso: 28, shoulder: 25, neck: 8, head: 6.5, upper: 14, fore: 13, thigh: 21, shin: 20, foot: 6 };
  const W = 120, H = 100, FLOOR = 90;
  const RAD = Math.PI / 180;

  const vec = (a, len) => [Math.cos(a * RAD) * len, Math.sin(a * RAD) * len];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const bez = (p0, c, p1, t) => {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
  };

  function solve(f) {
    const hip = [0, 0];
    const t = f.t == null ? -90 : f.t;
    const tl = f.tl || 1;
    const neck = vec(t, L.torso * tl);
    const len = Math.hypot(neck[0], neck[1]);
    const perp = [-neck[1] / len, neck[0] / len];
    const curve = (f.c || 0) * 2; // quadratic control offset is twice the visible bow
    const ctrl = [neck[0] / 2 + perp[0] * curve, neck[1] / 2 + perp[1] * curve];
    const shoulder = bez(hip, ctrl, neck, L.shoulder / L.torso);
    const head = add(neck, vec(f.hd == null ? t : f.hd, L.neck));

    const arm = a => {
      if (!a) return null;
      const elbow = add(shoulder, vec(a[0], L.upper));
      return [shoulder, elbow, add(elbow, vec(a[1], L.fore))];
    };
    const leg = l => {
      if (!l) return null;
      const knee = add(hip, vec(l[0], L.thigh));
      const ankle = add(knee, vec(l[1], L.shin * (l[3] || 1)));
      const toe = add(ankle, vec(l[2] == null ? l[1] - 90 : l[2], L.foot * (l[3] ? Math.max(l[3], 0.5) : 1)));
      return [hip, knee, ankle, toe];
    };
    return { f, hip, neck, ctrl, head, a1: arm(f.a1), a2: arm(f.a2), l1: leg(f.l1), l2: leg(f.l2) };
  }

  function bounds(solved) {
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const take = p => {
      b.x0 = Math.min(b.x0, p[0]); b.x1 = Math.max(b.x1, p[0]);
      b.y0 = Math.min(b.y0, p[1]); b.y1 = Math.max(b.y1, p[1]);
    };
    solved.forEach(s => {
      [s.hip, s.neck].forEach(take);
      take([s.head[0] - L.head, s.head[1] - L.head]);
      take([s.head[0] + L.head, s.head[1] + L.head]);
      ['a1', 'a2', 'l1', 'l2'].forEach(k => s[k] && s[k].forEach(take));
    });
    return b;
  }

  const fmt = n => Math.round(n * 10) / 10;
  const pts = (ps, tx) => ps.map(p => tx(p).map(fmt).join(',')).join(' ');

  function frameSvg(s, tx, cls) {
    const line = (ps, c) => ps ? `<polyline class="${c}" points="${pts(ps, tx)}"/>` : '';
    const [hx, hy] = tx(s.hip), [cx, cy] = tx(s.ctrl), [nx, ny] = tx(s.neck), [kx, ky] = tx(s.head);
    let props = '';
    if (s.f.strap && s.a1 && s.l1) {
      const h = tx(s.a1[2]), a = tx(s.l1[3]);
      props += `<line class="fig-prop" x1="${fmt(h[0])}" y1="${fmt(h[1])}" x2="${fmt(a[0])}" y2="${fmt(a[1])}"/>`;
    }
    return `<g class="fig-frame ${cls}">` +
      props +
      line(s.l2, 'fig-far') + line(s.a2, 'fig-far') +
      `<path class="fig-near" d="M${fmt(hx)},${fmt(hy)} Q${fmt(cx)},${fmt(cy)} ${fmt(nx)},${fmt(ny)}"/>` +
      `<circle class="fig-head" cx="${fmt(kx)}" cy="${fmt(ky)}" r="${L.head}"/>` +
      line(s.l1, 'fig-near') + line(s.a1, 'fig-near') +
      `</g>`;
  }

  /** Returns SVG markup for a pose. opts.frames: 'all' (default) or 'first'. */
  function svg(pose, opts) {
    opts = opts || {};
    let frames = Array.isArray(pose.fig) ? pose.fig : [pose.fig];
    if (opts.frames === 'first') frames = frames.slice(0, 1);
    const solved = frames.map(solve);
    const b = bounds(solved);
    const top = !!frames[0].top;
    const scale = Math.min(1, (W - 14) / (b.x1 - b.x0), (FLOOR - 6) / (b.y1 - b.y0));
    const cxm = (b.x0 + b.x1) / 2, cym = (b.y0 + b.y1) / 2;
    const ty = top ? H / 2 - cym * scale : FLOOR - b.y1 * scale;
    const tx = p => [W / 2 + (p[0] - cxm) * scale, ty + p[1] * scale];

    let base = '';
    if (top) {
      const w = (b.x1 - b.x0) * scale + 16, h = (b.y1 - b.y0) * scale + 14;
      base = `<rect class="fig-mat-top" x="${fmt(W / 2 - w / 2)}" y="${fmt(H / 2 - h / 2)}" width="${fmt(w)}" height="${fmt(h)}" rx="8"/>`;
    } else {
      base = `<rect class="fig-mat" x="10" y="${FLOOR + 2}" width="${W - 20}" height="3.2" rx="1.6"/>`;
      if (frames[0].wall) {
        const wx = fmt(tx([b.x1, 0])[0] + 4);
        base += `<rect class="fig-wall" x="${wx}" y="6" width="3.2" height="${FLOOR - 4}" rx="1.6"/>`;
      }
    }
    const body = solved.map((s, i) => frameSvg(s, tx, 'f' + i)).join('');
    const multi = solved.length > 1 ? ' multi' : '';
    return `<svg class="fig${multi}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${pose.name}">${base}${body}</svg>`;
  }

  window.Figure = { svg };
})();
