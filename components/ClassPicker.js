"use client";

import { useEffect, useState } from "react";
import { fetchOpenClasses } from "@/lib/classes";

/**
 * ClassPicker — 수강생이 참여할 수업을 고르는 화면.
 * 만료되지 않은 수업만 보여준다.
 */
export default function ClassPicker({ onSelect }) {
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchOpenClasses().then(({ classes: rows, error }) => {
      if (cancelled) return;
      setClasses(rows);
      setLoadError(Boolean(error));
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="brutal-card bg-brutal-white p-8 max-w-xl mx-auto mt-8">
      <h2 className="text-3xl font-black mb-2">🎓 수업 선택</h2>
      <p className="font-semibold text-base mb-8 text-brutal-black/70">
        참여하실 수업을 선택해 주세요.
      </p>

      {isLoading && <p className="font-bold">수업 목록 불러오는 중...</p>}

      {!isLoading && loadError && (
        <p className="font-bold text-brutal-red">
          수업 목록을 불러오지 못했어요. 강사님께 알려 주세요.
        </p>
      )}

      {!isLoading && !loadError && classes.length === 0 && (
        <p className="font-bold">
          지금 열려 있는 수업이 없어요. 강사님께 수업 개설을 요청해 주세요.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {classes.map((row) => (
          <button
            key={row.code}
            onClick={() => onSelect(row)}
            className="brutal-btn bg-brutal-yellow px-6 py-4 text-left"
          >
            <span className="block text-xl font-black">{row.label || row.code}</span>
            <span className="block text-sm font-bold opacity-70">코드 {row.code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
