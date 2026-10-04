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

/**
 * 가운데 글자를 가린다. 첫 글자와 마지막 글자만 남긴다.
 * 홍길동 → 홍*동, 남궁민수 → 남**수, 김수 → 김*
 * 이미 마스킹된 이름(최*혜)에 다시 적용해도 결과가 같다.
 */
export function maskName(rawName) {
  const name = normalizeName(rawName);
  if (UNMASKED_NAMES.includes(name)) return name;
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}`;
}

/** 등록 가능한 이름인지 검사. 문제가 없으면 null, 있으면 안내 문구를 돌려준다. */
export function validateName(rawName) {
  const name = normalizeName(rawName);

  if (!name) return "이름을 입력해 주세요.";
  if (name.length < 2) return "이름은 2글자 이상 입력해 주세요.";
  if (name.length > 10) return "이름이 너무 깁니다. 10글자 이하로 입력해 주세요.";
  if (name.includes("*")) return "* 기호는 사용할 수 없어요.";
  if (!/^[가-힣a-zA-Z]+$/.test(name)) return "한글 또는 영문 이름만 등록할 수 있어요.";

  return null;
}
