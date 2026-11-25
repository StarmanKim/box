/* 화면 구성·흐름 (PC 버전과 모바일 버전이 함께 사용)
 * <html data-platform="pc|mobile">에 따라 배치가 달라집니다. */
(function () {
  'use strict';
  const SF = window.SF, FIG = window.SF_FIG;
  const store = SF.store;
  store.load();
  const html = document.documentElement;
  const PLATFORM = html.dataset.platform || 'pc';
  const isPC = PLATFORM === 'pc';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = SF.esc;
  // 보안 샌드박스(미리보기 창, 일부 학교 브라우저)에서는 저장소·주소 변경이 막힐 수 있어 모두 안전하게 감쌉니다.
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* 미지원 */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* 미지원 */ } }
  };
  const hist = {
    push(st, url) { try { history.pushState(st, '', url); } catch (e) { /* 미지원 */ } },
    replace(st, url) { try { history.replaceState(st, '', url); } catch (e) { /* 미지원 */ } }
  };

  const S = {
    route: 'home',
    unit: ['u7', 'u8', 'all'].includes(store.settings.unit) ? store.settings.unit : 'u7',
    teacher: ss.get('sf.teacher') === '1',
    s: null, // 진행 중 세션
    timer: null,
    learnPreset: 0, // 함께 풀기 문항별 카운트다운(ms), 0 = 스톱워치
    mark: null, // 문항별 소요 시간 측정 시작점
    last: null, // 마지막 결과 {rec, s}
    learnSum: null,
    expTab: store.settings.expLevel || 'standard',
    showHint: false,
    wide: true
  };

  /* ───────── 아이콘 ───────── */
  const IC = {
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    next: '<path d="M9 6l6 6-6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/>',
    book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h14"/>',
    pencil: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    pause: '<path d="M9 5v14M15 5v14" style="stroke-width:3"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" style="fill:currentColor;stroke:none"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 7.6-1.8"/>',
    chart: '<path d="M4 20V11M10 20V5M16 20v-7M3 20.5h18"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.3M20 4v7h-7"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    expand: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" style="fill:currentColor"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>'
  };
  const icon = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;

  /* ───────── 그림 캐시 ───────── */
  const figCache = {};
  function fig(key, args) {
    if (!key) return '';
    const k = key + '|' + JSON.stringify(args || null);
    if (!figCache[k]) figCache[k] = FIG.get(key, args);
    return figCache[k];
  }
  function miniFig(kind) {
    const k = 'mini|' + kind;
    if (!figCache[k]) figCache[k] = FIG.viMini(kind);
    return figCache[k];
  }

  /* ───────── 테마·크기·단원 색 ───────── */
  const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const t = store.settings.theme;
    const dark = t === 'dark' || (t === 'auto' && mqDark.matches);
    html.dataset.theme = dark ? 'dark' : 'light';
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#000000' : '#F2F2F7');
  }
  mqDark.addEventListener && mqDark.addEventListener('change', applyTheme);
  function applyScale() {
    html.style.setProperty('--scale', store.settings.scale || 1);
  }
  function applyUnit() {
    const u = S.s ? S.s.unit : S.unit;
    html.dataset.unit = u;
  }

  /* ───────── 소리 (교사 카운트다운 종료) ───────── */
  let actx = null;
  function beep() {
    if (!store.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.22, 0.44].forEach((d) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.frequency.value = 880;
        o.type = 'sine';
        g.gain.setValueAtTime(0.0001, actx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.25, actx.currentTime + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d + 0.18);
        o.connect(g).connect(actx.destination);
        o.start(actx.currentTime + d);
        o.stop(actx.currentTime + d + 0.2);
      });
    } catch (e) { /* 소리 미지원 */ }
  }

  /* ───────── 토스트·시트 ───────── */
  let toastT = null;
  function toast(msg, kind) {
    const el = $('#toast');
    el.innerHTML = `<div class="toast glass ${kind || ''}" role="status">${msg}</div>`;
    clearTimeout(toastT);
    requestAnimationFrame(() => el.firstChild && el.firstChild.classList.add('show'));
    toastT = setTimeout(() => {
      const t = el.firstChild;
      if (t) t.classList.remove('show');
    }, 2400);
  }

  let sheetClose = null;
  function openSheet(inner, o = {}) {
    closeSheet(true);
    const root = $('#overlay');
    root.innerHTML = `<div class="sheet-wrap ${o.cls || ''}"><div class="sheet-backdrop" data-act="sheet-close"></div><div class="sheet glass-strong" role="dialog" aria-modal="true" aria-label="${esc(o.label || '창')}">${isPC ? '' : '<div class="grabber" data-grab></div>'}${inner}</div></div>`;
    const wrap = root.firstChild;
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
    sheetClose = o.onClose || null;
    if (!isPC) enableSheetDrag(wrap);
    const f = wrap.querySelector('[autofocus]') || wrap.querySelector('.sheet button');
    if (f && isPC) setTimeout(() => f.focus(), 60);
    return wrap;
  }
  function closeSheet(instant) {
    const root = $('#overlay');
    const wrap = root.firstChild;
    if (!wrap) return;
    const cb = sheetClose;
    sheetClose = null;
    if (instant) root.innerHTML = '';
    else {
      wrap.classList.remove('open');
      setTimeout(() => { if (root.firstChild === wrap) root.innerHTML = ''; }, 380);
    }
    if (cb) cb();
  }
  function enableSheetDrag(wrap) {
    const sheet = wrap.querySelector('.sheet');
    let y0 = null, dy = 0;
    sheet.addEventListener('touchstart', (e) => {
      if (sheet.scrollTop > 0 && !e.target.closest('[data-grab]')) return;
      y0 = e.touches[0].clientY;
      dy = 0;
    }, { passive: true });
    sheet.addEventListener('touchmove', (e) => {
      if (y0 == null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    sheet.addEventListener('touchend', () => {
      if (y0 == null) return;
      sheet.style.transform = '';
      if (dy > 110) closeSheet();
      y0 = null;
    });
  }
  function confirmSheet(o) {
    return new Promise((res) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; res(v); } };
      openSheet(
        `<div class="sheet-body center"><div class="sheet-icon ${o.danger ? 'danger' : ''}">${icon(o.icon || 'info')}</div><h3>${o.title}</h3>${o.msg ? `<p class="muted">${o.msg}</p>` : ''}<div class="btn-col"><button class="btn ${o.danger ? 'btn-danger' : 'btn-primary'} btn-lg" data-act="cf-ok" autofocus>${o.ok || '확인'}</button>${o.cancel === false ? '' : `<button class="btn btn-glass btn-lg" data-act="cf-no">${o.cancel || '취소'}</button>`}</div></div>`,
        { label: o.title, onClose: () => finish(false) }
      );
      const w = $('#overlay');
      w.querySelector('[data-act="cf-ok"]').addEventListener('click', (e) => { e.stopPropagation(); finish(true); closeSheet(); });
      const no = w.querySelector('[data-act="cf-no"]');
      if (no) no.addEventListener('click', (e) => { e.stopPropagation(); finish(false); closeSheet(); });
    });
  }

  /* ───────── 공통 조각 ───────── */
  const setBadge = (set) => `<span class="badge set-${set}">${SF.SETS[set].label}</span>`;
  const dots = (lv) => `<span class="lvl" title="난이도 ${lv}/3" aria-label="난이도 ${lv}단계">${[1, 2, 3].map((i) => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span>`;
  function unitPicker(cls) {
    const opts = [['u7', 'Ⅶ 전기와 자기'], ['u8', 'Ⅷ 별과 우주'], ['all', '전체']];
    return `<div class="seg ${cls || ''}" role="group" aria-label="단원 선택">${opts.map(([v, l]) => `<button data-act="unit" data-v="${v}" aria-pressed="${S.unit === v}">${l}</button>`).join('')}</div>`;
  }
  function countBy(unit, sets) {
    return SF.select({ unit, sets: sets || SF.SET_ORDER }).length;
  }
  function timerHTML() {
    if (!S.s) return '';
    const t = S.timer;
    const teacher = S.teacher;
    return `<div class="timer-wrap"><div class="timer glass" data-timer role="timer" aria-live="off" title="${S.s.mode === 'exam' ? '시험 시간' : '문항 풀이 시간'}">${icon('timer')}<span data-timer-text>${t ? SF.fmtTime(t.value()) : '00:00'}</span></div>${teacher ? `<button class="icon-btn glass t-toggle" data-act="timer-toggle" aria-label="시간 멈춤/다시 시작">${icon(t && t.running ? 'pause' : 'play')}</button><button class="icon-btn glass" data-act="timer-menu" aria-label="시간 설정">${icon('timer')}</button>` : ''}</div>`;
  }
  function updateTimerUI() {
    const t = S.timer;
    if (!t) return;
    const v = t.value();
    $$('[data-timer-text]').forEach((el) => (el.textContent = SF.fmtTime(v)));
    $$('[data-timer]').forEach((el) => {
      const down = t.mode === 'down';
      el.classList.toggle('paused', !t.running);
      el.classList.toggle('warn', down && v <= 5 * 60000 && v > 60000 && S.s && S.s.mode === 'exam');
      el.classList.toggle('danger', down && (v <= (S.s && S.s.mode === 'exam' ? 60000 : 10000)));
      el.classList.toggle('ended', down && t.ended);
    });
    if (S.lastRun !== t.running) {
      S.lastRun = t.running;
      $$('.t-toggle').forEach((b) => (b.innerHTML = icon(t.running ? 'pause' : 'play')));
    }
    const pc = $('#pause-cover');
    if (pc) pc.hidden = !(S.s && S.s.mode === 'exam' && S.s.paused);
  }

  /* ───────── 문항 렌더링 ───────── */
  function stimulus(q, o = {}) {
    let h = '';
    if (q.box) h += `<div class="q-box">${q.box}</div>`;
    if (q.fig) h += `<div class="q-fig ${q.fig === 'milkyWay' ? 'dark' : ''}">${fig(q.fig, q.figArgs)}</div>`;
    if (q.img) h += `<div class="q-imgs n${q.img.length}">${q.img.map((im) => `<figure class="q-img"><img src="${im.src}" alt="문항 그림${im.cap ? ' ' + im.cap : ''}" loading="lazy" decoding="async">${im.cap ? `<figcaption>${im.cap}</figcaption>` : ''}</figure>`).join('')}</div>`;
    if (q.table) {
      h += `<div class="q-table-wrap"><table class="q-table"><thead><tr>${q.table.head.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${q.table.rows
        .map((r) => `<tr>${r.map((x, i) => (i === 0 ? `<th scope="row">${x}</th>` : `<td>${x}</td>`)).join('')}</tr>`)
        .join('')}</tbody></table></div>`;
    }
    if (q.bogi && q.type !== 'multi' && !o.noBogi) {
      h += `<div class="q-bogi"><span class="bogi-tag">보기</span>${q.bogi.map((b) => `<div class="bogi-line"><b>${b.k}.</b> <span>${b.t}</span></div>`).join('')}</div>`;
    }
    if (q.conds) h += `<div class="q-conds"><span class="bogi-tag">조건</span><ul>${q.conds.map((c) => `<li>${c}</li>`).join('')}</ul></div>`;
    return h;
  }
  function qHead(q, idx, total) {
    const c = SF.concept(q);
    const flag = S.s && S.s.mode === 'exam' ? `<button class="chip-btn ${S.s.flags[q.id] ? 'on' : ''}" data-act="flag" aria-pressed="${!!S.s.flags[q.id]}">${icon('flag')}<span>${S.s.flags[q.id] ? '표시됨' : '나중에 보기'}</span></button>` : '';
    const tp = SF.topic(q);
    const badge = q.src === 'bank' ? `<span class="badge set-bank">추가 ${q.round}회</span>` : setBadge(q.set);
    return `<div class="q-meta">${badge}<span class="q-code">${SF.qTitle(q)}</span><span class="concept-chip">${tp ? tp.name : c ? c.name : ''}</span><span class="lvl-chip lv${q.level}" title="난이도">${SF.levelName(q)}</span><span class="spacer"></span>${flag}</div>
      ${q.lead ? `<p class="q-lead"><span class="lead-tag">공통 자료</span>${q.lead}</p>` : ''}<h2 class="q-stem"><span class="q-num">${idx + 1}</span><span>${q.stem}</span></h2>`;
  }

  function stateOf(id) {
    const s = S.s;
    if (!s.st[id]) s.st[id] = { tries: 0, res: null, prev: [] };
    return s.st[id];
  }
  const isFinal = (st) => !!st.res;

  function answerArea(q) {
    const s = S.s;
    const r = s.resp[q.id] || {};
    const learn = s.mode === 'learn';
    const st = learn ? stateOf(q.id) : {};
    const fin = learn && isFinal(st);
    const show = fin; // 정답 공개 여부
    if (q.type === 'mc') {
      const hasFig = q.options.some((o) => o.fig);
      return `<div class="options ${hasFig ? 'has-fig' : ''} ${SF.isCombo(q) ? 'combo' : ''}" role="radiogroup" aria-label="선택지">${q.options
        .map((o, i) => {
          const text = typeof o === 'string' ? o : o.t;
          const sel = r.c === i;
          let cls = '';
          let mark = '';
          if (show) {
            if (i === q.answer) { cls = 'is-correct'; mark = `<span class="opt-mark ok">${icon('check')}</span>`; }
            else if (sel) { cls = 'is-wrong'; mark = `<span class="opt-mark bad">${icon('close')}</span>`; }
            else cls = 'dim';
          } else if (learn && st.prev && st.prev.some((p) => p.c === i)) {
            cls = 'was-wrong';
            mark = '<span class="opt-note">앞에서 고른 답</span>';
          }
          const body = o.fig ? `<span class="opt-fig">${miniFig(o.figArgs)}</span>` : `<span class="opt-text">${text}</span>`;
          return `<button class="opt ${cls}" role="radio" aria-checked="${sel}" aria-pressed="${sel}" data-act="pick" data-i="${i}" ${fin ? 'disabled' : ''}><span class="num">${SF.circled(i)}</span>${body}${mark}</button>`;
        })
        .join('')}</div>`;
    }
    if (q.type === 'multi') {
      const chosen = r.k || [];
      return `<div class="q-bogi interactive"><span class="bogi-tag">보기</span><p class="bogi-help">옳은 것을 <b>모두</b> 골라 누르세요.</p>${q.bogi
        .map((b) => {
          const on = chosen.includes(b.k);
          let cls = on ? 'on' : '';
          let mark = '';
          if (show) {
            cls += b.ok ? ' truth' : ' false';
            if (on !== b.ok) cls += ' miss';
            mark = `<span class="ox ${b.ok ? 'o' : 'x'}">${b.ok ? '⭕' : '❌'}</span>`;
          }
          return `<button class="bogi-item ${cls}" data-act="toggle" data-k="${b.k}" aria-pressed="${on}" ${fin ? 'disabled' : ''}><span class="cbox">${icon('check')}</span><span class="bk">${b.k}.</span><span class="bt">${b.t}</span>${mark}</button>`;
        })
        .join('')}</div>`;
    }
    if (q.type === 'blanks') {
      const s2 = r.s || [];
      const g = show ? SF.grade(q, r) : null;
      return `<div class="slots">${q.slots
        .map((sl, si) => {
          const okSlot = g ? g.slots[si] : null;
          return `<div class="slot ${okSlot === true ? 'ok' : okSlot === false ? 'bad' : ''}"><div class="slot-label">${sl.label}${okSlot === true ? icon('check', 'ok') : okSlot === false ? icon('close', 'bad') : ''}</div><div class="chips" role="radiogroup" aria-label="${esc(sl.label.replace(/<[^>]+>/g, ''))}">${sl.choices
            .map((c, ci) => {
              const sel = s2[si] === ci;
              let cls = sel ? 'on' : '';
              if (show) {
                if (ci === sl.answer) cls += ' correct';
                else if (sel) cls += ' wrong';
              } else if (learn && st.prev && st.prev.some((p) => p.s && p.s[si] === ci && p.s[si] !== sl.answer)) cls += ' was-wrong';
              return `<button class="chip ${cls}" role="radio" aria-checked="${sel}" aria-pressed="${sel}" data-act="slot" data-si="${si}" data-ci="${ci}" ${fin ? 'disabled' : ''}>${c}</button>`;
            })
            .join('')}</div></div>`;
        })
        .join('')}</div>`;
    }
    if (q.type === 'short') {
      const g = show ? SF.grade(q, r) : null;
      const ro = fin || (s.mode === 'exam' && s.paused);
      const last = learn && st.prev && st.prev.length && !fin ? st.prev[st.prev.length - 1].t : null;
      return `<div class="short ${g ? (g.ok ? 'ok' : 'bad') : ''}"><input class="short-input" data-act="short" type="text" value="${esc(r.t || '')}" placeholder="답을 입력하세요" autocomplete="off" autocapitalize="off" spellcheck="false" ${ro ? 'readonly' : ''} aria-label="단답형 답">${q.short.unit ? `<span class="short-unit">${q.short.unit}</span>` : ''}${g ? (g.ok ? icon('check', 'ok') : icon('close', 'bad')) : ''}</div>${last ? `<p class="muted small prev-ans">앞에서 쓴 답: ${esc(last)}</p>` : ''}`;
    }
    if (q.type === 'essay') {
      const ro = learn ? st.submitted : false;
      return `<div class="essay"><textarea class="essay-input" data-act="essay" rows="${isPC ? 6 : 7}" placeholder="여기에 답안을 써 보세요. 조건과 근거를 함께 쓰면 좋아요." ${ro ? 'readonly' : ''} aria-label="서술형 답안">${esc(r.t || '')}</textarea><div class="essay-foot"><span data-essay-count>${(r.t || '').length}자</span></div></div>`;
    }
    return '';
  }

  /* ───────── 해설·피드백 ───────── */
  function expTabs() {
    const tabs = [['basic', '🌱 기초', '개념이 어려워요'], ['standard', '🌿 표준', '풀이 과정'], ['advanced', '🌳 심화', '더 깊이']];
    return `<div class="seg seg-exp" role="tablist" aria-label="수준별 해설">${tabs.map(([v, l, d]) => `<button role="tab" data-act="exp" data-v="${v}" aria-pressed="${S.expTab === v}" aria-selected="${S.expTab === v}" title="${d}">${l}</button>`).join('')}</div>`;
  }
  function explanation(q, o = {}) {
    let h = '';
    h += `<div class="exp-card card" data-qid="${q.id}"><div class="exp-head"><h3>수준별 해설</h3>${expTabs()}</div><div class="exp-body" data-exp-body>${q.exp[S.expTab]}</div>`;
    if (q.expFig) h += `<div class="q-fig small">${fig(q.expFig, q.expFigArgs)}</div>`;
    h += '</div>';
    if (q.bogi) {
      h += `<div class="card bogi-analysis"><h3>보기 하나씩 따져 보기</h3>${q.bogi
        .map((b) => `<div class="ba-row ${b.ok ? 'o' : 'x'}"><span class="ba-mark">${b.ok ? '⭕' : '❌'}</span><div><b>${b.k}. ${b.t}</b><p>${b.why}</p></div></div>`)
        .join('')}</div>`;
    }
    if (q.type === 'mc' && q.neg) {
      h += `<div class="card bogi-analysis"><h3>선택지 하나씩 따져 보기</h3>${q.options
        .map((op, i) => `<div class="ba-row ${i === q.answer ? 'x' : 'o'}"><span class="ba-mark">${i === q.answer ? '❌' : '⭕'}</span><div><b>${SF.circled(i)} ${op.t}</b><p>${i === q.answer ? '이것이 옳지 않은 설명이에요.' : op.why || ''}</p></div></div>`)
        .join('')}</div>`;
    }
    if (q.fix) h += `<div class="fix-note">${icon('info')}<div><b>원 자료 수정 안내</b><p>${q.fix}</p></div></div>`;
    const c = SF.concept(q);
    h += `<div class="keycard"><div class="kc-label">${icon('sparkle')} 핵심 개념 (정개념)</div><p>${q.key}</p>${c ? `<button class="btn btn-plain btn-sm" data-act="concept-sheet" data-c="${c.id}">‘${c.name}’ 개념 카드 보기 ${icon('next')}</button>` : ''}</div>`;
    return h;
  }
  function fbCards(list) {
    if (!list.length) return '';
    return `<div class="fb-list">${list
      .map((f) => `<div class="fb ${f.kind}"><div class="fb-tag">${f.kind === 'mis' ? '오개념 바로잡기' : f.kind === 'miss' ? '놓친 부분' : f.kind === 'neg' ? '문제를 다시 읽어요' : '도움말'}</div><div class="fb-text">${f.html}</div></div>`)
      .join('')}</div>`;
  }

  function essayPanel(q, r, st, examMode) {
    const chk = SF.essayCheck(q, r.t || '');
    const self = r.self || null;
    const lv = [['상', q.essay.rubric.상], ['중', q.essay.rubric.중], ['하', q.essay.rubric.하]];
    return `<div class="card essay-panel">
      <h3>${icon('target')} 핵심 내용 점검 <span class="muted small">(자동 점검은 참고용이에요)</span></h3>
      <ul class="kw-list">${q.essay.groups.map((g, i) => `<li class="${chk.hits[i] ? 'hit' : ''}"><span class="kw-ic">${chk.hits[i] ? '✓' : '○'}</span>${g.label}</li>`).join('')}</ul>
      <h3>예시 답안</h3><p class="model">${q.essay.model}</p>
      <h3>채점 기준 — 내 답안의 수준을 골라 보세요</h3>
      <div class="rubric">${lv
        .map(([k, d]) => `<button class="rubric-row ${self === k ? 'on' : ''} ${chk.suggest === k && !self ? 'suggest' : ''}" data-act="self" data-v="${k}" aria-pressed="${self === k}" ${!examMode && st && st.res ? 'disabled' : ''}><span class="rk">${k}</span><span class="rd">${d}</span>${chk.suggest === k ? '<span class="sg">추천</span>' : ''}</button>`)
        .join('')}</div>
    </div>`;
  }

  function feedbackArea(q) {
    const s = S.s;
    if (s.mode !== 'learn') return '';
    const st = stateOf(q.id);
    const r = s.resp[q.id] || {};
    let h = '';
    if (S.showHint && !isFinal(st)) h += `<div class="hint-box">${icon('bulb')}<div><b>힌트</b><p>${q.hint}</p></div></div>`;
    if (q.type === 'essay') {
      if (st.submitted) {
        h += essayPanel(q, r, st, false);
        if (st.res) {
          const msg = st.res === 'c1' ? ['ok', '‘상’ 수준이에요! 조건을 모두 갖추었어요.'] : st.res === 'p' ? ['retry', '‘중’ 수준이에요. 빠진 핵심 내용을 채워 보세요.'] : ['bad', '예시 답안과 비교하며 빠진 내용을 정리해 보세요.'];
          h = `<div class="result-banner ${msg[0]}">${msg[1]}</div>` + h + explanation(q);
        }
      }
      return h;
    }
    if (!st.tries && !isFinal(st)) return h;
    if (!isFinal(st)) {
      // 첫 시도 오답 → 오개념 피드백 후 다시 풀기
      const last = st.prev[st.prev.length - 1];
      h = `<div class="result-banner retry" role="status"><b>아쉬워요! 한 번 더 생각해 볼까요?</b><span>아래 피드백으로 오개념을 바로잡고 다시 골라 보세요.</span></div>` + fbCards(SF.feedback(q, last, false)) + h;
      return h;
    }
    const banner = {
      c1: ['ok', '정답이에요! 🎉', '개념을 정확히 이해했어요.'],
      c2: ['ok2', '다시 풀어서 맞혔어요! 👏', '오개념을 스스로 바로잡았어요.'],
      w: ['bad', '아쉬워요. 정답을 확인해 볼까요?', '틀린 문제는 오답 노트에 저장했어요.'],
      rv: ['bad', '정답을 확인해 봐요.', '오답 노트에 저장했어요. 나중에 다시 풀어 보세요.']
    }[st.res];
    h += `<div class="result-banner ${banner[0]}" role="status"><b>${banner[1]}</b><span>${banner[2]}</span><span class="ans-line">정답: ${SF.answerText(q)}</span></div>`;
    if (st.prev.length) {
      const fbs = SF.feedback(q, st.prev[st.prev.length - 1], true);
      if (fbs.length) h += `<details class="fb-details" ${st.res !== 'c2' ? 'open' : ''}><summary>내가 고른 답의 오개념 다시 보기</summary>${fbCards(fbs)}</details>`;
    }
    h += explanation(q);
    return h;
  }

  /* ───────── 액션 버튼 ───────── */
  function actionsHTML() {
    const s = S.s;
    const q = SF.q(s.qids[s.idx]);
    const last = s.idx === s.qids.length - 1;
    const r = s.resp[q.id];
    if (s.mode === 'exam') {
      return `<div class="actions exam">
        <button class="btn btn-glass" data-act="prev" ${s.idx === 0 ? 'disabled' : ''} aria-label="이전 문항">${icon('back')}<span class="hide-xs">이전</span></button>
        ${isPC ? '' : `<button class="btn btn-glass nav-pill" data-act="nav-sheet" aria-label="문항 목록">${icon('grid')}<span>${s.idx + 1}/${s.qids.length}</span></button>`}
        ${last ? `<button class="btn btn-primary grow" data-act="submit-exam">${icon('check')}답안 제출</button>` : `<button class="btn btn-primary grow" data-act="next">다음 ${icon('next')}</button>`}
      </div>`;
    }
    const st = stateOf(q.id);
    const answered = SF.isAnswered(q, r);
    if (isFinal(st)) {
      return `<div class="actions">
        <button class="btn btn-glass" data-act="prev" ${s.idx === 0 ? 'disabled' : ''} aria-label="이전 문항">${icon('back')}</button>
        ${isPC ? '' : `<button class="btn btn-glass nav-pill" data-act="nav-sheet" aria-label="문항 목록">${icon('grid')}<span>${s.idx + 1}/${s.qids.length}</span></button>`}
        ${last ? `<button class="btn btn-primary grow" data-act="learn-finish">${icon('chart')}학습 결과 보기</button>` : `<button class="btn btn-primary grow" data-act="next">다음 문제 ${icon('next')}</button>`}
      </div>`;
    }
    if (q.type === 'essay' && st.submitted) {
      return `<div class="actions"><span class="act-note">${icon('info')} 채점 기준에서 내 답안의 수준을 골라 주세요.</span>${S.teacher ? `<button class="btn btn-glass" data-act="reveal">정답 공개</button>` : ''}</div>`;
    }
    const retry = st.tries > 0;
    return `<div class="actions">
      ${isPC ? '' : `<button class="btn btn-glass nav-pill" data-act="nav-sheet" aria-label="문항 목록">${icon('grid')}<span>${s.idx + 1}/${s.qids.length}</span></button>`}
      <button class="btn btn-glass ${S.showHint ? 'on' : ''}" data-act="hint" aria-pressed="${S.showHint}" aria-label="힌트">${icon('bulb')}<span class="hide-m">힌트</span></button>
      ${retry || S.teacher ? `<button class="btn btn-glass" data-act="reveal">${isPC ? (S.teacher && !retry ? '정답 공개' : '정답 보기') : '정답'}</button>` : ''}
      <button class="btn btn-primary grow" data-act="submit" ${answered ? '' : 'disabled'}>${retry ? '다시 제출' : '제출하기'}</button>
    </div>`;
  }

  /* ───────── 문항 목록(내비게이터) ───────── */
  function navGrid() {
    const s = S.s;
    const groups = {};
    s.qids.forEach((id, i) => {
      const q = SF.q(id);
      const g = (s.unit === 'all' ? SF.unit(q.unit).code + ' ' : '') + SF.SETS[q.set].label;
      (groups[g] = groups[g] || []).push([id, i, q]);
    });
    const ordered = s.qids.map((id) => SF.q(id));
    const shuffled = ordered.some((q, i) => i > 0 && (q.unit < ordered[i - 1].unit || (q.unit === ordered[i - 1].unit && q.order < ordered[i - 1].order)));
    const cell = ([id, i, q]) => {
      let cls = '';
      if (s.mode === 'exam') {
        if (SF.isPartlyAnswered(q, s.resp[id])) cls = 'ans';
        if (s.flags[id]) cls += ' flag';
      } else {
        const st = s.st[id];
        if (st && st.res) cls = st.res;
        else if (st && st.tries) cls = 'try';
      }
      if (i === s.idx) cls += ' cur';
      return `<button class="qn ${cls}" data-act="goto" data-i="${i}" aria-label="${i + 1}번 문항" ${i === s.idx ? 'aria-current="true"' : ''}>${i + 1}</button>`;
    };
    if (shuffled) return `<div class="qnav">${s.qids.map((id, i) => cell([id, i, SF.q(id)])).join('')}</div>`;
    return Object.keys(groups).map((g) => `<div class="qnav-group"><div class="qnav-title">${g}</div><div class="qnav">${groups[g].map(cell).join('')}</div></div>`).join('');
  }
  function navLegend() {
    if (S.s.mode === 'exam') return `<div class="legend"><span><i class="lg ans"></i>답함</span><span><i class="lg"></i>안 함</span><span><i class="lg flag"></i>나중에 보기</span></div>`;
    return `<div class="legend"><span><i class="lg c1"></i>한 번에 정답</span><span><i class="lg c2"></i>다시 풀어 정답</span><span><i class="lg w"></i>오답</span></div>`;
  }
  function examStats() {
    const s = S.s;
    const n = s.qids.length;
    const a = s.qids.filter((id) => SF.isPartlyAnswered(SF.q(id), s.resp[id])).length;
    const f = s.qids.filter((id) => s.flags[id]).length;
    return { n, a, f };
  }

  /* ───────── 상단 바 ───────── */
  function topBar() {
    const s = S.s;
    const inQuiz = S.route === 'quiz' && s;
    if (isPC) {
      let mid = '';
      if (inQuiz) {
        const pct = Math.round(((s.idx + 1) / s.qids.length) * 100);
        mid = `<div class="tb-mid"><div class="tb-mode">${modeLabel(s)}${s.title ? ' · ' + esc(s.title) : ''}</div><div class="progress" aria-label="진행률"><i style="width:${pct}%"></i></div><div class="tb-count">${s.idx + 1} / ${s.qids.length}</div></div>`;
      } else mid = `<div class="tb-mid"></div>`;
      return `<button class="brand" data-act="home" aria-label="처음 화면">
          <span class="brand-ic">${icon('sparkle')}</span><span class="brand-t"><b>기말고사 과학 개념 확인</b><small>${SF.unitLabel(s ? s.unit : S.unit)}</small></span></button>
        ${mid}
        <div class="tb-right">
          ${S.teacher ? `<button class="pill teacher" data-act="teacher" title="교사 모드 끄기">${icon('person')}교사</button>` : `<button class="icon-btn" data-act="teacher" aria-label="교사 모드">${icon('lock')}</button>`}
          <div class="scale-ctl" role="group" aria-label="글자 크기"><button class="icon-btn" data-act="scale" data-v="-1" aria-label="글자 작게"><span>가<sup>−</sup></span></button><button class="icon-btn" data-act="scale" data-v="1" aria-label="글자 크게"><span>가<sup>+</sup></span></button></div>
          <button class="icon-btn" data-act="fullscreen" aria-label="전체 화면">${icon('expand')}</button>
          <button class="icon-btn" data-act="settings" aria-label="설정">${icon('gear')}</button>
          ${inQuiz ? timerHTML() : ''}
        </div>`;
    }
    // 모바일 내비게이션 바
    if (inQuiz) {
      const pct = Math.round(((s.idx + 1) / s.qids.length) * 100);
      return `<div class="nb-row"><button class="icon-btn glass" data-act="exit" aria-label="나가기">${icon('close')}</button>
        <button class="nb-center" data-act="nav-sheet"><b>${modeLabel(s)}</b><small>${s.idx + 1} / ${s.qids.length} ${icon('down')}</small></button>
        ${timerHTML()}</div><div class="progress thin"><i style="width:${pct}%"></i></div>`;
    }
    const titles = { home: '개념 확인', notes: '개념 정리', wrong: '오답 노트', history: '나의 기록', grade: '서술형 채점', result: '시험 결과', learnResult: '학습 결과' };
    const left = ['grade', 'result', 'learnResult'].includes(S.route) ? `<button class="icon-btn glass" data-act="home" aria-label="처음 화면">${icon('home')}</button>` : `<span class="nb-spacer"></span>`;
    return `<div class="nb-row">${left}<div class="nb-title">${titles[S.route] || ''}</div>
      <div class="nb-actions">${S.teacher ? `<button class="pill teacher" data-act="teacher">${icon('person')}교사</button>` : `<button class="icon-btn glass" data-act="teacher" aria-label="교사 모드">${icon('lock')}</button>`}<button class="icon-btn glass" data-act="settings" aria-label="설정">${icon('gear')}</button></div></div>`;
  }

  /* ───────── 화면: 처음 ───────── */
  function modeLabel(s) {
    if (!s) return '';
    if (s.mode === 'exam') return '실전 시험';
    return s.kind === 'lesson' || s.kind === 'guide' ? '함께 풀기' : '연습하기';
  }
  function kindLabel(k) {
    return { wrong: '오답 재시험', note: '오답 노트 시험', random: '무작위 시험', lesson: '수업 세트 시험', guide: '지도서 세트 시험', concept: '개념별 시험' }[k] || '전체 시험';
  }
  const lessonCache = {};
  function lessonsOf(u) {
    if (!lessonCache[u]) lessonCache[u] = SF.lessons(SF.bank[u]);
    return lessonCache[u];
  }
  function guideIds(u) {
    const list = SF.unit(u).questions.slice();
    return (store.settings.guideOrder === 'concept' ? SF.classOrder(list) : list).map((q) => q.id);
  }
  function teacherPanel(u) {
    const units = u === 'all' ? SF.UNITS : [u];
    const order = store.settings.guideOrder || 'book';
    return `<section class="block teacher-panel">
      <h2 class="sec-title">${icon('person')} 교사용 수업 세트 <span class="muted small">정해진 순서대로 풀이</span></h2>
      ${units
        .map((x) => {
          const d = SF.unit(x);
          const g = d.questions;
          const gMin = Math.round(g.reduce((a, q) => a + SF.estMin(q), 0));
          const L = lessonsOf(x);
          const nBank = SF.bank[x].length;
          return `<div class="card tset">
            <div class="tset-head"><span class="tset-tag tg-guide">지도서</span><b>${d.code}. ${d.title} · 지도서 평가 문항</b><span class="muted small">${g.length}문항 · 약 ${gMin}분</span></div>
            <div class="tset-row"><div class="seg seg-sm" role="group" aria-label="지도서 문항 순서"><button data-act="guide-order" data-v="book" aria-pressed="${order === 'book'}">지도서 순서</button><button data-act="guide-order" data-v="concept" aria-pressed="${order === 'concept'}">개념 우선 순서</button></div>
            <span class="spacer"></span><button class="btn btn-primary btn-sm" data-act="teach-guide" data-u="${x}" data-m="learn">${icon('person')}함께 풀기</button><button class="btn btn-glass btn-sm" data-act="teach-guide" data-u="${x}" data-m="exam">${icon('timer')}시험</button></div>
          </div>
          ${nBank ? `<div class="card tset">
            <div class="tset-head"><span class="tset-tag tg-bank">추가</span><b>${d.code}. ${d.title} · 추가 문제 (개념 우선 수업 순서)</b><span class="muted small">총 ${nBank}문항 · ${L.length}차시</span></div>
            <p class="muted small tset-note">세부 주제가 겹치지 않도록 주제마다 한 문항씩 먼저 배치하고, 같은 주제의 문항은 뒤 차시로 보냈어요. 각 차시는 약 ${SF.LESSON_MIN}분 분량이에요.</p>
            <div class="lesson-list">${L.map((l) => `<div class="lesson-row"><span class="ls-no">${l.no}차시</span><span class="ls-info"><b>${l.ids.length}문항</b> · 약 ${l.min}분 · 세부 주제 ${l.nTopics}개</span><span class="ls-btns"><button class="btn btn-primary btn-sm" data-act="lesson" data-u="${x}" data-l="${l.no}" data-m="learn">함께 풀기</button><button class="btn btn-glass btn-sm" data-act="lesson" data-u="${x}" data-l="${l.no}" data-m="exam">시험</button></span></div>`).join('')}</div>
          </div>` : ''}`;
        })
        .join('')}
    </section>`;
  }
  function homeView() {
    const st = store.settings;
    const u = S.unit;
    const wrongN = store.wrongIds(u).length;
    const hist = store.data.history.filter((h) => h.unit === u && h.kind !== 'wrong' && h.kind !== 'note');
    const lastRec = hist[hist.length - 1];
    const sess = store.data.session;
    const conceptN = u === 'all' ? SF.unit('u7').concepts.length + SF.unit('u8').concepts.length : SF.unit(u).concepts.length;
    const srcs = st.srcs && st.srcs.length ? st.srcs : ['guide', 'bank'];
    const base = { unit: u, srcs, level: st.level || 'all', essay: st.essay !== false };
    const pool = SF.pool(base);
    const count = st.count || 0;
    const nPick = count ? Math.min(count, pool.length) : pool.length;
    const lvN = (lv) => SF.pool(Object.assign({}, base, { level: lv })).length;
    const srcChip = (k) => {
      const on = srcs.includes(k);
      const n = SF.pool({ unit: u, srcs: [k], level: base.level, essay: base.essay }).length;
      return `<button class="set-toggle ${on ? 'on' : ''}" data-act="src" data-v="${k}" aria-pressed="${on}"><span class="dot src-${k}"></span>${SF.SRC[k]}<b>${n}</b></button>`;
    };
    const lvls = [['all', '전체'], [1, '기본'], [2, '보통'], [3, '도전']];
    const counts = [10, 20, 30, 0];
    const limits = [0, 10, 20, 30, 45];
    return `
      <section class="hero">
        <p class="eyebrow">2학기 기말고사 대비 · 중학교 과학</p>
        <h1 class="large-title" id="large-title">개념 확인 · 정리</h1>
        <p class="sub">수준을 골라 무작위로 풀고, 틀리면 오개념을 바로잡고, 실전처럼 채점해 실력을 올려요.</p>
      </section>
      ${sess ? `<button class="resume card" data-act="resume"><span class="resume-ic">${icon('refresh')}</span><span class="resume-t"><b>이어서 풀기</b><small>${SF.unitLabel(sess.unit)} · ${modeLabel(sess)}${sess.title ? ' · ' + esc(sess.title) : ''} · ${sess.idx + 1}/${sess.qids.length}번</small></span>${icon('next')}</button>` : ''}
      <section class="block">
        <h2 class="sec-title">단원 선택</h2>
        <div class="unit-cards">
          ${['u7', 'u8', 'all']
            .map((v) => {
              const on = S.unit === v;
              const d = v === 'all' ? null : SF.unit(v);
              return `<button class="unit-card ${on ? 'on' : ''} uc-${v}" data-act="unit" data-v="${v}" aria-pressed="${on}"><span class="uc-ic">${v === 'u7' ? icon('bolt') : v === 'u8' ? icon('sparkle') : icon('book')}</span><span class="uc-code">${d ? d.code : 'Ⅶ + Ⅷ'}</span><span class="uc-title">${d ? d.title : '두 단원 전체'}</span><span class="uc-n">${SF.all(v).length}문항</span>${on ? `<span class="uc-check">${icon('check')}</span>` : ''}</button>`;
            })
            .join('')}
        </div>
      </section>
      ${S.teacher ? teacherPanel(u) : ''}
      <section class="block">
        <h2 class="sec-title">${S.teacher ? '학생용 화면 (무작위 출제)' : '무엇을 할까요?'}</h2>
        <div class="mode-grid">
          <button class="mode-card card" data-act="go-notes"><span class="mc-ic c-teal">${icon('book')}</span><b>개념 정리</b><small>핵심 개념 ${conceptN}개와 오개념 → 정개념 카드</small></button>
          <button class="mode-card card" data-act="start-learn"><span class="mc-ic c-green">${icon('pencil')}</span><b>연습하기</b><small>무작위 한 문제씩 · 틀리면 오개념 피드백 · 수준별 해설</small></button>
          <button class="mode-card card" data-act="start-exam"><span class="mc-ic c-orange">${icon('timer')}</span><b>실전 시험</b><small>무작위 출제 · 시간 측정 · 채점 · 수준 진단 · 재시험</small></button>
          <button class="mode-card card" data-act="go-wrong"><span class="mc-ic c-red">${icon('refresh')}</span><b>오답 노트 ${wrongN ? `<span class="count">${wrongN}</span>` : ''}</b><small>${wrongN ? '틀린 문제만 모아 다시 도전' : '아직 틀린 문제가 없어요'}</small></button>
        </div>
      </section>
      <section class="block">
        <h2 class="sec-title">수준별 문제 구성 <span class="muted">무작위 출제</span></h2>
        <div class="list card">
          <div class="row wrap"><span class="row-label">수준</span><div class="seg seg-sm" role="group" aria-label="수준">${lvls.map(([v, l]) => `<button data-act="level" data-v="${v}" aria-pressed="${String(st.level || 'all') === String(v)}">${l} <small class="segn">${lvN(v)}</small></button>`).join('')}</div></div>
          <div class="row wrap"><span class="row-label">문항 수</span><div class="seg seg-sm" role="group" aria-label="문항 수">${counts.map((c) => `<button data-act="count" data-v="${c}" aria-pressed="${count === c}">${c ? c + '문항' : '전체'}</button>`).join('')}</div></div>
          <div class="row wrap"><span class="row-label">문제 범위</span><div class="set-toggles">${['guide', 'bank'].map(srcChip).join('')}</div></div>
          <div class="row"><span class="row-label">서술형 포함</span><label class="switch"><input type="checkbox" data-act="essay-inc" ${base.essay ? 'checked' : ''}><span></span></label></div>
          <div class="row wrap"><span class="row-label">실전 시험 제한 시간</span><div class="seg seg-sm" role="group" aria-label="제한 시간">${limits.map((m) => `<button data-act="limit" data-v="${m}" aria-pressed="${(st.limit || 0) === m}">${m ? m + '분' : '없음'}</button>`).join('')}</div></div>
          <div class="row pick-sum">${icon('sparkle')}<span>조건에 맞는 <b>${pool.length}문항</b> 중 <b>${nPick}문항</b>을 풀 때마다 무작위 순서로 골라 출제해요.</span></div>
        </div>
      </section>
      ${hist.length ? `<section class="block"><h2 class="sec-title">최근 실전 시험 <button class="link" data-act="go-history">전체 기록 ${icon('next')}</button></h2>${historyChart(hist.slice(-8))}<p class="muted small">마지막 점수 ${lastRec.pct}점 (${lastRec.grade}) · ${SF.fmtDate(lastRec.date)}</p></section>` : ''}
      <p class="foot-note">문항 출처: 교사용 지도서 Ⅶ·Ⅷ 단원 평가 문항, 중간·기말 대비 평가 1~5회(추가 문제). 기록은 이 기기의 브라우저에만 저장됩니다. ${isPC ? `<a href="mobile.html">모바일 버전</a>` : `<a href="pc.html">PC 버전</a>`}</p>`;
  }

  function historyChart(list) {
    if (!list.length) return '';
    const w = 100 / list.length;
    return `<div class="hchart card" role="img" aria-label="최근 시험 점수 그래프">${list
      .map((h) => {
        const lv = SF.levelOf(h.pct);
        return `<div class="hbar" style="width:${w}%"><div class="hbar-v">${Math.round(h.pct)}</div><div class="hbar-track"><i style="height:${Math.max(4, h.pct)}%;background:${lv.color}"></i></div><div class="hbar-l">${h.kind === 'wrong' ? '오답' : h.grade}</div></div>`;
      })
      .join('')}</div>`;
  }

  /* ───────── 화면: 개념 정리 ───────── */
  function notesView() {
    const units = S.unit === 'all' ? SF.UNITS : [S.unit];
    return `<section class="hero compact"><h1 class="large-title" id="large-title">개념 정리</h1><p class="sub">핵심 개념과 자주 하는 오개념을 정개념으로 바로잡아요.</p>${unitPicker('seg-unit')}</section>
      ${units
        .map((u) => {
          const d = SF.unit(u);
          return `<h2 class="sec-title unit-h">${d.code}. ${d.title}</h2><div class="notes-grid">${d.concepts
            .map((c, i) => {
              const n = SF.pool({ unit: u, concept: c.id }).length;
              return `<article class="note card" id="note-${c.id}"><header><span class="note-no">${i + 1}</span><h3>${c.name}</h3></header><ul class="note-points">${c.points.map((p) => `<li>${p}</li>`).join('')}</ul>${c.mis && c.mis.length ? `<div class="misfix"><div class="mf-title">오개념 → 정개념</div>${c.mis.map((m) => `<div class="mf-row"><span class="mf-x">❌ ${m[0]}</span><span class="mf-o">✅ ${m[1]}</span></div>`).join('')}</div>` : ''}<button class="btn btn-tinted btn-sm" data-act="start-concept" data-c="${c.id}" data-u="${u}">${icon('pencil')}관련 문제 ${n}개 풀기</button></article>`;
            })
            .join('')}</div>`;
        })
        .join('')}`;
  }
  function conceptSheet(cid) {
    const c = SF.conceptById(cid);
    if (!c) return;
    openSheet(`<div class="sheet-body"><div class="sheet-head"><h3>${c.name}</h3><button class="icon-btn glass" data-act="sheet-close" aria-label="닫기">${icon('close')}</button></div><ul class="note-points">${c.points.map((p) => `<li>${p}</li>`).join('')}</ul>${c.mis && c.mis.length ? `<div class="misfix"><div class="mf-title">오개념 → 정개념</div>${c.mis.map((m) => `<div class="mf-row"><span class="mf-x">❌ ${m[0]}</span><span class="mf-o">✅ ${m[1]}</span></div>`).join('')}</div>` : ''}</div>`, { label: c.name });
  }

  /* ───────── 화면: 오답 노트 ───────── */
  function wrongView() {
    const ids = store.wrongIds(S.unit);
    const fixed = store.fixedCount(S.unit);
    const rows = ids
      .map((id) => SF.q(id))
      .sort((a, b) => (a.unit + a.order > b.unit + b.order ? 1 : -1))
      .map((q) => `<button class="row wrong-row" data-act="wrong-one" data-id="${q.id}"><span class="badge set-${q.set}">${SF.SETS[q.set].short}</span><span class="wr-t"><b>${SF.qTitle(q)} · ${SF.concept(q).name}</b><small>${q.stem.replace(/<[^>]+>/g, '').slice(0, 60)}…</small></span><span class="wr-n">${store.data.wrong[q.id].n}회</span>${icon('next')}</button>`)
      .join('');
    return `<section class="hero compact"><h1 class="large-title" id="large-title">오답 노트</h1><p class="sub">틀린 문제를 다시 풀어 맞히면 ‘극복’으로 옮겨져요.</p>${unitPicker('seg-unit')}</section>
      <div class="stat-row"><div class="stat card"><b>${ids.length}</b><span>다시 풀 문제</span></div><div class="stat card"><b>${fixed}</b><span>극복한 문제</span></div></div>
      ${ids.length ? `<div class="btn-row"><button class="btn btn-primary" data-act="wrong-learn">${icon('person')}함께 풀기로 복습</button><button class="btn btn-glass" data-act="wrong-exam">${icon('timer')}오답 시험 보기</button></div><div class="list card">${rows}</div>` : `<div class="empty card">${icon('check')}<p>지금 다시 풀어야 할 문제가 없어요.<br>함께 풀기나 실전 시험에서 틀린 문제가 여기에 모여요.</p></div>`}`;
  }

  /* ───────── 화면: 기록 ───────── */
  function historyView() {
    const list = store.data.history.filter((h) => S.unit === 'all' || h.unit === S.unit).slice().reverse();
    return `<section class="hero compact"><h1 class="large-title" id="large-title">나의 기록</h1><p class="sub">실전 시험 점수 변화를 확인해요.</p>${unitPicker('seg-unit')}</section>
      ${list.length ? historyChart(list.slice(0, 10).reverse()) + `<div class="list card">${list
        .map((h) => {
          const lv = SF.levelOf(h.pct);
          return `<div class="row hist-row"><span class="grade-dot" style="background:${lv.color}">${h.grade}</span><span class="wr-t"><b>${h.pct}점 · ${h.n}문항 중 ${Math.round(h.earned * 10) / 10}점</b><small>${SF.unitLabel(h.unit)} · ${kindLabel(h.kind)} · ${SF.fmtDuration(h.timeMs)} · ${SF.fmtDate(h.date)}</small></span></div>`;
        })
        .join('')}</div>` : `<div class="empty card">${icon('chart')}<p>아직 실전 시험 기록이 없어요.</p><button class="btn btn-primary" data-act="start-exam">실전 시험 보기</button></div>`}`;
  }

  /* ───────── 화면: 문제 풀이 ───────── */
  function quizView() {
    const s = S.s;
    const q = SF.q(s.qids[s.idx]);
    const inline = !isPC || !S.wide;
    return `<div class="quiz">
      <article class="qcard card" id="qcard">
        ${qHead(q, s.idx, s.qids.length)}
        ${stimulus(q)}
        <div id="qa">${answerArea(q)}</div>
        ${s.mode === 'exam' ? '<div id="pause-cover" class="pause-cover" hidden><div class="pc-in">' + icon('pause') + '<b>일시정지</b><p>선생님이 시험 시간을 잠시 멈췄어요.</p></div></div>' : ''}
      </article>
      ${isPC ? `<div id="qact">${actionsHTML()}</div>` : ''}
      ${inline ? `<div id="qfb" class="qfb" aria-live="polite">${feedbackArea(q)}</div>` : ''}
    </div>`;
  }
  function refreshQuiz(scrollToFb) {
    const s = S.s;
    const q = SF.q(s.qids[s.idx]);
    const qa = $('#qa');
    if (qa) qa.innerHTML = answerArea(q);
    const qact = $('#qact');
    if (qact) qact.innerHTML = actionsHTML();
    if (!isPC) renderBottom();
    const fb = feedbackArea(q);
    const qfb = $('#qfb');
    if (qfb) qfb.innerHTML = fb;
    if (isPC && S.wide) renderInspector();
    renderSide();
    const tb = $('#topbar');
    if (tb && !isPC) {
      const c = tb.querySelector('.nb-center small');
      if (c) c.innerHTML = `${s.idx + 1} / ${s.qids.length} ${icon('down')}`;
    }
    if (scrollToFb) {
      const target = isPC && S.wide ? null : $('#qfb');
      if (target && target.firstElementChild) setTimeout(() => target.firstElementChild.scrollIntoView({ behavior: smooth(), block: 'start' }), 60);
      if (isPC && S.wide) {
        const ins = $('#insp');
        if (ins) ins.scrollTop = 0;
      }
    }
  }
  const smooth = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  /* ───────── 서술형 자기 채점 (시험 후) ───────── */
  function gradeView() {
    const s = S.s;
    const essays = s.qids.map(SF.q).filter((q) => q.type === 'essay');
    return `<section class="hero compact"><h1 class="large-title" id="large-title">서술형 자기 채점</h1><p class="sub">예시 답안과 채점 기준을 보고 내 답안의 수준을 정직하게 골라 주세요. 추천 수준은 핵심어 자동 점검 결과예요.</p></section>
      ${essays
        .map((q) => {
          const r = s.resp[q.id] || {};
          const empty = !SF.isAnswered(q, r);
          return `<article class="card grade-item" id="g-${q.id}"><div class="q-meta">${setBadge(q.set)}<span class="q-code">${SF.qTitle(q)}</span></div><h3 class="g-stem">${q.stem}</h3><div class="my-ans"><span class="muted small">내 답안</span><p>${empty ? '<i class="muted">작성하지 않았어요 (0점)</i>' : esc(r.t)}</p></div>${empty ? '' : essayPanel(q, r, null, true)}</article>`;
        })
        .join('')}
      <div class="btn-row center"><button class="btn btn-primary btn-lg" data-act="grade-done">${icon('chart')}채점 완료하고 결과 보기</button></div>`;
  }

  /* ───────── 결과 화면 ───────── */
  function ring(pct, color, label) {
    const R = 54, C = 2 * Math.PI * R;
    return `<svg class="ring" viewBox="0 0 140 140" role="img" aria-label="${label}"><circle cx="70" cy="70" r="${R}" class="ring-track"/><circle cx="70" cy="70" r="${R}" class="ring-val" style="stroke:${color};stroke-dasharray:${C};stroke-dashoffset:${C};--off:${C * (1 - pct / 100)}"/></svg>`;
  }
  function conceptBars(per) {
    const rows = Object.keys(per)
      .map((cid) => {
        const c = SF.conceptById(cid);
        const p = Math.round((per[cid].e / per[cid].n) * 100);
        return { cid, name: c ? c.name : cid, p, n: per[cid].n, e: per[cid].e };
      })
      .sort((a, b) => a.p - b.p);
    return `<div class="cbars">${rows
      .map((r) => {
        const col = r.p >= 80 ? 'var(--green)' : r.p >= 60 ? 'var(--orange)' : 'var(--red)';
        return `<button class="cbar" data-act="concept-sheet" data-c="${r.cid}"><span class="cb-name">${r.name}</span><span class="cb-track"><i style="width:${Math.max(3, r.p)}%;background:${col}"></i></span><span class="cb-v">${r.p}%</span>${r.p < 60 ? '<span class="cb-weak">보완</span>' : ''}</button>`;
      })
      .join('')}</div>`;
  }
  function levelSection(lv) {
    if (!lv || !Object.keys(lv).length) return '';
    const adv = SF.levelAdvice(lv);
    const rows = [1, 2, 3]
      .filter((k) => lv[k] && lv[k].n)
      .map((k) => {
        const p = Math.round((lv[k].e / lv[k].n) * 100);
        const col = p >= 80 ? 'var(--green)' : p >= 60 ? 'var(--orange)' : 'var(--red)';
        return `<div class="cbar static"><span class="cb-name"><span class="lvl-chip lv${k}">${SF.LEVELS[k]}</span> ${lv[k].n}문항</span><span class="cb-track"><i style="width:${Math.max(3, p)}%;background:${col}"></i></span><span class="cb-v">${p}%</span></div>`;
      })
      .join('');
    return `<section class="block"><h2 class="sec-title">난이도별 정답률 · 수준 진단</h2><div class="card"><div class="advice"><span class="adv-tag">${adv.tag}</span><p>${adv.msg}</p></div><div class="cbars">${rows}</div></div></section>`;
  }
  function resultView() {
    const { rec, s } = S.last;
    const lv = SF.levelOf(rec.pct);
    const prev = store.data.history.filter((h) => h.unit === rec.unit && h.kind === rec.kind && h.id !== rec.id && JSON.stringify(h.sets) === JSON.stringify(rec.sets) && h.date < rec.date).pop();
    const diff = prev ? Math.round((rec.pct - prev.pct) * 10) / 10 : null;
    const correct = rec.items.filter((i) => i.ok).length;
    const wrongItems = rec.items.filter((i) => i.score < 1);
    const avg = rec.n ? rec.timeMs / rec.n : 0;
    return `<section class="result-hero card">
        <div class="rh-ring">${ring(rec.pct, lv.color, `점수 ${rec.pct}점`)}<div class="rh-center"><b>${rec.pct}</b><span>점</span></div></div>
        <div class="rh-info"><div class="grade-big" style="--gc:${lv.color}"><span>성취수준</span><b>${lv.g}</b></div><p class="rh-msg">${lv.msg}</p>
          ${diff != null ? `<p class="rh-diff ${diff >= 0 ? 'up' : 'down'}">지난 시험(${prev.pct}점)보다 <b>${diff >= 0 ? '+' : ''}${diff}점</b> ${diff > 0 ? '올랐어요! 📈' : diff === 0 ? '— 같아요' : '내려갔어요. 오답을 다시 정리해 봐요.'}</p>` : ''}
          <p class="muted small">성취수준은 90·80·70·60점 구간으로 환산한 참고용이에요.</p></div>
      </section>
      <div class="stat-row">
        <div class="stat card"><b>${correct}<small>/${rec.n}</small></b><span>맞힌 문항</span></div>
        <div class="stat card"><b>${SF.fmtTime(rec.timeMs)}</b><span>걸린 시간${rec.limit ? ` (제한 ${Math.round(rec.limit / 60000)}분)` : ''}</span></div>
        <div class="stat card"><b>${SF.fmtDuration(avg)}</b><span>문항당 평균</span></div>
      </div>
      <div class="btn-row">${wrongItems.length ? `<button class="btn btn-primary" data-act="retest-wrong">${icon('refresh')}${wrongItems.some((i) => !i.answered) ? '틀리거나 안 푼' : '틀린'} ${wrongItems.length}문항 재시험</button>` : ''}<button class="btn ${wrongItems.length ? 'btn-glass' : 'btn-primary'}" data-act="retest-all">${icon('timer')}전체 재시험</button>${wrongItems.length ? `<button class="btn btn-glass" data-act="retest-learn">${icon('person')}틀린 문제 함께 풀기</button>` : ''}</div>
      ${levelSection(rec.lv)}
      <section class="block"><h2 class="sec-title">개념별 이해도 <span class="muted small">눌러서 개념 카드 보기</span></h2><div class="card">${conceptBars(rec.per)}</div></section>
      <section class="block"><h2 class="sec-title">문항별 결과 <span class="muted small">눌러서 해설 보기</span></h2><div class="list card">${rec.items
        .map((it, i) => {
          const q = SF.q(it.id);
          const r = s.resp[it.id];
          const st = it.ok ? 'ok' : it.score > 0 ? 'part' : 'bad';
          return `<button class="row res-row" data-act="review" data-id="${it.id}"><span class="res-ic ${st}">${it.ok ? icon('check') : it.score > 0 ? '½' : icon('close')}</span><span class="wr-t"><b>${i + 1}. ${SF.qTitle(q)} · ${SF.concept(q).name}</b><small>내 답: ${esc(stripTags(SF.responseText(q, r))).slice(0, 48)}${q.type === 'essay' ? '' : ` · 정답: ${stripTags(SF.answerText(q))}`}</small></span><span class="res-time">${SF.fmtDuration(it.ms)}</span>${icon('next')}</button>`;
        })
        .join('')}</div></section>
      <section class="block"><h2 class="sec-title">점수 변화</h2>${historyChart(store.data.history.filter((h) => h.unit === rec.unit).slice(-8))}</section>
      <div class="btn-row center"><button class="btn btn-glass" data-act="home">${icon('home')}처음으로</button></div>`;
  }
  const stripTags = (t) => String(t).replace(/<[^>]+>/g, '');

  function reviewSheet(id) {
    const { s } = S.last;
    const q = SF.q(id);
    const r = s.resp[id] || {};
    const g = SF.grade(q, r);
    // 결과 화면 해설: 고른 답과 정답 표시
    const save = S.s;
    const fake = { mode: 'learn', resp: { [id]: r }, st: { [id]: { tries: 1, res: g.ok ? 'c1' : 'w', prev: g.ok ? [] : [r], submitted: true } }, qids: [id], idx: 0, flags: {} };
    S.s = fake;
    const body = `${qHead(q, s.qids.indexOf(id), s.qids.length)}${stimulus(q)}${answerArea(q)}`;
    let fb = '';
    if (q.type === 'essay') fb = `<div class="card"><h3>내 답안</h3><p>${esc(r.t || '(작성하지 않음)')}</p><p class="muted">자기 채점: ${r.self || '-'}</p></div><div class="card"><h3>예시 답안</h3><p class="model">${q.essay.model}</p></div>` + explanation(q);
    else {
      const fbs = SF.feedback(q, r, true);
      fb = `<div class="result-banner ${g.ok ? 'ok' : 'bad'}"><b>${g.ok ? '정답' : SF.isPartlyAnswered(q, r) ? '오답' : '무응답'}</b><span class="ans-line">정답: ${SF.answerText(q)}</span></div>${fbCards(fbs)}${explanation(q)}`;
    }
    S.s = save;
    openSheet(`<div class="sheet-body review"><div class="sheet-head"><h3>문항 해설</h3><button class="icon-btn glass" data-act="sheet-close" aria-label="닫기">${icon('close')}</button></div><div class="qcard plain">${body}</div><div class="qfb">${fb}</div></div>`, { cls: 'wide', label: '문항 해설' });
  }

  function learnResultView() {
    const sum = S.learnSum;
    const s = S.s || S.lastLearn;
    const wrongIds = s.qids.filter((id) => s.st[id] && ['w', 'rv', 'c2', 'p'].includes(s.st[id].res));
    return `<section class="result-hero card">
        <div class="rh-ring">${ring(sum.pct, 'var(--tint)', `한 번에 맞힌 비율 ${sum.pct}%`)}<div class="rh-center"><b>${sum.pct}</b><span>%</span></div></div>
        <div class="rh-info"><h2>함께 풀기 완료!</h2><p class="rh-msg">한 번에 맞힌 비율이에요. 다시 풀어 맞힌 문제는 오개념을 바로잡은 소중한 문제예요.</p></div>
      </section>
      <div class="stat-row"><div class="stat card"><b class="c-green">${sum.first}</b><span>한 번에 정답</span></div><div class="stat card"><b class="c-orange">${sum.second}</b><span>다시 풀어 정답</span></div><div class="stat card"><b class="c-red">${sum.wrong}</b><span>오답·정답 확인</span></div></div>
      <div class="btn-row">${wrongIds.length ? `<button class="btn btn-primary" data-act="learn-again" >${icon('refresh')}헷갈린 ${wrongIds.length}문항 다시 풀기</button>` : ''}<button class="btn ${wrongIds.length ? 'btn-glass' : 'btn-primary'}" data-act="start-exam">${icon('timer')}실전 시험 도전</button><button class="btn btn-glass" data-act="home">${icon('home')}처음으로</button></div>
      ${levelSection(sum.lv)}
      <section class="block"><h2 class="sec-title">개념별 이해도</h2><div class="card">${conceptBars(sum.per)}</div></section>`;
  }

  /* ───────── PC 사이드바·인스펙터 ───────── */
  function renderSide() {
    if (!isPC) return;
    const el = $('#side');
    if (!el) return;
    if (S.route === 'quiz' && S.s) {
      const s = S.s;
      let extra = '';
      if (s.mode === 'exam') {
        const st = examStats();
        extra = `<div class="side-stats"><div><b>${st.a}</b><span>답함</span></div><div><b>${st.n - st.a}</b><span>안 함</span></div><div><b>${st.f}</b><span>나중에</span></div></div><button class="btn btn-primary w100" data-act="submit-exam">${icon('check')}답안 제출</button>`;
      } else {
        const sum = SF.summarizeLearn(s);
        extra = `<div class="side-stats"><div><b class="c-green">${sum.first}</b><span>한 번에</span></div><div><b class="c-orange">${sum.second}</b><span>다시 풀어</span></div><div><b class="c-red">${sum.wrong}</b><span>오답</span></div></div><button class="btn btn-tinted w100" data-act="learn-finish">${icon('chart')}학습 마치고 결과 보기</button>`;
      }
      el.innerHTML = `<div class="side-head"><button class="btn btn-glass btn-sm" data-act="exit">${icon('back')}나가기</button><span class="side-mode">${modeLabel(s)}</span></div><div class="side-title">${SF.unitLabel(s.unit)}</div>${navGrid()}${navLegend()}${extra}<div class="kbd-help"><b>단축키</b><span><kbd>1</kbd>~<kbd>6</kbd> 선택</span><span><kbd>Enter</kbd> ${s.mode === 'exam' ? '다음' : '제출/다음'}</span><span><kbd>←</kbd><kbd>→</kbd> 이동</span>${s.mode === 'learn' ? '<span><kbd>H</kbd> 힌트</span>' : ''}${S.teacher ? '<span><kbd>Space</kbd> 시간 멈춤</span>' : ''}</div>`;
      return;
    }
    const nav = [['home', 'home', '처음 화면'], ['notes', 'book', '개념 정리'], ['wrong', 'refresh', '오답 노트'], ['history', 'chart', '나의 기록']];
    const wrongN = store.wrongIds(S.unit).length;
    el.innerHTML = `<nav class="side-nav" aria-label="메뉴">${nav
      .map(([r, ic, l]) => `<button class="side-link ${S.route === r ? 'on' : ''}" data-act="route" data-v="${r}" ${S.route === r ? 'aria-current="page"' : ''}>${icon(ic)}<span>${l}</span>${r === 'wrong' && wrongN ? `<b class="count">${wrongN}</b>` : ''}</button>`)
      .join('')}</nav>
      <div class="side-sep"></div>
      <div class="side-title small">빠른 시작 · ${SF.unitLabel(S.unit)}</div>
      <button class="side-link" data-act="start-learn">${icon('person')}<span>함께 풀기</span></button>
      <button class="side-link" data-act="start-exam">${icon('timer')}<span>실전 시험</span></button>
      <div class="side-sep"></div>
      <div class="side-tip card">${icon('info')}<p>${S.teacher ? '교사 모드: 문제 풀이 중 오른쪽 위에서 <b>시간을 멈추거나</b> 카운트다운을 정할 수 있어요.' : '수업 시간에는 <b>함께 풀기</b>로 한 문제씩 풀고, 집에서는 <b>실전 시험</b>으로 실력을 확인해 보세요.'}</p></div>`;
  }
  function renderInspector() {
    if (!isPC) return;
    const el = $('#insp');
    if (!el) return;
    const onQuiz = S.route === 'quiz' && S.s && S.wide;
    document.body.classList.toggle('has-insp', !!onQuiz);
    if (!onQuiz) {
      el.innerHTML = '';
      return;
    }
    const s = S.s;
    const q = SF.q(s.qids[s.idx]);
    if (s.mode === 'exam') {
      const st = examStats();
      const flagged = s.qids.map((id, i) => (s.flags[id] ? i : -1)).filter((i) => i >= 0);
      el.innerHTML = `<div class="card insp-card"><h3>${icon('info')} 시험 안내</h3><ul class="plain"><li>답을 고르면 자동으로 저장돼요.</li><li>마지막 문항에서 또는 왼쪽 <b>답안 제출</b>로 채점해요.</li><li>서술형은 제출 후 채점 기준을 보고 스스로 채점해요.</li>${s.limit ? `<li>제한 시간 ${Math.round(s.limit / 60000)}분이 지나면 자동 제출돼요.</li>` : ''}</ul></div><div class="card insp-card"><h3>진행 상황</h3><div class="progress"><i style="width:${Math.round((st.a / st.n) * 100)}%"></i></div><p class="muted small">${st.n}문항 중 ${st.a}문항 답함</p>${flagged.length ? `<p class="small">나중에 볼 문항: ${flagged.map((i) => `<button class="link" data-act="goto" data-i="${i}">${i + 1}번</button>`).join(' ')}</p>` : ''}</div>`;
      return;
    }
    const st = stateOf(q.id);
    const c = SF.concept(q);
    const solving = !isFinal(st) && !st.tries && !(q.type === 'essay' && st.submitted);
    if (!solving) {
      el.innerHTML = feedbackArea(q);
      return;
    }
    el.innerHTML = `<div class="card insp-card"><h3>${icon('bulb')} 풀이 도우미</h3>${S.showHint ? `<div class="hint-box">${icon('bulb')}<div><b>힌트</b><p>${q.hint}</p></div></div>` : '<p class="muted">먼저 스스로 풀어 보고, 막히면 힌트를 열어 보세요.</p>'}<button class="btn btn-tinted w100" data-act="hint">${icon('bulb')}힌트 ${S.showHint ? '닫기' : '보기'}</button></div><div class="card insp-card"><h3>${icon('book')} 이 문항의 개념</h3><p><b>${c.name}</b></p><button class="btn btn-plain btn-sm" data-act="concept-sheet" data-c="${c.id}">개념 카드 미리 보기 ${icon('next')}</button></div>`;
  }

  /* ───────── 모바일 하단 ───────── */
  function renderBottom() {
    if (isPC) return;
    const el = $('#bottom');
    if (S.route === 'quiz' && S.s) {
      el.className = 'actionbar glass';
      el.innerHTML = actionsHTML();
      return;
    }
    if (['grade', 'result', 'learnResult'].includes(S.route)) {
      el.className = '';
      el.innerHTML = '';
      return;
    }
    const tabs = [['home', 'home', '홈'], ['notes', 'book', '개념 정리'], ['wrong', 'refresh', '오답 노트'], ['history', 'chart', '기록']];
    const wrongN = store.wrongIds(S.unit).length;
    el.className = 'tabbar glass';
    el.innerHTML = tabs
      .map(([r, ic, l]) => `<button class="tab ${S.route === r ? 'on' : ''}" data-act="route" data-v="${r}" ${S.route === r ? 'aria-current="page"' : ''}>${icon(ic)}<span>${l}</span>${r === 'wrong' && wrongN ? `<b class="tab-badge">${wrongN}</b>` : ''}</button>`)
      .join('');
  }

  /* ───────── 전체 렌더 ───────── */
  function render() {
    applyUnit();
    document.body.dataset.route = S.route;
    $('#topbar').innerHTML = topBar();
    S.lastRun = null;
    const main = $('#main');
    let h = '';
    switch (S.route) {
      case 'home': h = homeView(); break;
      case 'notes': h = notesView(); break;
      case 'wrong': h = wrongView(); break;
      case 'history': h = historyView(); break;
      case 'quiz': h = quizView(); break;
      case 'grade': h = gradeView(); break;
      case 'result': h = resultView(); break;
      case 'learnResult': h = learnResultView(); break;
    }
    main.innerHTML = h;
    renderSide();
    renderInspector();
    renderBottom();
    updateTimerUI();
    if (S.route === 'result' || S.route === 'learnResult') {
      requestAnimationFrame(() => requestAnimationFrame(() => $$('.ring-val').forEach((c) => (c.style.strokeDashoffset = c.style.getPropertyValue('--off')))));
    }
    observeTitle();
  }
  let io = null;
  function observeTitle() {
    if (isPC) return;
    const t = $('#large-title');
    const nb = $('#topbar');
    if (io) io.disconnect();
    if (!t) {
      nb.classList.add('solid');
      return;
    }
    nb.classList.remove('solid');
    io = new IntersectionObserver((en) => en.forEach((e) => nb.classList.toggle('show-title', !e.isIntersecting)), { rootMargin: '-56px 0px 0px 0px' });
    io.observe(t);
  }

  function go(route, push) {
    S.route = route;
    S.showHint = false;
    if (push !== false) hist.push({ route }, '#' + route);
    render();
    window.scrollTo({ top: 0 });
    const m = $('#main');
    if (m) m.focus({ preventScroll: true });
  }
  window.addEventListener('popstate', (e) => {
    const r = (e.state && e.state.route) || 'home';
    if (S.route === 'quiz' && r !== 'quiz') {
      leaveQuiz(false);
    }
    if (r === 'quiz' && !S.s) return go('home', false);
    if ((r === 'result' && !S.last) || (r === 'learnResult' && !S.learnSum) || (r === 'grade' && !S.s)) return go('home', false);
    S.route = r;
    render();
  });

  /* ───────── 세션 시작·진행 ───────── */
  function startSession(o) {
    const st = store.settings;
    const sets = o.sets || (st.sets && st.sets.length ? st.sets : SF.SET_ORDER);
    const s = SF.newSession(Object.assign({ unit: S.unit, sets, shuffle: false }, o, { sets }));
    if (!s.qids.length) {
      toast('선택한 조건에 맞는 문항이 없어요. 문항 유형을 확인해 주세요.', 'warn');
      return;
    }
    S.s = s;
    S.learnSum = null;
    startTimer();
    markStart();
    saveSession();
    go('quiz');
  }
  /* 학생용: 수준·범위에 맞는 문항을 무작위로 골라 출제 */
  function studentStart(mode, extra) {
    const st = store.settings;
    const o = Object.assign({ unit: S.unit, srcs: st.srcs && st.srcs.length ? st.srcs : ['guide', 'bank'], level: st.level || 'all', essay: st.essay !== false }, extra || {});
    const pool = SF.pool(o);
    if (!pool.length) {
      toast('조건에 맞는 문항이 없어요. 수준이나 문제 범위를 바꿔 주세요.', 'warn');
      return;
    }
    const n = st.count ? Math.min(st.count, pool.length) : pool.length;
    const ids = SF.shuffle(pool).slice(0, n).map((q) => q.id);
    const lvName = o.level === 'all' ? '전체 수준' : SF.LEVELS[o.level] + ' 수준';
    startSession({ mode, unit: S.unit, ids, kind: o.concept ? 'concept' : 'random', title: (o.title || lvName) + ` ${ids.length}문항`, limit: mode === 'exam' ? (st.limit || 0) * 60000 : 0 });
  }
  function startTimer() {
    if (S.timer) S.timer.destroy();
    const s = S.s;
    if (s.mode === 'exam') {
      S.timer = new SF.Timer({ mode: s.limit ? 'down' : 'up', limit: s.limit, acc: s.timerAcc || 0, onTick: updateTimerUI, onEnd: onExamTimeUp });
      if (!s.paused) S.timer.start();
    } else {
      S.timer = new SF.Timer({ mode: S.learnPreset ? 'down' : 'up', limit: S.learnPreset, onTick: updateTimerUI, onEnd: onLearnTimeUp });
      S.timer.start();
    }
  }
  function onExamTimeUp() {
    toast('시험 시간이 끝났어요. 답안을 제출합니다.', 'warn');
    setTimeout(() => submitExam(true), 600);
  }
  function onLearnTimeUp() {
    beep();
    toast('⏰ 풀이 시간이 끝났어요!', 'warn');
  }
  function markStart() {
    const s = S.s;
    if (!s || !S.timer) return;
    S.mark = { id: s.qids[s.idx], t: S.timer.elapsed() };
  }
  function markEnd() {
    const s = S.s;
    if (!s || !S.mark || !S.timer) return;
    const d = S.timer.elapsed() - S.mark.t;
    if (s.mode === 'exam' && d > 0) s.spent[S.mark.id] = (s.spent[S.mark.id] || 0) + d;
    S.mark = null;
  }
  let saveT = null;
  function saveSession() {
    const s = S.s;
    if (!s) return;
    if (s.mode === 'exam' && S.timer) s.timerAcc = S.timer.elapsed();
    store.saveSession(s);
  }
  function saveSoon() {
    clearTimeout(saveT);
    saveT = setTimeout(saveSession, 400);
  }
  setInterval(() => { if (S.s && S.route === 'quiz') saveSession(); }, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveSession(); });
  window.addEventListener('pagehide', saveSession);

  function gotoQ(i) {
    const s = S.s;
    if (i < 0 || i >= s.qids.length || i === s.idx) return;
    markEnd();
    s.idx = i;
    S.showHint = false;
    if (s.mode === 'learn') {
      S.timer.set(S.learnPreset ? 'down' : 'up', S.learnPreset);
      S.timer.reset(0);
      if (!S.timer.running && !S.teacherPaused) S.timer.start();
    }
    markStart();
    saveSoon();
    render();
    window.scrollTo({ top: 0, behavior: smooth() });
  }

  function leaveQuiz(toHome) {
    markEnd();
    saveSession();
    if (S.timer) S.timer.destroy();
    S.timer = null;
    S.s = null;
    if (toHome) go('home');
  }
  async function exitQuiz() {
    const s = S.s;
    if (s.mode === 'exam') {
      const ok = await confirmSheet({ title: '시험을 잠시 멈추고 나갈까요?', msg: '지금까지 고른 답과 남은 시간은 저장돼요. 처음 화면의 ‘이어서 풀기’로 돌아올 수 있어요.', ok: '나가기', cancel: '계속 풀기', icon: 'timer' });
      if (!ok) return;
    }
    leaveQuiz(true);
  }

  /* ───────── 응답 처리 ───────── */
  function curQ() { return SF.q(S.s.qids[S.s.idx]); }
  function resp(q) { return (S.s.resp[q.id] = S.s.resp[q.id] || {}); }
  function locked(q) {
    if (S.s.mode === 'exam') return !!S.s.paused;
    const st = stateOf(q.id);
    return isFinal(st) || (q.type === 'essay' && st.submitted);
  }
  function pick(i) {
    const q = curQ();
    if (q.type !== 'mc' || locked(q)) return;
    resp(q).c = i;
    saveSoon();
    refreshQuiz();
  }
  function toggleKey(k) {
    const q = curQ();
    if (q.type !== 'multi' || locked(q)) return;
    const r = resp(q);
    r.k = r.k || [];
    r.k = r.k.includes(k) ? r.k.filter((x) => x !== k) : r.k.concat(k).sort();
    saveSoon();
    refreshQuiz();
  }
  function pickSlot(si, ci) {
    const q = curQ();
    if (q.type !== 'blanks' || locked(q)) return;
    const r = resp(q);
    r.s = r.s || q.slots.map(() => null);
    r.s[si] = ci;
    saveSoon();
    refreshQuiz();
  }

  function submitLearn() {
    const s = S.s;
    const q = curQ();
    const st = stateOf(q.id);
    const r = s.resp[q.id];
    if (!SF.isAnswered(q, r) || isFinal(st)) return;
    if (q.type === 'essay') {
      st.submitted = true;
      saveSoon();
      refreshQuiz(true);
      return;
    }
    st.tries += 1;
    const g = SF.grade(q, r);
    if (g.ok) {
      st.res = st.tries === 1 ? 'c1' : 'c2';
      if (st.res === 'c1') store.markRight(q.id);
      haptic(10);
    } else {
      st.prev.push(JSON.parse(JSON.stringify(r)));
      store.markWrong(q.id);
      if (st.tries >= 2) {
        st.res = 'w';
      } else {
        s.resp[q.id] = q.type === 'blanks' ? { s: r.s.map((x, i) => (x === q.slots[i].answer ? x : null)) } : {};
      }
      haptic([20, 40, 20]);
      shake();
    }
    store.save();
    saveSoon();
    refreshQuiz(true);
  }
  function reveal() {
    const s = S.s;
    const q = curQ();
    const st = stateOf(q.id);
    if (isFinal(st)) return;
    const r = s.resp[q.id];
    if (q.type !== 'essay' && SF.isAnswered(q, r) && st.tries === 0 && !S.teacher) return;
    if (st.prev.length === 0 && SF.isAnswered(q, r) && q.type !== 'essay') st.prev.push(JSON.parse(JSON.stringify(r)));
    if (q.type === 'essay') st.submitted = true;
    st.res = 'rv';
    if (!S.teacher || st.tries) store.markWrong(q.id);
    store.save();
    saveSoon();
    refreshQuiz(true);
  }
  function selfGrade(v) {
    const s = S.s;
    const q = curQ();
    if (s.mode === 'learn') {
      const st = stateOf(q.id);
      if (st.res) return;
      resp(q).self = v;
      st.res = v === '상' ? 'c1' : v === '중' ? 'p' : 'w';
      if (v === '상') store.markRight(q.id);
      else store.markWrong(q.id);
      store.save();
      saveSoon();
      refreshQuiz(true);
    }
  }
  function haptic(p) {
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* 미지원 */ }
  }
  function shake() {
    const el = $('#qa');
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  /* ───────── 시험 제출·결과 ───────── */
  async function submitExam(force) {
    const s = S.s;
    if (!s || s.mode !== 'exam') return;
    if (!force) {
      const st = examStats();
      const ok = await confirmSheet({
        title: '답안을 제출할까요?',
        msg: st.n - st.a ? `아직 답하지 않은 문항이 <b>${st.n - st.a}개</b> 있어요. 제출하면 수정할 수 없어요.` : '모든 문항에 답했어요. 제출하면 채점 결과를 볼 수 있어요.',
        ok: '제출하기',
        cancel: '다시 검토하기',
        icon: 'check'
      });
      if (!ok) return;
    }
    markEnd();
    S.timer.pause();
    s.timerAcc = S.timer.elapsed();
    s.submitted = true;
    saveSession();
    const essays = s.qids.map(SF.q).filter((q) => q.type === 'essay' && SF.isAnswered(q, s.resp[q.id]));
    essays.forEach((q) => {
      const r = s.resp[q.id];
      if (!r.self) r.self = SF.essayCheck(q, r.t).suggest;
    });
    if (essays.length) go('grade');
    else finalizeExam();
  }
  function finalizeExam() {
    const s = S.s;
    const rec = SF.finishExam(s, s.timerAcc);
    // 답하지 않은 문항은 오답 노트에 넣지 않음(결과 화면의 재시험에는 포함)
    rec.items.forEach((it) => (it.ok ? store.markRight(it.id) : it.answered ? store.markWrong(it.id) : null));
    store.addHistory(rec);
    store.clearSession();
    if (S.timer) S.timer.destroy();
    S.timer = null;
    S.last = { rec, s };
    S.s = null;
    go('result');
  }
  function finishLearn() {
    const s = S.s;
    S.learnSum = SF.summarizeLearn(s);
    S.lastLearn = s;
    markEnd();
    store.clearSession();
    if (S.timer) S.timer.destroy();
    S.timer = null;
    S.s = null;
    go('learnResult');
  }

  /* ───────── 교사 모드 ───────── */
  function teacherSheet() {
    if (S.teacher) {
      confirmSheet({ title: '교사 모드를 끌까요?', msg: '시간 멈춤, 정답 공개, 카운트다운 기능이 숨겨져요.', ok: '끄기', icon: 'person' }).then((ok) => {
        if (!ok) return;
        S.teacher = false;
        ss.del('sf.teacher');
        if (S.timer && !S.timer.running && S.route === 'quiz') S.timer.start();
        if (S.s) S.s.paused = false;
        S.teacherPaused = false;
        render();
        toast('교사 모드를 껐어요.');
      });
      return;
    }
    let code = '';
    const draw = () => {
      const d = $('#pin-dots');
      if (d) d.innerHTML = [0, 1, 2, 3].map((i) => `<i class="${i < code.length ? 'on' : ''}"></i>`).join('');
    };
    openSheet(`<div class="sheet-body center pin"><div class="sheet-icon">${icon('lock')}</div><h3>교사 모드</h3><p class="muted">교사용 암호 4자리를 입력하세요.</p><div id="pin-dots" class="pin-dots" aria-live="polite"></div><div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫']
      .map((k) => (k === '' ? '<span></span>' : `<button class="key ${k === '⌫' ? 'del' : ''}" data-key="${k}" aria-label="${k === '⌫' ? '지우기' : k}">${k}</button>`))
      .join('')}</div></div>`, { label: '교사 모드' });
    draw();
    const pad = $('#overlay .keypad');
    const press = (k) => {
      if (k === '⌫') code = code.slice(0, -1);
      else if (code.length < 4) code += k;
      draw();
      if (code.length === 4) {
        if (code === String(store.settings.pin || SF.TEACHER_PIN_DEFAULT)) {
          S.teacher = true;
          ss.set('sf.teacher', '1');
          closeSheet();
          render();
          toast('교사 모드가 켜졌어요. 시간 멈춤·정답 공개를 쓸 수 있어요.');
        } else {
          const d = $('#pin-dots');
          d.classList.add('shake');
          setTimeout(() => { code = ''; draw(); d.classList.remove('shake'); }, 450);
        }
      }
    };
    pad.addEventListener('click', (e) => {
      const b = e.target.closest('[data-key]');
      if (b) press(b.dataset.key);
    });
    const onKey = (e) => {
      if (!$('#overlay .keypad')) return document.removeEventListener('keydown', onKey);
      if (/^[0-9]$/.test(e.key)) press(e.key);
      if (e.key === 'Backspace') press('⌫');
    };
    document.addEventListener('keydown', onKey);
  }
  function timerToggle() {
    if (!S.teacher || !S.timer) return;
    const s = S.s;
    if (S.timer.running) {
      S.timer.pause();
      S.teacherPaused = true;
      if (s.mode === 'exam') s.paused = true;
      toast('⏸ 시간을 멈췄어요.');
    } else {
      if (S.timer.ended && s.mode === 'learn') S.timer.reset(0);
      S.timer.start();
      S.teacherPaused = false;
      if (s.mode === 'exam') s.paused = false;
      toast('▶ 시간이 다시 흘러요.');
    }
    saveSession();
    updateTimerUI();
  }
  function timerMenu() {
    const s = S.s;
    if (!S.teacher || !s) return;
    if (s.mode === 'exam') {
      openSheet(`<div class="sheet-body"><div class="sheet-head"><h3>시험 시간 (교사용)</h3><button class="icon-btn glass" data-act="sheet-close" aria-label="닫기">${icon('close')}</button></div>
        <div class="list card">
          <button class="row" data-act="tm" data-v="toggle">${icon(S.timer.running ? 'pause' : 'play')}<span>${S.timer.running ? '시간 멈추기' : '다시 시작'}</span></button>
          ${s.limit ? `<button class="row" data-act="tm" data-v="+5">${icon('plus')}<span>남은 시간 5분 늘리기</span></button><button class="row" data-act="tm" data-v="-5">${icon('minus')}<span>남은 시간 5분 줄이기</span></button>` : '<div class="row muted small">제한 시간 없이 경과 시간을 재고 있어요.</div>'}
        </div></div>`, { label: '시험 시간' });
      return;
    }
    const presets = [[0, '스톱워치 (경과 시간)'], [30000, '30초'], [60000, '1분'], [120000, '2분'], [180000, '3분'], [300000, '5분']];
    openSheet(`<div class="sheet-body"><div class="sheet-head"><h3>문항별 풀이 시간 (교사용)</h3><button class="icon-btn glass" data-act="sheet-close" aria-label="닫기">${icon('close')}</button></div>
      <p class="muted small">카운트다운을 고르면 문항마다 새로 시작하고, 시간이 끝나면 알림음이 울려요.</p>
      <div class="list card">${presets.map(([v, l]) => `<button class="row" data-act="tm" data-v="p${v}">${S.learnPreset === v ? icon('check') : '<span class="ic"></span>'}<span>${l}</span></button>`).join('')}</div>
      <div class="btn-row"><button class="btn btn-glass" data-act="tm" data-v="toggle">${icon(S.timer.running ? 'pause' : 'play')}${S.timer.running ? '멈추기' : '다시 시작'}</button><button class="btn btn-glass" data-act="tm" data-v="reset">${icon('refresh')}처음부터</button></div></div>`, { label: '풀이 시간' });
  }
  function timerMenuAct(v) {
    const s = S.s;
    if (!s) return;
    if (v === 'toggle') timerToggle();
    else if (v === '+5') { S.timer.add(5 * 60000); s.limit = S.timer.limit; toast('남은 시간을 5분 늘렸어요.'); }
    else if (v === '-5') { S.timer.add(-5 * 60000); s.limit = S.timer.limit; toast('남은 시간을 5분 줄였어요.'); }
    else if (v === 'reset') { S.timer.reset(0); if (!S.timer.running) S.timer.start(); }
    else if (v[0] === 'p') {
      S.learnPreset = +v.slice(1);
      S.timer.set(S.learnPreset ? 'down' : 'up', S.learnPreset);
      S.timer.reset(0);
      S.timer.start();
      toast(S.learnPreset ? `문항마다 ${SF.fmtDuration(S.learnPreset)} 카운트다운` : '스톱워치로 바꿨어요.');
    }
    saveSession();
    closeSheet();
    $('#topbar').innerHTML = topBar();
    updateTimerUI();
  }

  /* ───────── 설정 ───────── */
  function settingsSheet() {
    const st = store.settings;
    const seg = (act, cur, list) => `<div class="seg seg-sm">${list.map(([v, l]) => `<button data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`;
    openSheet(`<div class="sheet-body"><div class="sheet-head"><h3>설정</h3><button class="icon-btn glass" data-act="sheet-close" aria-label="닫기">${icon('close')}</button></div>
      <div class="list card">
        <div class="row wrap"><span class="row-label">화면 모드</span>${seg('theme', st.theme, [['auto', '자동'], ['light', '라이트'], ['dark', '다크']])}</div>
        <div class="row wrap"><span class="row-label">글자 크기</span>${seg('scale-set', st.scale, isPC ? [[0.9, '작게'], [1, '보통'], [1.15, '크게'], [1.3, '아주 크게'], [1.5, '수업용']] : [[0.9, '작게'], [1, '보통'], [1.12, '크게'], [1.25, '아주 크게']])}</div>
        <div class="row wrap"><span class="row-label">처음 보여 줄 해설</span>${seg('exp-default', st.expLevel, [['basic', '🌱 기초'], ['standard', '🌿 표준'], ['advanced', '🌳 심화']])}</div>
        <div class="row"><span class="row-label">알림음 (카운트다운 종료)</span><label class="switch"><input type="checkbox" data-act="sound" ${st.sound ? 'checked' : ''}><span></span></label></div>
      </div>
      <div class="list card">
        <button class="row" data-act="teacher">${icon(S.teacher ? 'unlock' : 'lock')}<span>${S.teacher ? '교사 모드 끄기' : '교사 모드 켜기'}</span></button>
        ${S.teacher ? `<button class="row" data-act="pin-change">${icon('lock')}<span>교사용 암호 바꾸기</span></button>` : ''}
        <a class="row" href="${isPC ? 'mobile.html' : 'pc.html'}">${icon(isPC ? 'phone' : 'monitor')}<span>${isPC ? '모바일 버전으로 열기' : 'PC 버전으로 열기'}</span></a>
        <a class="row" href="index.html">${icon('home')}<span>버전 선택 화면 (QR 코드)</span></a>
        <button class="row danger" data-act="reset-all">${icon('trash')}<span>이 기기의 기록 모두 지우기</span></button>
      </div>
      <p class="muted small center">기록은 이 기기의 브라우저에만 저장되며 서버로 보내지 않아요. v${SF.VERSION}</p></div>`, { label: '설정' });
  }
  function pinChange() {
    let code = '';
    openSheet(`<div class="sheet-body center pin"><div class="sheet-icon">${icon('lock')}</div><h3>새 교사용 암호</h3><p class="muted">숫자 4자리를 입력하세요.</p><div id="pin-dots" class="pin-dots"></div><div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫']
      .map((k) => (k === '' ? '<span></span>' : `<button class="key" data-key="${k}">${k}</button>`))
      .join('')}</div></div>`, { label: '암호 바꾸기' });
    const draw = () => ($('#pin-dots').innerHTML = [0, 1, 2, 3].map((i) => `<i class="${i < code.length ? 'on' : ''}"></i>`).join(''));
    draw();
    $('#overlay .keypad').addEventListener('click', (e) => {
      const b = e.target.closest('[data-key]');
      if (!b) return;
      const k = b.dataset.key;
      if (k === '⌫') code = code.slice(0, -1);
      else if (code.length < 4) code += k;
      draw();
      if (code.length === 4) {
        store.set('pin', code);
        closeSheet();
        toast('교사용 암호를 바꿨어요.');
      }
    });
  }

  /* ───────── 문항 목록 시트(모바일) ───────── */
  function navSheet() {
    const s = S.s;
    let extra = '';
    if (s.mode === 'exam') {
      const st = examStats();
      extra = `<div class="side-stats"><div><b>${st.a}</b><span>답함</span></div><div><b>${st.n - st.a}</b><span>안 함</span></div><div><b>${st.f}</b><span>나중에</span></div></div><button class="btn btn-primary w100" data-act="submit-exam">${icon('check')}답안 제출</button>`;
    } else extra = `<button class="btn btn-tinted w100" data-act="learn-finish">${icon('chart')}학습 마치고 결과 보기</button>`;
    openSheet(`<div class="sheet-body"><div class="sheet-head"><h3>문항 목록</h3><button class="icon-btn glass" data-act="sheet-close" aria-label="닫기">${icon('close')}</button></div>${navGrid()}${navLegend()}${extra}</div>`, { label: '문항 목록' });
  }

  /* ───────── 이벤트 위임 ───────── */
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    const a = t.dataset.act;
    const v = t.dataset.v;
    const inSheet = !!t.closest('#overlay');
    switch (a) {
      case 'sheet-close': closeSheet(); break;
      case 'home':
        if (S.route === 'quiz' && S.s) return exitQuiz();
        if (S.route === 'grade') {
          const ok = await confirmSheet({ title: '채점을 마치지 않고 나갈까요?', msg: '제출한 답안은 저장되어 있어요. 처음 화면의 ‘이어서 풀기’로 돌아오면 채점을 계속할 수 있어요.', ok: '나가기', cancel: '계속 채점' });
          if (!ok) return;
          if (S.timer) S.timer.destroy();
          S.timer = null;
          S.s = null;
        }
        go('home');
        break;
      case 'route': go(v); break;
      case 'unit':
        S.unit = v;
        store.set('unit', v);
        render();
        break;
      case 'set': {
        const st = store.settings;
        let sets = (st.sets && st.sets.length ? st.sets : SF.SET_ORDER).slice();
        sets = sets.includes(v) ? sets.filter((x) => x !== v) : sets.concat(v);
        if (!sets.length) { toast('문항 유형을 하나 이상 골라 주세요.', 'warn'); return; }
        store.set('sets', SF.SET_ORDER.filter((x) => sets.includes(x)));
        render();
        break;
      }
      case 'limit': store.set('limit', +v); render(); break;
      case 'go-notes': go('notes'); break;
      case 'go-wrong': go('wrong'); break;
      case 'go-history': go('history'); break;
      case 'start-learn': studentStart('learn'); break;
      case 'start-exam': studentStart('exam'); break;
      case 'level': store.set('level', v === 'all' ? 'all' : +v); render(); break;
      case 'count': store.set('count', +v); render(); break;
      case 'src': {
        const cur = (store.settings.srcs && store.settings.srcs.length ? store.settings.srcs : ['guide', 'bank']).slice();
        const nx = cur.includes(v) ? cur.filter((x) => x !== v) : cur.concat(v);
        if (!nx.length) { toast('문제 범위를 하나 이상 골라 주세요.', 'warn'); return; }
        store.set('srcs', ['guide', 'bank'].filter((x) => nx.includes(x)));
        render();
        break;
      }
      case 'guide-order': store.set('guideOrder', v); render(); break;
      case 'teach-guide': {
        const x = t.dataset.u;
        const order = store.settings.guideOrder === 'concept' ? '개념 우선' : '지도서 순서';
        startSession({ mode: t.dataset.m, unit: x, ids: guideIds(x), kind: 'guide', title: `지도서 평가(${order})`, limit: t.dataset.m === 'exam' ? (store.settings.limit || 0) * 60000 : 0 });
        break;
      }
      case 'lesson': {
        const x = t.dataset.u;
        const l = lessonsOf(x).find((y) => y.no === +t.dataset.l);
        startSession({ mode: t.dataset.m, unit: x, ids: l.ids, kind: 'lesson', title: `추가 문제 ${l.no}차시`, limit: t.dataset.m === 'exam' ? (store.settings.limit || 0) * 60000 : 0 });
        break;
      }
      case 'start-concept': {
        const c = SF.conceptById(t.dataset.c);
        if (S.teacher) {
          const ids = SF.classOrder(SF.pool({ unit: t.dataset.u, concept: t.dataset.c })).map((q) => q.id);
          startSession({ mode: 'learn', unit: t.dataset.u, ids, kind: 'lesson', title: c ? c.name : '' });
        } else {
          const prev = S.unit;
          S.unit = t.dataset.u;
          studentStart('learn', { concept: t.dataset.c, level: 'all', title: c ? c.name : '' });
          S.unit = prev;
        }
        break;
      }
      case 'resume': {
        const sess = store.data.session;
        if (!sess) return;
        S.s = sess;
        if (!S.teacher) sess.paused = false;
        if (sess.mode === 'exam' && sess.submitted) {
          S.timer = new SF.Timer({ mode: 'up', acc: sess.timerAcc });
          go('grade');
          return;
        }
        startTimer();
        markStart();
        go('quiz');
        break;
      }
      case 'exit': if (inSheet) closeSheet(true); exitQuiz(); break;
      case 'pick': pick(+t.dataset.i); break;
      case 'toggle': toggleKey(t.dataset.k); break;
      case 'slot': pickSlot(+t.dataset.si, +t.dataset.ci); break;
      case 'submit': submitLearn(); break;
      case 'reveal': reveal(); break;
      case 'hint':
        S.showHint = !S.showHint;
        refreshQuiz(S.showHint && !isPC);
        break;
      case 'exp':
        S.expTab = v;
        rerenderExp();
        break;
      case 'self':
        if (S.route === 'grade') {
          const id = t.closest('.grade-item').id.slice(2);
          S.s.resp[id].self = v;
          saveSoon();
          const item = t.closest('.essay-panel');
          $$('.rubric-row', item).forEach((b) => {
            b.classList.toggle('on', b.dataset.v === v);
            b.setAttribute('aria-pressed', b.dataset.v === v);
            b.classList.remove('suggest');
          });
        } else selfGrade(v);
        break;
      case 'grade-done': finalizeExam(); break;
      case 'next': gotoQ(S.s.idx + 1); break;
      case 'prev': gotoQ(S.s.idx - 1); break;
      case 'goto': if (inSheet) closeSheet(); gotoQ(+t.dataset.i); break;
      case 'flag': {
        const id = curQ().id;
        S.s.flags[id] = !S.s.flags[id];
        saveSoon();
        const fb = $('.q-meta .chip-btn');
        if (fb) {
          const on = !!S.s.flags[id];
          fb.classList.toggle('on', on);
          fb.setAttribute('aria-pressed', on);
          fb.querySelector('span').textContent = on ? '표시됨' : '나중에 보기';
        }
        renderSide();
        renderInspector();
        break;
      }
      case 'nav-sheet': navSheet(); break;
      case 'submit-exam': if (inSheet) closeSheet(true); submitExam(false); break;
      case 'learn-finish': if (inSheet) closeSheet(true); finishLearn(); break;
      case 'learn-again': {
        const s = S.lastLearn;
        const ids = s.qids.filter((id) => s.st[id] && ['w', 'rv', 'c2', 'p'].includes(s.st[id].res));
        startSession({ mode: 'learn', unit: s.unit, ids, shuffle: false, kind: 'wrong' });
        break;
      }
      case 'retest-wrong': {
        const { rec } = S.last;
        const ids = rec.items.filter((i) => i.score < 1).map((i) => i.id);
        const lim = rec.limit ? Math.max(60000, Math.ceil(((rec.limit / 60000) * ids.length) / rec.n) * 60000) : 0;
        startSession({ mode: 'exam', unit: rec.unit, ids: store.settings.shuffle ? SF.shuffle(ids) : ids, kind: 'wrong', retestOf: rec.id, limit: lim, sets: rec.sets });
        break;
      }
      case 'retest-all': {
        const { rec } = S.last;
        startSession({ mode: 'exam', unit: rec.unit, sets: rec.kind === 'full' ? rec.sets : null, ids: rec.kind === 'full' ? null : rec.items.map((i) => i.id), kind: rec.kind, retestOf: rec.id, limit: rec.limit, shuffle: true });
        break;
      }
      case 'retest-learn': {
        const { rec } = S.last;
        startSession({ mode: 'learn', unit: rec.unit, ids: rec.items.filter((i) => i.score < 1).map((i) => i.id), shuffle: false, kind: 'wrong' });
        break;
      }
      case 'review': reviewSheet(t.dataset.id); break;
      case 'concept-sheet': conceptSheet(t.dataset.c); break;
      case 'wrong-learn': startSession({ mode: 'learn', unit: S.unit, ids: store.wrongIds(S.unit), kind: 'note', shuffle: false }); break;
      case 'wrong-exam': startSession({ mode: 'exam', unit: S.unit, ids: SF.shuffle(store.wrongIds(S.unit)), kind: 'note', limit: 0 }); break;
      case 'wrong-one': startSession({ mode: 'learn', unit: SF.q(t.dataset.id).unit, ids: [t.dataset.id], kind: 'note', shuffle: false }); break;
      case 'teacher': if (inSheet) closeSheet(true); teacherSheet(); break;
      case 'settings': settingsSheet(); break;
      case 'theme': store.set('theme', v); applyTheme(); markSeg(t); break;
      case 'scale-set': store.set('scale', +v); applyScale(); markSeg(t); break;
      case 'exp-default': store.set('expLevel', v); S.expTab = v; markSeg(t); break;
      case 'scale': {
        const steps = [0.9, 1, 1.15, 1.3, 1.5];
        const cur = steps.indexOf(store.settings.scale);
        const ni = Math.min(steps.length - 1, Math.max(0, (cur < 0 ? 1 : cur) + +v));
        store.set('scale', steps[ni]);
        applyScale();
        toast(`글자 크기 ${Math.round(steps[ni] * 100)}%`);
        break;
      }
      case 'fullscreen':
        try {
          const pr = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
          if (pr && pr.catch) pr.catch(() => toast('이 화면에서는 전체 화면을 쓸 수 없어요. 브라우저의 F11 키를 눌러 보세요.'));
        } catch (err) { toast('이 브라우저는 전체 화면을 지원하지 않아요.'); }
        break;
      case 'timer-toggle': timerToggle(); break;
      case 'timer-menu': timerMenu(); break;
      case 'tm': timerMenuAct(v); break;
      case 'pin-change': pinChange(); break;
      case 'reset-all': {
        closeSheet(true);
        const ok = await confirmSheet({ title: '기록을 모두 지울까요?', msg: '이 기기에 저장된 시험 기록, 오답 노트, 진행 중인 풀이가 모두 삭제되며 되돌릴 수 없어요.', ok: '모두 지우기', danger: true, icon: 'trash' });
        if (!ok) return;
        store.resetAll();
        S.s = null;
        if (S.timer) S.timer.destroy();
        S.timer = null;
        go('home');
        toast('기록을 모두 지웠어요.');
        break;
      }
    }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.act === 'essay-inc') { store.set('essay', t.checked); render(); return; }
    if (t.dataset.act === 'shuffle') store.set('shuffle', t.checked);
    if (t.dataset.act === 'sound') store.set('sound', t.checked);
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if ((t.dataset.act !== 'essay' && t.dataset.act !== 'short') || !S.s) return;
    const q = curQ();
    if (locked(q)) return;
    resp(q).t = t.value;
    const c = $('[data-essay-count]');
    if (c && t.dataset.act === 'essay') c.textContent = t.value.length + '자';
    saveSoon();
    // 버튼 상태만 갱신 (입력 중 포커스 유지)
    const btns = $$('[data-act="submit"]');
    btns.forEach((b) => (b.disabled = !SF.isAnswered(q, S.s.resp[q.id])));
    if (S.s.mode === 'exam') renderSide();
  });
  function markSeg(t) {
    $$('button', t.parentNode).forEach((b) => b.setAttribute('aria-pressed', b === t));
  }
  function rerenderExp() {
    $$('.seg-exp button').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.v === S.expTab);
      b.setAttribute('aria-selected', b.dataset.v === S.expTab);
    });
    $$('[data-exp-body]').forEach((el) => {
      const holder = el.closest('[data-qid]');
      const q = holder ? SF.q(holder.dataset.qid) : null;
      if (q) {
        el.innerHTML = q.exp[S.expTab];
        el.classList.remove('fade-in');
        void el.offsetWidth;
        el.classList.add('fade-in');
      }
    });
  }

  /* 키보드 단축키 (PC) */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#overlay').firstChild) { closeSheet(); return; }
    if (S.route !== 'quiz' || !S.s || $('#overlay').firstChild) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' && e.target.dataset.act === 'short' && e.key === 'Enter') {
      const prim = $(isPC ? '#qact .btn-primary' : '#bottom .btn-primary');
      if (prim && !prim.disabled) prim.click();
      e.preventDefault();
      return;
    }
    if (tag === 'textarea' || tag === 'input') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const q = curQ();
    const s = S.s;
    if (/^[1-9]$/.test(e.key)) {
      const n = +e.key - 1;
      if (q.type === 'mc' && n < q.options.length) pick(n);
      else if (q.type === 'multi' && n < q.bogi.length) toggleKey(q.bogi[n].k);
      else if (q.type === 'blanks') {
        const r = s.resp[q.id] || {};
        const si = q.slots.findIndex((_, i) => !(r.s && Number.isInteger(r.s[i])));
        const slot = si < 0 ? q.slots.length - 1 : si;
        if (n < q.slots[slot].choices.length) pickSlot(slot, n);
      }
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const prim = $(isPC ? '#qact .btn-primary' : '#bottom .btn-primary');
      if (prim && !prim.disabled) prim.click();
      e.preventDefault();
    } else if (e.key === 'ArrowRight') { gotoQ(s.idx + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { gotoQ(s.idx - 1); e.preventDefault(); }
    else if ((e.key === 'h' || e.key === 'H' || e.key === 'ㅗ') && s.mode === 'learn') { S.showHint = !S.showHint; refreshQuiz(); }
    else if (e.key === ' ' && S.teacher) { timerToggle(); e.preventDefault(); }
  });

  /* PC: 넓은 화면이면 해설을 오른쪽 패널에 표시 */
  const mqWide = window.matchMedia('(min-width: 1280px)');
  function onWide() {
    S.wide = isPC && mqWide.matches;
    if (S.route === 'quiz') render();
  }
  if (isPC) {
    S.wide = mqWide.matches;
    mqWide.addEventListener && mqWide.addEventListener('change', onWide);
  }

  /* 시작 */
  applyTheme();
  applyScale();
  hist.replace({ route: 'home' }, location.pathname + location.search);
  render();
  if (!store.ok) toast('이 브라우저에서는 기록을 저장할 수 없어요(사생활 보호 모드 등).', 'warn');

  // 오프라인 사용(홈 화면 추가)을 위한 서비스 워커
  try {
    if ('serviceWorker' in navigator && location.protocol === 'https:' && window.self === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
  } catch (e) { /* 샌드박스 등에서는 오프라인 기능 없이 동작 */ }
  window.SF_APP = { S, render, go };
})();
