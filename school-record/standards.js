/*
 * 성취기준 데이터와 붙여넣기 파서
 * - 2026학년도: 중1·중2 = 2022 개정 교육과정, 중3 = 2015 개정 교육과정 (기재요령 부칙 p.133)
 * - 내장 성취기준은 국가교육과정정보센터(NCIC) 원문에서 그대로 옮긴 것만 수록합니다.
 *   (교육부 고시 「초·중등학교 교육과정」, 공공누리 제2유형: 출처표시 + 상업적 이용금지)
 * - 내장 자료가 없는 과목은 교육과정 문서의 성취기준을 붙여 넣어 추가할 수 있습니다.
 */
(function (global) {
  "use strict";
  const SRM = (global.SRM = global.SRM || {});

  const SUBJECTS = [
    "국어", "사회", "역사", "도덕", "수학", "과학", "기술·가정", "정보", "체육", "음악", "미술", "영어",
    "한문", "환경", "보건", "진로와 직업",
    "생활 독일어", "생활 프랑스어", "생활 스페인어", "생활 중국어", "생활 일본어", "생활 러시아어", "생활 아랍어", "생활 베트남어",
  ];

  // 체육·예술 교과(군): 세특 작성 시 실기능력·교과적성 포함 (기재요령 p.102)
  const ARTS_PE = ["체육", "음악", "미술"];

  /*
   * BUILT_IN[교육과정][과목] = [{ domain: "영역명", items: [{ code, text }] }]
   * 원문 검증을 마친 과목만 standards-data.js 에서 채웁니다.
   */
  const BUILT_IN = { "2022": {}, "2015": {} };

  function register(curriculum, subject, domains, source) {
    BUILT_IN[curriculum] = BUILT_IN[curriculum] || {};
    BUILT_IN[curriculum][subject] = { domains, source: source || "" };
  }

  function builtIn(curriculum, subject) {
    const entry = (BUILT_IN[curriculum] || {})[subject];
    return entry ? entry : null;
  }

  // 성취기준 코드: [9과01-01], [9사(지리)01-01], [9기가01-01], [9체01-01] 등
  const CODE = /\[\s*(\d{1,2}\s*[가-힣A-Za-z()·\s]{1,14}?\s*\d{2}\s*-\s*\d{2})\s*\]/gu;

  function normalizeCode(code) {
    return String(code).replace(/\s+/g, "");
  }

  /**
   * 교육과정 문서에서 복사한 텍스트에서 성취기준을 추출
   * - 같은 코드가 여러 번 나오면(성취기준 해설 등) 첫 번째 문장만 사용
   */
  function parse(text) {
    const src = String(text || "").replace(/\r\n?/g, "\n");
    const hits = [...src.matchAll(CODE)];
    const seen = new Set();
    const out = [];
    hits.forEach((m, i) => {
      const code = normalizeCode(m[1]);
      const start = m.index + m[0].length;
      const end = i + 1 < hits.length ? hits[i + 1].index : src.length;
      let body = src.slice(start, end);
      body = body.split(/\n\s*\n/)[0]; // 빈 줄에서 끊기
      body = body.replace(/\s+/g, " ").trim();
      body = body.replace(/^[:：\-–]\s*/, "");
      if (!body || seen.has(code)) return;
      if (/^이\s*성취기준은/.test(body)) return; // 해설 문단 제외
      if (body.length > 300) body = body.slice(0, 300).trim() + "…";
      seen.add(code);
      out.push({ code, text: body });
    });
    return out;
  }

  SRM.standards = { SUBJECTS, ARTS_PE, BUILT_IN, register, builtIn, parse, normalizeCode };
})(typeof window !== "undefined" ? window : globalThis);
