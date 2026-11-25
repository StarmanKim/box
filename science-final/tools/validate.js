/* 문항 데이터 검증: node science-final/tools/validate.js
 * - PDF 해답과 정답 키 대조, 보기 조합 일치·유일성, 필수 항목, 그림 키, 서술형 예시 답안 자기 점검 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..', 'js');
const ctx = { window: {}, performance: { now: () => Date.now() }, localStorage: { getItem: () => null, setItem: () => {} }, console };
vm.createContext(ctx);
['figures.js', 'data-u7.js', 'data-u8.js', 'core.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
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
const counts = {};
SF.UNITS.forEach((u) => SF.unit(u).questions.forEach((q) => { const key = `${u}-${q.set}`; counts[key] = (counts[key] || 0) + 1; }));
console.log(JSON.stringify(counts));
console.log(err ? `\n${err}개 문제 발견 (총 ${n}문항)` : `✓ 모든 검사 통과 (총 ${n}문항)`);
process.exit(err ? 1 : 0);
