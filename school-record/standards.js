/*
 * 성취기준 데이터와 붙여넣기 파서
 * - 2026학년도: 중1·중2 = 2022 개정, 중3 = 2015 개정 / 2027학년도부터 중1~3 모두 2022 개정 (기재요령 부칙 p.133)
 * - 내장 자료(std/2022-*.js): 「2022 개정 교육과정에 따른 중학교 ○○ 성취수준」의 ‘성취기준별 성취수준’ 표를
 *   원문 그대로 옮긴 것 (국어·사회·역사·도덕·수학·과학·영어·체육·음악·미술). 2022 개정 중학교 성취기준은
 *   1~3학년군 공통이므로 2027학년도 3학년에도 그대로 쓰입니다.
 * - 2015 개정(2026학년도 3학년)과 내장 자료가 없는 과목은 교육과정 문서의 성취기준을 붙여 넣어 추가할 수 있습니다.
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

  // 내장 자료 파일 (교과별 지연 로딩, file:// 에서도 동작하도록 <script> 방식)
  const FILES = {
    "2022": { 국어: "kor", 사회: "soc", 역사: "his", 도덕: "mor", 수학: "mat", 과학: "sci", 영어: "eng", 체육: "pe", 음악: "mus", 미술: "art" },
  };
  const loading = {};
  function hasFile(curriculum, subject) {
    return !!(FILES[curriculum] && FILES[curriculum][subject]);
  }
  function ensure(curriculum, subject) {
    if (builtIn(curriculum, subject) || !hasFile(curriculum, subject)) return Promise.resolve(builtIn(curriculum, subject));
    const src = `std/${curriculum}-${FILES[curriculum][subject]}.js`;
    if (!loading[src]) {
      loading[src] = new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => resolve(builtIn(curriculum, subject));
        s.onerror = () => {
          delete loading[src];
          resolve(null);
        };
        document.head.appendChild(s);
      });
    }
    return loading[src];
  }
  // 성취기준 항목에서 특정 수준(A~E)의 설명 찾기 (병합 칸 ‘A·B’ 포함)
  function levelText(item, grade) {
    if (!item || !item.levels || !grade) return "";
    const hit = item.levels.find((l) => String(l[0]).split("·").includes(grade));
    return hit ? hit[1] : "";
  }
  function levelGrades(item) {
    if (!item || !item.levels) return [];
    return item.levels.flatMap((l) => String(l[0]).split("·"));
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

  SRM.standards = { SUBJECTS, ARTS_PE, BUILT_IN, FILES, register, builtIn, hasFile, ensure, levelText, levelGrades, parse, normalizeCode };
})(typeof window !== "undefined" ? window : globalThis);
