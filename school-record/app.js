/* 2026 생기부 마스터 — 화면 동작 */
(function () {
  "use strict";
  const { rules, ko, compose: C, standards: STD, sheet } = window.SRM;
  const AREAS = rules.AREAS;
  const STORE_KEY = "srm2026-middle-v1";
  const TARGETS = { seteuk: [500, 400, 300, 150], auto: [500, 400, 300, 150], club: [500, 400, 300, 150], career: [500, 400, 300, 150], behavior: [300, 200, 150] };
  const CLUB_TYPES = {
    regular: { label: "정규교육과정 동아리", note: "" },
    sport: { label: "정규교육과정 학교스포츠클럽", note: "" },
    self: { label: "자율동아리 (학교교육계획)", note: "자율동아리는 학년당 1개, 동아리명과 필요시 소개 30자 이내(동아리명과 공백 포함)만 입력합니다. (기재요령 p.79)" },
    youth: { label: "청소년단체 (학교교육계획)", note: "청소년단체 활동은 단체명만 입력하며 특기사항은 입력하지 않습니다. (기재요령 p.74, p.80)" },
    afterSport: { label: "정규교육과정 이외 학교스포츠클럽", note: "정규교육과정 이외의 학교스포츠클럽은 클럽명만 입력합니다. (기재요령 p.74, p.80)" },
  };

  /* ---------- 상태 ---------- */
  const defaults = () => ({
    v: 1,
    grade: "2",
    area: "seteuk",
    subject: "과학",
    tone: "observe",
    versions: 2,
    target: { seteuk: 500, auto: 500, club: 500, career: 500, behavior: 300 },
    closing: false,
    students: [],
    selected: null,
    rec: {},
    customStd: {},
    classFilter: "",
    bulk: false,
  });

  let state = load();
  let saveTimer = null;
  let skipConfirm = false;
  let pendingConfirm = null;
  let rosterRows = [];
  let rosterMap = null;
  let rosterSheets = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      return hydrate(parsed);
    } catch (e) {
      console.warn(e);
      return defaults();
    }
  }
  function hydrate(obj) {
    const d = defaults();
    if (!obj || typeof obj !== "object") return d;
    const s = Object.assign(d, obj);
    s.target = Object.assign(defaults().target, obj.target || {});
    if (!Array.isArray(s.students)) s.students = [];
    if (!s.rec || typeof s.rec !== "object") s.rec = {};
    if (!s.customStd || typeof s.customStd !== "object") s.customStd = {};
    if (!AREAS[s.area]) s.area = "seteuk";
    return s;
  }
  function save(immediate) {
    setSaveState("pending", "저장 중…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, immediate ? 0 : 400);
  }
  function flush() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      const t = new Date();
      setSaveState("", `이 기기에 저장됨 · ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`);
    } catch (e) {
      setSaveState("error", "저장 실패: 브라우저 저장 공간을 확인하세요");
    }
  }
  window.addEventListener("beforeunload", () => {
    if (saveTimer) flush();
  });

  /* ---------- 도우미 ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (el.hidden = true), 2200);
  }
  function setSaveState(cls, text) {
    const el = $("#save-state");
    el.className = "save-state" + (cls ? " " + cls : "");
    el.textContent = text;
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("복사했습니다. 나이스에 붙여 넣으세요.");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast("복사했습니다.");
    }
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  /* ---------- 학생·기록 접근 ---------- */
  const student = () => state.students.find((s) => s.id === state.selected) || null;
  const gradeOf = (s) => String((s && s.grade) || state.grade || "2");
  const recKey = (area = state.area, subject = state.subject) => (area === "seteuk" ? `seteuk:${subject || "과목 미정"}` : area);
  const newEntry = () => ({ id: uid(), date: "", scene: "", action: "", change: "" });
  function getRec(sid, key = recKey(), create = true) {
    if (!sid) return null;
    state.rec[sid] = state.rec[sid] || {};
    if (!state.rec[sid][key] && create) {
      state.rec[sid][key] = { entries: [newEntry()], keywords: [], extra: {}, drafts: [], final: "", finalAt: null };
    }
    return state.rec[sid][key] || null;
  }
  const hasMemo = (r) => !!r && r.entries.some((e) => (e.scene || e.action || e.change || "").trim());
  function statusOf(sid, key) {
    const r = state.rec[sid] && state.rec[sid][key];
    if (!r) return "none";
    if (r.final) return "done";
    if (r.drafts && r.drafts.some((d) => d.text)) return "draft";
    if (hasMemo(r) || (r.keywords && r.keywords.length)) return "memo";
    return "none";
  }
  const allNames = () => state.students.map((s) => s.name).filter(Boolean);
  const targetBytes = (area = state.area) => (state.target[area] || AREAS[area].maxChars) * 3;
  const studentLabel = (s) => `${s.grade ? s.grade + "학년 " : ""}${s.cls ? s.cls + "반 " : ""}${s.num ? s.num + "번 " : ""}${s.name || "(이름 없음)"}`;

  function sortStudents() {
    const n = (x) => (x === "" || x == null ? 999 : Number(x) || 999);
    state.students.sort((a, b) => n(a.grade) - n(b.grade) || n(a.cls) - n(b.cls) || n(a.num) - n(b.num) || String(a.name).localeCompare(String(b.name), "ko"));
  }
  function visibleStudents() {
    const q = ($("#roster-search").value || "").trim();
    return state.students.filter((s) => {
      if (state.classFilter && `${s.grade}-${s.cls}` !== state.classFilter) return false;
      if (!q) return true;
      return String(s.name).includes(q) || String(s.num) === q || studentLabel(s).includes(q);
    });
  }

  /* ---------- 검사 ---------- */
  function analyze(text, area, opts = {}) {
    const bytes = rules.countBytes(text);
    const chars = rules.countChars(text);
    const max = AREAS[area].maxChars * 3;
    const issues = [];
    if (bytes > max) issues.push({ level: "error", label: `최대 ${AREAS[area].maxChars}자(${max.toLocaleString()}Byte)를 ${(bytes - max).toLocaleString()}Byte 초과`, basis: "p.162" });
    rules.detectProhibited(text).forEach((f) => issues.push(f));
    rules.styleChecks(text, { names: allNames(), areaKey: area }).forEach((f) => issues.push(f));
    if (opts.clubSelf) {
      const n = rules.countChars(((opts.clubName || "") + " " + text).trim());
      if (n > 30) issues.push({ level: "error", label: `자율동아리 소개는 동아리명과 공백 포함 30자 이내 (현재 ${n}자)`, basis: "p.79" });
    }
    if (opts.dupWith && opts.dupWith.length) {
      const mine = ko.splitSentences(text).filter((s) => s.length >= 15);
      const dup = mine.filter((s) => opts.dupWith.filter((o) => o.includes(s)).length >= 1);
      if (dup.length) issues.push({ level: "info", label: `다른 학생 문구와 똑같은 문장 ${dup.length}개`, matches: dup.slice(0, 2).map((m) => ({ match: m.slice(0, 24) + (m.length > 24 ? "…" : "") })) });
    }
    return { bytes, chars, max, issues };
  }
  function otherTexts(sid, key) {
    const out = [];
    for (const s of state.students) {
      if (s.id === sid) continue;
      const r = state.rec[s.id] && state.rec[s.id][key];
      if (!r) continue;
      if (r.final) out.push(r.final);
      (r.drafts || []).forEach((d) => d.text && out.push(d.text));
    }
    return out;
  }
  function meterHtml(a, target) {
    const pct = Math.min(100, Math.round((a.bytes / a.max) * 100));
    const cls = a.bytes > a.max ? "over" : a.bytes > a.max * 0.9 ? "near" : "";
    const kChars = Math.floor(a.bytes / 3);
    return `<div class="meter"><div class="meter-bar"><div class="meter-fill ${cls}" style="width:${pct}%"></div></div>
      <div class="meter-text"><span class="${a.bytes > a.max ? "over" : ""}">${a.bytes.toLocaleString()} / ${a.max.toLocaleString()} Byte</span>
      <span>공백 포함 ${a.chars}자 · 한글 환산 약 ${kChars}자${target ? ` · 목표 ${Math.round(target / 3)}자` : ""}</span></div></div>`;
  }
  function issuesHtml(issues) {
    if (!issues.length) return `<ul class="issues"><li class="ok">감지된 기재 금지·주의 표현 없음 (자동 점검이므로 최종 확인은 직접 해 주세요)</li></ul>`;
    const order = { error: 0, warn: 1, info: 2 };
    return `<ul class="issues">${issues
      .slice()
      .sort((a, b) => order[a.level] - order[b.level])
      .map((i) => {
        const m = (i.matches || []).map((x) => `<mark>${esc(x.match)}</mark>`).join(" ");
        const tag = i.level === "error" ? "기재 불가" : i.level === "warn" ? "확인 필요" : "참고";
        return `<li class="${i.level}"><b>[${tag}]</b> ${esc(i.label)} ${m}${i.basis ? ` <span class="basis">(${esc(i.basis)})</span>` : ""}</li>`;
      })
      .join("")}</ul>`;
  }

  /* ---------- 렌더링: 명렬표 ---------- */
  function renderRoster() {
    sortStudents();
    const classes = [...new Set(state.students.map((s) => `${s.grade}-${s.cls}`))].filter((x) => x !== "-");
    const sel = $("#roster-class");
    sel.innerHTML = `<option value="">전체 반</option>` + classes.map((c) => {
      const [g, k] = c.split("-");
      return `<option value="${esc(c)}">${esc(g ? g + "-" : "")}${esc(k || "?")}반</option>`;
    }).join("");
    if (!classes.includes(state.classFilter)) state.classFilter = "";
    sel.value = state.classFilter;

    const list = $("#student-list");
    const vis = visibleStudents();
    $("#roster-count").textContent = `${state.students.length}명`;
    if (!state.students.length) {
      list.innerHTML = `<li class="empty">명렬표가 비어 있습니다.<br>엑셀에서 표를 복사해 붙여 넣거나<br>가상 예시로 먼저 살펴보세요.<br><button type="button" class="btn small" id="demo-inline">가상 예시 불러오기</button></li>`;
      return;
    }
    const key = recKey();
    list.innerHTML = vis
      .map((s) => {
        const st = statusOf(s.id, key);
        const no = [s.cls ? s.cls + "반" : "", s.num ? s.num + "번" : ""].filter(Boolean).join(" ");
        return `<li><button type="button" class="student-btn" data-sid="${esc(s.id)}" aria-current="${s.id === state.selected}">
          <span class="no">${esc(no)}</span><span>${esc(s.name || "(이름 없음)")}</span>
          <span class="dots" title="현재 영역 상태"><span class="dot st-${st}"></span></span></button></li>`;
      })
      .join("") || `<li class="empty">검색 결과가 없습니다.</li>`;
  }

  /* ---------- 렌더링: 작성 영역 ---------- */
  function renderWork() {
    const el = $("#work");
    const s = student();
    if (!s) {
      el.innerHTML = `<div class="empty"><h2>학생을 선택하세요</h2><p>왼쪽 명렬표에서 학생을 고르면 영역별 관찰 기록을 입력할 수 있습니다.</p></div>`;
      return;
    }
    const grade = gradeOf(s);
    const curr = rules.curriculumOf(grade);
    const area = AREAS[state.area];
    const r = getRec(s.id);
    const tabs = rules.AREA_ORDER.map((k) => {
      const a = AREAS[k];
      return `<button type="button" class="tab" role="tab" data-area="${k}" aria-selected="${k === state.area}">${esc(a.label(grade))}<span class="lim">${a.maxChars}자</span></button>`;
    }).join("");

    let context = "";
    if (state.area === "seteuk") context = seteukContext(s, r, curr);
    if (state.area === "auto") context = autoContext(r, grade);
    if (state.area === "club") context = clubContext(r);
    if (state.area === "career") context = careerContext(r);

    const blocked = state.area === "club" && ["youth", "afterSport"].includes(r.extra.clubType);
    const kwGroups = C.KEYWORDS[state.area];
    const kwHtml = Object.entries(kwGroups)
      .map(([g, list]) => `<div class="kw-group"><h4>${esc(g)}</h4><div class="chips">${list.map((k) => `<button type="button" class="chip" data-kw="${esc(k)}" aria-pressed="${r.keywords.includes(k)}">${esc(k)}</button>`).join("")}</div></div>`)
      .join("");
    const custom = r.keywords.filter((k) => !Object.values(kwGroups).flat().includes(k));

    el.innerHTML = `
      <div class="student-head">
        <h2>${esc(studentLabel(s))}</h2>
        <span class="badge">${grade}학년 · ${curr} 개정 교육과정</span>
        <button type="button" class="link-btn" data-action="toggle-info">학생 정보 수정</button>
      </div>
      <div class="field-row" id="student-info" hidden>
        <label class="field">학년<select data-sfield="grade">${["1", "2", "3"].map((g) => `<option ${g === grade ? "selected" : ""}>${g}</option>`).join("")}</select></label>
        <label class="field">반<input data-sfield="cls" value="${esc(s.cls)}" inputmode="numeric"></label>
        <label class="field">번호<input data-sfield="num" value="${esc(s.num)}" inputmode="numeric"></label>
        <label class="field">이름<input data-sfield="name" value="${esc(s.name)}"></label>
        <div class="field" style="justify-content:flex-end"><button type="button" class="btn small danger" data-action="delete-student">이 학생 삭제</button></div>
      </div>
      <div class="tabs" role="tablist" aria-label="작성 영역">${tabs}</div>
      <details class="guide-box"><summary>${esc(area.label(grade))} 작성 원칙 · 입력: ${esc(area.writer)} · 최대 ${area.maxChars}자 (${(area.maxChars * 3).toLocaleString()}Byte)</summary>
        <ul>${area.guide.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></details>
      ${context}
      ${blocked ? `<div class="notice warn">${esc(CLUB_TYPES[r.extra.clubType].note)}</div>` : `
      <div class="section-title"><h3>관찰 기록 <span class="sub">수업·활동에서 직접 관찰한 사실만 적으세요</span></h3>
        <button type="button" class="btn small" data-action="add-entry">+ 관찰 추가</button></div>
      <div class="entries">${r.entries.map((e, i) => entryHtml(e, i, state.area)).join("")}</div>
      <div class="section-title"><h3>특장점 키워드 <span class="sub">관찰로 확인한 것만 고르세요 · ${r.keywords.length}개 선택</span></h3></div>
      ${kwHtml}
      <div class="chips" style="margin-top:6px">${custom.map((k) => `<span class="chip static">${esc(k)}<button type="button" class="x" data-kw-remove="${esc(k)}" aria-label="${esc(k)} 삭제">×</button></span>`).join("")}</div>
      <div class="field-row" style="margin-top:8px"><label class="field">직접 입력 <span class="sub">쉼표로 구분 후 Enter</span><input id="kw-custom" placeholder="예: 꼼꼼한 기록"></label></div>
      <div class="options">
        <label class="field">문체<select data-opt="tone">${Object.entries(C.TONES).map(([k, t]) => `<option value="${k}" ${state.tone === k ? "selected" : ""}>${esc(t.label)} — ${esc(t.desc)}</option>`).join("")}</select></label>
        <label class="field">목표 분량<select data-opt="target">${TARGETS[state.area].map((n) => `<option value="${n}" ${state.target[state.area] === n ? "selected" : ""}>${n}자 이내 (${(n * 3).toLocaleString()}Byte)</option>`).join("")}</select></label>
        <label class="field">버전 수<select data-opt="versions">${[1, 2, 3].map((n) => `<option value="${n}" ${Number(state.versions) === n ? "selected" : ""}>${n}가지</option>`).join("")}</select></label>
        ${state.area === "behavior" ? `<label class="check"><input type="checkbox" data-opt="closing" ${state.closing ? "checked" : ""}> 마무리 문장(발전 가능성) 추가</label>` : ""}
      </div>
      <div class="actions-row">
        <button type="button" class="btn primary" data-action="generate">문구 만들기</button>
        <button type="button" class="btn" data-action="prompt">AI 윤문용 프롬프트</button>
        <button type="button" class="btn ghost" data-action="clear-memo">관찰 기록 비우기</button>
      </div>`}
    `;
  }

  function entryHtml(e, i, area) {
    const ph = {
      seteuk: ["예: 물질의 특성을 비교하는 실험에서 모둠별 관찰 결과를 발표함", "예: 측정값을 표로 정리하고 결과가 달라진 까닭을 모둠원과 비교함", "예: 학기 초에는 관찰값만 읽었으나 2학기에는 측정값을 근거로 해석을 설명함"],
      auto: ["예: 학급회의에서 학급 규칙 정하기를 진행함", "예: 친구들의 의견을 칠판에 정리하고 투표로 합의를 이끔", "예: 이후 정한 규칙을 게시하고 지키도록 친구들을 독려함"],
      club: ["예: 동아리에서 생태 관찰 일지를 작성하는 활동", "예: 교내 화단의 식물 변화를 사진과 함께 기록함", "예: 처음에는 관찰 항목이 단순했으나 점차 측정 항목을 늘림"],
      career: ["예: 진로 흥미 검사 결과를 바탕으로 관심 직업을 탐색하는 활동", "예: 관심 직업 세 가지의 하는 일과 필요한 역량을 비교함", "예: 탐색 후 관련 교과 학습 계획을 세움"],
      behavior: ["예: 청소 시간과 학급 행사", "예: 맡은 구역 외에도 어려움을 겪는 친구를 먼저 도움", "예: 학기 초에는 발표를 어려워했으나 2학기에는 학급회의에서 의견을 밝힘"],
    }[area];
    return `<div class="entry" data-eid="${esc(e.id)}">
      <div class="entry-head"><b>관찰 ${i + 1}</b>
        <label class="sr-only" for="d-${esc(e.id)}">시기</label><input id="d-${esc(e.id)}" data-efield="date" value="${esc(e.date)}" placeholder="시기 (예: 2026.05.)">
        <button type="button" class="icon-btn" data-action="remove-entry" aria-label="관찰 ${i + 1} 삭제">삭제</button></div>
      <label for="s-${esc(e.id)}">활동·장면</label><textarea id="s-${esc(e.id)}" data-efield="scene" rows="2" placeholder="${esc(ph[0])}">${esc(e.scene)}</textarea>
      <label for="a-${esc(e.id)}">관찰한 행동·발언 (구체적 사실)</label><textarea id="a-${esc(e.id)}" data-efield="action" rows="2" placeholder="${esc(ph[1])}">${esc(e.action)}</textarea>
      <label for="c-${esc(e.id)}">변화·성장 (선택)</label><textarea id="c-${esc(e.id)}" data-efield="change" rows="2" placeholder="${esc(ph[2])}">${esc(e.change)}</textarea>
    </div>`;
  }

  function stdPool(curr, subject) {
    const pool = [];
    const b = STD.builtIn(curr, subject);
    if (b) b.domains.forEach((d) => d.items.forEach((it) => pool.push({ ...it, domain: d.domain, src: "원문 내장" })));
    (state.customStd[`${curr}:${subject}`] || []).forEach((it) => {
      if (!pool.some((p) => p.code === it.code)) pool.push({ ...it, domain: "직접 추가한 성취기준", src: "직접 추가" });
    });
    return pool;
  }

  function seteukContext(s, r, curr) {
    const subjects = [...new Set([...STD.SUBJECTS, ...Object.keys(state.rec[s.id] || {}).filter((k) => k.startsWith("seteuk:")).map((k) => k.slice(7))])];
    const isArts = STD.ARTS_PE.includes(state.subject);
    const selected = r.extra.standards || [];
    const pool = stdPool(curr, state.subject);
    const builtInCount = (STD.builtIn(curr, state.subject) || { domains: [] }).domains.reduce((n, d) => n + d.items.length, 0);
    return `
      <div class="field-row">
        <label class="field">과목<select data-opt="subject">${subjects.map((x) => `<option ${x === state.subject ? "selected" : ""}>${esc(x)}</option>`).join("")}<option value="__custom">직접 입력…</option></select></label>
        <label class="field">단원·주제 <span class="sub">(참고용, 문구에 자동 삽입하지 않음)</span><input data-xfield="unit" value="${esc(r.extra.unit || "")}" placeholder="예: Ⅰ. 물질의 구성"></label>
      </div>
      ${isArts ? `<div class="notice info">체육·예술(음악/미술) 과목은 성취수준의 특성, 실기능력, 교과적성, 학습활동 참여도 및 태도 등을 입력합니다. (기재요령 p.102)</div>` : ""}
      <div class="section-title"><h3>연계 성취기준 <span class="sub">${curr} 개정 · ${esc(state.subject)} · 내장 ${builtInCount}개${pool.length - builtInCount > 0 ? ` + 직접 추가 ${pool.length - builtInCount}개` : ""}</span></h3>
        <button type="button" class="btn small" data-action="open-std">성취기준 선택</button></div>
      <div class="std-selected">${selected.length ? selected.map((x) => `<div class="std-item"><code>[${esc(x.code)}]</code><span>${esc(x.text)}</span><button type="button" class="icon-btn" data-std-remove="${esc(x.code)}" aria-label="성취기준 ${esc(x.code)} 빼기">빼기</button></div>`).join("") : `<p class="hint">선택한 성취기준이 없습니다. 성취기준은 문구에 그대로 넣지 않고, 관찰 내용이 어떤 성취수준을 보여 주는지 점검하는 기준으로 씁니다. (기재요령 p.88: 성취기준에 명시된 지식의 단순 서술 지양)</p>`}</div>`;
  }

  function autoContext(r, grade) {
    const roles = r.extra.roles || [];
    return `
      <div class="section-title"><h3>임원 활동 <span class="sub">‘전교·학년·학급’과 재임기간 병기 (기재요령 p.78)</span></h3>
        <button type="button" class="btn small" data-action="add-role">+ 임원 추가</button></div>
      <div class="roles">${roles.length ? roles.map((x, i) => `
        <div class="role-row" data-ridx="${i}">
          <select data-rfield="term" aria-label="기간 구분">${["", "1학기", "2학기"].map((t) => `<option value="${t}" ${x.term === t ? "selected" : ""}>${t || "학년"}</option>`).join("")}</select>
          <select data-rfield="scope" aria-label="임원 종류">${["전교", "학년", "학급"].map((t) => `<option ${x.scope === t ? "selected" : ""}>${t}</option>`).join("")}</select>
          <input data-rfield="title" value="${esc(x.title)}" placeholder="직책 (예: 반장, 학생자치회 부회장)" aria-label="직책">
          <input data-rfield="start" value="${esc(x.start)}" placeholder="2026.03.01." aria-label="시작일">
          <input data-rfield="end" value="${esc(x.end)}" placeholder="${grade === "3" ? "졸업일" : "학년말·학기말"}" aria-label="종료일">
          <button type="button" class="icon-btn" data-action="remove-role" aria-label="임원 ${i + 1} 삭제">삭제</button>
        </div>`).join("") : `<p class="hint">임원 활동이 없으면 비워 두세요. 재임기간은 1·2학년 3월 1일~학년말, 3학년 3월 1일~졸업일이 기본이며 학기 단위 선출은 학기 시작~종료일로 씁니다. (p.78)</p>`}</div>`;
  }

  function clubContext(r) {
    const type = r.extra.clubType || "regular";
    return `
      <div class="field-row">
        <label class="field">동아리 유형<select data-xfield="clubType">${Object.entries(CLUB_TYPES).map(([k, t]) => `<option value="${k}" ${type === k ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select></label>
        <label class="field">동아리명 <span class="sub">(나이스에서 자동 표기, 점검용)</span><input data-xfield="clubName" value="${esc(r.extra.clubName || "")}" placeholder="예: 생태탐구반"></label>
      </div>
      ${type === "self" ? `<div class="notice info">${esc(CLUB_TYPES.self.note)}</div>` : ""}`;
  }

  function careerContext(r) {
    return `
      <div class="field-row">
        <label class="field">희망분야 <span class="sub">(별도 칸 입력, 상급학교 미제공 · p.80)</span><input data-xfield="hope" value="${esc(r.extra.hope || "")}" placeholder="예: 생명과학 분야 / 진로탐색 중임."></label>
      </div>`;
  }

  /* ---------- 렌더링: 문구 ---------- */
  function renderOutput() {
    const el = $("#output");
    const s = student();
    if (!s) {
      el.innerHTML = `<div class="panel-head"><h2>문구 초안과 검수</h2></div><p class="hint">학생을 선택하면 이곳에 문구 초안, Byte, 금지 표현 점검 결과가 나타납니다.</p>`;
      return;
    }
    const r = getRec(s.id);
    const key = recKey();
    const others = otherTexts(s.id, key);
    const opts = { clubSelf: state.area === "club" && r.extra.clubType === "self", clubName: r.extra.clubName, dupWith: others };
    let html = `<div class="panel-head"><h2>문구 초안과 검수</h2><span class="count">${esc(AREAS[state.area].label(gradeOf(s)))}${state.area === "seteuk" ? " · " + esc(state.subject) : ""}</span></div>`;

    if (state.area === "career" && r.extra.hope) {
      html += `<div class="notice info"><b>희망분야</b>: ${esc(r.extra.hope)} <button type="button" class="link-btn" data-copy-text="${esc(r.extra.hope)}">복사</button></div>`;
    }

    if (r.final) {
      const a = analyze(r.final, state.area, opts);
      html += `<div class="draft final" data-final="1">
        <div class="draft-head"><b>확정 문구</b><span>${r.finalAt ? esc(new Date(r.finalAt).toLocaleString("ko-KR")) : ""}</span><span class="spacer"></span></div>
        <label class="sr-only" for="final-text">확정 문구</label>
        <textarea id="final-text" data-final-text rows="7">${esc(r.final)}</textarea>
        <div data-check>${meterHtml(a, targetBytes())}${issuesHtml(a.issues)}</div>
        <div class="draft-actions"><button type="button" class="btn small primary" data-action="copy-final">나이스용 복사</button><button type="button" class="btn small" data-action="unfinal">확정 취소</button></div>
      </div>`;
    }

    if (!r.drafts.length) {
      html += `<p class="hint">관찰 기록과 키워드를 입력한 뒤 <b>문구 만들기</b>를 누르세요. 앱 안에서 입력한 내용만 조합하며 외부로 전송하지 않습니다.</p>`;
    }
    r.drafts.forEach((d, i) => {
      const a = analyze(d.text, state.area, opts);
      html += `<div class="draft" data-didx="${i}">
        <div class="draft-head"><b>초안 ${i + 1}</b><span>${d.manual ? "직접 수정함" : d.structure ? "구조 " + esc(d.structure) : ""}${d.omitted ? ` · 분량 맞춤으로 ${d.omitted}문장 제외` : ""}</span><span class="spacer"></span></div>
        <label class="sr-only" for="draft-${i}">초안 ${i + 1}</label>
        <textarea id="draft-${i}" data-draft="${i}" rows="7">${esc(d.text)}</textarea>
        <div data-check>${meterHtml(a, targetBytes())}${issuesHtml(a.issues)}</div>
        <div class="draft-actions">
          <button type="button" class="btn small primary" data-action="finalize" data-idx="${i}">이 문구로 확정</button>
          <button type="button" class="btn small" data-action="copy-draft" data-idx="${i}">복사</button>
          <button type="button" class="btn small ghost" data-action="remove-draft" data-idx="${i}">삭제</button>
        </div></div>`;
    });
    if (r.drafts.length) html += `<p class="hint">초안은 자동 조합 결과입니다. 학생의 실제 수행과 대조해 고친 뒤 확정하세요.</p>`;
    el.innerHTML = html;
    $$(".draft textarea", el).forEach(autosize);
  }

  function autosize(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.max(120, ta.scrollHeight + 2) + "px";
  }

  function refreshCheck(container, text) {
    const s = student();
    const r = getRec(s.id);
    const a = analyze(text, state.area, { clubSelf: state.area === "club" && r.extra.clubType === "self", clubName: r.extra.clubName, dupWith: otherTexts(s.id, recKey()) });
    $("[data-check]", container).innerHTML = meterHtml(a, targetBytes()) + issuesHtml(a.issues);
  }

  /* ---------- 렌더링: 학급 전체 ---------- */
  function renderBulk() {
    const el = $("#bulk");
    const layout = $(".layout");
    el.hidden = !state.bulk;
    layout.classList.toggle("bulk-mode", state.bulk);
    $("#bulk-toggle").setAttribute("aria-pressed", String(state.bulk));
    if (!state.bulk) return;
    const key = recKey();
    const vis = visibleStudents();
    const sample = vis[0] || student();
    const label = AREAS[state.area].label(gradeOf(sample));
    const rows = vis.map((s) => {
      const r = state.rec[s.id] && state.rec[s.id][key];
      const st = statusOf(s.id, key);
      const text = r ? r.final || (r.drafts[0] && r.drafts[0].text) || "" : "";
      const a = text ? analyze(text, state.area) : null;
      const errs = a ? a.issues.filter((i) => i.level === "error").length : 0;
      const stLabel = { done: "확정", draft: "초안", memo: "메모", none: "없음" }[st];
      return `<tr><td class="num">${esc(s.cls || "")}-${esc(s.num || "")}</td><td><button type="button" class="link-btn" data-sid="${esc(s.id)}" data-go="1">${esc(s.name)}</button></td>
        <td><span class="state st-${st === "memo" ? "none" : st}">${stLabel}</span></td>
        <td class="text" style="${r && !r.final ? "color:var(--muted)" : ""}">${esc(text)}</td>
        <td class="num">${a ? a.bytes.toLocaleString() + "B" : ""}</td><td class="num">${errs ? `<span style="color:var(--err);font-weight:700">${errs}</span>` : a ? "0" : ""}</td></tr>`;
    });
    const done = vis.filter((s) => statusOf(s.id, key) === "done").length;
    el.innerHTML = `
      <div class="bulk-head"><h2>학급 전체 보기 · ${esc(label)}${state.area === "seteuk" ? " · " + esc(state.subject) : ""}</h2>
        <select data-opt="area-bulk" aria-label="영역">${rules.AREA_ORDER.map((k) => `<option value="${k}" ${k === state.area ? "selected" : ""}>${esc(AREAS[k].label(gradeOf(sample)))}</option>`).join("")}</select>
        <button type="button" class="btn small" data-action="bulk-generate">메모 있는 학생 초안 일괄 생성</button>
        <button type="button" class="btn small" data-action="bulk-copy">확정 문구 전체 복사</button>
        <button type="button" class="btn small" data-action="bulk-csv">CSV 저장</button>
        <button type="button" class="btn small" data-action="bulk-txt">TXT 저장</button>
        <button type="button" class="btn small" data-action="print">인쇄</button></div>
      <p class="hint">표시 ${vis.length}명 중 확정 ${done}명 · 확정되지 않은 학생은 첫 번째 초안을 회색으로 보여 줍니다. 내보내기에는 <b>확정 문구만</b> 들어갑니다.</p>
      <div class="table-wrap"><table class="grid"><thead><tr><th>반-번호</th><th>이름</th><th>상태</th><th>문구</th><th>Byte</th><th>금지</th></tr></thead><tbody>${rows.join("") || `<tr><td colspan="6" class="empty">학생이 없습니다.</td></tr>`}</tbody></table></div>`;
  }

  function renderAll() {
    renderRoster();
    renderWork();
    renderOutput();
    renderBulk();
  }

  /* ---------- 문구 생성 ---------- */
  function draftsFor(s, r, area) {
    const out = [];
    for (let v = 0; v < Number(state.versions); v++) {
      const res = C.compose({
        areaKey: area,
        entries: r.entries,
        keywords: r.keywords,
        roles: r.extra.roles,
        tone: state.tone,
        version: v,
        seed: s.id + "|" + recKey(),
        targetBytes: area === "club" && r.extra.clubType === "self" ? 90 : targetBytes(area),
        closing: state.closing,
        names: allNames(),
      });
      if (res.empty) break;
      if (out.some((d) => d.text === res.text)) continue;
      out.push({ text: res.text, manual: false, omitted: res.omitted, structure: res.structure });
    }
    return out;
  }

  function generate() {
    const s = student();
    if (!s) return;
    const r = getRec(s.id);
    if (!hasMemo(r) && !r.keywords.length && !(r.extra.roles || []).some((x) => x.title)) {
      toast("관찰 기록이나 키워드를 먼저 입력하세요.");
      return;
    }
    if (r.drafts.some((d) => d.manual) && !confirm("직접 고친 초안이 있습니다. 새로 만들면 기존 초안을 바꿉니다. 계속할까요?")) return;
    r.drafts = draftsFor(s, r, state.area);
    save();
    renderOutput();
    renderRoster();
    toast(`초안 ${r.drafts.length}개를 만들었습니다.`);
  }

  function bulkGenerate() {
    const key = recKey();
    let n = 0;
    visibleStudents().forEach((s) => {
      const r = state.rec[s.id] && state.rec[s.id][key];
      if (!r || r.final || (r.drafts && r.drafts.length)) return;
      if (!hasMemo(r) && !r.keywords.length) return;
      r.drafts = draftsFor(s, r, state.area);
      if (r.drafts.length) n++;
    });
    save();
    renderAll();
    toast(n ? `${n}명의 초안을 만들었습니다. 학생별로 검토 후 확정하세요.` : "새로 만들 학생이 없습니다. (메모가 있고 초안·확정 문구가 없는 학생만 대상)");
  }

  /* ---------- 확정 ---------- */
  function askConfirm(onOk) {
    if (skipConfirm) return onOk();
    pendingConfirm = onOk;
    const list = $("#confirm-list");
    list.innerHTML = rules.FINAL_CHECKLIST.map((c, i) => `<li><label><input type="checkbox" data-ci="${i}"> <span>${esc(c)}</span></label></li>`).join("");
    $("#confirm-ok").disabled = true;
    $("#confirm-skip").checked = false;
    $("#confirm-dialog").showModal();
  }

  /* ---------- 내보내기 ---------- */
  function finalsForExport() {
    const key = recKey();
    return visibleStudents()
      .map((s) => ({ s, r: state.rec[s.id] && state.rec[s.id][key] }))
      .filter((x) => x.r && x.r.final);
  }
  // 일부 환경에서 한글 파일 이름이 'download'로 바뀌는 문제를 피하려고 영문 이름 사용 (내용은 한글 그대로)
  function exportName(ext) {
    return `srm2026-${state.area}-${today()}.${ext}`; // 과목명은 파일 안 ‘과목’ 열에 들어감
  }
  function csvCell(v) {
    const t = String(v == null ? "" : v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  }

  /* ---------- 명렬표 가져오기 ---------- */
  function openRosterDialog(mode) {
    rosterRows = [];
    rosterMap = null;
    $("#roster-paste").value = "";
    $("#roster-paste-wrap").hidden = mode !== "paste";
    $("#sheet-pick-wrap").hidden = mode !== "sheet";
    $("#roster-replace").checked = false;
    $("#roster-default-hint").textContent = `학년 열이 없으면 ${state.grade}학년으로 넣습니다. (기본 학년은 학생 정보에서 바꿀 수 있습니다)`;
    renderRosterMap();
    $("#roster-dialog").showModal();
  }

  function guessMap(rows) {
    const map = { grade: -1, cls: -1, num: -1, name: -1, header: -1 };
    for (let i = 0; i < Math.min(6, rows.length); i++) {
      const row = rows[i].map((c) => String(c).replace(/\s/g, ""));
      const nameIdx = row.findIndex((c) => /^(이름|성명|학생명|학생이름)$/.test(c));
      if (nameIdx >= 0) {
        map.header = i;
        map.name = nameIdx;
        map.grade = row.findIndex((c) => /^학년$/.test(c));
        map.cls = row.findIndex((c) => /^(반|학급)$/.test(c));
        map.num = row.findIndex((c) => /^(번호|번|출석번호)$/.test(c));
        return map;
      }
    }
    const width = Math.max(...rows.slice(0, 10).map((r) => r.length), 0);
    const isName = (v) => /^[가-힣]{2,5}$/.test(String(v).trim()) || /^[A-Za-z][A-Za-z\s.'-]{1,30}$/.test(String(v).trim());
    for (let c = 0; c < width; c++) {
      const sample = rows.slice(0, 10).map((r) => r[c] || "");
      if (sample.filter(isName).length >= Math.max(1, Math.ceil(sample.filter(Boolean).length * 0.6))) {
        map.name = c;
        break;
      }
    }
    if (map.name < 0) map.name = width - 1;
    const numericBefore = [];
    for (let c = 0; c < map.name; c++) {
      if (rows.slice(0, 10).every((r) => !r[c] || /^\d{1,3}$/.test(String(r[c]).trim()))) numericBefore.push(c);
    }
    if (numericBefore.length >= 3) [map.grade, map.cls, map.num] = numericBefore.slice(-3);
    else if (numericBefore.length === 2) [map.cls, map.num] = numericBefore;
    else if (numericBefore.length === 1) map.num = numericBefore[0];
    return map;
  }

  function renderRosterMap() {
    const box = $("#roster-map");
    const prev = $("#roster-preview");
    if (!rosterRows.length) {
      box.innerHTML = "";
      prev.innerHTML = "";
      return;
    }
    if (!rosterMap) rosterMap = guessMap(rosterRows);
    const map = rosterMap;
    const width = Math.max(...rosterRows.slice(0, 20).map((r) => r.length));
    const colOpts = (sel) => `<option value="-1">(없음)</option>` + Array.from({ length: width }, (_, c) => `<option value="${c}" ${sel === c ? "selected" : ""}>${String.fromCharCode(65 + (c % 26))}열: ${esc(String((rosterRows[map.header + 1] || rosterRows[0] || [])[c] || "").slice(0, 8))}</option>`).join("");
    box.innerHTML = [["grade", "학년"], ["cls", "반"], ["num", "번호"], ["name", "이름"]].map(([k, l]) => `<label>${l}<select data-map="${k}">${colOpts(map[k])}</select></label>`).join("");
    const body = rosterRows.slice(map.header + 1, map.header + 9);
    prev.innerHTML = `<tr><th>학년</th><th>반</th><th>번호</th><th>이름</th></tr>` + body.map((r) => `<tr>${["grade", "cls", "num", "name"].map((k) => `<td>${esc(map[k] >= 0 ? r[map[k]] || "" : k === "grade" ? state.grade : "")}</td>`).join("")}</tr>`).join("") + (rosterRows.length - map.header - 1 > 8 ? `<tr><td colspan="4">… 모두 ${rosterRows.length - map.header - 1}행</td></tr>` : "");
  }

  function applyRoster() {
    if (!rosterRows.length) {
      toast("불러올 내용이 없습니다.");
      return;
    }
    const map = rosterMap;
    if (!map || map.name < 0) {
      toast("이름 열을 지정하세요.");
      return;
    }
    if ($("#roster-replace").checked) {
      if (!confirm("기존 명렬표와 학생별 기록을 모두 지우고 새로 불러옵니다. 계속할까요?")) return;
      state.students = [];
      state.rec = {};
      state.selected = null;
    }
    const clean = (v) => String(v == null ? "" : v).trim().replace(/(학년|반|번)$/, "");
    let added = 0;
    rosterRows.slice(map.header + 1).forEach((r) => {
      const name = String(r[map.name] || "").trim();
      if (!name || /^(이름|성명)$/.test(name)) return;
      const st = {
        id: uid(),
        grade: map.grade >= 0 ? clean(r[map.grade]) || state.grade : state.grade,
        cls: map.cls >= 0 ? clean(r[map.cls]) : "",
        num: map.num >= 0 ? clean(r[map.num]) : "",
        name,
      };
      if (state.students.some((x) => x.name === st.name && x.grade === st.grade && x.cls === st.cls && x.num === st.num)) return;
      state.students.push(st);
      added++;
    });
    sortStudents();
    if (!state.selected && state.students[0]) state.selected = state.students[0].id;
    save(true);
    $("#roster-dialog").close();
    renderAll();
    toast(`${added}명을 불러왔습니다.`);
  }

  /* ---------- 성취기준 대화상자 ---------- */
  function renderStdDialog() {
    const s = student();
    if (!s) return;
    const curr = rules.curriculumOf(gradeOf(s));
    const r = getRec(s.id);
    const selected = new Set((r.extra.standards || []).map((x) => x.code));
    const q = ($("#std-search").value || "").trim();
    const pool = stdPool(curr, state.subject).filter((x) => !q || x.code.includes(q) || x.text.includes(q));
    const b = STD.builtIn(curr, state.subject);
    $("#std-dialog-title").textContent = `성취기준 선택 · ${curr} 개정 · ${state.subject}`;
    $("#std-source").innerHTML = b
      ? `출처: ${esc(b.source)} (국가교육과정정보센터 원문, 공공누리 제2유형)`
      : `<span class="notice warn" style="display:block">이 과목의 ${curr} 개정 성취기준은 아직 내장되지 않았습니다. 아래 ‘붙여넣어 추가’로 교육과정 원문의 성취기준을 넣을 수 있습니다.</span>`;
    let html = "";
    let lastDomain = null;
    pool.forEach((x) => {
      if (x.domain !== lastDomain) {
        html += `<div class="std-domain">${esc(x.domain)}</div>`;
        lastDomain = x.domain;
      }
      html += `<label class="std-row"><input type="checkbox" data-std="${esc(x.code)}" ${selected.has(x.code) ? "checked" : ""}><span><code>[${esc(x.code)}]</code> ${esc(x.text)}${x.src === "직접 추가" ? ` <span class="src">(직접 추가)</span>` : ""}</span></label>`;
    });
    $("#std-list").innerHTML = html || `<p class="empty">표시할 성취기준이 없습니다.</p>`;
  }

  /* ---------- 기재요령 요약 ---------- */
  function renderGuide() {
    const limits = rules.AREA_ORDER.map((k) => {
      const a = AREAS[k];
      const name = k === "auto" ? "자율·자치활동 (3학년은 자율활동)" : a.label("2");
      return `<tr><td>${esc(name)}</td><td>${a.maxChars}자 (${(a.maxChars * 3).toLocaleString()}Byte)</td><td>${esc(a.writer)}</td><td>${esc(a.basis)}</td></tr>`;
    }).join("");
    const banned = [...new Map(rules.PROHIBITED.map((p) => [p.label, p])).values()]
      .map((p) => `<li>${p.level === "error" ? "<b>[기재 불가]</b>" : "[확인 필요]"} ${esc(p.label)} <span class="hint">(${esc(p.basis)})</span></li>`)
      .join("");
    $("#guide-body").innerHTML = `
      <p class="hint">출처: ${esc(rules.SOURCE)}. 쪽수는 원문 PDF 기준입니다. 이 요약은 작성 보조용이며 원문을 대신하지 않습니다.</p>
      <h3>2026학년도 학년별 적용 교육과정</h3>
      <ul><li>중학교 1·2학년: 2022 개정 교육과정 → 창체 영역은 <b>자율·자치활동, 동아리활동, 진로활동</b> (봉사활동은 각 영역과 연계)</li>
      <li>중학교 3학년: 2015 개정 교육과정 → 창체 영역은 <b>자율활동, 동아리활동, 봉사활동, 진로활동</b> (p.73, 부칙 p.133)</li></ul>
      <h3>영역별 입력 가능 최대 글자 수 (p.162)</h3>
      <table><tr><th>영역</th><th>최대</th><th>입력</th><th>근거</th></tr>${limits}
      <tr><td>자유학기활동 (진로탐색·주제선택 등)</td><td>각 1,000자</td><td>담당 교사</td><td>p.108-110, p.162</td></tr></table>
      <ul><li>나이스 입력 단위는 Byte: 한글 1자 = 3Byte, 영문·숫자 1자 = 1Byte, 엔터 = 1Byte (p.162)</li><li>최대 글자 수는 학년 단위 기준 (창체·독서·행특, p.162)</li>
      <li>그 밖의 기호(·, ‘ ’ 등)는 기재요령에 바이트 수가 명시되어 있지 않아 이 앱은 UTF-8 길이로 계산합니다. 실제 나이스 표시와 다를 수 있습니다.</li></ul>
      <h3>교사 작성 원칙 (p.19 유의사항 4)</h3>
      <ul><li>서술형 항목은 교사가 평소 학생을 직접 관찰·평가한 내용을 바탕으로 작성</li>
      <li>항목과 관련 없는 내용, 과장·부풀림, 허위 기재 금지 (허위 기재는 징계 감경 제외)</li>
      <li>학생에게 서술형 항목 내용을 작성·제출하게 하는 행위 금지</li>
      <li><b>AI로 생성한 자료를 서술형 항목에 그대로 입력하는 행위 금지</b> — 윤문 보조로 쓴 경우 입력 전 허위·과장 여부와 유의사항 준수 여부를 철저히 확인</li></ul>
      <h3>이 앱이 자동 점검하는 기재 금지·주의 항목</h3>
      <ul>${banned}</ul>
      <p class="hint">자동 점검은 표현을 찾아 주는 보조 기능입니다. 표현이 없어도 맥락상 금지 사항일 수 있고, 표시되어도 허용되는 경우(예: 교육관련기관명)가 있으니 원문 기준으로 판단하세요.</p>`;
  }

  /* ---------- 가상 예시 ---------- */
  function loadDemo() {
    if (state.students.length && !confirm("현재 명렬표 뒤에 가상 예시 학생 3명을 추가합니다. 계속할까요?")) return;
    const mk = (num, name) => ({ id: uid(), grade: "2", cls: "9", num: String(num), name });
    const a = mk(1, "가상학생가");
    const b = mk(2, "가상학생나");
    const c = mk(3, "가상학생다");
    state.students.push(a, b, c);
    const set = (sid, key, rec) => {
      state.rec[sid] = state.rec[sid] || {};
      state.rec[sid][key] = Object.assign({ entries: [], keywords: [], extra: {}, drafts: [], final: "", finalAt: null }, rec);
    };
    set(a.id, "seteuk:과학", {
      entries: [
        { id: uid(), date: "2026.04.", scene: "물질의 특성을 비교하는 실험에서 모둠별 관찰 결과를 발표했다", action: "서로 다른 시료의 측정값을 표로 정리하고 결과가 달라진 까닭을 모둠원과 비교함", change: "학기 초에는 관찰값만 읽었으나 2학기에는 측정 결과의 차이를 근거로 자신의 해석을 설명함" },
        { id: uid(), date: "2026.06.", scene: "상태 변화 모형 만들기 활동", action: "온도를 높이기 전후의 입자 운동을 화살표로 표현하고 두 그림의 차이를 설명함", change: "" },
      ],
      keywords: ["자료 해석", "근거 제시", "모형 활용"],
      extra: { unit: "(가상) 물질의 특성" },
    });
    set(b.id, "seteuk:과학", {
      entries: [{ id: uid(), date: "2026.05.", scene: "모둠 탐구에서 변인을 정하는 토의", action: "온도 외의 조건을 같게 해야 한다고 제안하고 실험 순서를 모둠원과 함께 정리함", change: "" }],
      keywords: ["변인 통제", "협업"],
      extra: {},
    });
    set(a.id, "behavior", {
      entries: [{ id: uid(), date: "", scene: "청소 시간과 학급 행사", action: "맡은 구역 외에도 어려움을 겪는 친구를 먼저 도움", change: "학기 초에는 발표를 어려워했으나 2학기에는 학급회의에서 자신의 의견을 밝힘" }],
      keywords: ["배려", "성실함"],
      extra: {},
    });
    set(c.id, "auto", {
      entries: [{ id: uid(), date: "2026.03.", scene: "학급회의에서 학급 규칙 정하기를 진행함", action: "친구들의 의견을 칠판에 정리하고 투표로 합의하도록 이끔", change: "" }],
      keywords: ["합의 도출", "책임감"],
      extra: { roles: [{ term: "1학기", scope: "학급", title: "반장", start: "2026.03.01.", end: "2026.08.18." }] },
    });
    state.subject = "과학";
    state.area = "seteuk";
    state.selected = a.id;
    save(true);
    renderAll();
    toast("가상 예시 학생 3명을 불러왔습니다. (실제 학생 정보 아님)");
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener("click", (ev) => {
    const t = ev.target;
    const opener = t.closest("[data-open]");
    if (opener) {
      const id = opener.dataset.open;
      if (id === "guide-dialog") renderGuide();
      if (id === "count-dialog") initCount();
      $("#" + id).showModal();
      return;
    }
    if (t.closest("[data-close]")) {
      t.closest("dialog").close();
      if (t.closest("#std-dialog")) {
        renderWork();
        renderOutput();
      }
      return;
    }
    const menuBtn = t.closest("#data-menu-btn");
    const menu = $("#data-menu");
    if (menuBtn) {
      menu.hidden = !menu.hidden;
      menuBtn.setAttribute("aria-expanded", String(!menu.hidden));
      return;
    }
    if (!t.closest("#data-menu")) menu.hidden = true;

    const sbtn = t.closest("[data-sid]");
    if (sbtn) {
      state.selected = sbtn.dataset.sid;
      if (sbtn.dataset.go) state.bulk = false;
      save();
      renderAll();
      return;
    }
    if (t.closest("#demo-inline") || t.closest("#demo-btn")) {
      menu.hidden = true;
      loadDemo();
      return;
    }
    const tab = t.closest("[data-area]");
    if (tab) {
      state.area = tab.dataset.area;
      save();
      renderAll();
      return;
    }
    const kw = t.closest("[data-kw]");
    if (kw) {
      const r = getRec(state.selected);
      const k = kw.dataset.kw;
      r.keywords = r.keywords.includes(k) ? r.keywords.filter((x) => x !== k) : [...r.keywords, k];
      kw.setAttribute("aria-pressed", String(r.keywords.includes(k)));
      save();
      renderRoster();
      const sub = kw.closest(".work").querySelectorAll(".section-title .sub")[1];
      if (sub) sub.textContent = `관찰로 확인한 것만 고르세요 · ${r.keywords.length}개 선택`;
      return;
    }
    const kwr = t.closest("[data-kw-remove]");
    if (kwr) {
      const r = getRec(state.selected);
      r.keywords = r.keywords.filter((x) => x !== kwr.dataset.kwRemove);
      save();
      renderWork();
      return;
    }
    const stdr = t.closest("[data-std-remove]");
    if (stdr) {
      const r = getRec(state.selected);
      r.extra.standards = (r.extra.standards || []).filter((x) => x.code !== stdr.dataset.stdRemove);
      save();
      renderWork();
      return;
    }
    const cp = t.closest("[data-copy-text]");
    if (cp) return void copyText(cp.dataset.copyText);

    const act = t.closest("[data-action]");
    if (!act) return;
    const action = act.dataset.action;
    const s = student();
    const r = s ? getRec(s.id) : null;
    switch (action) {
      case "toggle-info": {
        const box = $("#student-info");
        box.hidden = !box.hidden;
        break;
      }
      case "delete-student":
        if (confirm(`${studentLabel(s)} 학생과 모든 기록을 삭제할까요? 되돌릴 수 없습니다.`)) {
          state.students = state.students.filter((x) => x.id !== s.id);
          delete state.rec[s.id];
          state.selected = state.students[0] ? state.students[0].id : null;
          save(true);
          renderAll();
          toast("삭제했습니다.");
        }
        break;
      case "add-entry":
        r.entries.push(newEntry());
        save();
        renderWork();
        $$(".entry").slice(-1)[0].querySelector("textarea").focus();
        break;
      case "remove-entry": {
        const eid = act.closest(".entry").dataset.eid;
        const e = r.entries.find((x) => x.id === eid);
        if ((e.scene || e.action || e.change) && !confirm("이 관찰 기록을 삭제할까요?")) break;
        r.entries = r.entries.filter((x) => x.id !== eid);
        if (!r.entries.length) r.entries.push(newEntry());
        save();
        renderWork();
        renderRoster();
        break;
      }
      case "clear-memo":
        if (confirm("이 영역의 관찰 기록과 키워드를 비울까요? (확정 문구는 유지)")) {
          r.entries = [newEntry()];
          r.keywords = [];
          save();
          renderWork();
          renderRoster();
        }
        break;
      case "add-role":
        r.extra.roles = r.extra.roles || [];
        r.extra.roles.push({ term: "", scope: "학급", title: "", start: "2026.03.01.", end: "" });
        save();
        renderWork();
        break;
      case "remove-role": {
        const i = Number(act.closest(".role-row").dataset.ridx);
        r.extra.roles.splice(i, 1);
        save();
        renderWork();
        break;
      }
      case "open-std":
        $("#std-search").value = "";
        $("#std-paste").value = "";
        $("#std-parse-result").textContent = "";
        renderStdDialog();
        $("#std-dialog").showModal();
        break;
      case "generate":
        generate();
        break;
      case "prompt": {
        const curr = rules.curriculumOf(gradeOf(s));
        const extra = [];
        if (state.area === "seteuk" && r.extra.unit) extra.push("단원·주제: " + r.extra.unit);
        if (state.area === "club" && r.extra.clubName) extra.push("동아리: " + r.extra.clubName + " (" + CLUB_TYPES[r.extra.clubType || "regular"].label + ")");
        if (state.area === "career" && r.extra.hope) extra.push("희망분야(별도 칸 입력, 문구에 넣지 않아도 됨): " + r.extra.hope);
        if (state.area === "auto") (r.extra.roles || []).filter((x) => x.title).forEach((x) => extra.push(`임원: ${[x.term, x.scope, x.title].filter(Boolean).join(" ")}(${[x.start, x.end].filter(Boolean).join("-")})`));
        $("#prompt-text").value = C.buildPrompt({
          areaKey: state.area,
          grade: gradeOf(s),
          subject: state.area === "seteuk" ? state.subject : "",
          names: allNames(),
          targetBytes: targetBytes(),
          versions: state.versions,
          standards: state.area === "seteuk" ? r.extra.standards || [] : [],
          extra: extra.length ? extra : null,
          entries: r.entries,
          keywords: r.keywords,
          curriculum: curr,
        });
        $("#prompt-dialog").showModal();
        break;
      }
      case "finalize": {
        const i = Number(act.dataset.idx);
        const text = r.drafts[i].text.trim();
        if (!text) return toast("빈 문구는 확정할 수 없습니다.");
        const a = analyze(text, state.area);
        const errs = a.issues.filter((x) => x.level === "error");
        if (errs.length && !confirm(`기재 불가로 감지된 항목이 ${errs.length}개 있습니다.\n- ${errs.map((e) => e.label).join("\n- ")}\n\n그래도 확정할까요?`)) return;
        askConfirm(() => {
          r.final = text;
          r.finalAt = Date.now();
          save(true);
          renderOutput();
          renderRoster();
          toast("확정했습니다.");
        });
        break;
      }
      case "unfinal":
        if (confirm("확정을 취소할까요? 확정 문구는 초안 목록 맨 앞으로 옮깁니다.")) {
          r.drafts.unshift({ text: r.final, manual: true });
          r.final = "";
          r.finalAt = null;
          save();
          renderOutput();
          renderRoster();
        }
        break;
      case "copy-final":
        copyText(r.final);
        break;
      case "copy-draft":
        copyText(r.drafts[Number(act.dataset.idx)].text);
        break;
      case "remove-draft":
        r.drafts.splice(Number(act.dataset.idx), 1);
        save();
        renderOutput();
        renderRoster();
        break;
      case "bulk-generate":
        bulkGenerate();
        break;
      case "bulk-copy": {
        const list = finalsForExport();
        if (!list.length) return toast("확정 문구가 없습니다.");
        copyText(list.map(({ s: st, r: rr }) => `${studentLabel(st)}\n${rr.final}`).join("\n\n"));
        break;
      }
      case "bulk-csv": {
        const list = finalsForExport();
        if (!list.length) return toast("확정 문구가 없습니다.");
        const head = ["학년", "반", "번호", "이름", "영역", "과목", "문구", "Byte", "공백포함글자수"];
        const lines = [head.join(",")].concat(
          list.map(({ s: st, r: rr }) => [st.grade, st.cls, st.num, st.name, AREAS[state.area].label(gradeOf(st)), state.area === "seteuk" ? state.subject : "", rr.final, rules.countBytes(rr.final), rules.countChars(rr.final)].map(csvCell).join(","))
        );
        download(exportName("csv"), "﻿" + lines.join("\r\n"), "text/csv;charset=utf-8");
        break;
      }
      case "bulk-txt": {
        const list = finalsForExport();
        if (!list.length) return toast("확정 문구가 없습니다.");
        download(exportName("txt"), list.map(({ s: st, r: rr }) => `[${studentLabel(st)}] (${rules.countBytes(rr.final)}Byte)\n${rr.final}`).join("\n\n"));
        break;
      }
      case "print":
        window.print();
        break;
    }
  });

  document.addEventListener("input", (ev) => {
    const t = ev.target;
    const s = student();
    if (t.matches("[data-efield]")) {
      const r = getRec(s.id);
      const e = r.entries.find((x) => x.id === t.closest(".entry").dataset.eid);
      e[t.dataset.efield] = t.value;
      save();
      if (t.dataset.efield !== "date") renderRoster();
      return;
    }
    if (t.matches("[data-xfield]") && t.tagName !== "SELECT") {
      getRec(s.id).extra[t.dataset.xfield] = t.value;
      save();
      return;
    }
    if (t.matches("[data-rfield]") && t.tagName !== "SELECT") {
      const r = getRec(s.id);
      r.extra.roles[Number(t.closest(".role-row").dataset.ridx)][t.dataset.rfield] = t.value;
      save();
      return;
    }
    if (t.matches("[data-sfield]") && t.tagName !== "SELECT") {
      s[t.dataset.sfield] = t.value.trim();
      save();
      $(".student-head h2").textContent = studentLabel(s);
      renderRoster();
      return;
    }
    if (t.matches("[data-draft]")) {
      const r = getRec(s.id);
      const d = r.drafts[Number(t.dataset.draft)];
      d.text = t.value;
      d.manual = true;
      save();
      autosize(t);
      refreshCheck(t.closest(".draft"), t.value);
      return;
    }
    if (t.matches("[data-final-text]")) {
      const r = getRec(s.id);
      r.final = t.value;
      save();
      autosize(t);
      refreshCheck(t.closest(".draft"), t.value);
      return;
    }
    if (t.id === "roster-search") return renderRoster();
    if (t.id === "roster-paste") {
      rosterMap = null;
      rosterRows = sheet.parseDelimited(t.value);
      renderRosterMap();
      return;
    }
    if (t.id === "std-search") return renderStdDialog();
    if (t.id === "count-text") return renderCount();
  });

  document.addEventListener("change", (ev) => {
    const t = ev.target;
    const s = student();
    if (t.matches("[data-opt]")) {
      const k = t.dataset.opt;
      if (k === "subject") {
        if (t.value === "__custom") {
          const name = (prompt("과목명을 입력하세요. (예: 학교자율시간 과목명)") || "").trim();
          if (name) state.subject = name;
        } else state.subject = t.value;
        save();
        renderAll();
        return;
      }
      if (k === "area-bulk") {
        state.area = t.value;
        save();
        renderAll();
        return;
      }
      if (k === "target") state.target[state.area] = Number(t.value);
      else if (k === "versions") state.versions = Number(t.value);
      else if (k === "closing") state.closing = t.checked;
      else state[k] = t.value;
      save();
      return;
    }
    if (t.matches("[data-xfield]") && t.tagName === "SELECT") {
      getRec(s.id).extra[t.dataset.xfield] = t.value;
      save();
      renderWork();
      renderOutput();
      return;
    }
    if (t.matches("[data-rfield]") && t.tagName === "SELECT") {
      getRec(s.id).extra.roles[Number(t.closest(".role-row").dataset.ridx)][t.dataset.rfield] = t.value;
      save();
      return;
    }
    if (t.matches("[data-sfield]") && t.tagName === "SELECT") {
      s.grade = t.value;
      state.grade = t.value;
      save();
      renderAll();
      return;
    }
    if (t.matches("[data-map]")) {
      rosterMap[t.dataset.map] = Number(t.value);
      renderRosterMap();
      return;
    }
    if (t.matches("[data-std]")) {
      const r = getRec(s.id);
      const curr = rules.curriculumOf(gradeOf(s));
      const item = stdPool(curr, state.subject).find((x) => x.code === t.dataset.std);
      r.extra.standards = (r.extra.standards || []).filter((x) => x.code !== t.dataset.std);
      if (t.checked && item) r.extra.standards.push({ code: item.code, text: item.text });
      save();
      return;
    }
    if (t.matches("[data-ci]")) {
      $("#confirm-ok").disabled = $$("#confirm-list input").some((x) => !x.checked);
      return;
    }
    if (t.id === "roster-class") {
      state.classFilter = t.value;
      save();
      renderRoster();
      renderBulk();
      return;
    }
    if (t.id === "sheet-pick") {
      rosterMap = null;
      rosterRows = rosterSheets[Number(t.value)].rows.slice();
      renderRosterMap();
      return;
    }
    if (t.id === "count-area") return renderCount();
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.target.id === "kw-custom" && ev.key === "Enter") {
      ev.preventDefault();
      const r = getRec(state.selected);
      ev.target.value
        .split(/[,，]/)
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((k) => !r.keywords.includes(k) && r.keywords.push(k));
      save();
      renderWork();
      $("#kw-custom").focus();
    }
  });

  /* 단일 버튼들 */
  $("#paste-roster-btn").addEventListener("click", () => openRosterDialog("paste"));
  $("#file-roster-btn").addEventListener("click", () => $("#file-input").click());
  $("#add-student-btn").addEventListener("click", () => {
    const sameClass = state.students.filter((x) => x.grade === state.grade);
    const last = sameClass[sameClass.length - 1];
    const st = { id: uid(), grade: state.grade, cls: last ? last.cls : "", num: last && last.num ? String(Number(last.num) + 1) : "1", name: "" };
    state.students.push(st);
    state.selected = st.id;
    save();
    renderAll();
    $("#student-info").hidden = false;
    $('[data-sfield="name"]').focus();
  });
  $("#roster-apply").addEventListener("click", applyRoster);
  $("#file-input").addEventListener("change", async (ev) => {
    const f = ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    try {
      if (/\.xlsx$/i.test(f.name)) {
        rosterSheets = await sheet.readXlsx(await f.arrayBuffer());
        if (!rosterSheets.length) throw new Error("워크시트를 찾지 못했습니다.");
        openRosterDialog("sheet");
        $("#sheet-pick").innerHTML = rosterSheets.map((x, i) => `<option value="${i}">${esc(x.name)} (${x.rows.length}행)</option>`).join("");
        rosterMap = null;
        rosterRows = rosterSheets[0].rows.slice();
        renderRosterMap();
      } else if (/\.xls$/i.test(f.name)) {
        toast("예전 형식(.xls)은 읽을 수 없습니다. 엑셀에서 .xlsx로 저장하거나 표를 복사해 붙여 넣으세요.");
      } else {
        const text = await f.text();
        openRosterDialog("paste");
        $("#roster-paste").value = text;
        rosterMap = null;
        rosterRows = sheet.parseDelimited(text);
        renderRosterMap();
      }
    } catch (e) {
      toast(e.message || "파일을 읽지 못했습니다.");
    }
  });
  $("#bulk-toggle").addEventListener("click", () => {
    state.bulk = !state.bulk;
    save();
    renderAll();
  });
  $("#confirm-ok").addEventListener("click", () => {
    if ($("#confirm-skip").checked) skipConfirm = true;
    $("#confirm-dialog").close();
    const fn = pendingConfirm;
    pendingConfirm = null;
    if (fn) fn();
  });
  $("#prompt-copy").addEventListener("click", () => copyText($("#prompt-text").value));
  $("#std-add-btn").addEventListener("click", () => {
    const s = student();
    const curr = rules.curriculumOf(gradeOf(s));
    const found = STD.parse($("#std-paste").value);
    if (!found.length) {
      $("#std-parse-result").textContent = "[코드] 형식의 성취기준을 찾지 못했습니다.";
      return;
    }
    const key = `${curr}:${state.subject}`;
    const list = state.customStd[key] || [];
    let n = 0;
    found.forEach((x) => {
      if (!list.some((y) => y.code === x.code)) {
        list.push(x);
        n++;
      }
    });
    state.customStd[key] = list;
    save();
    $("#std-parse-result").textContent = `${found.length}개 찾음, ${n}개 새로 추가`;
    $("#std-paste").value = "";
    renderStdDialog();
  });

  /* 백업·복원·초기화 */
  $("#backup-btn").addEventListener("click", () => {
    $("#data-menu").hidden = true;
    flush();
    download(`srm2026-backup-${today()}.json`, JSON.stringify({ app: "srm2026-middle", version: 1, savedAt: new Date().toISOString(), state }, null, 1), "application/json");
    toast("백업 파일을 저장했습니다. 학생 개인정보가 들어 있으니 안전하게 보관하세요.");
  });
  $("#restore-btn").addEventListener("click", () => {
    $("#data-menu").hidden = true;
    $("#restore-input").click();
  });
  $("#restore-input").addEventListener("change", async (ev) => {
    const f = ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      if (obj.app !== "srm2026-middle" || !obj.state) throw new Error("이 앱의 백업 파일이 아닙니다.");
      if (!confirm(`백업(${obj.savedAt ? new Date(obj.savedAt).toLocaleString("ko-KR") : "날짜 미상"})을 불러오면 현재 기기의 자료를 덮어씁니다. 계속할까요?`)) return;
      state = hydrate(obj.state);
      save(true);
      renderAll();
      toast("백업을 불러왔습니다.");
    } catch (e) {
      toast(e.message || "백업 파일을 읽지 못했습니다.");
    }
  });
  $("#wipe-btn").addEventListener("click", () => {
    $("#data-menu").hidden = true;
    if (!confirm("이 기기에 저장된 명렬표, 관찰 기록, 문구를 모두 지웁니다. 먼저 백업 파일을 저장했는지 확인하세요. 계속할까요?")) return;
    if (!confirm("정말 모두 지울까요? 되돌릴 수 없습니다.")) return;
    localStorage.removeItem(STORE_KEY);
    state = defaults();
    renderAll();
    setSaveState("", "자료를 모두 지웠습니다");
  });

  /* 글자 수 검사 */
  function initCount() {
    const sel = $("#count-area");
    sel.innerHTML = rules.AREA_ORDER.map((k) => `<option value="${k}" ${k === state.area ? "selected" : ""}>${esc(k === "auto" ? "자율·자치활동(3학년 자율활동)" : AREAS[k].label("2"))} · ${AREAS[k].maxChars}자</option>`).join("");
    renderCount();
  }
  function renderCount() {
    const text = $("#count-text").value;
    const a = analyze(text, $("#count-area").value || "seteuk");
    $("#count-result").innerHTML = text.trim() ? meterHtml(a) + issuesHtml(a.issues) : `<p class="hint">문구를 입력하면 결과가 나타납니다.</p>`;
  }

  /* 서비스 워커(오프라인 사용) */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  if (!state.selected && state.students[0]) state.selected = state.students[0].id;
  renderAll();
  setSaveState("", state.students.length ? "이 기기에 저장된 자료를 불러왔습니다" : "자료는 이 기기에만 저장됩니다");
})();
