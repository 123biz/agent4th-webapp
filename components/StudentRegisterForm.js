"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { maskName, validateName, filterNameInput, hasBlockedChars } from "@/lib/maskName";
import ClassPicker from "@/components/ClassPicker";

/**
 * StudentRegisterForm — 수강생이 본인 이름을 직접 등록하는 모달.
 * 실명은 저장하지 않고, 마스킹한 이름만 DB에 넣는다.
 */
export default function StudentRegisterForm({ selectedClass, onSelectClass, onClose, onRegistered }) {
  const [rawName, setRawName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const masked = maskName(rawName);

  // 수업을 아직 안 골랐으면 수업 선택부터
  if (!selectedClass) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brutal-black/60 px-4 overflow-y-auto py-10">
        <div className="w-full max-w-xl">
          <ClassPicker onSelect={onSelectClass} />
          <button
            onClick={onClose}
            className="brutal-btn bg-brutal-gray px-6 py-3 text-base font-bold w-full mt-4"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const message = validateName(rawName);
    if (message) {
      setError(message);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // 같은 수업 안에서만 중복을 막는다 (다른 기수에 같은 이름이 있어도 상관없다)
      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("name", masked)
        .eq("class_code", selectedClass.code)
        .maybeSingle();

      if (existing) {
        setError(
          `'${masked}'님은 이미 등록되어 있어요. 본인이면 시작하기에서 선택하시고, ` +
            `동명이인이면 이름 뒤에 숫자를 붙여 주세요. (예: ${maskName(rawName + "2")})`
        );
        return;
      }

      const { error: insertError } = await supabase
        .from("students")
        .insert({ name: masked, is_active: true, class_code: selectedClass.code });

      if (insertError) {
        setError("등록에 실패했어요. 강사님께 알려 주세요.");
        return;
      }

      onRegistered(masked);
    } catch (err) {
      setError("등록에 실패했어요. 강사님께 알려 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brutal-black/60 px-4">
      <div className="brutal-card bg-brutal-white w-full max-w-lg p-8">
        <div className="flex items-baseline gap-3 flex-wrap mb-2">
          <h2 className="text-3xl font-black">
            수업명 : {selectedClass.label || selectedClass.code}
          </h2>
          <button
            type="button"
            onClick={() => onSelectClass(null)}
            className="underline font-bold text-base text-brutal-black/60 whitespace-nowrap"
          >
            수업 변경
          </button>
        </div>
        <p className="font-semibold text-base mb-6 text-brutal-black/70">
          개인정보 보호를 위해 가운데 글자는 마스킹 처리됩니다.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            autoFocus
            lang="ko"
            value={rawName}
            onChange={(e) => {
              const typed = e.target.value;
              // 한글 아닌 글자는 칸에 쌓이지 않게 즉시 걸러낸다.
              // 지울 게 없어야 한/영 키만 누르고 바로 다시 칠 수 있다.
              setRawName(filterNameInput(typed));
              setError(
                hasBlockedChars(typed)
                  ? "⌨️ 한/영 키를 확인해 주세요. 한글만 입력할 수 있어요."
                  : ""
              );
            }}
            placeholder="예) 홍길동"
            className="brutal-input w-full px-5 py-4 text-2xl font-black"
          />

          {masked.length >= 2 && (
            <p className="mt-4 font-bold text-lg">
              이렇게 저장됩니다 →{" "}
              <span className="bg-brutal-green px-3 py-1 border-4 border-brutal-black">{masked}</span>
            </p>
          )}

          {error && <p className="mt-4 font-bold text-base text-brutal-red">{error}</p>}

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="brutal-btn bg-brutal-gray px-6 py-3 text-lg font-bold whitespace-nowrap"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="brutal-btn bg-brutal-green px-6 py-3 text-lg font-bold w-full whitespace-nowrap disabled:opacity-50"
            >
              {isSubmitting ? "등록 중..." : "등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
