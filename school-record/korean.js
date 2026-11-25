/* 한국어 문장 처리 도우미: 받침 판별, 조사 선택, ‘~함/~임’형 종결 변환 */
(function (global) {
  "use strict";
  const SRM = (global.SRM = global.SRM || {});

  const BASE = 0xac00;
  const LAST = 0xd7a3;
  const JONG = { none: 0, N: 4, L: 8, LM: 10, M: 16, SS: 20 };

  function isHangul(ch) {
    if (!ch) return false;
    const c = ch.charCodeAt(0);
    return c >= BASE && c <= LAST;
  }
  function jongOf(ch) {
    return isHangul(ch) ? (ch.charCodeAt(0) - BASE) % 28 : -1;
  }
  function withJong(ch, jong) {
    const c = ch.charCodeAt(0) - BASE;
    return String.fromCharCode(BASE + c - (c % 28) + jong);
  }

  // 마지막 글자의 받침 여부 (숫자·영문 근사 처리)
  function hasFinal(word) {
    const w = String(word || "")
      .replace(/\s*\([^()]*\)\s*$/u, "")
      .replace(/[\s)\]’'"」』.,]+$/u, "");
    const ch = w.slice(-1);
    if (!ch) return false;
    if (isHangul(ch)) return jongOf(ch) !== 0;
    if (/[0-9]/.test(ch)) return "013678".includes(ch);
    if (/[a-z]/i.test(ch)) return "lmnr".includes(ch.toLowerCase());
    return false;
  }
  function endsWithRieul(word) {
    const ch = String(word || "").trim().slice(-1);
    return isHangul(ch) && jongOf(ch) === JONG.L;
  }

  // josa("탐구", "을/를") → "탐구를"
  function josa(word, pair) {
    const [withF, withoutF] = pair.split("/");
    if (pair === "으로/로") return word + (hasFinal(word) && !endsWithRieul(word) ? "으로" : "로");
    return word + (hasFinal(word) ? withF : withoutF);
  }

  // 이미 명사형(~함, ~임, ~됨, ~음 등)으로 끝나는지
  // 받침 ㅁ으로 끝나지만 명사형 어미가 아닌 흔한 명사
  const M_NOUNS = /(?:실험|시험|경험|체험|사람|마음|이름|모임|프로그램|게임|팀|시스템|아이템|프리즘|점검|보험|위험|요금|기름|여름|바람|구름|처음|다음|소금|지금|얼음|알림|다짐|그림책|도움반)$/u;

  function isNominalEnding(s) {
    const ch = s.slice(-1);
    if (!isHangul(ch)) return false;
    if (M_NOUNS.test(s)) return false;
    const j = jongOf(ch);
    return j === JONG.M || j === JONG.LM || ch === "음" || ch === "함" || ch === "임" || ch === "됨";
  }

  const ACTION_NOUN = /(?:참여|정리|기록|관찰|비교|분류|분석|측정|질문|제시|설명|발표|표현|보완|수정|확인|추론|검토|수행|실천|노력|준비|협력|협업|공유|조율|지원|배려|조사|탐구|탐색|실험|계획|설계|선택|집중|토론|토의|연습|활용|계산|예측|제안|완성|반영|작성|구성|유지|준수|이해|해석|진행|답변|소통|해결|시도|주도|기여|제작|제출|수집|발견|학습|발언|전달|성장|변화|향상|개선)$/u;

  /**
   * 문장 끝을 ‘~함/~임/~음’ 형태로 바꿈. 변환할 수 없으면 원문 유지.
   * 예) 설명했다 → 설명함, 보였다 → 보였음, 보인다 → 보임, 읽는다 → 읽음, 학생이다 → 학생임
   */
  function toNominal(sentence) {
    let s = String(sentence || "").trim().replace(/\s+/g, " ");
    if (!s) return "";
    s = s.replace(/[.。!?…~]+$/u, "").trim();
    if (!s) return "";
    if (isNominalEnding(s)) return s + ".";

    const rules = [
      [/(하였|했)습니다$/u, "함"],
      [/(되었|됐)습니다$/u, "됨"],
      [/합니다$/u, "함"],
      [/됩니다$/u, "됨"],
      [/입니다$/u, "임"],
      [/(하였|했)(다|어요|음)$/u, "함"],
      [/(되었|됐)(다|어요)$/u, "됨"],
      [/(하였|했)고$/u, "함"],
      [/한다$/u, "함"],
      [/된다$/u, "됨"],
      [/(이|가) ?아니다$/u, "$1 아님"],
      [/이다$/u, "임"],
      [/(있|없)다$/u, "$1음"],
      [/해요$/u, "함"],
      [/돼요$/u, "됨"],
      [/(이)?에요$/u, "임"],
    ];
    for (const [re, rep] of rules) {
      if (re.test(s)) return s.replace(re, rep) + ".";
    }
    // ~는다 → 받침 있는 어간 + 음 (읽는다 → 읽음)
    if (/는다$/u.test(s)) {
      const stem = s.slice(0, -2);
      const last = stem.slice(-1);
      if (hasFinal(stem) || !isHangul(last)) return stem + "음.";
      return stem.slice(0, -1) + withJong(last, JONG.M) + ".";
    }
    // 과거형 ~었다/~았다/~였다 (받침 ㅆ) → ~었음
    if (/다$/u.test(s)) {
      const stem = s.slice(0, -1);
      const last = stem.slice(-1);
      if (isHangul(last)) {
        const j = jongOf(last);
        if (j === JONG.SS) return stem + "음.";
        if (j === JONG.N) return stem.slice(0, -1) + withJong(last, JONG.M) + "."; // 보인다 → 보임
        if (j === JONG.L) return stem.slice(0, -1) + withJong(last, JONG.LM) + "."; // 만들다 → 만듦
        if (j === 0) return stem.slice(0, -1) + withJong(last, JONG.M) + "."; // 뛰어나다 → 뛰어남
        return stem + "음."; // 좋다 → 좋음
      }
    }
    // 명사로 끝나면 ‘함’ 보충 (발표 → 발표함)
    if (ACTION_NOUN.test(s)) return s + "함.";
    return s + ".";
  }

  // 여러 줄·여러 문장 입력을 문장 단위로 나눔
  function splitSentences(text) {
    return String(text || "")
      .replace(/\r\n?/g, "\n")
      .split(/\n+|(?<=[.。!?])\s+/u)
      .map((x) => x.trim().replace(/^[-•·▪*]\s*/u, ""))
      .filter(Boolean);
  }

  // 결정적 의사난수 (학생·버전별로 같은 결과를 내도록)
  function seeded(seedText) {
    let h = 2166136261;
    for (const ch of String(seedText)) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return function () {
      h += 0x6d2b79f5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  SRM.ko = { hasFinal, josa, toNominal, splitSentences, isNominalEnding, seeded };
})(typeof window !== "undefined" ? window : globalThis);
