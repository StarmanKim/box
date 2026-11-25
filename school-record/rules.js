/*
 * 2026학년도 학교생활기록부 기재요령(중학교, 17개 시도교육청) 기반 규칙 데이터
 * 근거 쪽수는 「2026학년도 학교생활기록부 기재요령 중학교」 PDF 쪽 번호입니다.
 * 이 파일의 규칙은 입력 보조용 점검이며, 최종 판단은 기재요령 원문과 학교 학업성적관리규정을 따릅니다.
 */
(function (global) {
  "use strict";

  const SRM = (global.SRM = global.SRM || {});

  /* ---------- 학년도·학년별 교육과정 적용 (기재요령 부칙 p.133) ---------- */
  // 2022 개정 교육과정 순차 적용: 2025 중1 → 2026 중1·2 → 2027 중1·2·3
  const CURRICULUM_BY_YEAR = {
    2025: { 1: "2022", 2: "2015", 3: "2015" },
    2026: { 1: "2022", 2: "2022", 3: "2015" },
    2027: { 1: "2022", 2: "2022", 3: "2022" },
  };
  // 기재요령(글자 수·금지 사항 등)을 반영한 학년도. 그 밖의 학년도는 가장 가까운 기재요령을 임시 적용
  const GUIDE_YEARS = [2026];
  let currentYear = 2026;

  function setYear(year) {
    const y = Number(year);
    if (Number.isFinite(y)) currentYear = y;
  }
  function getYear() {
    return currentYear;
  }
  function curriculumOf(grade, year = currentYear) {
    const g = String(grade || "1");
    const table = CURRICULUM_BY_YEAR[year] || (year > 2027 ? CURRICULUM_BY_YEAR[2027] : CURRICULUM_BY_YEAR[2025]);
    return table[g] || "2022";
  }
  function guideStatus(year = currentYear) {
    const exact = GUIDE_YEARS.includes(Number(year));
    const used = exact ? Number(year) : GUIDE_YEARS.reduce((a, b) => (Math.abs(b - year) < Math.abs(a - year) ? b : a));
    return { exact, used };
  }

  /* ---------- 영역 정의 및 입력 가능 최대 글자 수 (p.162) ---------- */
  // maxChars: 한글 기준 최대 글자 수, maxBytes: 교육정보시스템 Byte 한도(한글 1자 = 3Byte)
  const AREAS = {
    seteuk: {
      key: "seteuk",
      short: "교과 세특",
      label: () => "과목별 세부능력 및 특기사항",
      maxChars: 500,
      writer: "교과담당교사",
      basis: "p.88-89, p.102-104, p.162",
      perSubject: true,
      guide: [
        "학생참여형 수업 및 수업과 연계된 수행평가 등에서 관찰한 내용을 바탕으로 입력 (p.102)",
        "과목별 성취기준에 따른 성취수준의 특성, 학습활동 참여도, 자기주도적 학습에 의한 변화와 성장 정도 중심 (p.102)",
        "수업 활동의 단순 나열이나 성취기준에 이미 명시된 지식의 단순 서술은 지양 (p.88)",
        "중학교는 특기할 만한 사항이 있는 과목·학생에 대해 입력. 입력 대상 범위는 학업성적관리위원회 심의로 결정 (p.88, p.103)",
        "자유학기에 이수한 과목은 모든 학생 입력 (p.103)",
        "체육·예술(음악/미술)은 성취수준의 특성, 실기능력, 교과적성, 학습활동 참여도 및 태도 등 (p.102)",
      ],
    },
    auto: {
      key: "auto",
      short: "자율·자치",
      // 2015 개정 적용 학년은 ‘자율활동’, 2022 개정 적용 학년은 ‘자율·자치활동’ (p.73)
      label: (grade) => (curriculumOf(grade) === "2015" ? "자율활동" : "자율·자치활동"),
      maxChars: 500,
      writer: "학급담임교사",
      basis: "p.73-78, p.162",
      guide: [
        "활동결과에 대한 평가보다 활동과정에서 드러나는 개별적인 행동 특성, 참여도, 협력도, 활동실적 중심 (p.78)",
        "정규교육과정 또는 학교교육계획에 의해 실시한 주제 탐구 활동, 공동체 자치활동 등을 입력 (p.78)",
        "임원은 ‘전교’, ‘학년’, ‘학급’ 등 종류와 재임기간을 ( )안에 병기. 예: 1학기 학급 반장(2026.03.01.-2026.08.18.) (p.78)",
        "정량적 기록 가능: 예) 학급회의(월 1회), 양성평등교육(4시간) (p.77)",
        "모든 학생 입력. 한 번도 참여하지 못한 경우 사유 입력 (p.73, p.77)",
      ],
    },
    club: {
      key: "club",
      short: "동아리",
      label: () => "동아리활동",
      maxChars: 500,
      writer: "동아리 담당교사",
      basis: "p.74, p.78-80, p.162",
      guide: [
        "자기 평가, 학생상호 평가, 교사 관찰 등으로 평가하여 참여도, 협력도, 열성도, 특별한 활동실적 등 실제적인 활동과 역할 위주 (p.78)",
        "동아리명(부서명)과 유형 표기는 나이스에서 자동 표기됨 (p.79)",
        "자율동아리: 학년당 1개, 동아리명 + 필요시 소개 30자 이내만 입력 (p.79)",
        "학교교육계획에 따른 청소년단체: 단체명만 입력, 특기사항 입력 불가 (p.74, p.80)",
        "정규교육과정 이외 학교스포츠클럽: 클럽명만 입력 (p.80)",
      ],
    },
    career: {
      key: "career",
      short: "진로",
      label: () => "진로활동",
      maxChars: 500,
      writer: "학급담임교사",
      basis: "p.74, p.80-81, p.162",
      guide: [
        "진로희망분야, 각종 진로검사 및 진로상담 결과, 관심 분야 및 진로희망 관련 활동 등 진로 특성이 드러나는 사항 (p.74)",
        "진로희망(희망분야)은 특기사항 내 ‘희망분야’ 칸에 입력하며 상급학교에 제공하지 않음 (p.80)",
        "진로희망을 정하지 못한 경우에도 입력. 예: ‘진로탐색 중임.’ (p.80)",
        "학생의 실제적인 활동과 역할 위주: 자질·노력, 상담 결과, 참여도·의욕·태도 변화 등 (p.81)",
      ],
    },
    behavior: {
      key: "behavior",
      short: "행동특성",
      label: () => "행동특성 및 종합의견",
      maxChars: 300,
      writer: "학급담임교사",
      basis: "p.115-116, p.162",
      guide: [
        "학년 동안 지속적으로 관찰한 행동특성을 바탕으로 학생을 총체적으로 이해할 수 있는 종합의견 (p.115)",
        "모든 학생 입력. 성장 정도, 특기사항, 발전 가능성 등을 고려하여 성장을 지원하는 교육적 관점에서 작성 (p.115)",
        "학기 구분 입력 시 ‘(1학기)’, ‘(2학기)’를 직접 입력 (p.116)",
        "다른 항목에 입력할 수 없는 내용(방과후학교 활동 등)은 입력 불가 (p.116)",
        "영재교육 관련 내용은 행특이 아닌 교과 세특의 ‘영재교육 기록사항’에 입력 (p.116)",
      ],
    },
  };

  const AREA_ORDER = ["seteuk", "auto", "club", "career", "behavior"];

  /* ---------- 교육정보시스템 Byte 계산 (p.162) ---------- */
  // 한글 1자 = 3Byte, 영문·숫자 1자 = 1Byte, 엔터 = 1Byte.
  // 그 밖의 기호는 UTF-8 길이로 계산(기재요령에 명시되지 않아 실제 나이스와 다를 수 있음).
  function utf8Len(cp) {
    if (cp < 0x80) return 1;
    if (cp < 0x800) return 2;
    if (cp < 0x10000) return 3;
    return 4;
  }

  function normalizeNewlines(text) {
    return String(text || "").replace(/\r\n?/g, "\n");
  }

  function countBytes(text) {
    let bytes = 0;
    for (const ch of normalizeNewlines(text)) {
      bytes += ch === "\n" ? 1 : utf8Len(ch.codePointAt(0));
    }
    return bytes;
  }

  function countChars(text) {
    return Array.from(normalizeNewlines(text)).length;
  }

  function limitBytes(areaKey) {
    return AREAS[areaKey].maxChars * 3;
  }

  /* ---------- 기재 금지·주의 항목 ---------- */
  // level: "error" = 기재요령상 입력 불가 표현이 감지됨, "warn" = 맥락 확인 필요
  const S = "\\s*"; // 글자 사이 공백 허용
  const sp = (word) => word.split("").join(S);

  const PROHIBITED = [
    {
      id: "lang-test",
      level: "error",
      label: "공인어학시험 참여·성적",
      basis: "p.18 유의사항 3-가",
      pattern: new RegExp(
        [
          "TOEIC", "TOEFL", "TEPS", "HSK", "JPT", "JLPT", "DELF", "DALF", "TESTDAF", "DSH", "DSD", "TORFL", "DELE", "IELTS", "OPIC", "TOPIK",
          sp("토익"), sp("토플"), sp("텝스"), sp("아이엘츠"), sp("오픽"),
          sp("공인어학"), sp("어학시험"), sp("한자능력검정"), sp("상공회의소한자"), sp("실용한자"), sp("한자급수"), sp("상무한검"), sp("한자자격검정"),
        ].join("|"),
        "iu"
      ),
    },
    {
      id: "contest",
      level: "error",
      label: "교내·외 대회 참여 사실·성적·수상실적",
      basis: "p.18 유의사항 3-나, p.104 마-2) (교내대회는 ‘수상경력’에만 입력)",
      pattern: new RegExp(
        [
          sp("대회"), sp("경진"), sp("올림피아드"), sp("공모전"), sp("콘테스트"),
          sp("수상") + "(?=" + S + "(?:함|했|하였|하여|한|실적|경력|자|작|내역|이력))",
          sp("입상"), sp("입선"),
          "(?:" + ["금상", "은상", "동상", "최우수상", "우수상", "장려상", "특별상"].map(sp).join("|") + ")" + "(?=" + S + "(?:을|를|수상|받|획득|차지|$|[.,\\s]))",
          "\\d+" + S + "(?:위|등)" + S + "(?:입상|수상|차지|을\\s*차지)",
        ].join("|"),
        "u"
      ),
    },
    {
      id: "outside-award",
      level: "error",
      label: "교외상(표창장·감사장·공로상 등)",
      basis: "p.18 유의사항 3-다",
      pattern: new RegExp([sp("표창"), sp("감사장"), sp("공로상"), sp("상장")].join("|"), "u"),
    },
    {
      id: "cert-test",
      level: "error",
      label: "교내·외 인증시험 참여 사실·성적",
      basis: "p.18 유의사항 3-라",
      pattern: new RegExp([sp("인증시험"), sp("인증평가"), sp("검정시험"), sp("능력검정"), sp("급수시험")].join("|"), "u"),
    },
    {
      id: "paper",
      level: "error",
      label: "논문 투고·등재·발표, 연구보고서(소논문)",
      basis: "p.18 유의사항 3-바, p.104 마-5)",
      pattern: new RegExp([sp("소논문"), sp("논문"), "(?<![가-힣])" + sp("학회"), sp("학술지"), sp("연구보고서"), sp("투고"), sp("등재")].join("|"), "u"),
    },
    {
      id: "book",
      level: "error",
      label: "도서출간 사실",
      basis: "p.18 유의사항 3-사",
      pattern: new RegExp([sp("출간"), sp("출판") + "(?=" + S + "(?:함|했|하였|한|하여|사))", sp("저서"), sp("책을") + S + "(?:펴|냄|냈|출)", sp("발간")].join("|"), "u"),
    },
    {
      id: "ip",
      level: "error",
      label: "지식재산권(특허·실용신안·상표·디자인) 출원·등록",
      basis: "p.18 유의사항 3-아",
      pattern: new RegExp([sp("특허"), sp("실용신안"), sp("출원"), sp("상표") + S + sp("등록"), sp("디자인") + S + "(?:" + sp("등록") + "|" + sp("출원") + ")", sp("지식재산권")].join("|"), "u"),
    },
    {
      id: "overseas",
      level: "error",
      label: "어학연수·봉사활동 등 해외 활동실적",
      basis: "p.18 유의사항 3-자, p.77 ※",
      pattern: new RegExp([sp("어학연수"), "(?:" + sp("해외") + "|" + sp("외국") + ")" + S + "(?:" + ["봉사", "연수", "체험", "캠프", "활동", "탐방", "견학", "유학"].map(sp).join("|") + ")"].join("|"), "u"),
    },
    {
      id: "parents",
      level: "warn",
      label: "부모(친인척 포함)의 사회·경제적 지위 암시 여부 확인",
      basis: "p.18 유의사항 3-차",
      pattern: new RegExp(
        "(?:" + ["아버지", "어머니", "부모님", "부모", "부친", "모친", "아빠", "엄마", "친척", "삼촌", "이모", "고모", "외삼촌", "할아버지", "할머니"].join("|") + ")" +
          "[^.\\n]{0,20}?" +
          "(?:" + ["직업", "직장", "회사", "근무", "운영", "대표", "사장", "의사", "변호사", "교수", "판사", "검사", "공무원", "약사", "목사", "임원", "CEO", "경영"].join("|") + ")",
        "u"
      ),
    },
    {
      id: "scholarship",
      level: "error",
      label: "장학생·장학금 관련 내용",
      basis: "p.18 유의사항 3-카",
      pattern: new RegExp(sp("장학"), "u"),
    },
    {
      id: "university",
      level: "error",
      label: "구체적인 특정 대학명",
      basis: "p.19 유의사항 3-타",
      pattern: new RegExp(
        [
          "[가-힣A-Za-z]{2,}" + S + "대학교", "[가-힣]{2,}" + S + "대학원", "대학" + S + "병원",
          "서울대", "연세대", "고려대", "카이스트", "KAIST", "포스텍", "POSTECH", "포항공대", "성균관대", "한양대", "서강대", "이화여대", "중앙대", "경희대", "한국외대", "서울시립대", "건국대", "동국대", "홍익대", "부산대", "경북대", "전남대", "충남대", "UNIST", "유니스트", "DGIST", "디지스트", "GIST", "지스트", "하버드", "MIT", "스탠퍼드", "옥스퍼드", "케임브리지",
        ].join("|"),
        "u"
      ),
    },
    {
      id: "org-brand",
      level: "warn",
      label: "기관명·상호명일 수 있음(교육관련기관 외 입력 불가)",
      basis: "p.19 유의사항 3-타 (교육부·시도교육청·교육지원청 및 소속기관만 기재 가능)",
      pattern: new RegExp(
        [
          "㈜", "\\(주\\)", sp("주식회사"), "[가-힣]{2,}" + S + "(?:재단|협회|연구소|박물관|과학관|미술관|기념관|전시관|체험관|문화원)",
          "삼성", "LG", "엘지", "현대자동차", "SK", "네이버", "카카오", "구글", "Google", "애플", "Apple", "마이크로소프트", "Microsoft", "유튜브", "YouTube", "챗GPT", "ChatGPT", "넷플릭스", "인스타그램", "틱톡",
        ].join("|"),
        "u"
      ),
    },
    {
      id: "lecturer",
      level: "warn",
      label: "강사명일 수 있음(학생이 참여한 강의의 강사명 입력 불가)",
      basis: "p.19 유의사항 3-타 2)",
      pattern: new RegExp("[가-힣]{2,4}" + S + "(?:강사|교수님|박사님|작가님|선생님의\\s*(?:강연|특강|강의))", "u"),
    },
    {
      id: "license",
      level: "error",
      label: "자격증 명칭 및 취득 사실",
      basis: "p.19 유의사항 3-파",
      pattern: new RegExp([sp("자격증"), sp("자격") + S + sp("취득"), sp("컴퓨터활용능력"), "ITQ", sp("워드프로세서"), sp("기능사"), sp("급") + S + sp("취득")].join("|"), "iu"),
    },
    {
      id: "mooc",
      level: "error",
      label: "K-MOOC, MOOC, KOCW 등",
      basis: "p.104 마-3)",
      pattern: /K\s*-?\s*MOOC|MOOC|KOCW|무크/iu,
    },
    {
      id: "afterschool",
      level: "error",
      label: "방과후학교 활동",
      basis: "p.104 마-4), p.116 나",
      pattern: new RegExp(sp("방과후") + "(?!" + S + sp("학교스포츠클럽") + ")", "u"),
    },
    {
      id: "private-edu",
      level: "warn",
      label: "사교육(학원·과외 등) 관련 내용",
      basis: "p.18 유의사항 2·3 (학교교육계획에 따른 교육활동만 기재)",
      pattern: new RegExp([sp("학원"), sp("과외"), sp("인강"), sp("사교육"), sp("선행학습")].join("|"), "u"),
    },
    {
      id: "hs-event",
      level: "warn",
      label: "외부 기관·대학 주최 체험활동일 수 있음",
      basis: "p.76 다 (학교·타 중학교·교육관련기관 주최·주관 + 학교장 승인 활동만 입력)",
      pattern: new RegExp([sp("캠프"), sp("특강"), sp("외부") + S + "(?:기관|강사|프로그램)"].join("|"), "u"),
    },
  ];

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * 문구에서 금지·주의 표현을 찾아 반환
   * @returns {Array<{id,level,label,basis,match,index}>}
   */
  function detectProhibited(text) {
    const source = String(text || "").normalize("NFC");
    const found = [];
    for (const rule of PROHIBITED) {
      const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : rule.pattern.flags + "g");
      const matches = [];
      for (const m of source.matchAll(re)) {
        if (m[0].trim()) matches.push({ match: m[0], index: m.index });
        if (matches.length >= 5) break;
      }
      if (matches.length) {
        found.push({ id: rule.id, level: rule.level, label: rule.label, basis: rule.basis, matches });
      }
    }
    return found;
  }

  /* ---------- 문체·형식 점검 ---------- */
  function styleChecks(text, { names = [], areaKey } = {}) {
    const result = [];
    const t = String(text || "").trim();
    if (!t) return result;

    const sentences = t.split(/(?<=[.。!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
    const plainEnding = sentences.filter((s) => /(?:다|요)[.!?]?$/.test(s) && !/(?:바란다)$/.test(s));
    if (plainEnding.length) {
      result.push({
        level: "info",
        label: "‘~다/~요’로 끝나는 문장이 있음 (학교생활기록부는 보통 ‘~함/~임’ 형태로 씀)",
        matches: plainEnding.slice(0, 3).map((s) => ({ match: s.slice(-12) })),
      });
    }
    const validNames = names.map((n) => String(n || "").trim()).filter((n) => n.length >= 2);
    const nameHits = validNames.filter((n) => t.includes(n));
    if (nameHits.length) {
      result.push({ level: "warn", label: "학생 이름이 들어 있음", matches: nameHits.map((n) => ({ match: n })) });
    }
    if (/[○◯●□■◇◆△▲▽▼※★☆]{1}/u.test(t) || /OOO|ㅇㅇ/.test(t)) {
      result.push({ level: "warn", label: "자리표시 기호(○○ 등)가 남아 있음", matches: [] });
    }
    if (areaKey === "behavior" && /[가-힣]+\s*(?:보다|에 비해)\s*(?:뛰어|우수|낫)/.test(t)) {
      result.push({ level: "info", label: "다른 학생과 비교하는 표현인지 확인", matches: [] });
    }
    return result;
  }

  /* ---------- 최종 확인 체크리스트 (p.19 유의사항 4) ---------- */
  const FINAL_CHECKLIST = [
    "교사가 직접 관찰·평가한 내용만 담았습니다. (p.19 유의사항 4)",
    "단순 사실을 과장하거나 사실과 다른 내용이 없습니다. (p.19 4-가)",
    "학생이 작성하여 제출한 내용을 옮긴 것이 아닙니다. (p.19 4-나)",
    "AI 도움을 받았다면 그대로 입력하지 않고 실제 수행과 대조하여 고쳤습니다. (p.19 4-다)",
    "기재 금지 사항(대회·어학시험·기관명·부모 직업 등)이 없습니다. (p.18-19 유의사항 3)",
  ];

  SRM.rules = {
    curriculumOf,
    setYear,
    getYear,
    guideStatus,
    CURRICULUM_BY_YEAR,
    AREAS,
    AREA_ORDER,
    countBytes,
    countChars,
    limitBytes,
    normalizeNewlines,
    PROHIBITED,
    detectProhibited,
    styleChecks,
    FINAL_CHECKLIST,
    escapeRegExp,
    SOURCE: "2026학년도 학교생활기록부 기재요령 중학교(17개 시도교육청, 2026.2.)",
  };
})(typeof window !== "undefined" ? window : globalThis);
