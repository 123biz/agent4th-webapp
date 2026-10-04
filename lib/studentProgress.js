/**
 * studentProgress.js
 * 수강생 진행 단계 정의와 초기화 로직. 관제탑(관리자)과 수강생 화면이 함께 사용한다.
 */
import { supabase } from "@/lib/supabase";

// 단계 정의 (컬럼명 ↔ 라벨). 학생별 상세 뱃지와 전체 통계 대시보드가 공유한다.
export const STAGE_DEFS = [
  { key: "antigravity_installed", label: "설치" },
  { key: "netlify_signed_up", label: "가입" },
  { key: "preview_started", label: "제작중" },
  { key: "pwa_downloaded", label: "다운로드" },
  { key: "final_url", label: "최종 제출" },
];

// 초기화하면 되돌아가는 값들: 진행 단계 플래그 + 4문항 저장값. is_active(활성 상태)는 건드리지 않는다.
export const RESET_STUDENT_FIELDS = {
  antigravity_installed: false,
  netlify_signed_up: false,
  preview_started: false,
  pwa_downloaded: false,
  final_url: null,
  ...Object.fromEntries(STAGE_DEFS.map((stage) => [`${stage.key}_at`, null])),
  business_name: null,
  product: null,
  target_customer: null,
  brand_color: null,
};

export async function resetStudentProgress(studentId) {
  return supabase
    .from("students")
    .update({ ...RESET_STUDENT_FIELDS, updated_at: new Date().toISOString() })
    .eq("id", studentId);
}
