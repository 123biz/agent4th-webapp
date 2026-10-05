"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 8;

// 초대/비밀번호 재설정 메일 링크가 도착하는 곳. supabase-js가 URL의 토큰을 읽어 세션을 만든다.
// (정적 export라 서버 코드가 없다. 토큰 처리는 전부 브라우저에서 한다.)
export default function InviteCallbackPage() {
  const [status, setStatus] = useState("checking"); // checking | ready | invalid | done
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 만료된 링크는 해시/쿼리에 error_description이 붙어서 온다
    const params = new URLSearchParams(window.location.hash.replace(/^#/, "") + "&" + window.location.search.replace(/^\?/, ""));
    if (params.get("error")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("invalid");
      return;
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) setStatus("ready");
    });

    // 토큰 교환이 끝난 뒤의 세션을 확인한다. 끝내 없으면 잘못된 접근으로 본다.
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setStatus((prev) => (prev === "checking" ? (data.session ? "ready" : "invalid") : prev));
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);
    if (updateError) {
      setError("비밀번호를 저장하지 못했습니다. 링크가 만료되었다면 초대를 다시 요청해 주세요.");
      return;
    }
    setStatus("done");
  };

  return (
    <div className="min-h-screen bg-brutal-cream py-10 px-4 flex flex-col">
      <main className="flex-1 mt-24">
        <div className="text-center mb-10">
          <p className="text-4xl md:text-5xl font-black tracking-tighter whitespace-nowrap">🚀 Antigravity</p>
          <p className="text-3xl md:text-4xl font-black text-brutal-pink mt-6 whitespace-nowrap">
            우주선 건조소 관제탑
          </p>
        </div>

        {status === "checking" && <p className="text-center font-semibold text-lg">초대 링크 확인 중...</p>}

        {status === "invalid" && (
          <div className="brutal-card bg-brutal-white p-8 flex flex-col gap-4 max-w-sm mx-auto">
            <h2 className="text-2xl font-black">⚠️ 링크를 확인할 수 없어요</h2>
            <p className="font-semibold">초대 링크가 만료되었거나 이미 사용되었습니다. 관리자에게 초대를 다시 요청해 주세요.</p>
            <a href="/admin" className="brutal-btn bg-brutal-yellow py-3 text-lg text-center">로그인 화면으로</a>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="brutal-card bg-brutal-white p-8 flex flex-col gap-4 max-w-sm mx-auto">
            <h2 className="text-2xl font-black mb-2">🔑 비밀번호 설정</h2>
            <input
              type="password"
              required
              autoFocus
              autoComplete="new-password"
              placeholder={`새 비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="brutal-input px-4 py-3 text-lg"
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="비밀번호 확인"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="brutal-input px-4 py-3 text-lg"
            />
            {error && <p className="text-red-600 font-semibold text-sm">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="brutal-btn bg-brutal-yellow py-3 text-lg">
              {isSubmitting ? "저장 중..." : "비밀번호 저장"}
            </button>
          </form>
        )}

        {status === "done" && (
          <div className="brutal-card bg-brutal-white p-8 flex flex-col gap-4 max-w-sm mx-auto">
            <h2 className="text-2xl font-black">✅ 설정 완료</h2>
            <p className="font-semibold">이제 설정한 비밀번호로 관제탑에 로그인할 수 있어요.</p>
            <a href="/admin" className="brutal-btn bg-brutal-yellow py-3 text-lg text-center">관제탑으로 이동</a>
          </div>
        )}
      </main>

      <footer className="w-full pt-10 shrink-0 text-center text-xs md:text-sm font-bold text-brutal-black/50">
        Copyright © 2026 주식회사 에이아이캠프. All rights reserved.
      </footer>
    </div>
  );
}
