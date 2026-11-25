/* 문항 데이터 검증: node science-final/tools/validate.js
 * - PDF 해답과 정답 키 대조, 보기 조합 일치·유일성, 필수 항목, 그림 키, 서술형 예시 답안 자기 점검 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..', 'js');
const ctx = { window: {}, performance: { now: () => Date.now() }, localStorage: { getItem: () => null, setItem: () => {} }, console };
vm.createContext(ctx);
['figures.js', 'data-u7.js', 'data-u8.js', 'bank-topics.js', 'bank-u7.js', 'bank-u8.js', 'core.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const SF = ctx.window.SF, FIG = ctx.window.SF_FIG;
const KEY = {
  // PDF 해답 (Ⅶ 604~609쪽, Ⅷ 672~677쪽)
  'u7-b1': [0, 0, 1], 'u7-b2': [1, 0], 'u7-b3': [0, 0], 'u7-b4': 3, 'u7-b5': [0, 1, 1], 'u7-b6': 2, 'u7-b7': 2, 'u7-b8': 'ㄴ,ㄹ',
  'u7-a1': 3, 'u7-a2': 4, 'u7-a3': 'ㄴ,ㄹ', 'u7-a4': 3, 'u7-a5': 1, 'u7-a6': 2, 'u7-a7': 1, 'u7-a8': 5, 'u7-a9': 2, 'u7-a10': 3,
  'u7-a12': 3, 'u7-a13': [3, 1], 'u7-a14': [0, 0], 'u7-a15': 'ㄱ', 'u7-a16': 2, 'u7-a17': 2, 'u7-w1a': [1, 2, 0], 'u7-w2a': [1, 0, 0],
  'u8-b1': 0, 'u8-b2': [0, 1], 'u8-b3': 0, 'u8-b4': 3, 'u8-b5': [2, 0, 1], 'u8-b6': [0],
  'u8-a1': 3, 'u8-a2': 2, 'u8-a3': 4, 'u8-a4': 4, 'u8-a5': 0, 'u8-a6': 2, 'u8-a7': 'ㄴ,ㄷ', 'u8-a8': 'ㄱ,ㄴ', 'u8-a9': 1, 'u8-a10': 2,
  'u8-a11': 2, 'u8-a12': 0, 'u8-a13': 'ㄴ,ㄷ', 'u8-w1a': 3, 'u8-w2a': [0, 1]
};
let err = 0, n = 0;
const bad = (q, m) => { err++; console.log(`✗ ${q.id}: ${m}`); };
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
SF.UNITS.forEach((u) => {
  const d = SF.unit(u);
  const cids = d.concepts.map((c) => c.id);
  d.questions.forEach((q) => {
    n++;
    ['id', 'set', 'no', 'concept', 'type', 'stem', 'hint', 'key'].forEach((k) => { if (!q[k]) bad(q, `${k} 없음`); });
    if (!q.exp || !q.exp.basic || !q.exp.standard || !q.exp.advanced) bad(q, '수준별 해설 누락');
    if (!cids.includes(q.concept)) bad(q, '개념 id 오류');
    if (q.fig && !FIG.get(q.fig, q.figArgs)) bad(q, '그림 키 오류 ' + q.fig);
    if (q.expFig && !FIG.get(q.expFig, q.expFigArgs)) bad(q, '해설 그림 키 오류 ' + q.expFig);
    const k = KEY[q.id];
    if (q.type === 'mc') {
      if (k === undefined) bad(q, '정답 키 없음');
      else if (q.answer !== k) bad(q, `정답 불일치 ${q.answer} ≠ PDF ${k}`);
      if (SF.isCombo(q)) {
        const t = SF.trueKeys(q);
        const hits = q.options.map((o, i) => (sameSet(SF.comboKeys(o), t) ? i : -1)).filter((i) => i >= 0);
        if (hits.length !== 1 || hits[0] !== q.answer) bad(q, `보기 진위와 조합 정답 불일치 (참: ${t})`);
        q.bogi.forEach((b) => { if (!b.why) bad(q, `보기 ${b.k} 해설 없음`); });
      } else {
        q.options.forEach((o, i) => {
          if (i === q.answer) return;
          if (q.neg ? !o.why : !o.fb) bad(q, `${i + 1}번 선택지 피드백 없음`);
        });
      }
    } else if (q.type === 'multi') {
      if (SF.trueKeys(q).join(',') !== k) bad(q, `정답 불일치 ${SF.trueKeys(q)} ≠ PDF ${k}`);
      q.bogi.forEach((b) => { if (!b.why) bad(q, `보기 ${b.k} 해설 없음`); });
    } else if (q.type === 'blanks') {
      const a = q.slots.map((s) => s.answer);
      if (JSON.stringify(a) !== JSON.stringify(k)) bad(q, `정답 불일치 ${a} ≠ PDF ${k}`);
      q.slots.forEach((s) => s.choices.forEach((c, i) => { if (i !== s.answer && !(s.fb && s.fb[i])) bad(q, `${s.label} '${c}' 피드백 없음`); }));
    } else if (q.type === 'essay') {
      const c = SF.essayCheck(q, q.essay.model);
      if (c.suggest !== '상') bad(q, `예시 답안이 '상'으로 판정되지 않음 (${c.hits})`);
      const e = SF.essayCheck(q, '잘 모르겠다');
      if (e.suggest === '상') bad(q, '무관한 답이 상으로 판정됨');
    }
    // 채점기 자기 점검: 정답 응답은 정답
    let r = null;
    if (q.type === 'mc') r = { c: q.answer };
    if (q.type === 'multi') r = { k: SF.trueKeys(q) };
    if (q.type === 'blanks') r = { s: q.slots.map((s) => s.answer) };
    if (r && !SF.grade(q, r).ok) bad(q, '채점기 오류');
  });
});
/* ── 추가 문제(중간·기말 대비 평가 1~5회) ──
 * PDF 정답표(회차별 1~25번, 숫자 = 선택지 번호, '-' = 단답·서술형 등 선택형이 아님, 'm' = 복수 정답)
 * 원 자료 정답과 다르게 바로잡은 문항은 CORRECTED에 적고, 문항에 fix(안내 문구)가 있어야 합니다. */
const BANK_KEY = {
  'u7-1': '23441-55-33--551115424-32', 'u7-2': '54325-3-532255431525-----', 'u7-3': '3-42-4251--45-344-5231--4',
  'u7-4': '33454-12524-34-453-2-234-', 'u7-5': '433-1-335234441-35-4-1244',
  'u8-1': '5231245545433-434-35-----', 'u8-2': '43-4-m2-15-21-23--1-5-143', 'u8-3': '4-451535312123553441-----',
  'u8-4': '1--23343-422-3245-134-25-', 'u8-5': '422-335-3-22-5444-1152-43'
};
const CORRECTED = { 'u7-r1-24': 1, 'u7-r3-15': 2, 'u7-r3-25': 2, 'u8-r1-20': 3 };
const IMG = path.join(__dirname, '..');
let nb = 0;
SF.UNITS.forEach((u) => {
  const topicIds = Object.keys(SF.topics).filter((t) => SF.topics[t].u === u);
  const seen = {};
  SF.bank[u].forEach((q) => {
    nb++;
    if (seen[q.id]) bad(q, '문항 id 중복');
    seen[q.id] = 1;
    if (!topicIds.includes(q.topic)) bad(q, '세부 주제 id 오류 ' + q.topic);
    if (![1, 2, 3].includes(q.level)) bad(q, '수준 값 오류');
    if (!q.exp.basic || !q.exp.standard || !q.exp.advanced) bad(q, '수준별 해설 누락');
    if (!q.hint || !q.key) bad(q, '힌트·핵심 개념 누락');
    (q.img || []).forEach((im) => { if (!fs.existsSync(path.join(IMG, im.src))) bad(q, '그림 파일 없음 ' + im.src); });
    const k = (BANK_KEY[`${u}-${q.round}`] || '')[q.n - 1];
    if (q.type === 'mc') {
      (q.options || []).forEach((o) => { if (o.img && !fs.existsSync(path.join(IMG, o.img))) bad(q, '선택지 그림 없음 ' + o.img); });
      if (k && /[1-5]/.test(k)) {
        const want = CORRECTED[q.id] || +k;
        if (q.answer + 1 !== want) bad(q, `정답 불일치 ${q.answer + 1} ≠ ${CORRECTED[q.id] ? '정정값' : 'PDF'} ${want}`);
        if (CORRECTED[q.id] && !q.fix) bad(q, '정답을 바로잡았으나 안내 문구(fix) 없음');
      }
      if (SF.isCombo(q)) {
        const t = q.neg ? q.bogi.filter((b) => !b.ok).map((b) => b.k) : SF.trueKeys(q);
        const hits = q.options.map((o, i) => (sameSet(SF.comboKeys(o), t) ? i : -1)).filter((i) => i >= 0);
        if (hits.length !== 1 || hits[0] !== q.answer) bad(q, `보기 진위와 조합 정답 불일치 (참: ${t})`);
        q.bogi.forEach((b) => { if (!b.why) bad(q, `보기 ${b.k} 해설 없음`); });
        const opts = q.options.map((o) => SF.comboKeys(o).join(','));
        if (new Set(opts).size !== opts.length) bad(q, '조합 선택지 중복');
      } else {
        q.options.forEach((o, i) => {
          if (i === q.answer) return;
          if (q.neg ? !o.why : !o.fb) bad(q, `${i + 1}번 선택지 피드백 없음`);
        });
      }
    } else if (q.type === 'multi') {
      if (k === 'm' && !q.numbered) bad(q, '복수 정답 문항은 번호형이어야 함');
      q.bogi.forEach((b) => { if (!b.why) bad(q, `보기 ${b.k} 해설 없음`); });
    } else if (q.type === 'blanks') {
      q.slots.forEach((s) => {
        if (!(s.answer >= 0 && s.answer < s.choices.length)) bad(q, `${s.label} 정답 범위 오류`);
        s.choices.forEach((c, i) => { if (i !== s.answer && !(s.fb && s.fb[i])) bad(q, `${s.label} '${c}' 피드백 없음`); });
      });
    } else if (q.type === 'short') {
      q.short.ans.forEach((a) => { if (!SF.shortOk(q, a)) bad(q, `단답 정답 '${a}'이 정답 처리되지 않음`); });
      Object.keys(q.short.wrong).forEach((w) => { if (SF.shortOk(q, w)) bad(q, `오답 예시 '${w}'이 정답 처리됨`); });
    } else if (q.type === 'essay') {
      const c = SF.essayCheck(q, q.essay.model);
      if (c.suggest !== '상') bad(q, `예시 답안이 '상'으로 판정되지 않음 (${c.hits})`);
      const e = SF.essayCheck(q, '잘 모르겠다');
      if (e.suggest === '상') bad(q, '무관한 답이 상으로 판정됨');
    }
    let r = null;
    if (q.type === 'mc') r = { c: q.answer };
    if (q.type === 'multi') r = { k: SF.trueKeys(q) };
    if (q.type === 'blanks') r = { s: q.slots.map((s) => s.answer) };
    if (q.type === 'short') r = { t: q.short.ans[0] };
    if (r && !SF.grade(q, r).ok) bad(q, '채점기 오류');
  });
  // 교사용 차시: 모든 문항이 한 번씩, 차시마다 45분 이내
  const L = SF.lessons(SF.bank[u]);
  const ids = [].concat(...L.map((l) => l.ids));
  if (ids.length !== SF.bank[u].length || new Set(ids).size !== ids.length) { err++; console.log(`✗ ${u} 차시 구성 오류`); }
  L.forEach((l) => { if (l.min > SF.LESSON_MIN) { err++; console.log(`✗ ${u} ${l.no}차시 ${l.min}분 초과`); } });
  console.log(`${u} 추가 문제 ${SF.bank[u].length}문항 → ${L.length}차시 (${L.map((l) => l.min + '분').join(', ')})`);
});
n += nb;
// 오프라인 캐시 목록(sw.js)에 추가 문제 파일·그림이 모두 들어 있는지
const SW = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
['js/bank-topics.js', 'js/bank-u7.js', 'js/bank-u8.js'].forEach((f) => { if (!SW.includes(`'${f}'`)) { err++; console.log(`✗ sw.js에 ${f} 없음`); } });
SF.UNITS.forEach((u) => SF.bank[u].forEach((q) => {
  const srcs = (q.img || []).map((im) => im.src).concat((q.options || []).filter((o) => o.img).map((o) => o.img));
  srcs.forEach((s) => { if (!SW.includes(`'${s}'`)) bad(q, `sw.js 캐시 목록에 그림 없음 ${s}`); });
}));
const counts = {};
SF.UNITS.forEach((u) => SF.unit(u).questions.forEach((q) => { const key = `${u}-${q.set}`; counts[key] = (counts[key] || 0) + 1; }));
SF.UNITS.forEach((u) => (counts[`${u}-bank`] = SF.bank[u].length));
console.log(JSON.stringify(counts));
console.log(err ? `\n${err}개 문제 발견 (총 ${n}문항)` : `✓ 모든 검사 통과 (총 ${n}문항)`);
process.exit(err ? 1 : 0);
