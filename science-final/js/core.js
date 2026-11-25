/* 채점·피드백·타이머·저장 엔진 (화면과 무관한 공통 로직) */
(function () {
  'use strict';
  const SF = (window.SF = window.SF || {});
  const DATA = window.SF_DATA || {};
  SF.VERSION = '1.0.0';
  SF.KEY = 'sciFinal.v1';
  SF.TEACHER_PIN_DEFAULT = '1357';
  SF.UNITS = ['u7', 'u8'];
  SF.SETS = {
    basic: { label: '최소 성취수준', short: '기본', color: '#34C759' },
    achieve: { label: '학업 성취도', short: '실력', color: '#007AFF' },
    essay: { label: '서술형·논술형', short: '서술형', color: '#AF52DE' }
  };
  SF.SET_ORDER = ['basic', 'achieve', 'essay'];
  SF.ESSAY_SCORE = { 상: 1, 중: 0.5, 하: 0, 0: 0 };

  /* ── 문항 색인 ── */
  const QMAP = {};
  SF.UNITS.forEach((u) => {
    const d = DATA[u];
    if (!d) return;
    const fix = (t) => (typeof t === 'string' ? t.replace(/<보기>/g, '〈보기〉') : t);
    d.questions.forEach((q, i) => {
      q.unit = u;
      q.order = i;
      q.stem = fix(q.stem);
      q.hint = fix(q.hint);
      if (q.exp) Object.keys(q.exp).forEach((k) => (q.exp[k] = fix(q.exp[k])));
      // 오개념 문장 없이 '❌ → ✅'로 시작하는 피드백은 '✅'만 남겨 자연스럽게 표시
      const tidy = (t) => (typeof t === 'string' ? t.replace(/^❌\s*→\s*✅\s*/, '✅ ') : t);
      if (q.type === 'mc' && Array.isArray(q.options)) q.options.forEach((o) => { if (o && o.fb) o.fb = tidy(o.fb); });
      if (q.slots) q.slots.forEach((sl) => { if (sl.fb) Object.keys(sl.fb).forEach((k) => (sl.fb[k] = tidy(sl.fb[k]))); });
      QMAP[q.id] = q;
    });
  });
  SF.data = DATA;
  SF.unit = (u) => DATA[u];
  SF.q = (id) => QMAP[id];
  SF.unitLabel = (u) => (u === 'all' ? '전체 (Ⅶ + Ⅷ)' : `${DATA[u].code}. ${DATA[u].title}`);
  SF.concept = (q) => {
    const d = DATA[q.unit];
    return d.concepts.find((c) => c.id === q.concept);
  };
  SF.conceptById = (cid) => {
    for (const u of SF.UNITS) {
      const c = DATA[u].concepts.find((x) => x.id === cid);
      if (c) return Object.assign({ unit: u }, c);
    }
    return null;
  };
  SF.select = function (opt) {
    const units = opt.unit === 'all' ? SF.UNITS : [opt.unit];
    let list = [];
    units.forEach((u) => (list = list.concat(DATA[u].questions)));
    if (opt.sets) list = list.filter((q) => opt.sets.includes(q.set));
    if (opt.concept) list = list.filter((q) => q.concept === opt.concept);
    if (opt.ids) {
      const set = new Set(opt.ids);
      list = list.filter((q) => set.has(q.id));
    }
    return list;
  };
  SF.circled = (i) => '①②③④⑤⑥⑦⑧⑨⑩'[i] || String(i + 1);
  SF.qLabel = (q) => `${DATA[q.unit].code}-${SF.SETS[q.set].short} ${q.no}`;

  /* ── 보기 조합형 ── */
  SF.isCombo = (q) => q.type === 'mc' && !!q.bogi && typeof q.options[0] === 'string';
  SF.comboKeys = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
  SF.trueKeys = (q) => q.bogi.filter((b) => b.ok).map((b) => b.k);
  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

  /* ── 응답 ──
   * mc: {c:index} / multi: {k:[...]} / blanks: {s:[...]} / essay: {t:'', self:'상'|'중'|'하'|'0'} */
  SF.isAnswered = function (q, r) {
    if (!r) return false;
    switch (q.type) {
      case 'mc': return Number.isInteger(r.c);
      case 'multi': return Array.isArray(r.k) && r.k.length > 0;
      case 'blanks': return Array.isArray(r.s) && q.slots.every((_, i) => Number.isInteger(r.s[i]));
      case 'essay': return !!(r.t && r.t.trim().length >= 2);
      default: return false;
    }
  };
  SF.isPartlyAnswered = function (q, r) {
    if (!r) return false;
    if (q.type === 'blanks') return Array.isArray(r.s) && r.s.some((x) => Number.isInteger(x));
    return SF.isAnswered(q, r);
  };

  /* 채점: {ok, score(0~1), slots?, pending?} */
  SF.grade = function (q, r) {
    r = r || {};
    switch (q.type) {
      case 'mc': {
        const ok = r.c === q.answer;
        return { ok, score: ok ? 1 : 0 };
      }
      case 'multi': {
        const ok = Array.isArray(r.k) && sameSet(r.k, SF.trueKeys(q));
        return { ok, score: ok ? 1 : 0 };
      }
      case 'blanks': {
        const slots = q.slots.map((s, i) => (Array.isArray(r.s) && Number.isInteger(r.s[i]) ? r.s[i] === s.answer : null));
        const ok = slots.every((x) => x === true);
        return { ok, score: ok ? 1 : 0, slots };
      }
      case 'essay': {
        if (!SF.isAnswered(q, r)) return { ok: false, score: 0 };
        if (!r.self) return { ok: false, score: 0, pending: true };
        const sc = SF.ESSAY_SCORE[r.self] || 0;
        return { ok: r.self === '상', score: sc, partial: sc > 0 && sc < 1 };
      }
    }
    return { ok: false, score: 0 };
  };

  /* 오개념 피드백 목록: [{kind:'mis'|'miss'|'neg'|'tip', html}] */
  SF.feedback = function (q, r, reveal) {
    const out = [];
    r = r || {};
    if (q.type === 'mc' && !SF.isCombo(q)) {
      if (r.c === q.answer || !Number.isInteger(r.c)) return out;
      const o = q.options[r.c];
      if (q.neg && o.why) {
        out.push({ kind: 'neg', html: `<b>${SF.circled(r.c)}은(는) 옳은 설명이에요.</b> ${o.why} 이 문제는 <u>옳지 않은</u> 것을 찾는 문제예요.` });
      } else if (o.fb) {
        out.push({ kind: 'mis', html: o.fb });
      } else {
        out.push({ kind: 'tip', html: '선택한 답은 정답이 아니에요. 힌트를 참고해 다시 생각해 보세요.' });
      }
      return out;
    }
    if (q.bogi && (q.type === 'multi' || SF.isCombo(q))) {
      const chosen = q.type === 'multi' ? r.k || [] : Number.isInteger(r.c) ? SF.comboKeys(q.options[r.c]) : [];
      if (!chosen.length) return out;
      const truth = SF.trueKeys(q);
      if (sameSet(chosen, truth)) return out;
      q.bogi.forEach((b) => {
        if (chosen.includes(b.k) && !b.ok) out.push({ kind: 'mis', html: `<b>${b.k}. ${b.t}</b><br>❌ 옳지 않은 진술이에요. ✅ ${b.why}` });
      });
      q.bogi.forEach((b) => {
        if (!chosen.includes(b.k) && b.ok) {
          out.push(reveal ? { kind: 'miss', html: `<b>${b.k}. ${b.t}</b><br>⭕ 이 진술도 옳아요. ${b.why}` } : { kind: 'miss', html: `<b>${b.k}</b>도 다시 읽어 보세요. 옳은 진술일 수 있어요.` });
        }
      });
      return out;
    }
    if (q.type === 'blanks') {
      const s = r.s || [];
      q.slots.forEach((sl, i) => {
        if (!Number.isInteger(s[i]) || s[i] === sl.answer) return;
        const fb = sl.fb && sl.fb[s[i]];
        const head = `<b>${sl.label}</b> — 고른 답: ${sl.choices[s[i]]}`;
        out.push({ kind: 'mis', html: `${head}<br>${fb || '다시 생각해 보세요.'}${reveal ? `<br><span class="fb-ans">정답: ${sl.choices[sl.answer]}</span>` : ''}` });
      });
      return out;
    }
    return out;
  };

  /* 정답 표시 문자열 */
  SF.answerText = function (q) {
    switch (q.type) {
      case 'mc':
        return SF.isCombo(q) ? `${SF.circled(q.answer)} ${q.options[q.answer]}` : `${SF.circled(q.answer)}${q.options[q.answer].t ? ' ' + q.options[q.answer].t : ''}`;
      case 'multi':
        return SF.trueKeys(q).join(', ');
      case 'blanks':
        return q.slots.map((s) => `${s.label.replace(/\s*\(.*$/, '')}: ${s.choices[s.answer]}`).join(' · ');
      case 'essay':
        return '예시 답안 참고';
    }
    return '';
  };
  SF.responseText = function (q, r) {
    if (!SF.isPartlyAnswered(q, r)) return '무응답';
    switch (q.type) {
      case 'mc':
        return SF.isCombo(q) ? `${SF.circled(r.c)} ${q.options[r.c]}` : `${SF.circled(r.c)}${q.options[r.c].t ? ' ' + q.options[r.c].t : ''}`;
      case 'multi':
        return r.k.slice().sort().join(', ');
      case 'blanks':
        return q.slots.map((s, i) => `${s.label.replace(/\s*\(.*$/, '')}: ${Number.isInteger(r.s[i]) ? s.choices[r.s[i]] : '—'}`).join(' · ');
      case 'essay':
        return r.t;
    }
    return '';
  };

  /* 서술형 핵심 내용 점검 */
  SF.essayCheck = function (q, text) {
    const t = (text || '').replace(/\s+/g, ' ');
    const hits = q.essay.groups.map((g) => g.all.every((re) => re.test(t)));
    const n = hits.filter(Boolean).length;
    const lv = q.essay.levels;
    let suggest = '0';
    if (t.trim().length >= 2) suggest = n >= lv.상 ? '상' : n >= lv.중 ? '중' : '하';
    return { hits, count: n, suggest };
  };

  /* 성취수준 환산 (참고용: 중학교 성취평가제 구간) */
  SF.levelOf = function (pct) {
    if (pct >= 90) return { g: 'A', msg: '훌륭해요! 개념이 탄탄해요. 심화 해설로 한 걸음 더 나아가 보세요.', color: '#34C759' };
    if (pct >= 80) return { g: 'B', msg: '잘했어요! 틀린 개념만 다시 확인하면 A도 충분해요.', color: '#30B0C7' };
    if (pct >= 70) return { g: 'C', msg: '기본기가 잡혀 가고 있어요. 오답 개념을 정리하고 재시험에 도전해요.', color: '#007AFF' };
    if (pct >= 60) return { g: 'D', msg: '조금만 더! 개념 정리 카드로 약한 부분을 복습해 봐요.', color: '#FF9500' };
    return { g: 'E', msg: '지금부터가 시작이에요. 기초 해설부터 차근차근 다시 풀면 분명 올라가요.', color: '#FF3B30' };
  };

  SF.fmtTime = function (ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    const p = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`;
  };
  SF.fmtDuration = function (ms) {
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60), x = s % 60;
    return m ? `${m}분 ${x}초` : `${x}초`;
  };
  SF.fmtDate = function (t) {
    const d = new Date(t);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  SF.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  SF.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ── 저장소 (이 기기의 브라우저에만 저장) ── */
  const defaults = () => ({
    settings: { theme: 'auto', scale: 1, expLevel: 'standard', sound: true, pin: SF.TEACHER_PIN_DEFAULT, shuffle: false, limit: 0, sets: ['basic', 'achieve', 'essay'], unit: 'u7' },
    history: [],
    wrong: {},
    session: null
  });
  let mem = defaults();
  let storageOK = true;
  SF.store = {
    load() {
      try {
        const raw = localStorage.getItem(SF.KEY);
        if (raw) {
          const d = JSON.parse(raw);
          mem = Object.assign(defaults(), d);
          mem.settings = Object.assign(defaults().settings, d.settings || {});
        }
      } catch (e) {
        storageOK = false;
      }
      return mem;
    },
    save() {
      try {
        localStorage.setItem(SF.KEY, JSON.stringify(mem));
      } catch (e) {
        storageOK = false;
      }
    },
    get ok() { return storageOK; },
    get data() { return mem; },
    get settings() { return mem.settings; },
    set(k, v) { mem.settings[k] = v; this.save(); },
    addHistory(rec) {
      mem.history.push(rec);
      if (mem.history.length > 60) mem.history = mem.history.slice(-60);
      this.save();
    },
    markWrong(id) {
      const w = mem.wrong[id] || { n: 0, fixed: false };
      w.n += 1;
      w.fixed = false;
      w.at = Date.now();
      mem.wrong[id] = w;
    },
    markRight(id) {
      const w = mem.wrong[id];
      if (w && !w.fixed) {
        w.fixed = true;
        w.fixedAt = Date.now();
      }
    },
    wrongIds(unit) {
      return Object.keys(mem.wrong).filter((id) => {
        const q = SF.q(id);
        return q && !mem.wrong[id].fixed && (unit === 'all' || !unit || q.unit === unit);
      });
    },
    fixedCount(unit) {
      return Object.keys(mem.wrong).filter((id) => {
        const q = SF.q(id);
        return q && mem.wrong[id].fixed && (unit === 'all' || !unit || q.unit === unit);
      }).length;
    },
    saveSession(s) {
      mem.session = s;
      this.save();
    },
    clearSession() {
      mem.session = null;
      this.save();
    },
    resetAll() {
      const pin = mem.settings.pin;
      mem = defaults();
      mem.settings.pin = pin;
      this.save();
    }
  };

  /* ── 타이머: 경과(up) 또는 남은 시간(down) ── */
  class Timer {
    constructor(o = {}) {
      this.mode = o.mode || 'up';
      this.limit = o.limit || 0;
      this.acc = o.acc || 0;
      this.running = false;
      this.ended = false;
      this.t0 = 0;
      this.onTick = o.onTick || null;
      this.onEnd = o.onEnd || null;
      this.iv = null;
    }
    now() { return performance.now(); }
    start() {
      if (this.running || this.ended) return;
      this.t0 = this.now();
      this.running = true;
      clearInterval(this.iv);
      this.iv = setInterval(() => this.tick(), 250);
      this.tick();
    }
    pause() {
      if (!this.running) return;
      this.acc += this.now() - this.t0;
      this.running = false;
      clearInterval(this.iv);
      this.tick();
    }
    toggle() { this.running ? this.pause() : this.start(); }
    reset(acc) {
      const was = this.running;
      this.pause();
      this.acc = acc || 0;
      this.ended = false;
      if (was) this.start();
      else this.tick();
    }
    set(mode, limit) {
      this.mode = mode;
      this.limit = limit || 0;
      this.ended = false;
      this.tick();
    }
    add(ms) {
      // 남은 시간 늘리기/줄이기(교사용)
      if (this.mode === 'down') {
        this.limit = Math.max(60000, this.limit + ms);
        this.ended = false;
      }
      this.tick();
    }
    elapsed() { return this.acc + (this.running ? this.now() - this.t0 : 0); }
    remaining() { return Math.max(0, this.limit - this.elapsed()); }
    value() { return this.mode === 'down' ? this.remaining() : this.elapsed(); }
    tick() {
      if (this.onTick) this.onTick(this);
      if (this.mode === 'down' && this.running && this.remaining() <= 0 && !this.ended) {
        this.ended = true;
        this.pause();
        if (this.onEnd) this.onEnd(this);
      }
    }
    destroy() {
      clearInterval(this.iv);
      this.running = false;
    }
  }
  SF.Timer = Timer;

  /* ── 세션 ── */
  SF.newSession = function (o) {
    let list = o.ids ? o.ids.map(SF.q).filter(Boolean) : SF.select({ unit: o.unit, sets: o.sets, concept: o.concept });
    if (o.shuffle) list = SF.shuffle(list);
    return {
      id: 's' + Date.now().toString(36),
      mode: o.mode, // 'learn' | 'exam'
      kind: o.kind || 'full', // 'full' | 'wrong' | 'concept' | 'note'
      unit: o.unit,
      sets: o.sets || null,
      concept: o.concept || null,
      qids: list.map((q) => q.id),
      idx: 0,
      resp: {},
      st: {},
      flags: {},
      spent: {},
      limit: o.limit || 0,
      timerAcc: 0,
      started: Date.now(),
      retestOf: o.retestOf || null,
      title: o.title || ''
    };
  };

  /* 시험 결과 기록 만들기 */
  SF.finishExam = function (s, timeMs) {
    const items = [];
    const per = {};
    let earned = 0;
    s.qids.forEach((id) => {
      const q = SF.q(id);
      const r = s.resp[id];
      const g = SF.grade(q, r);
      earned += g.score;
      items.push({ id, score: g.score, ok: g.ok, ms: Math.round(s.spent[id] || 0), answered: SF.isPartlyAnswered(q, r) });
      const c = per[q.concept] || (per[q.concept] = { e: 0, n: 0 });
      c.e += g.score;
      c.n += 1;
    });
    const n = s.qids.length;
    const pct = n ? Math.round((earned / n) * 1000) / 10 : 0;
    return {
      id: s.id,
      date: Date.now(),
      unit: s.unit,
      kind: s.kind,
      sets: s.sets,
      n,
      earned: Math.round(earned * 10) / 10,
      pct,
      grade: SF.levelOf(pct).g,
      timeMs: Math.round(timeMs || 0),
      limit: s.limit,
      per,
      items,
      retestOf: s.retestOf
    };
  };

  /* 학습 모드 요약 */
  SF.summarizeLearn = function (s) {
    let first = 0, second = 0, wrong = 0, done = 0, score = 0;
    const per = {};
    s.qids.forEach((id) => {
      const q = SF.q(id);
      const st = s.st[id] || {};
      const c = per[q.concept] || (per[q.concept] = { e: 0, n: 0 });
      c.n += 1;
      if (!st.res) return;
      done += 1;
      if (st.res === 'c1') { first++; c.e += 1; score += 1; }
      else if (st.res === 'c2') { second++; c.e += 0.5; score += 0.5; }
      else if (st.res === 'p') { second++; c.e += 0.5; score += 0.5; }
      else wrong++;
    });
    return { first, second, wrong, done, n: s.qids.length, per, pct: s.qids.length ? Math.round((first / s.qids.length) * 100) : 0 };
  };
})();
