/**
 * classes.js
 * 수업(기수) 조회·생성. 강사는 본인 수업만, 수강생은 열려 있는 수업만 본다.
 */
import { supabase } from "@/lib/supabase";

// 수강생이 고른 수업을 기억해 둔다 (매번 고르지 않도록)
export const SELECTED_CLASS_KEY = "selected-class-code";

// 헷갈리는 글자(0/O, 1/I/L)를 뺀 코드 문자
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateClassCode() {
  return Array.from(
    { length: 6 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("");
}

/** 수강생 화면용: 아직 만료되지 않은 수업만 */
export async function fetchOpenClasses() {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false });

  return { classes: data || [], error };
}

/** 관제탑용: 로그인한 강사가 만든 수업 전부 (만료된 것도 포함) */
export async function fetchTeacherClasses(teacherEmail) {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_email", teacherEmail)
    .order("created_at", { ascending: false });

  return { classes: data || [], error };
}

export async function createClass({ teacherEmail, label, hoursUntilExpiry = 12 }) {
  const expiresAt = new Date(Date.now() + hoursUntilExpiry * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("classes")
    .insert({ code: generateClassCode(), teacher_email: teacherEmail, label, expires_at: expiresAt })
    .select()
    .single();

  return { newClass: data, error };
}

/** 만료 시각을 옮긴다. 화면이 다시 계산하지 않도록 적용된 시각을 돌려준다. */
async function setExpiry(code, expiresAt) {
  const { error } = await supabase.from("classes").update({ expires_at: expiresAt }).eq("code", code);
  return { expiresAt, error };
}

export function extendClass(code, hoursFromNow = 12) {
  return setExpiry(code, new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString());
}

/** 지금 즉시 마감 — 등록만 막히고 수강생 기록은 그대로 남는다. */
export function closeClass(code) {
  return setExpiry(code, new Date().toISOString());
}

export function isExpired(classRow) {
  if (!classRow?.expires_at) return false;
  return new Date(classRow.expires_at).getTime() <= Date.now();
}
