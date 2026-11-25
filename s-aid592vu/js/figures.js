/* 2학기 기말 과학 개념 확인 — 문항 그림 (모두 자체 제작 SVG)
 * 교과서 사진 대신 같은 과학 내용을 담은 도식으로 다시 그렸습니다.
 * 색은 CSS 변수(--fig-ink 등)를 style 속성으로 사용해 라이트/다크 모드에 맞춥니다. */
(function () {
  'use strict';
  const F = (window.SF_FIG = {});
  let UID = 0;
  const uid = (p) => (p || 'g') + ++UID;
  const r1 = (n) => Math.round(n * 10) / 10;
  const INK = 'var(--fig-ink)';
  const SUB = 'var(--fig-sub)';
  const PAPER = 'var(--fig-paper)';
  const PANEL = 'var(--fig-panel)';

  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    const u = Math.max(1e-9, r()), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function svg(w, h, body, label, cls) {
    return `<svg class="fig-svg ${cls || ''}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label || '그림'}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  }
  // 텍스트
  function T(x, y, s, o = {}) {
    const st = [];
    st.push(`fill:${o.fill || INK}`);
    if (o.s) st.push(`font-size:${o.s}px`);
    if (o.w) st.push(`font-weight:${o.w}`);
    const rot = o.rot ? ` transform="rotate(${o.rot} ${r1(x)} ${r1(y)})"` : '';
    return `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${o.a || 'middle'}" dominant-baseline="central" class="ft" style="${st.join(';')}"${rot}>${s}</text>`;
  }
  // 선
  function L(x1, y1, x2, y2, o = {}) {
    const st = [`stroke:${o.c || INK}`, `stroke-width:${o.w || 2}`, 'stroke-linecap:round', 'fill:none'];
    if (o.dash) st.push(`stroke-dasharray:${o.dash}`);
    if (o.op) st.push(`opacity:${o.op}`);
    return `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" style="${st.join(';')}"/>`;
  }
  function P(d, o = {}) {
    const st = [`stroke:${o.c || INK}`, `stroke-width:${o.w == null ? 2 : o.w}`, 'stroke-linecap:round', 'stroke-linejoin:round', `fill:${o.fill || 'none'}`];
    if (o.dash) st.push(`stroke-dasharray:${o.dash}`);
    if (o.op != null) st.push(`opacity:${o.op}`);
    if (o.filter) st.push(`filter:url(#${o.filter})`);
    return `<path d="${d}" style="${st.join(';')}"/>`;
  }
  function C(cx, cy, r, o = {}) {
    const st = [`fill:${o.fill || 'none'}`];
    if (o.c) st.push(`stroke:${o.c}`, `stroke-width:${o.w || 2}`);
    if (o.dash) st.push(`stroke-dasharray:${o.dash}`);
    if (o.op != null) st.push(`opacity:${o.op}`);
    if (o.filter) st.push(`filter:url(#${o.filter})`);
    return `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" style="${st.join(';')}"/>`;
  }
  function R(x, y, w, h, o = {}) {
    const st = [`fill:${o.fill || 'none'}`];
    if (o.c) st.push(`stroke:${o.c}`, `stroke-width:${o.w || 2}`);
    if (o.op != null) st.push(`opacity:${o.op}`);
    if (o.dash) st.push(`stroke-dasharray:${o.dash}`);
    return `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${o.rx || 0}" style="${st.join(';')}"/>`;
  }
  function E(cx, cy, rx, ry, o = {}) {
    const st = [`fill:${o.fill || 'none'}`];
    if (o.c) st.push(`stroke:${o.c}`, `stroke-width:${o.w || 2}`);
    if (o.op != null) st.push(`opacity:${o.op}`);
    if (o.filter) st.push(`filter:url(#${o.filter})`);
    const tr = o.rot ? ` transform="rotate(${o.rot} ${cx} ${cy})"` : '';
    return `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(ry)}" style="${st.join(';')}"${tr}/>`;
  }
  function poly(pts, fill, o = {}) {
    const st = [`fill:${fill}`];
    if (o.c) st.push(`stroke:${o.c}`, `stroke-width:${o.w || 1.5}`, 'stroke-linejoin:round');
    if (o.op != null) st.push(`opacity:${o.op}`);
    return `<polygon points="${pts.map(r1).join(' ')}" style="${st.join(';')}"/>`;
  }
  // 화살촉(끝점 x,y, 방향 ang 라디안)
  function head(x, y, ang, size, color) {
    const s = size || 10;
    const a1 = ang + Math.PI * 0.86, a2 = ang - Math.PI * 0.86;
    return poly([x, y, x + s * Math.cos(a1), y + s * Math.sin(a1), x + s * Math.cos(a2), y + s * Math.sin(a2)], color || INK);
  }
  // 직선 화살표
  function A(x1, y1, x2, y2, o = {}) {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const s = o.hs || 10;
    const ex = x2 - Math.cos(ang) * s * 0.75, ey = y2 - Math.sin(ang) * s * 0.75;
    let out = L(x1, y1, ex, ey, o) + head(x2, y2, ang, s, o.c || INK);
    if (o.both) {
      const ang2 = ang + Math.PI;
      out = L(x1 + Math.cos(ang) * s * 0.75, y1 + Math.sin(ang) * s * 0.75, ex, ey, o) + head(x2, y2, ang, s, o.c || INK) + head(x1, y1, ang2, s, o.c || INK);
    }
    return out;
  }
  // 전하 기호 원
  function charge(x, y, sign, r) {
    r = r || 7;
    const pos = sign === '+';
    const col = pos ? '#FF3B30' : '#0A84FF';
    let s = C(x, y, r, { fill: col });
    s += L(x - r * 0.55, y, x + r * 0.55, y, { c: '#fff', w: 2 });
    if (pos) s += L(x, y - r * 0.55, x, y + r * 0.55, { c: '#fff', w: 2 });
    return s;
  }
  function radial(id, stops, o = {}) {
    const fx = o.fx != null ? ` fx="${o.fx}" fy="${o.fy}"` : '';
    return `<radialGradient id="${id}" cx="${o.cx || '50%'}" cy="${o.cy || '50%'}" r="${o.r || '50%'}"${fx}>${stops
      .map((s) => `<stop offset="${s[0]}" stop-color="${s[1]}" stop-opacity="${s[2] == null ? 1 : s[2]}"/>`)
      .join('')}</radialGradient>`;
  }
  function linear(id, stops, o = {}) {
    return `<linearGradient id="${id}" x1="${o.x1 || 0}" y1="${o.y1 || 0}" x2="${o.x2 || 0}" y2="${o.y2 || 1}">${stops
      .map((s) => `<stop offset="${s[0]}" stop-color="${s[1]}" stop-opacity="${s[2] == null ? 1 : s[2]}"/>`)
      .join('')}</linearGradient>`;
  }
  function blurF(id, sd) {
    return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
  }

  /* ───────────────────────── Ⅶ. 전기와 자기 ───────────────────────── */

  // 검전기: rod '+' | '-', labels {plate, foil}, charges(해설용)
  F.electroscope = function (o = {}) {
    const rod = o.rod || '+';
    const lb = o.labels || { plate: 'A', foil: 'B' };
    const g1 = uid('es');
    let s = `<defs>${linear(g1, [[0, '#f4f5f7'], [0.5, '#c9cdd4'], [1, '#9ea4ae']], { x2: 1, y2: 0 })}</defs>`;
    // 유리병
    s += P('M150 96 L150 106 C150 116 108 124 104 152 L104 222 C104 236 116 242 130 242 L230 242 C244 242 256 236 256 222 L256 152 C252 124 210 116 210 106 L210 96 Z', {
      c: 'rgba(110,150,200,.85)', w: 2, fill: 'rgba(150,190,235,.16)'
    });
    s += R(144, 76, 72, 26, { fill: '#4f86c6', rx: 6 });
    s += R(177, 52, 6, 150, { fill: `url(#${g1})`, c: '#8a8f99', w: 1 });
    s += E(180, 50, 46, 10, { fill: `url(#${g1})`, c: '#8a8f99', w: 1.2 });
    // 금속박(벌어짐)
    s += poly([178, 198, 156, 236, 164, 239, 181, 203], '#d6d9df', { c: '#8a8f99', w: 1 });
    s += poly([182, 198, 204, 236, 196, 239, 179, 203], '#d6d9df', { c: '#8a8f99', w: 1 });
    // 대전체 막대
    s += L(336, 8, 240, 40, { c: '#9aa7b8', w: 14 });
    s += L(336, 8, 240, 40, { c: '#eef2f8', w: 10 });
    [0.2, 0.45, 0.7].forEach((t) => {
      s += charge(336 - 96 * t, 8 + 32 * t, rod, 6);
    });
    s += T(304, 46, rod === '+' ? '(+)대전체' : '(−)대전체', { s: 14, w: 600 });
    // 이름표
    const long = lb.plate.length > 1;
    s += L(132, 50, 70, 50, { w: 1.2, c: SUB });
    s += T(long ? 64 : 60, 50, lb.plate, { a: 'end', s: 15, w: 700 });
    s += L(158, 228, 70, 228, { w: 1.2, c: SUB });
    s += T(long ? 64 : 60, 228, lb.foil, { a: 'end', s: 15, w: 700 });
    s += T(300, 226, '검전기', { s: 14, fill: SUB });
    if (o.charges) {
      const top = rod === '+' ? '-' : '+';
      const bot = rod === '+' ? '+' : '-';
      [160, 180, 200].forEach((x) => (s += charge(x, 36, top, 6)));
      s += charge(160, 222, bot, 5.5) + charge(200, 222, bot, 5.5);
      if (rod === '+') s += A(232, 178, 232, 74, { c: '#0A84FF', w: 2.5 }) + T(240, 128, '전자 이동', { a: 'start', s: 13, fill: '#0A84FF', w: 700 });
      else s += A(232, 74, 232, 178, { c: '#0A84FF', w: 2.5 }) + T(240, 128, '전자 이동', { a: 'start', s: 13, fill: '#0A84FF', w: 700 });
    }
    return svg(360, 250, s, `대전되지 않은 검전기에 ${rod === '+' ? '(+)' : '(−)'}대전체를 가까이 한 모습`);
  };

  // 도선 내부 모형: 원자핵(+)은 고정, 전자는 → 방향으로 이동
  F.wire = function (o = {}) {
    const g = uid('wr');
    const H = o.current ? 250 : 190;
    let s = `<defs>${linear(g, [[0, '#e3e6eb'], [1, '#b7bdc6']])}</defs>`;
    s += R(10, 34, 420, 136, { fill: `url(#${g})`, rx: 18, c: '#9aa1ab', w: 1 });
    const rows = [62, 102, 142];
    const cols = [45, 103, 161, 219, 277, 335, 393];
    rows.forEach((y) => cols.forEach((x) => (s += charge(x, y, '+', 11))));
    const es = [
      [74, 82], [132, 82], [190, 84], [248, 80], [306, 82], [364, 84],
      [70, 122], [128, 120], [188, 122], [246, 124], [304, 120], [366, 122],
      [104, 44], [216, 44], [330, 160], [160, 160]
    ];
    es.forEach(([x, y]) => {
      s += C(x, y, 5.5, { fill: '#0A84FF' });
      s += A(x + 8, y, x + 24, y, { c: '#0A84FF', w: 1.8, hs: 6 });
    });
    s += L(150, 22, 135, 75, { w: 1.3 });
    s += T(156, 14, '㉠', { s: 17, w: 700 });
    if (o.current) {
      s += A(120, 200, 320, 200, { c: '#0A84FF', w: 3 }) + T(330, 200, '전자의 이동 방향', { a: 'start', s: 13, fill: '#0A84FF', w: 700 });
      s += A(320, 232, 120, 232, { c: '#FF9500', w: 3 }) + T(330, 232, '전류의 방향', { a: 'start', s: 13, fill: '#FF9500', w: 700 });
    }
    return svg(440, H, s, '도선 내부의 원자핵과 전자 모형');
  };

  // 쇠숟가락 + 대전체 (가)(나)
  F.spoons = function (o = {}) {
    const g = uid('sp');
    let s = `<defs>${linear(g, [[0, '#f1f2f5'], [0.5, '#c3c8d0'], [1, '#8f96a1']])}</defs>`;
    [0, 275].forEach((ox, k) => {
      s += R(ox + 5, 5, 262, 176, { fill: PANEL, rx: 14 });
      // 병뚜껑 받침
      s += R(ox + 172, 120, 30, 26, { fill: '#a0703f', rx: 4 });
      s += E(ox + 187, 120, 15, 4, { fill: '#c08a52' });
      // 숟가락 (A쪽이 대전체 쪽)
      s += R(ox + 62, 111, 150, 7, { fill: `url(#${g})`, rx: 3.5, c: '#8a8f99', w: 1 });
      s += E(ox + 228, 114.5, 26, 11, { fill: `url(#${g})`, c: '#8a8f99', w: 1 });
      s += L(ox + 66, 108, ox + 72, 82, { w: 1.2, c: SUB }) + T(ox + 74, 72, 'A', { s: 15, w: 700 });
      s += L(ox + 210, 108, ox + 214, 82, { w: 1.2, c: SUB }) + T(ox + 216, 72, 'B', { s: 15, w: 700 });
      if (k === 0) {
        s += L(ox + 16, 170, ox + 54, 122, { c: '#e0b400', w: 10 });
        s += charge(ox + 26, 157, '-', 5) + charge(ox + 40, 140, '-', 5);
        s += T(ox + 70, 160, '(−)대전체', { a: 'start', s: 13, w: 600 });
        s += T(ox + 70, 142, '플라스틱 빨대', { a: 'start', s: 11, fill: SUB });
      } else {
        s += E(ox + 34, 146, 20, 28, { fill: '#bfe3ef', c: '#7fb6c8', w: 1.5, rot: -30 });
        s += charge(ox + 30, 150, '+', 5) + charge(ox + 42, 134, '+', 5);
        s += T(ox + 70, 160, '(+)대전체', { a: 'start', s: 13, w: 600 });
        s += T(ox + 70, 142, '장갑', { a: 'start', s: 11, fill: SUB });
      }
      s += T(ox + 136, 198, k === 0 ? '(가)' : '(나)', { s: 15, w: 700 });
      if (o.charges) {
        const near = k === 0 ? '+' : '-', far = k === 0 ? '-' : '+';
        s += charge(ox + 82, 100, near, 5.5) + charge(ox + 98, 100, near, 5.5);
        s += charge(ox + 222, 98, far, 5.5) + charge(ox + 238, 98, far, 5.5);
        if (k === 0) s += A(ox + 105, 34, ox + 205, 34, { c: '#0A84FF', w: 2.2, hs: 8 });
        else s += A(ox + 205, 34, ox + 105, 34, { c: '#0A84FF', w: 2.2, hs: 8 });
        s += T(ox + 155, 22, '전자 이동', { s: 12, fill: '#0A84FF', w: 700 });
      }
    });
    return svg(545, 210, s, '대전되지 않은 쇠숟가락에 대전체를 가까이 한 모습');
  };

  // 전기 회로와 물의 흐름 비유
  F.water = function () {
    let s = '';
    // (가) 전기 회로
    s += R(6, 6, 262, 196, { fill: PANEL, rx: 14 });
    s += P('M40 48 H240 V170 H40 Z', { w: 3 });
    s += C(140, 48, 22, { fill: 'rgba(255,214,10,.35)' });
    s += C(140, 48, 14, { fill: '#fff6c2', c: INK, w: 2 });
    s += P('M133 52 q3.5 -10 7 0 q3.5 -10 7 0', { w: 1.6, c: '#e08a00' });
    s += R(112, 160, 56, 22, { fill: '#3a3a3c', rx: 4 });
    s += R(168, 165, 5, 12, { fill: '#3a3a3c' });
    s += T(126, 171, '−', { s: 15, fill: '#fff', w: 700 });
    s += T(154, 171, '+', { s: 15, fill: '#fff', w: 700 });
    s += T(140, 18, '전구', { s: 13, w: 600 });
    s += T(140, 192, '전지', { s: 13, w: 600 });
    s += T(56, 109, '전선', { a: 'start', s: 13, w: 600 });
    s += T(137, 214, '(가)', { s: 15, w: 700 });
    // (나) 물의 흐름
    const ox = 286;
    s += R(ox + 6, 6, 262, 196, { fill: PANEL, rx: 14 });
    s += P(`M${ox + 236} 50 H${ox + 50} V170 H${ox + 236} Z`, { c: '#5AC8FA', w: 11 });
    s += P(`M${ox + 236} 50 H${ox + 50} V170 H${ox + 236} Z`, { c: '#0A84FF', w: 2, op: 0.35 });
    // 물레방아
    s += C(ox + 50, 110, 24, { fill: PAPER, c: '#8E5A2B', w: 3 });
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      s += L(ox + 50, 110, ox + 50 + 24 * Math.cos(a), 110 + 24 * Math.sin(a), { c: '#8E5A2B', w: 2 });
    }
    // 펌프
    s += R(ox + 216, 88, 40, 44, { fill: '#8E8E93', rx: 6 });
    s += T(ox + 236, 110, '펌프', { s: 12, fill: '#fff', w: 700 });
    s += head(ox + 150, 50, Math.PI, 11, '#fff');
    s += head(ox + 236, 70, -Math.PI / 2, 11, '#fff');
    s += head(ox + 150, 170, 0, 11, '#fff');
    s += head(ox + 50, 150, Math.PI / 2, 11, '#fff');
    s += T(ox + 150, 28, '물의 흐름', { s: 13, w: 600 });
    s += T(ox + 84, 110, '물레방아', { a: 'start', s: 13, w: 600 });
    s += T(ox + 150, 190, '수로', { s: 13, w: 600 });
    s += T(ox + 137, 214, '(나)', { s: 15, w: 700 });
    return svg(560, 225, s, '전기 회로와 물의 흐름 비교');
  };

  // 니크롬선 전류·전압 측정 회로 (㉠ 직렬, ㉡ 병렬)
  F.nichrome = function (o = {}) {
    let s = '';
    s += R(150, 10, 120, 42, { fill: '#2c2c2e', rx: 7 });
    s += T(210, 31, '전원 장치', { s: 13, fill: '#fff', w: 700 });
    s += C(172, 52, 5, { fill: '#FF3B30' }) + C(248, 52, 5, { fill: '#8E8E93' });
    s += T(158, 64, '(+)', { s: 11, fill: SUB }) + T(262, 64, '(−)', { s: 11, fill: SUB });
    const W = { w: 2.6 };
    s += P('M172 52 V80 H50 V120', W);
    s += C(50, 120, 3.5, { fill: INK }) + C(50, 150, 3.5, { fill: INK });
    s += L(50, 150, 68, 124, { w: 2.6 });
    s += T(76, 140, '스위치', { a: 'start', s: 12, fill: SUB });
    s += P('M50 150 V205 H100', W);
    s += C(118, 205, 18, { fill: PAPER, c: INK, w: 2.4 });
    s += P('M136 205 H165', W);
    let z = 'M165 205';
    for (let i = 1; i <= 12; i++) z += ` L${165 + i * 10} ${i === 12 ? 205 : 205 + (i % 2 ? -8 : 8)}`;
    s += P(z, { c: '#C77D2E', w: 3 });
    s += P('M285 205 H370 V80 H248 V52', W);
    s += P('M155 205 V150 H202', W);
    s += C(220, 150, 18, { fill: PAPER, c: INK, w: 2.4 });
    s += P('M238 150 H295 V205', W);
    s += C(155, 205, 4, { fill: INK }) + C(295, 205, 4, { fill: INK });
    s += T(225, 232, '니크롬선', { s: 13, w: 600 });
    if (o.reveal) {
      s += T(118, 205, 'A', { s: 16, w: 800, fill: '#0A84FF' }) + T(220, 150, 'V', { s: 16, w: 800, fill: '#FF9500' });
      s += T(118, 238, '전류계(직렬)', { s: 11, fill: '#0A84FF', w: 700 });
      s += T(220, 120, '전압계(병렬)', { s: 11, fill: '#FF9500', w: 700 });
    } else {
      s += T(118, 205, '㉠', { s: 17, w: 700 }) + T(220, 150, '㉡', { s: 17, w: 700 });
    }
    return svg(420, 250, s, '니크롬선에 흐르는 전류와 전압을 측정하는 회로');
  };

  // 전압-전류 그래프 보기용 작은 그래프
  F.viMini = function (kind) {
    let s = '';
    s += A(28, 98, 28, 8, { w: 1.6, hs: 7 }) + A(28, 98, 142, 98, { w: 1.6, hs: 7 });
    s += T(14, 22, '전', { s: 11, fill: SUB }) + T(14, 36, '류', { s: 11, fill: SUB });
    s += T(116, 110, '전압', { s: 11, fill: SUB }) + T(20, 108, 'O', { s: 11, fill: SUB });
    const c = { c: '#FF9500', w: 3.2 };
    const d = {
      down: 'M32 20 L130 90',
      up: 'M28 98 L128 20',
      flat: 'M28 52 L134 52',
      curve: 'M28 98 Q 104 96 124 16',
      decay: 'M34 16 Q 44 86 136 90'
    }[kind];
    s += P(d, c);
    return svg(150, 118, s, '전압-전류 그래프', 'fig-mini');
  };

  // 니크롬선 A, B, C의 전압-전류 그래프
  F.viThree = function () {
    let s = '';
    s += A(50, 196, 50, 14, { w: 1.8, hs: 8 }) + A(50, 196, 300, 196, { w: 1.8, hs: 8 });
    s += T(32, 28, '전', { s: 13, fill: SUB }) + T(32, 44, '류', { s: 13, fill: SUB });
    s += T(280, 214, '전압', { s: 13, fill: SUB }) + T(42, 208, '0', { s: 12, fill: SUB });
    s += L(50, 196, 160, 30, { c: '#FF2D55', w: 3 }) + T(168, 24, 'A', { s: 15, w: 700 });
    s += L(50, 196, 248, 74, { c: '#FF9500', w: 3 }) + T(258, 68, 'B', { s: 15, w: 700 });
    s += L(50, 196, 282, 124, { c: '#30B0C7', w: 3 }) + T(292, 118, 'C', { s: 15, w: 700 });
    return svg(320, 224, s, '니크롬선 A, B, C의 전압과 전류 그래프');
  };

  function bulb(x, y, on) {
    const g = uid('bl');
    let s = `<defs>${radial(g, [[0, '#fff7c2', 0.95], [1, '#ffd60a', 0]])}</defs>`;
    if (on) s += C(x, y, 26, { fill: `url(#${g})` });
    s += C(x, y, 14, { fill: '#fffbe6', c: INK, w: 2 });
    s += P(`M${x - 7} ${y + 3} q3.5 -10 7 0 q3.5 -10 7 0`, { w: 1.5, c: '#e08a00' });
    return s;
  }

  // 전구 두 개를 직렬로 연결한 회로
  F.seriesBulbs = function () {
    let s = '';
    s += P('M50 45 H136 M164 45 H226 M254 45 H330 V165 H202 M178 165 H50 V112 M50 98 V45', { w: 2.6 });
    s += bulb(150, 45, true) + bulb(240, 45, true);
    s += T(150, 14, '전구 1', { s: 12, fill: SUB }) + T(240, 14, '전구 2', { s: 12, fill: SUB });
    s += L(32, 98, 68, 98, { w: 3 }) + L(41, 112, 59, 112, { w: 5 });
    s += T(76, 105, '전지', { a: 'start', s: 12, fill: SUB });
    s += C(178, 165, 3.5, { fill: INK }) + C(202, 165, 3.5, { fill: INK }) + L(178, 165, 202, 162, { w: 2.6 });
    s += T(190, 186, '스위치', { s: 12, fill: SUB });
    return svg(380, 200, s, '전구 두 개를 연결한 전기 회로');
  };

  // 가정의 전기 기구 병렬연결
  F.house = function () {
    let s = '';
    s += A(14, 40, 446, 40, { w: 2.4, hs: 0.1 }) + L(14, 58, 446, 58, { w: 2.4 });
    s += T(16, 20, '주 전원(220 V)', { a: 'start', s: 12, fill: SUB, w: 600 });
    const xs = [95, 195, 295, 395];
    const names = ['텔레비전', '선풍기', '세탁기', '전등'];
    xs.forEach((x, i) => {
      s += C(x - 6, 40, 3.5, { fill: INK }) + C(x + 6, 58, 3.5, { fill: INK });
      s += L(x - 6, 40, x - 6, 92, { w: 2 }) + L(x + 6, 58, x + 6, 92, { w: 2 });
      s += R(x - 13, 90, 26, 20, { fill: PAPER, c: INK, w: 1.6, rx: 4 });
      s += R(x - 4, 94, 8, 12, { fill: '#34C759', rx: 2 });
      s += L(x - 6, 110, x - 6, 124, { w: 2 }) + L(x + 6, 110, x + 6, 124, { w: 2 });
      if (i === 0) {
        s += R(x - 34, 124, 68, 46, { fill: '#1c1c1e', rx: 4, c: INK, w: 1.5 });
        s += R(x - 29, 129, 58, 36, { fill: '#2f6fd1', rx: 2 });
        s += L(x, 170, x, 180, { w: 3 }) + L(x - 16, 182, x + 16, 182, { w: 3 });
      } else if (i === 1) {
        s += C(x, 150, 24, { fill: PAPER, c: INK, w: 2 });
        for (let k = 0; k < 3; k++) {
          const a = (k * 2 * Math.PI) / 3 - Math.PI / 2;
          s += E(x + 11 * Math.cos(a), 150 + 11 * Math.sin(a), 10, 5, { fill: '#5AC8FA', rot: (a * 180) / Math.PI });
        }
        s += C(x, 150, 3.5, { fill: INK }) + L(x, 174, x, 186, { w: 3 }) + L(x - 14, 188, x + 14, 188, { w: 3 });
      } else if (i === 2) {
        s += R(x - 26, 124, 52, 64, { fill: PAPER, c: INK, w: 2, rx: 6 });
        s += C(x, 160, 16, { fill: '#cfe8ff', c: INK, w: 2 });
        s += L(x - 20, 134, x + 20, 134, { w: 1.4 });
      } else {
        s += P(`M${x - 22} 150 L${x - 10} 124 L${x + 10} 124 L${x + 22} 150 Z`, { fill: '#FFCC00', w: 2 });
        s += L(x, 150, x, 182, { w: 3 }) + L(x - 16, 184, x + 16, 184, { w: 3 });
      }
      s += T(x, 208, names[i], { s: 12, w: 600 });
    });
    return svg(460, 220, s, '집 안의 전기 기구가 주 전원에 병렬로 연결된 모습');
  };

  function compass(cx, cy, dir) {
    let s = C(cx, cy, 17, { fill: PAPER, c: INK, w: 1.6, dash: '2 3' });
    if (dir != null) {
      const a = dir; // 라디안, N극이 가리키는 방향
      const nx = cx + 13 * Math.cos(a), ny = cy + 13 * Math.sin(a);
      const sx = cx - 13 * Math.cos(a), sy = cy - 13 * Math.sin(a);
      const px = 4 * Math.cos(a + Math.PI / 2), py = 4 * Math.sin(a + Math.PI / 2);
      s += poly([nx, ny, cx + px, cy + py, cx - px, cy - py], '#FF3B30');
      s += poly([sx, sy, cx + px, cy + py, cx - px, cy - py], '#d1d1d6', { c: '#8e8e93', w: 1 });
    }
    s += C(cx, cy, 2, { fill: INK });
    return s;
  }

  // 막대자석 주위 자기력선과 나침반 ㉠ ㉡
  F.barMagnet = function (o = {}) {
    let s = '';
    for (let k = 1; k <= 3; k++) {
      const c1 = 176 - 52 * k, c2 = 294 + 52 * k, cy = 92 - 34 * k, cyb = 108 + 34 * k;
      const top = `M178 92 C${c1} ${cy} ${c2} ${cy} 292 92`;
      const bot = `M178 108 C${c1} ${cyb} ${c2} ${cyb} 292 108`;
      s += P(top, { c: '#5b8def', w: 1.6 }) + P(bot, { c: '#5b8def', w: 1.6 });
      const yt = (92 + 6 * cy + 92) / 8;
      const xm = (178 + 3 * c1 + 3 * c2 + 292) / 8;
      s += head(xm + 5, yt, 0, 9, '#5b8def');
      s += head(xm + 5, 200 - yt, 0, 9, '#5b8def');
    }
    s += L(175, 100, 14, 100, { c: '#5b8def', w: 1.6 }) + head(128, 100, Math.PI, 9, '#5b8def');
    s += L(456, 100, 295, 100, { c: '#5b8def', w: 1.6 }) + head(352, 100, Math.PI, 9, '#5b8def');
    s += R(175, 88, 60, 24, { fill: '#FF3B30', rx: 2 }) + R(235, 88, 60, 24, { fill: '#0A84FF', rx: 2 });
    s += T(205, 100, 'N', { s: 15, fill: '#fff', w: 800 }) + T(265, 100, 'S', { s: 15, fill: '#fff', w: 800 });
    s += compass(70, 100, o.needles ? Math.PI : null) + compass(400, 100, o.needles ? Math.PI : null);
    s += T(40, 100, '㉠', { s: 16, w: 700 }) + T(430, 100, '㉡', { s: 16, w: 700 });
    return svg(470, 200, s, '막대자석 주위의 자기력선과 나침반');
  };

  // 전류가 흐르는 코일과 주위의 나침반 (앞쪽 도선의 전류가 위쪽 → 코일 내부 자기장 왼쪽)
  F.solenoid = function (o = {}) {
    let s = '';
    const xs = [];
    for (let i = 0; i < 9; i++) xs.push(150 + 20 * i);
    xs.forEach((x, i) => {
      if (i < 8) s += P(`M${x} 73 Q${x - 2} 115 ${x + 20} 157`, { c: '#C77D2E', w: 2, op: 0.35, dash: '3 3' });
    });
    xs.forEach((x) => {
      s += P(`M${x} 157 Q${x + 18} 115 ${x} 73`, { c: '#C77D2E', w: 3.2 });
      s += head(x + 9, 108, -Math.PI / 2, 7, '#B25E12');
    });
    s += P('M60 205 H150 V157', { w: 2.4 });
    s += P('M310 73 V36 H430', { w: 2.4 });
    s += A(80, 205, 128, 205, { c: '#FF9500', w: 2.6, hs: 9 }) + T(104, 222, '전류', { s: 12, fill: '#FF9500', w: 700 });
    const nd = o.needles === false;
    s += compass(96, 115, nd ? null : Math.PI) + compass(364, 115, nd ? null : Math.PI);
    s += compass(230, 30, nd ? null : 0) + compass(240, 202, nd ? null : 0);
    return svg(460, 232, s, '전류가 흐르는 코일 주위에 놓은 나침반');
  };

  // 전동기 구조 (S 왼쪽, N 오른쪽, 코일은 수평면: A·C 뒤쪽, B·D 앞쪽)
  F.motor = function (o = {}) {
    const g1 = uid('mg'), g2 = uid('mg');
    let s = `<defs>${linear(g1, [[0, '#4d8be6'], [1, '#2a5cb8']])}${linear(g2, [[0, '#f0645b'], [1, '#c4362e']])}</defs>`;
    // S 자석
    s += poly([18, 80, 140, 80, 174, 54, 52, 54], '#7fabf0');
    s += poly([140, 80, 174, 54, 174, 150, 140, 176], '#2552a5');
    s += R(18, 80, 122, 96, { fill: `url(#${g1})` });
    s += T(79, 128, 'S', { s: 34, fill: '#fff', w: 800 });
    // N 자석
    s += poly([300, 80, 422, 80, 456, 54, 334, 54], '#f39a93');
    s += poly([422, 80, 456, 54, 456, 150, 422, 176], '#a92c25');
    s += R(300, 80, 122, 96, { fill: `url(#${g2})` });
    s += T(361, 128, 'N', { s: 34, fill: '#fff', w: 800 });
    if (o.field) {
      s += A(298, 30, 178, 30, { c: '#8E8E93', w: 2, hs: 9 });
      s += T(238, 14, '자기장 방향 (N극 → S극)', { s: 11.5, fill: '#8E8E93', w: 700 });
    }
    // 정류자와 브러시
    s += R(229, 176, 12, 22, { fill: '#E5B567', rx: 3, c: '#9c7430', w: 1 });
    s += R(245, 176, 12, 22, { fill: '#E5B567', rx: 3, c: '#9c7430', w: 1 });
    s += L(214, 212, 228, 194, { c: '#48484a', w: 6 }) + L(272, 212, 258, 194, { c: '#48484a', w: 6 });
    s += L(214, 212, 214, 246, { w: 2.2 }) + L(272, 212, 272, 246, { w: 2.2 });
    s += A(200, 214, 200, 242, { c: '#FF3B30', w: 2.4, hs: 8 }) + T(192, 228, '전류', { a: 'end', s: 12, fill: '#FF3B30', w: 700 });
    s += A(286, 242, 286, 214, { c: '#FF3B30', w: 2.4, hs: 8 }) + T(294, 228, '전류', { a: 'start', s: 12, fill: '#FF3B30', w: 700 });
    // 코일: 정류자 오른쪽 → D → C → A → B → 정류자 왼쪽 (B·D 앞쪽, A·C 뒤쪽)
    const coil = 'M251 176 L251 152 L246 140 L256 140 L290 114 L214 114 L180 140 L228 140 L235 152 L235 176';
    s += P(coil, { c: '#8a5a12', w: 7 }) + P(coil, { c: '#E3A33A', w: 4.5 });
    const ar = '#C0392B';
    s += head(281, 121, Math.atan2(-26, 34), 10, ar);
    s += head(244, 114, Math.PI, 10, ar);
    s += head(189, 133, Math.atan2(26, -34), 10, ar);
    if (o.labels !== false && !o.arcs) {
      s += T(206, 102, 'A', { s: 15, w: 700 }) + T(282, 102, 'C', { s: 15, w: 700 });
      s += T(168, 146, 'B', { s: 15, w: 700 }) + T(266, 152, 'D', { s: 15, w: 700 });
    }
    if (o.forces) {
      s += A(197, 130, 197, 178, { c: '#34C759', w: 4, hs: 12 }) + T(189, 172, '힘', { a: 'end', s: 13, fill: '#34C759', w: 800 });
      s += A(273, 124, 273, 66, { c: '#34C759', w: 4, hs: 12 }) + T(262, 66, '힘', { a: 'end', s: 13, fill: '#34C759', w: 800 });
    }
    if (o.arcs) {
      s += P('M320 72 Q235 0 150 72', { c: '#FF2D55', w: 3 }) + head(150, 72, Math.atan2(72, -85), 11, '#FF2D55');
      s += P('M190 90 Q235 48 280 90', { c: '#FF9500', w: 3 }) + head(280, 90, Math.atan2(42, 45), 11, '#FF9500');
      s += T(235, 22, 'A', { s: 15, w: 800, fill: '#FF2D55' }) + T(235, 82, 'B', { s: 15, w: 800, fill: '#FF9500' });
    }
    return svg(470, 252, s, '전동기의 구조');
  };

  /* ───────────────────────── Ⅷ. 별과 우주 ───────────────────────── */

  // 연주 시차 (mode: 'sym' → ㉠㉡, 'val' → 0.05″, 0.1″)
  F.parallax = function (o = {}) {
    const g = uid('sun'), g2 = uid('st');
    let s = `<defs>${radial(g, [[0, '#fff2b0'], [0.6, '#ff9f0a'], [1, '#e8590c']])}${radial(g2, [[0, '#fffbe0'], [0.5, '#ffd60a'], [1, '#ffd60a', 0]])}</defs>`;
    s += R(352, 8, 110, 214, { fill: '#0b1a3a', rx: 10 });
    const r = rng(7);
    for (let i = 0; i < 40; i++) s += C(358 + r() * 98, 14 + r() * 202, 0.6 + r() * 0.9, { fill: '#fff', op: 0.3 + r() * 0.5 });
    s += E(80, 115, 34, 86, { c: '#30B0C7', w: 2 });
    s += head(46, 122, Math.PI / 2, 9, '#30B0C7');
    s += C(80, 115, 13, { fill: `url(#${g})` });
    s += T(80, 141, '태양', { s: 12, w: 600 });
    s += C(80, 29, 7, { fill: '#2f80ed' }) + C(80, 201, 7, { fill: '#2f80ed' });
    s += T(80, 12, '지구', { s: 12, w: 600 }) + T(80, 220, '6개월 후의 지구', { s: 11, fill: SUB });
    const S = [250, 115];
    s += L(80, 29, 420, 201, { dash: '6 5', w: 1.4, c: SUB }) + L(80, 201, 420, 29, { dash: '6 5', w: 1.4, c: SUB });
    s += L(80, 115, 250, 115, { dash: '3 4', w: 1.4, c: SUB });
    s += C(420, 29, 9, { fill: `url(#${g2})` }) + C(420, 29, 3, { fill: '#fff' });
    s += C(420, 201, 9, { fill: `url(#${g2})` }) + C(420, 201, 3, { fill: '#fff' });
    s += C(S[0], S[1], 13, { fill: `url(#${g2})` }) + C(S[0], S[1], 4.5, { fill: '#ffcc00' });
    s += T(250, 138, 'S', { s: 14, w: 700 });
    const ang = Math.atan2(29 - 115, 80 - 250); // 지구(위) 방향
    const p = (rad, a) => [S[0] + rad * Math.cos(a), S[1] + rad * Math.sin(a)];
    const a0 = Math.PI, a1 = ang + 2 * Math.PI, a2 = -ang; // a1 ≈ 206°, a2 ≈ 154°
    const h0 = p(34, a0), h1 = p(34, a1);
    s += P(`M${r1(h0[0])} ${r1(h0[1])} A34 34 0 0 1 ${r1(h1[0])} ${r1(h1[1])}`, { c: '#FF2D55', w: 2.4 });
    const f0 = p(54, a2), f1 = p(54, a1);
    s += P(`M${r1(f0[0])} ${r1(f0[1])} A54 54 0 0 1 ${r1(f1[0])} ${r1(f1[1])}`, { c: '#0A84FF', w: 2.4 });
    const lh = p(30, (a0 + a1) / 2), lf = p(54, a2 + 0.12);
    const t1 = o.mode === 'val' ? '0.05″' : '㉠';
    const t2 = o.mode === 'val' ? '0.1″' : '㉡';
    s += L(lh[0], lh[1], 236, 62, { w: 1.1, c: '#FF2D55' }) + T(238, 52, t1, { s: o.mode === 'val' ? 13 : 16, w: 700, fill: '#FF2D55' });
    s += L(lf[0], lf[1], 210, 168, { w: 1.1, c: '#0A84FF' }) + T(210, 180, t2, { s: o.mode === 'val' ? 13 : 16, w: 700, fill: '#0A84FF' });
    return svg(470, 230, s, '별 S를 6개월 간격으로 관측할 때 보이는 위치');
  };

  // 거리와 빛이 퍼지는 면적
  F.lightSpread = function () {
    const g = uid('ls');
    let s = `<defs>${radial(g, [[0, '#fff3b0'], [0.6, '#ff9f0a'], [1, '#ff9f0a', 0]])}</defs>`;
    const sx = 30, sy = 110;
    [1, 2, 3].forEach((k) => {
      const x = 30 + 110 * k, h = 36 * k, w = h * 0.42, top = sy - h / 2;
      s += P(`M${sx} ${sy} L${x} ${top} M${sx} ${sy} L${x + w} ${top + h} M${sx} ${sy} L${x + w} ${top} M${sx} ${sy} L${x} ${top + h}`, { c: '#FF9F0A', w: 1, op: 0.45 });
      s += poly([x, top, x + w, top + 0, x + w, top + h, x, top + h], 'rgba(255,159,10,.14)', { c: '#FF9F0A', w: 1.6 });
      for (let i = 1; i < k; i++) {
        s += L(x, top + (h * i) / k, x + w, top + (h * i) / k, { c: '#FF9F0A', w: 1, op: 0.8 });
        s += L(x + (w * i) / k, top, x + (w * i) / k, top + h, { c: '#FF9F0A', w: 1, op: 0.8 });
      }
      s += R(x, top, w / k, h / k, { fill: 'rgba(255,159,10,.55)' });
      s += T(x + w / 2, top - 12, `${k * k}칸`, { s: 12, w: 700, fill: '#E07700' });
      s += T(x + w / 2, 192, `${k}배`, { s: 12, fill: SUB });
    });
    s += C(sx, sy, 14, { fill: `url(#${g})` }) + C(sx, sy, 5, { fill: '#fff' });
    s += T(sx, sy + 26, '광원', { s: 12, fill: SUB });
    s += A(30, 206, 420, 206, { w: 1.2, c: SUB, hs: 7 }) + T(440, 206, '거리', { s: 12, fill: SUB });
    return svg(470, 218, s, '광원으로부터의 거리와 빛이 퍼지는 면적');
  };

  // 절대 등급-별의 색 그래프
  F.magGraph = function (o = {}) {
    let s = '';
    const x0 = 72, yOf = (m) => 120 + m * 8.6;
    const cats = ['청색', '청백색', '백색', '황백색', '황색', '주황색', '적색'];
    const xOf = (i) => 108 + i * 50;
    [-10, -5, 0, 5, 10].forEach((m) => {
      s += L(x0, yOf(m), 430, yOf(m), { dash: '4 4', w: 1, c: SUB, op: 0.7 });
      s += T(x0 - 8, yOf(m), m > 0 ? String(m) : m === 0 ? '0' : '−' + Math.abs(m), { a: 'end', s: 12 });
    });
    cats.forEach((c, i) => {
      s += L(xOf(i), 22, xOf(i), 222, { dash: '4 4', w: 1, c: SUB, op: 0.6 });
      s += T(xOf(i), 238, c, { s: 11.5 });
    });
    s += L(x0, 14, x0, 222, { w: 1.8 }) + L(x0, 222, 436, 222, { w: 1.8 });
    s += T(24, 120, '절대 등급', { s: 12, rot: -90, fill: SUB });
    s += T(436, 258, '별의 색', { a: 'end', s: 12, fill: SUB });
    const pts = [['㉠', 0, 5], ['㉡', 1, -5], ['㉢', 3, 5], ['㉣', 5, -5], ['㉤', 6, 10]];
    pts.forEach(([l, i, m]) => {
      s += C(xOf(i), yOf(m), 12, { fill: PAPER, c: INK, w: 1.8 }) + T(xOf(i), yOf(m) + 0.5, l, { s: 14, w: 700 });
    });
    if (o.hint) {
      s += T(x0 + 6, 30, '↑ 실제로 밝다', { a: 'start', s: 11, fill: '#0A84FF', w: 700 });
      s += A(150, 252, 90, 252, { c: '#FF3B30', w: 1.6, hs: 7 }) + T(156, 252, '표면 온도 높다', { a: 'start', s: 11, fill: '#FF3B30', w: 700 });
    }
    return svg(450, 266, s, '별 ㉠~㉤의 절대 등급과 색');
  };

  // 옆에서 본 우리은하
  F.milkyWay = function (o = {}) {
    const g1 = uid('mw'), g2 = uid('mw'), b1 = uid('bl'), b2 = uid('bl');
    let s = `<defs>${radial(g1, [[0, '#fff8e6', 1], [0.35, '#e8eeff', 0.75], [0.7, '#8aa6ff', 0.35], [1, '#5a74d6', 0]])}${radial(g2, [[0, '#fff6dc', 1], [0.6, '#ffe0a0', 0.6], [1, '#ffcc66', 0]])}${blurF(b1, 3)}${blurF(b2, 1.6)}</defs>`;
    s += R(0, 0, 470, 180, { fill: '#04050b', rx: 12 });
    const r = rng(11);
    for (let i = 0; i < 140; i++) s += C(r() * 470, r() * 180, 0.4 + r() * 0.9, { fill: '#fff', op: 0.25 + r() * 0.6 });
    s += E(235, 88, 208, 20, { fill: `url(#${g1})`, filter: b1 });
    s += E(235, 88, 52, 32, { fill: `url(#${g2})`, filter: b1 });
    s += E(235, 90, 190, 2.4, { fill: '#2a1608', op: 0.6, filter: b2 });
    for (let i = 0; i < 260; i++) {
      const x = 235 + gauss(r) * 70, y = 88 + gauss(r) * 4.5;
      if (Math.abs(x - 235) < 205) s += C(x, y, 0.5 + r() * 0.7, { fill: '#fff', op: 0.5 + r() * 0.5 });
    }
    if (o.marker) {
      const xs = 235 - 208 * (8500 / 15000);
      s += A(xs, 40, xs, 80, { c: '#fff', w: 2, hs: 8 }) + T(xs, 28, '태양계', { s: 13, fill: '#fff', w: 700 });
    }
    if (o.scale) {
      s += A(28, 154, 442, 154, { c: '#fff', w: 1.5, hs: 8, both: true });
      s += R(185, 143, 100, 22, { fill: '#04050b', rx: 11 }) + T(235, 154, '약 30000 pc', { s: 12, fill: '#fff', w: 700 });
    }
    return svg(470, 180, s, '옆에서 본 우리은하의 모습', 'fig-dark');
  };

  // ── 천체 사진 대신 쓰는 그림 (200×150) ──
  function starBurst(x, y, rad, color, gid) {
    let s = C(x, y, rad * 3.2, { fill: `url(#${gid})` });
    s += L(x - rad * 3.6, y, x + rad * 3.6, y, { c: color, w: 0.8, op: 0.8 });
    s += L(x, y - rad * 3.6, x, y + rad * 3.6, { c: color, w: 0.8, op: 0.8 });
    s += C(x, y, rad * 0.8, { fill: '#fff' });
    return s;
  }
  function field(r, n, w, h, op) {
    let s = '';
    for (let i = 0; i < n; i++) s += C(r() * w, r() * h, 0.3 + r() * 0.7, { fill: '#fff', op: (op || 0.5) * (0.4 + r() * 0.6) });
    return s;
  }
  F.astro = {};
  F.astro.openCluster = function () {
    const g = uid('oc'), gb = uid('ob'), b = uid('bf');
    let s = `<defs>${radial(g, [[0, '#ffffff', 1], [0.25, '#cfe2ff', 0.9], [1, '#5aa0ff', 0]])}${radial(gb, [[0, '#4f8dff', 0.55], [1, '#1d3a8a', 0]])}${blurF(b, 6)}</defs>`;
    s += R(0, 0, 200, 150, { fill: '#02040c' });
    const r = rng(21);
    s += field(r, 90, 200, 150, 0.6);
    const bright = [[62, 50, 3], [96, 36, 2.6], [124, 66, 3.2], [86, 86, 2.4], [146, 46, 2.2], [112, 104, 2.6], [68, 112, 2], [150, 92, 1.8], [40, 78, 1.6]];
    bright.forEach(([x, y]) => (s += C(x, y, 22, { fill: `url(#${gb})`, filter: b })));
    bright.forEach(([x, y, k]) => (s += starBurst(x, y, k, '#bcd6ff', g)));
    return svg(200, 150, s, '산개 성단 모습', 'fig-astro');
  };
  F.astro.globular = function () {
    const g = uid('gc');
    let s = `<defs>${radial(g, [[0, '#fff1c8', 0.9], [0.5, '#ffcf80', 0.35], [1, '#ff9f40', 0]])}</defs>`;
    s += R(0, 0, 200, 150, { fill: '#020205' });
    const r = rng(33);
    s += field(r, 50, 200, 150, 0.5);
    s += C(100, 75, 46, { fill: `url(#${g})` });
    const cols = ['#ffe6b0', '#ffd08a', '#ffb47a', '#ff9a6a', '#fff2d6', '#ffc070'];
    for (let i = 0; i < 900; i++) {
      const rad = Math.abs(gauss(r)) * 17 + (r() < 0.15 ? r() * 40 : 0);
      const a = r() * Math.PI * 2;
      const x = 100 + rad * Math.cos(a), y = 75 + rad * Math.sin(a);
      s += C(x, y, 0.35 + r() * 0.95, { fill: cols[(r() * cols.length) | 0], op: 0.6 + r() * 0.4 });
    }
    return svg(200, 150, s, '구상 성단 모습', 'fig-astro');
  };
  F.astro.reflection = function () {
    const b = uid('rb'), b2 = uid('rb'), g = uid('rs');
    let s = `<defs>${blurF(b, 9)}${blurF(b2, 3)}${radial(g, [[0, '#ffffff', 1], [0.3, '#d6e6ff', 0.8], [1, '#6aa8ff', 0]])}</defs>`;
    s += R(0, 0, 200, 150, { fill: '#03040d' });
    const r = rng(45);
    s += field(r, 70, 200, 150, 0.5);
    s += E(96, 70, 62, 44, { fill: '#2b6fd6', op: 0.75, filter: b });
    s += E(120, 58, 40, 30, { fill: '#6fb8ff', op: 0.7, filter: b });
    s += E(76, 92, 36, 22, { fill: '#9fd2ff', op: 0.5, filter: b });
    s += P('M20 120 C60 100 70 70 110 92 S170 120 196 96', { c: '#05060d', w: 14, op: 0.75, filter: b2 });
    s += P('M120 10 C110 40 140 52 128 80', { c: '#07080f', w: 9, op: 0.7, filter: b2 });
    s += starBurst(110, 62, 2.6, '#cfe0ff', g) + starBurst(82, 80, 1.8, '#cfe0ff', g);
    return svg(200, 150, s, '반사 성운 모습', 'fig-astro');
  };
  F.astro.emission = function () {
    const b = uid('eb'), b2 = uid('eb'), g = uid('es');
    let s = `<defs>${blurF(b, 10)}${blurF(b2, 3)}${radial(g, [[0, '#ffffff', 1], [0.4, '#ffe3ee', 0.8], [1, '#ff6fa0', 0]])}</defs>`;
    s += R(0, 0, 200, 150, { fill: '#07030a' });
    const r = rng(57);
    s += field(r, 80, 200, 150, 0.5);
    s += E(100, 78, 76, 56, { fill: '#c2185b', op: 0.7, filter: b });
    s += E(88, 70, 50, 36, { fill: '#ff4f8b', op: 0.75, filter: b });
    s += E(118, 90, 40, 30, { fill: '#ff8a65', op: 0.55, filter: b });
    s += E(98, 74, 18, 12, { fill: '#ffe0ec', op: 0.9, filter: b });
    s += E(104, 76, 14, 9, { fill: '#9ff0ff', op: 0.35, filter: b });
    s += P('M30 40 C60 60 70 30 100 50', { c: '#1a0610', w: 8, op: 0.6, filter: b2 });
    s += P('M120 120 C140 100 160 112 186 92', { c: '#1a0610', w: 10, op: 0.55, filter: b2 });
    s += starBurst(98, 76, 1.6, '#fff', g);
    return svg(200, 150, s, '방출 성운(오리온 대성운) 모습', 'fig-astro');
  };
  F.astro.dark = function () {
    const b = uid('db'), b2 = uid('db');
    let s = `<defs>${blurF(b, 10)}${blurF(b2, 1.2)}</defs>`;
    s += R(0, 0, 200, 150, { fill: '#08030a' });
    const r = rng(69);
    s += field(r, 90, 200, 150, 0.55);
    s += E(100, 66, 120, 40, { fill: '#c2185b', op: 0.8, filter: b });
    s += E(120, 54, 70, 26, { fill: '#ff5c8a', op: 0.6, filter: b });
    s += P('M0 150 L0 118 C30 112 60 120 84 112 C92 100 88 90 92 80 C90 70 82 66 80 58 C78 48 86 42 94 46 C100 38 110 38 114 46 C122 46 126 56 120 64 C126 74 128 90 122 104 C140 114 170 108 200 116 L200 150 Z', {
      c: 'none', w: 0, fill: '#050208', filter: b2
    });
    return svg(200, 150, s, '암흑 성운(말머리 성운) 모습', 'fig-astro');
  };
  F.astro.sun = function () {
    const g = uid('sn'), g2 = uid('sg');
    let s = `<defs>${radial(g, [[0, '#fff8d6'], [0.45, '#ffd24a'], [0.85, '#ffa000'], [1, '#f57c00']])}${radial(g2, [[0, '#ffb300', 0.5], [1, '#ff8f00', 0]])}</defs>`;
    s += R(0, 0, 200, 150, { fill: '#030303' });
    s += C(100, 75, 70, { fill: `url(#${g2})` });
    s += C(100, 75, 58, { fill: `url(#${g})` });
    s += C(118, 84, 2.6, { fill: '#5a2a00', op: 0.85 }) + C(123, 86, 1.6, { fill: '#5a2a00', op: 0.85 }) + C(80, 62, 1.6, { fill: '#5a2a00', op: 0.7 });
    return svg(200, 150, s, '태양 모습', 'fig-astro');
  };
  F.astro.star = function (color, seed) {
    const g = uid('sg');
    let s = `<defs>${radial(g, [[0, '#ffffff', 1], [0.12, color, 0.95], [0.5, color, 0.35], [1, color, 0]])}</defs>`;
    s += R(0, 0, 200, 150, { fill: '#04050b' });
    const r = rng(seed || 5);
    s += field(r, 70, 200, 150, 0.45);
    s += C(100, 75, 60, { fill: `url(#${g})` });
    s += L(30, 75, 170, 75, { c: color, w: 1, op: 0.8 }) + L(100, 12, 100, 138, { c: color, w: 1, op: 0.8 });
    s += C(100, 75, 5, { fill: '#fff' });
    return svg(200, 150, s, '별의 모습', 'fig-astro');
  };
  // 천체 그림을 캡션과 함께 가로로 배열 (HTML)
  F.astroRow = function (items) {
    return `<div class="astro-row">${items
      .map((it) => `<figure class="astro-item"><div class="astro-img">${typeof it.fig === 'function' ? it.fig() : it.fig}</div><figcaption>${it.cap}</figcaption></figure>`)
      .join('')}</div>`;
  };

  // 우주 팽창
  F.expansion = function () {
    const g = uid('ux'), gb = uid('ub');
    let s = `<defs>${radial(g, [[0, '#3c4f8f'], [0.7, '#141c42'], [1, '#090d24']], { fx: '38%', fy: '35%' })}${radial(gb, [[0, '#fff6d0', 1], [0.4, '#ff9f0a', 0.9], [1, '#ff3b30', 0]])}</defs>`;
    s += C(36, 170, 16, { fill: `url(#${gb})` });
    const sp = [[92, 160, 14], [146, 146, 24], [226, 124, 38], [352, 94, 64]];
    const gal = [[0.1, 0.2], [-0.4, -0.3], [0.5, -0.4], [-0.2, 0.55], [0.6, 0.3], [-0.6, 0.15], [0.15, -0.65], [0.35, 0.6], [-0.45, -0.6], [0, -0.15], [0.7, -0.05], [-0.15, 0.25]];
    sp.forEach(([x, y, rad]) => {
      s += C(x, y, rad, { fill: `url(#${g})`, c: 'rgba(150,180,255,.55)', w: 1.2 });
      gal.forEach(([gx, gy]) => (s += C(x + gx * rad, y + gy * rad, Math.max(0.9, rad / 32), { fill: '#e6ecff', op: 0.9 })));
    });
    s += A(148, 72, 240, 34, { c: SUB, w: 1.8, hs: 9 });
    s += T(132, 86, '시간의 흐름', { s: 12, fill: SUB, w: 600 });
    return svg(470, 200, s, '시간에 따라 팽창하는 우주');
  };

  // 겉보기 등급·절대 등급과 10 pc
  F.starMag = function () {
    const E0 = [235, 172], R0 = 115;
    let s = '';
    s += C(E0[0], E0[1], R0, { c: '#30B0C7', w: 2 });
    s += L(E0[0], E0[1], E0[0] - R0, E0[1], { dash: '5 4', w: 1.3, c: SUB });
    s += T(E0[0] - 60, E0[1] - 12, '10 pc', { s: 12, w: 700 });
    const grad = {};
    const defs = [];
    const starCol = { sun: ['#fff3b0', '#ff9f0a'], arc: ['#ffd2a6', '#ff7a1a'], sir: ['#ffffff', '#b8bfcc'], den: ['#ffffff', '#b8bfcc'], pol: ['#fff8d8', '#f0c75e'] };
    Object.keys(starCol).forEach((k) => {
      const id = uid('sm');
      grad[k] = id;
      defs.push(radial(id, [[0, starCol[k][0]], [1, starCol[k][1]]], { fx: '35%', fy: '35%' }));
    });
    s = `<defs>${defs.join('')}</defs>` + s;
    const at = (deg, d) => [E0[0] + d * Math.cos((deg * Math.PI) / 180), E0[1] + d * Math.sin((deg * Math.PI) / 180)];
    const stars = [
      { k: 'sun', name: '태양', app: '−26.7', abs: '4.8', deg: -90, real: 34, box: [255, 14] },
      { k: 'arc', name: '아크투루스', app: '0.0', abs: '−0.3', deg: -135, real: 152, box: [10, 96] },
      { k: 'sir', name: '시리우스', app: '−1.5', abs: '1.4', deg: 0, real: 62, box: [360, 108] },
      { k: 'den', name: '데네브', app: '1.3', abs: '2.5', deg: 135, real: 152, box: [10, 214] },
      { k: 'pol', name: '북극성', app: '2.0', abs: '−3.6', deg: 45, real: 152, box: [360, 232] }
    ];
    stars.forEach((st) => {
      const p10 = at(st.deg, R0), pr = at(st.deg, st.real);
      const far = st.real > R0 ? pr : p10;
      s += L(E0[0], E0[1], far[0], far[1], { dash: '4 4', w: 1.1, c: SUB, op: 0.8 });
      const dir = Math.atan2(p10[1] - pr[1], p10[0] - pr[0]);
      s += A(pr[0] + 12 * Math.cos(dir), pr[1] + 12 * Math.sin(dir), p10[0] - 12 * Math.cos(dir), p10[1] - 12 * Math.sin(dir), { c: '#FF2D55', w: 2, hs: 8 });
      s += C(pr[0], pr[1], 9, { fill: `url(#${grad[st.k]})` });
      s += C(p10[0], p10[1], 9, { fill: `url(#${grad[st.k]})` });
      const [bx, by] = st.box;
      s += R(bx, by, 100, 50, { fill: PAPER, c: '#5AC8FA', w: 1.2, rx: 6 });
      s += R(bx, by, 100, 17, { fill: '#5AC8FA', rx: 6 }) + R(bx, by + 10, 100, 7, { fill: '#5AC8FA' });
      s += T(bx + 50, by + 9, st.name, { s: 11.5, w: 800, fill: '#00334d' });
      s += T(bx + 6, by + 27, '겉보기 등급', { a: 'start', s: 10.5 }) + T(bx + 94, by + 27, st.app, { a: 'end', s: 11, w: 700 });
      s += T(bx + 6, by + 41, '절대 등급', { a: 'start', s: 10.5 }) + T(bx + 94, by + 41, st.abs, { a: 'end', s: 11, w: 700 });
    });
    s += C(E0[0], E0[1], 7, { fill: '#2f80ed' }) + T(E0[0], E0[1] + 16, '지구', { s: 11, fill: SUB });
    s += A(150, 328, 186, 328, { c: '#FF2D55', w: 2, hs: 7 }) + T(194, 328, '실제 위치 → 10 pc 거리로 옮긴 위치', { a: 'start', s: 11, fill: SUB });
    return svg(470, 340, s, '여러 별의 겉보기 등급과 절대 등급, 10 pc 거리 비교');
  };

  // 풍선 모형
  F.balloons = function () {
    const g = uid('bn');
    let s = `<defs>${radial(g, [[0, '#ffb3c1'], [0.7, '#ff5c7a'], [1, '#e0244a']], { fx: '35%', fy: '30%' })}</defs>`;
    const small = [[-2.25, -11.4], [15.75, -11.4], [-13.5, 22.8]];
    [[95, 100, 48, 1, '조금 불었을 때'], [300, 100, 92, 2, '많이 불었을 때']].forEach(([cx, cy, rad, k, cap]) => {
      s += C(cx, cy, rad, { fill: `url(#${g})` });
      s += poly([cx - 6, cy + rad + 8, cx + 6, cy + rad + 8, cx, cy + rad - 1], '#e0244a');
      s += P(`M${cx} ${cy + rad + 8} q-6 10 0 18`, { w: 1.2, c: SUB });
      const pts = small.map(([x, y]) => [cx + x * k * 1.25, cy + y * k * 1.25]);
      s += P(`M${pts[0][0]} ${pts[0][1]} L${pts[1][0]} ${pts[1][1]} L${pts[2][0]} ${pts[2][1]} Z`, { c: '#fff', w: 1.2, dash: '3 3', op: 0.9 });
      ['①', '②', '③'].forEach((n, i) => {
        s += R(pts[i][0] - 5, pts[i][1] - 5, 10, 10, { fill: '#FFD60A', rx: 2, c: '#9a7d00', w: 0.8 });
        s += T(pts[i][0] + (i === 1 ? 14 : -13), pts[i][1] - 1, n, { s: 12, w: 700, fill: '#fff' });
      });
      s += T(cx, 226, cap, { s: 12, fill: SUB, w: 600 });
    });
    return svg(420, 236, s, '풍선 모형 실험');
  };

  // 전기 주전자·드론·헤드폰
  F.devices = function () {
    let s = '';
    // 주전자
    s += P('M48 110 L54 62 Q70 50 86 62 L92 110 Z', { fill: '#e5e5ea', w: 2 });
    s += P('M86 70 Q108 66 102 96 L92 98', { w: 2 }) + P('M52 66 L36 54', { w: 4 });
    s += R(42, 108, 56, 8, { fill: '#3a3a3c', rx: 3 });
    // 드론
    s += R(194, 74, 32, 18, { fill: '#d1d1d6', rx: 6, c: INK, w: 1.5 });
    [[170, 62], [250, 62], [170, 104], [250, 104]].forEach(([x, y]) => {
      s += L(210, 83, x, y, { w: 3 });
      s += E(x, y - 5, 18, 3.5, { fill: '#8e8e93' });
    });
    // 헤드폰
    s += P('M318 98 C318 52 382 52 382 98', { w: 6 });
    s += R(308, 88, 18, 30, { fill: '#3a3a3c', rx: 8 }) + R(374, 88, 18, 30, { fill: '#3a3a3c', rx: 8 });
    s += T(70, 136, '전기 주전자', { s: 12, w: 600 }) + T(210, 136, '드론', { s: 12, w: 600 }) + T(350, 136, '헤드폰', { s: 12, w: 600 });
    return svg(420, 146, s, '전기 주전자, 드론, 헤드폰');
  };

  // 샤프심 연결 조건
  F.leads = function () {
    let s = '';
    const clip = (x, y) => R(x - 6, y - 7, 12, 14, { fill: '#1c1c1e', rx: 3 });
    const caps = ['① 3 cm 샤프심 1개', '② 6 cm 샤프심 1개', '③ 3 cm 샤프심 2개'];
    [0, 1, 2].forEach((i) => {
      const cx = 80 + i * 160;
      s += R(cx - 74, 6, 148, 110, { fill: PANEL, rx: 12 });
      const half = i === 1 ? 60 : 30;
      s += P(`M${cx - half} 70 C${cx - half - 10} 30 ${cx - 40} 22 ${cx - 50} 16`, { w: 1.8, c: '#FF3B30' });
      s += P(`M${cx + half} 70 C${cx + half + 10} 30 ${cx + 40} 22 ${cx + 50} 16`, { w: 1.8 });
      if (i === 2) {
        s += R(cx - half, 63, half * 2, 4, { fill: '#6b6b70', rx: 2 }) + R(cx - half, 75, half * 2, 4, { fill: '#6b6b70', rx: 2 });
        s += R(cx - half - 3, 60, 6, 22, { fill: '#1c1c1e', rx: 2 }) + R(cx + half - 3, 60, 6, 22, { fill: '#1c1c1e', rx: 2 });
      } else {
        s += R(cx - half, 69, half * 2, 4, { fill: '#6b6b70', rx: 2 });
        s += clip(cx - half, 71) + clip(cx + half, 71);
      }
      s += T(cx, 100, caps[i], { s: 11.5, w: 600 });
    });
    return svg(480, 122, s, '샤프심 연결 조건');
  };

  /* 그림 키 → 함수 (문항 데이터에서 문자열로 참조) */
  F.get = function (key, args) {
    switch (key) {
      case 'electroscope': return F.electroscope(args);
      case 'wire': return F.wire(args);
      case 'spoons': return F.spoons(args);
      case 'water': return F.water(args);
      case 'nichrome': return F.nichrome(args);
      case 'viThree': return F.viThree(args);
      case 'seriesBulbs': return F.seriesBulbs(args);
      case 'house': return F.house(args);
      case 'barMagnet': return F.barMagnet(args);
      case 'solenoid': return F.solenoid(args);
      case 'motor': return F.motor(args);
      case 'devices': return F.devices(args);
      case 'leads': return F.leads(args);
      case 'parallax': return F.parallax(args);
      case 'lightSpread': return F.lightSpread(args);
      case 'magGraph': return F.magGraph(args);
      case 'milkyWay': return F.milkyWay(args);
      case 'expansion': return F.expansion(args);
      case 'starMag': return F.starMag(args);
      case 'balloons': return F.balloons(args);
      case 'stars2':
        return F.astroRow([
          { fig: () => F.astro.star('#8fb8ff', 3), cap: '㉠' },
          { fig: () => F.astro.star('#ff5a36', 9), cap: '㉡' }
        ]);
      case 'astro3':
        return F.astroRow([
          { fig: F.astro.openCluster, cap: '(1)' },
          { fig: F.astro.globular, cap: '(2)' },
          { fig: F.astro.reflection, cap: '(3)' }
        ]);
      case 'nebulae':
        return F.astroRow([
          { fig: F.astro.emission, cap: '오리온 대성운' },
          { fig: F.astro.dark, cap: '말머리 성운' }
        ]);
      case 'galaxyObjects':
        return F.astroRow([
          { fig: F.astro.globular, cap: 'M80' },
          { fig: F.astro.openCluster, cap: '플레이아데스 성단' },
          { fig: F.astro.sun, cap: '태양' }
        ]);
      case 'astroAll':
        return F.astroRow([
          { fig: F.astro.openCluster, cap: '산개 성단' },
          { fig: F.astro.globular, cap: '구상 성단' },
          { fig: F.astro.emission, cap: '방출 성운' },
          { fig: F.astro.reflection, cap: '반사 성운' },
          { fig: F.astro.dark, cap: '암흑 성운' }
        ]);
      default:
        return '';
    }
  };
  F.viMiniFig = F.viMini;
})();
