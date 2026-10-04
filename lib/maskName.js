/**
 * maskName.js
 * 수강생 이름 마스킹. 실명은 저장하지 않고, 등록 시점에 마스킹한 값만 DB에 넣는다.
 */

// 사람 이름이 아니라 역할 계정이라 마스킹하지 않고 입력한 그대로 등록한다.
// 앱 곳곳에서 name === "관리자"로 강사 계정을 식별하므로 값이 변형되면 안 된다.
const UNMASKED_NAMES = ["관리자"];

export function normalizeName(rawName) {
  return (rawName || "").trim().replace(/\s+/g, "");
}

// 입력칸에서 허용할 문자: 완성형 한글 + 조합 중인 자모 + 동명이인 구분 숫자.
// 자모(ㅎ, ㅗ)를 허용하지 않으면 한글 입력기의 조합 과정이 깨져 타이핑 자체가 막힌다.
const ALLOWED_WHILE_TYPING = /[^가-힣ㄱ-ㅎㅏ-ㅣ0-9]/g;

/** 한글·숫자가 아닌 문자를 입력 즉시 걸러낸다 (영문이 칸에 쌓이지 않게) */
export function filterNameInput(rawName) {
  return (rawName || "").replace(ALLOWED_WHILE_TYPING, "");
}

/** 방금 입력에서 걸러낸 문자가 있었는지 — 한/영 키 안내를 띄울지 판단용 */
export function hasBlockedChars(rawName) {
  return new RegExp(ALLOWED_WHILE_TYPING.source).test(rawName || "");
}

/**
 * 가운데 글자를 가린다. 첫 글자와 마지막 글자만 남긴다.
 * 홍길동 → 홍*동, 남궁민수 → 남**수, 김수 → 김*
 * 이미 마스킹된 이름(최*혜)에 다시 적용해도 결과가 같다.
 */
export function maskName(rawName) {
  const name = normalizeName(rawName);
  if (UNMASKED_NAMES.includes(name)) return name;

  // 동명이인 구분용 끝자리 숫자는 가리지 않는다.
  // 그래야 김철수 → 김*수, 김철수2 → 김*수2 로 나란히 구분된다.
  const [, base, suffix] = name.match(/^(.*?)(\d*)$/);

  if (base.length <= 1) return base + suffix;
  if (base.length === 2) return `${base[0]}*${suffix}`;
  return `${base[0]}${"*".repeat(base.length - 2)}${base[base.length - 1]}${suffix}`;
}

/** 등록 가능한 이름인지 검사. 문제가 없으면 null, 있으면 안내 문구를 돌려준다. */
export function validateName(rawName) {
  const name = normalizeName(rawName);

  if (!name) return "이름을 입력해 주세요.";
  if (name.length > 10) return "이름이 너무 깁니다. 10글자 이하로 입력해 주세요.";
  if (/[ㄱ-ㅎㅏ-ㅣ]/.test(name)) return "완성되지 않은 글자가 있어요.";
  if (!/^[가-힣]+[0-9]*$/.test(name)) {
    return "한글 이름만 등록할 수 있어요. 동명이인은 뒤에 숫자를 붙여 주세요. (예: 김철수2)";
  }
  if (name.replace(/\d+$/, "").length < 2) return "이름은 2글자 이상 입력해 주세요.";

  return null;
}
