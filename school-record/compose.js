/*
 * 규칙 기반 문구 조합기
 * - 교사가 입력한 관찰 기록만 사용합니다. 기록에 없는 활동·수치·사실을 만들어 넣지 않습니다.
 * - 문장 끝을 ‘~함/~임’ 형태로 맞추고, 연결어와 배열 순서를 바꿔 학생마다 구조가 겹치지 않게 합니다.
 * - 선택한 특장점 키워드는 교사의 평가로 간주하여 평가 문장으로 바꿉니다.
 */
(function (global) {
  "use strict";
  const SRM = (global.SRM = global.SRM || {});
  const ko = SRM.ko;
  const rules = SRM.rules;

  /* ---------- 영역별 특장점 키워드 ---------- */
  const KEYWORDS = {
    seteuk: {
      "탐구·사고": ["탐구 설계", "변인 통제", "자료 해석", "근거 제시", "원리 적용", "모형 활용", "비판적 사고", "창의적 문제 해결"],
      "학습 태도": ["적극적 질문", "자기주도 학습", "오류 수정", "피드백 반영", "꾸준한 노력", "집중력"],
      "협력·소통": ["역할 수행", "경청", "토론 참여", "논리적 설명", "결과 발표", "협업"],
      "체육·예술": ["실기 능력", "예술적 표현", "감상 능력", "운동 기능 향상", "안전 수칙 준수"],
    },
    auto: {
      "자치·참여": ["자발적 참여", "의견 제안", "합의 도출", "규칙 실천", "학급 문제 해결"],
      "공동체": ["배려", "나눔 실천", "책임감", "협력", "리더십"],
      "소통": ["경청", "의견 조율", "갈등 조정", "설득력"],
    },
    club: {
      "참여·열성": ["꾸준한 참여", "열정", "성실함"],
      "역할·협력": ["역할 수행", "리더십", "협력", "공동 과제 기여"],
      "문제 해결": ["아이디어 제안", "시도와 개선", "결과물 완성"],
      "기능 향상": ["기능 향상", "숙련도 향상"],
    },
    career: {
      "자기이해": ["흥미 발견", "강점 이해", "가치관 탐색"],
      "진로 탐색": ["직업 정보 탐색", "관련 역량 조사", "진로 질문"],
      "진로 설계": ["목표 설정", "계획 수립", "교과 연계"],
      "태도": ["적극적 탐색", "관심 분야 구체화"],
    },
    behavior: {
      "생활 태도": ["책임감", "성실함", "규칙 준수", "자기관리"],
      "관계": ["배려", "공감", "경청", "원만한 교우 관계", "포용"],
      "공동체": ["협력", "봉사 정신", "리더십", "솔선수범"],
      "성장": ["꾸준한 노력", "도전 정신", "자기 성찰", "긍정적 변화"],
    },
  };

  // 키워드 → 평가 명사구
  const PHRASES = {
    "탐구 설계": "탐구 과정을 체계적으로 설계하는 능력",
    "변인 통제": "변인을 통제하여 실험을 계획하는 능력",
    "자료 해석": "자료를 근거로 해석하는 능력",
    "근거 제시": "근거를 들어 자신의 생각을 밝히는 능력",
    "원리 적용": "배운 원리를 새로운 상황에 적용하는 능력",
    "모형 활용": "모형을 활용하여 현상을 설명하는 능력",
    "비판적 사고": "주어진 정보를 따져 보는 비판적 사고력",
    "창의적 문제 해결": "새로운 방법으로 문제를 해결하려는 창의성",
    "적극적 질문": "궁금한 점을 적극적으로 질문하는 태도",
    "자기주도 학습": "스스로 학습을 계획하고 실천하는 자기주도성",
    "오류 수정": "자신의 오류를 찾아 고치는 태도",
    "피드백 반영": "피드백을 받아들여 결과를 보완하는 태도",
    "꾸준한 노력": "꾸준히 노력하는 성실함",
    "집중력": "과제에 몰입하는 집중력",
    "역할 수행": "맡은 역할을 끝까지 수행하는 책임감",
    "경청": "다른 사람의 의견을 경청하는 태도",
    "토론 참여": "토론에 적극적으로 참여하는 태도",
    "논리적 설명": "생각을 논리적으로 설명하는 능력",
    "결과 발표": "결과를 명확하게 전달하는 발표력",
    "협업": "친구들과 협력하여 과제를 해결하는 능력",
    "실기 능력": "기능을 정확하게 수행하는 실기 능력",
    "예술적 표현": "자신의 생각을 작품으로 표현하는 능력",
    "감상 능력": "작품의 특징을 파악하는 감상 능력",
    "운동 기능 향상": "연습을 통해 운동 기능을 높이는 태도",
    "안전 수칙 준수": "안전 수칙을 지키는 태도",
    "자발적 참여": "공동체 활동에 자발적으로 참여하는 태도",
    "의견 제안": "공동체 문제에 대해 의견을 제안하는 적극성",
    "합의 도출": "서로 다른 의견을 모아 합의를 이끄는 능력",
    "규칙 실천": "함께 정한 규칙을 실천하는 태도",
    "학급 문제 해결": "학급의 문제를 해결하려는 주인의식",
    "배려": "친구를 배려하는 따뜻한 마음",
    "나눔 실천": "나눔을 실천하는 태도",
    "책임감": "맡은 일을 끝까지 해내는 책임감",
    "협력": "공동의 목표를 위해 협력하는 태도",
    "리더십": "구성원을 이끄는 리더십",
    "의견 조율": "다양한 의견을 조율하는 능력",
    "갈등 조정": "갈등 상황을 원만하게 조정하는 능력",
    "설득력": "근거를 들어 상대를 설득하는 능력",
    "꾸준한 참여": "활동에 꾸준히 참여하는 성실함",
    "열정": "활동에 임하는 열정",
    "성실함": "주어진 일에 성실하게 임하는 태도",
    "공동 과제 기여": "공동 과제에 기여하는 태도",
    "아이디어 제안": "새로운 아이디어를 제안하는 적극성",
    "시도와 개선": "시행착오를 거쳐 결과를 개선하는 태도",
    "결과물 완성": "결과물을 끝까지 완성하는 끈기",
    "기능 향상": "연습을 통해 기능을 향상시키는 태도",
    "숙련도 향상": "반복 연습으로 숙련도를 높이는 끈기",
    "흥미 발견": "자신의 흥미를 발견하려는 태도",
    "강점 이해": "자신의 강점을 이해하려는 노력",
    "가치관 탐색": "직업 가치관을 탐색하는 태도",
    "직업 정보 탐색": "관심 직업의 정보를 찾아보는 탐색 능력",
    "관련 역량 조사": "진로에 필요한 역량을 조사하는 태도",
    "진로 질문": "진로에 대해 스스로 질문하는 태도",
    "목표 설정": "진로 목표를 구체적으로 세우는 능력",
    "계획 수립": "목표에 맞는 실천 계획을 세우는 능력",
    "교과 연계": "교과 학습을 진로와 연결하는 태도",
    "적극적 탐색": "진로를 적극적으로 탐색하는 자세",
    "관심 분야 구체화": "관심 분야를 구체화해 가는 모습",
    "규칙 준수": "규칙을 지키는 바른 생활 태도",
    "자기관리": "스스로 생활을 관리하는 자기관리 능력",
    "공감": "다른 사람의 마음에 공감하는 능력",
    "원만한 교우 관계": "친구들과 원만하게 지내는 친화력",
    "포용": "다른 사람을 포용하는 넓은 마음",
    "봉사 정신": "공동체를 위해 봉사하는 정신",
    "솔선수범": "궂은일에 먼저 나서는 솔선수범의 자세",
    "도전 정신": "어려운 과제에 도전하는 자세",
    "자기 성찰": "자신을 돌아보고 고쳐 나가는 성찰 능력",
    "긍정적 변화": "생활 태도의 긍정적인 변화",
  };

  function phraseOf(keyword) {
    const k = String(keyword || "").trim();
    return PHRASES[k] || k;
  }

  const TONES = {
    observe: { label: "관찰 중심", desc: "관찰한 사실을 담백하게" },
    growth: { label: "성장 서사", desc: "처음과 이후의 변화를 강조" },
    concise: { label: "간결", desc: "연결어를 줄이고 짧게" },
  };

  const STARTS_WITH_TIME = /^(?:학기\s*초|[12]\s*학기|처음|초기|이전|이후|최근|현재|점차|특히|또한|이\s*과정에서|그\s*결과|이러한|전반적으로|그러나|하지만|그리고|이에|이를|활동\s*(?:초기|후반|이후))/u;

  function addConnector(sentence, connector) {
    if (!connector || STARTS_WITH_TIME.test(sentence)) return sentence;
    return connector + sentence;
  }

  function pick(rand, list) {
    return list[Math.floor(rand() * list.length) % list.length];
  }

  function keywordSentences(areaKey, keywords, tone, rand, structure, pickC) {
    const ps = keywords.map(phraseOf).filter(Boolean);
    if (!ps.length) return [];
    const out = [];
    let firstVerb = "";
    const pair = (a, b) => (b ? ko.josa(a, "과/와") + " " + b : a);
    const p1 = ps[0];
    const p2 = ps[1];
    const p3 = ps[2];
    const p4 = ps[3];

    if (areaKey === "behavior") {
      const templates = [
        () => ko.josa(pair(p1, p2), "을/를") + " 지닌 학생임.",
        () => ko.josa(pair(p1, p2), "이/가") + " 돋보이는 학생임.",
        () => "학교생활 전반에서 " + ko.josa(pair(p1, p2), "을/를") + " 보여 줌.",
      ];
      out.push(pick(rand, templates)());
    } else {
      const lead = structure === "B" ? "" : tone === "concise" ? "" : pickC(["이 과정에서 ", "활동 전반에서 ", "이러한 활동을 통해 ", ""]);
      const verb = pick(rand, ["드러남", "보여 줌", "돋보임"]);
      firstVerb = verb;
      out.push(lead + ko.josa(pair(p1, p2), verb === "보여 줌" ? "을/를" : "이/가") + " " + verb + ".");
    }
    if (p3) {
      const more = pair(p3, p4);
      out.push(
        tone === "concise"
          ? ko.josa(more, "이/가") + " 돋보임."
          : (() => {
              const c = pickC(["또한 ", "아울러 ", ""]);
              const verb = pick(rand, ["돋보임", "드러남"].filter((v) => v !== firstVerb));
              return c ? c + ko.josa(more, "이/가") + " " + verb + "." : more + "도 꾸준히 보여 줌.";
            })()
      );
    }
    return out;
  }

  // 문장 앞의 학생 이름(주어) 제거: "김하늘은 ~" → "~"
  function nameStripper(names) {
    const list = [...new Set((names || []).map((n) => String(n || "").trim()).filter((n) => n.length >= 2))].sort((a, b) => b.length - a.length);
    if (!list.length) return (s) => s;
    const re = new RegExp("^(?:" + list.map(rules.escapeRegExp).join("|") + ")\\s*(?:학생)?(?:은|는|이|가)?\\s+", "u");
    return (s) => s.replace(re, "");
  }

  function cleanEntry(entry, strip = (s) => s) {
    const conv = (t) => ko.splitSentences(t).map(strip).map(ko.toNominal).filter(Boolean);
    // ‘○○ 활동’처럼 명사로 끝난 장면은 ‘~에 참여함’으로 보충
    // ‘정부반장선거(2026.03.11.)’처럼 끝에 날짜·시간 괄호가 붙은 경우도 같은 규칙 적용
    const NOUN_SCENE = /(?:활동|수업|프로젝트|과제|캠페인|회의|행사|교육|체험|시간|상담|놀이|축제|발표회|현장체험학습|실험|실습|토론|토의|게임|견학|답사|탐방|공연|경기|수행평가|모둠\s*탐구|선거|안내|대화|멘토링|입학식|개학식|방학식|졸업식|수료식|세우기|만들기)$/u;
    const isNounScene = (x) => NOUN_SCENE.test(x.replace(/\s*\([^()]*\)\s*$/u, ""));
    const sceneConv = (t) =>
      ko
        .splitSentences(t)
        .map(strip)
        .map((x) => x.replace(/[.。]+$/u, ""))
        .map((x) => (isNounScene(x) ? x + "에 참여함" : x))
        .map(ko.toNominal)
        .filter(Boolean);
    return {
      scene: sceneConv(entry.scene),
      action: conv(entry.action),
      change: conv(entry.change),
    };
  }

  function roleSentences(roles) {
    return (roles || [])
      .filter((r) => r && r.title)
      .map((r) => {
        const head = [r.term, r.scope, r.title].map((x) => String(x || "").trim()).filter(Boolean).join(" ");
        const period = r.start || r.end ? "(" + [r.start, r.end].filter(Boolean).join("-") + ")" : "";
        return ko.josa(head + period, "으로/로") + " 활동함.";
      });
  }

  /**
   * 문구 초안 생성
   * @param {object} input {areaKey, entries, keywords, roles, tone, version, seed, targetBytes, closing}
   * @returns {{text:string, bytes:number, omitted:number, structure:string, empty:boolean}}
   */
  function compose(input) {
    const areaKey = input.areaKey;
    const tone = TONES[input.tone] ? input.tone : "observe";
    const version = input.version || 0;
    const rand = ko.seeded([input.seed || "", areaKey, tone, version].join("|"));
    const strip = nameStripper(input.names);
    const entries = (input.entries || []).map((e) => cleanEntry(e, strip)).filter((e) => e.scene.length || e.action.length || e.change.length);
    const keywords = (input.keywords || []).filter(Boolean);
    const roles = areaKey === "auto" || areaKey === "club" ? roleSentences(input.roles) : [];
    const leads = (input.leads || []).filter(Boolean); // 정량 기록 등 맨 앞에 둘 문장

    if (!entries.length && !keywords.length && !roles.length && !leads.length) {
      return { text: "", bytes: 0, omitted: 0, structure: "", empty: true };
    }

    // 학생·버전마다 구조를 바꿔 문구가 겹치지 않도록 함
    const structures = tone === "growth" ? ["G", "A", "B"] : ["A", "B", "G"];
    const offset = Math.floor(ko.seeded(input.seed || "x")() * 3);
    const structure = structures[(offset + version) % structures.length];

    // priority: 숫자가 작을수록 우선(분량 초과 시 큰 숫자부터 제외)
    const items = [];
    const push = (text, priority) => text && items.push({ text, priority });

    roles.forEach((r) => push(r, 1));
    leads.forEach((s) => push(s, 3));

    // 한 문구 안에서 같은 연결어를 반복하지 않음
    const used = new Set();
    const pickC = (list) => {
      const avail = list.filter((x) => !x || !used.has(x));
      const c = pick(rand, avail.length ? avail : [""]);
      if (c) used.add(c);
      return c;
    };
    const kw = keywordSentences(areaKey, keywords, tone, rand, structure, pickC);
    if (structure === "B" && kw[0]) push(kw[0], 2);

    const sceneConnectors = tone === "concise" ? [""] : ["", "또한 ", "이 밖에 "];
    const actionConnectors = tone === "concise" ? [""] : ["", "특히 ", "이 과정에서 "];
    const changeConnectors = tone === "concise" ? [""] : tone === "growth" ? ["이후 ", "점차 ", ""] : ["", "이후 "];

    const allChanges = [];
    entries.forEach((e, i) => {
      const base = i === 0 ? 1 : 3;
      e.scene.forEach((s, j) => push(i > 0 && j === 0 ? addConnector(s, pickC(sceneConnectors)) : s, base));
      e.action.forEach((s, j) => push(j === 0 && e.scene.length ? addConnector(s, pickC(actionConnectors)) : s, base));
      if (structure === "G") allChanges.push(...e.change);
      else e.change.forEach((s) => push(addConnector(s, pickC(changeConnectors)), 2));
    });
    if (structure === "G") allChanges.forEach((s, j) => push(j === 0 ? s : addConnector(s, pickC(changeConnectors)), 2));

    if (structure !== "B" && kw[0]) push(kw[0], 2);
    if (kw[1]) push(kw[1], 4);

    if (input.closing && areaKey === "behavior") {
      push(pick(rand, ["앞으로의 성장이 더욱 기대되는 학생임.", "앞으로의 발전이 기대됨."]), 5);
    }

    // 분량 맞추기
    let chosen = items.slice();
    const target = input.targetBytes || Infinity;
    const join = (list) => list.map((x) => x.text).join(" ");
    let omitted = 0;
    while (chosen.length > 1 && rules.countBytes(join(chosen)) > target) {
      let worst = -1;
      for (let i = chosen.length - 1; i >= 0; i--) {
        if (worst === -1 || chosen[i].priority > chosen[worst].priority) worst = i;
      }
      chosen.splice(worst, 1);
      omitted++;
    }
    const text = join(chosen).replace(/\s+/g, " ").trim();
    return { text, bytes: rules.countBytes(text), omitted, structure, empty: false };
  }

  /* ---------- 이름·식별정보 가리기 ---------- */
  function maskIdentity(text, names) {
    let t = String(text || "");
    const list = [...new Set((names || []).map((n) => String(n || "").trim()).filter((n) => n.length >= 2))].sort((a, b) => b.length - a.length);
    for (const n of list) t = t.split(n).join("학생");
    t = t.replace(/(?:[1-3]\s*학년\s*)?\d{1,2}\s*반\s*\d{1,2}\s*번/gu, "학생");
    return t;
  }

  /* ---------- 외부 AI용 프롬프트 ---------- */
  function buildPrompt(ctx) {
    const area = rules.AREAS[ctx.areaKey];
    const label = area.label(ctx.grade);
    const names = ctx.names || [];
    const mask = (t) => maskIdentity(t, names);
    const maxChars = area.maxChars;
    const targetChars = Math.round((ctx.targetBytes || maxChars * 3) / 3);
    const lines = [];
    lines.push("당신은 중학교 교사가 쓴 학교생활기록부 관찰 기록을 문장으로 다듬도록 돕는 보조자입니다.");
    lines.push("");
    lines.push("[작성 조건]");
    lines.push(`- 항목: ${label}${ctx.subject ? ` (과목: ${ctx.subject})` : ""}`);
    lines.push(`- 대상: 2026학년도 중학교 ${ctx.grade}학년 (${rules.curriculumOf(ctx.grade)} 개정 교육과정)`);
    lines.push(`- 분량: 한글 약 ${targetChars}자 이내 (나이스 최대 ${maxChars}자 = ${maxChars * 3}Byte, 한글 1자 3Byte·영문/숫자/엔터 1Byte)`);
    lines.push(`- 버전: 서로 다른 구조로 ${ctx.versions || 1}가지`);
    lines.push("- 문체: 문장 끝을 ‘~함’, ‘~임’, ‘~음’ 형태로 쓰고, 주어(학생 이름)는 쓰지 않음");
    lines.push("");
    lines.push("[반드시 지킬 원칙 — 2026학년도 학교생활기록부 기재요령(중학교)]");
    area.guide.forEach((g) => lines.push("- " + g));
    lines.push("- 아래 관찰 기록에 없는 활동, 수치, 결과, 감정, 진로 등을 새로 만들어 넣지 말 것");
    lines.push("- 단순 사실을 과장하거나 부풀리지 말 것 (p.19)");
    lines.push("- 기재 금지: 교내·외 대회와 수상, 공인어학시험, 인증시험, 논문·소논문, 도서출간, 특허 등 지식재산권, 해외 활동, 부모의 사회·경제적 지위, 장학금, 특정 대학명·기관명·상호명·강사명, 자격증, 방과후학교 활동 (p.18-19, p.104)");
    if (ctx.standards && ctx.standards.length) {
      lines.push("");
      lines.push("[관련 성취기준 — 성취기준·성취수준 문장을 그대로 옮기지 말고, 관찰 기록에 드러난 성취수준의 특성과 연결할 것]");
      ctx.standards.forEach((s) => {
        lines.push(`- [${s.code}] ${s.text}`);
        if (s.level && s.levelText) lines.push(`  · 교사가 판단한 성취수준 ${s.level}: ${s.levelText}`);
      });
    }
    if (ctx.planActs && ctx.planActs.length) {
      lines.push("");
      lines.push("[학교교육계획에 따라 학교가 주최·주관한 활동 중 이 학생과 관련된 것 — 날짜·시간 등 정량 정보는 사실대로만]");
      ctx.planActs.forEach((a) => lines.push("- " + a));
    }
    if (ctx.extra) {
      lines.push("");
      lines.push("[참고 정보]");
      ctx.extra.forEach((x) => lines.push("- " + mask(x)));
    }
    lines.push("");
    lines.push("[교사 관찰 기록]");
    (ctx.entries || []).forEach((e, i) => {
      const parts = [];
      if (e.date) parts.push(`시기: ${e.date}`);
      if (e.scene) parts.push(`활동·장면: ${mask(e.scene)}`);
      if (e.action) parts.push(`관찰한 행동: ${mask(e.action)}`);
      if (e.change) parts.push(`변화·성장: ${mask(e.change)}`);
      if (parts.length) lines.push(`${i + 1}. ` + parts.join(" / "));
    });
    if (ctx.keywords && ctx.keywords.length) {
      lines.push("");
      lines.push("[교사가 판단한 특장점] " + ctx.keywords.join(", "));
    }
    lines.push("");
    lines.push("[출력] 완성 문구만 버전별로 번호를 붙여 제시하고, 각 문구 뒤에 공백 포함 글자 수를 괄호로 적을 것.");
    lines.push("");
    lines.push("※ 교사 확인용 안내: AI가 만든 문장은 학교생활기록부에 그대로 입력할 수 없습니다(기재요령 p.19 유의사항 4-다). 실제 수행과 대조해 허위·과장 여부와 유의사항 준수 여부를 확인한 뒤 고쳐 쓰세요.");
    return lines.join("\n");
  }

  SRM.compose = { KEYWORDS, PHRASES, TONES, phraseOf, compose, buildPrompt, maskIdentity };
})(typeof window !== "undefined" ? window : globalThis);
