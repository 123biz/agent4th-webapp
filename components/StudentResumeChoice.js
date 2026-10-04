"use client";

import { useState } from "react";

/**
 * StudentResumeChoice — 이미 진행 기록이 있는 수강생을 선택했을 때 뜨는 확인 모달.
 * 기본값은 비파괴적인 '이어서 하기'. 남의 이름을 잘못 눌러도 피해가 없도록 한다.
 */
export default function StudentResumeChoice({ student, stageLabels, onResume, onRestart, onCancel }) {
  const [isRestarting, setIsRestarting] = useState(false);

  const handleRestart = async () => {
    setIsRestarting(true);
    await onRestart();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brutal-black/60 px-4">
      <div className="brutal-card bg-brutal-white w-full max-w-xl p-8">
        <h2 className="text-3xl font-black mb-4">
          <span className="bg-brutal-green px-3 py-1 border-4 border-brutal-black">{student.name}</span>님,
          이미 진행 기록이 있어요
        </h2>

        {stageLabels.length > 0 && (
          <p className="font-bold text-base mb-6">
            완료한 단계: {stageLabels.join(" · ")}
          </p>
        )}

        <p className="font-semibold text-base mb-8 text-brutal-black/70">
          본인이 맞다면 이어서 하거나 처음부터 다시 할 수 있어요.
          <br />
          다른 분의 이름이라면 반드시 취소를 눌러 주세요.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            disabled={isRestarting}
            className="brutal-btn bg-brutal-green px-6 py-4 text-xl font-black whitespace-nowrap disabled:opacity-50"
          >
            👉 이어서 하기
          </button>
          <button
            onClick={handleRestart}
            disabled={isRestarting}
            className="brutal-btn bg-brutal-white px-6 py-3 text-base font-bold whitespace-nowrap disabled:opacity-50"
          >
            {isRestarting ? "초기화 중..." : "🔄 초기화하고 처음부터 다시 하기"}
          </button>
          <button
            onClick={onCancel}
            disabled={isRestarting}
            className="brutal-btn bg-brutal-gray px-6 py-3 text-base font-bold whitespace-nowrap disabled:opacity-50"
          >
            취소 (내 이름이 아니에요)
          </button>
        </div>
      </div>
    </div>
  );
}
