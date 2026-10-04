"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { generateInitialCode } from "@/lib/codeGenerator";
import { generateManifest, generateServiceWorker, generateIconSvg } from "@/lib/pwaGenerator";
import { supabase } from "@/lib/supabase";
import { resetStudentProgress } from "@/lib/studentProgress";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import PreviewFrame from "@/components/PreviewFrame";
import ChatPanel from "@/components/ChatPanel";

function PreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [finalUrl, setFinalUrl] = useState("");
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);
  const [urlSubmitted, setUrlSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 쿼리 파라미터에서 데이터 추출
      const businessName = searchParams.get("name") || "";
      const product = searchParams.get("product") || "";
      const targetCustomer = searchParams.get("customer") || "";
      const brandColor = searchParams.get("color") || "yellow";
      const studentId = searchParams.get("studentId");

      // 데이터가 아예 없으면 메인으로 튕겨냄
      if (!businessName && !product) {
        router.push("/");
        return;
      }

      // 관리자가 관제탑에서 이 수강생의 진행 상황을 초기화했다면(= 저장된 입력값이 지워졌다면),
      // 주소창에 남아있는 옛 query로 새로고침해도 시작 화면으로 돌려보낸다
      if (studentId) {
        const { data: student, error } = await supabase
          .from("students")
          .select("business_name, is_active")
          .eq("id", studentId)
          .maybeSingle();

        if (cancelled) return;

        if (!error && (!student || student.is_active === false || !student.business_name)) {
          router.push("/");
          return;
        }
      }

      // 코드 생성 엔진 호출
      const initialCode = generateInitialCode({
        businessName,
        product,
        targetCustomer,
        brandColor
      });

      setCode(initialCode);

      // 관제탑에 "제작중" 시작 기록 (4문항 입력 후 미리보기 화면 도달 시점)
      if (studentId) {
        supabase
          .from("students")
          .update({ preview_started: true, preview_started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", studentId)
          .then(() => {});
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  // 수강생이 직접 진행 상황을 초기화하고 처음부터 다시 실습할 수 있게 한다
  const handleSelfReset = async () => {
    const studentId = searchParams.get("studentId");
    const studentName = searchParams.get("studentName");

    const confirmed = window.confirm(
      `${studentName}님, 진행 상황을 처음부터 다시 시작할까요?\n입력했던 4문항과 설치/가입/다운로드 기록이 모두 지워집니다.`
    );
    if (!confirmed) return;

    if (studentId) {
      const { error } = await resetStudentProgress(studentId);
      if (error) {
        window.alert("초기화에 실패했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
    }

    router.push("/");
  };

  // AI 채팅을 통해 코드가 '수정'되는 것을 흉내내는 임시 함수
  const handleUpdateCode = (userInput) => {
    let updatedCode = code;
    const text = userInput.replace(/\s+/g, ""); // 공백 제거 후 검사
    
    // 1. 색상 변경 시연 (조건 완화: '빨', '파', '초' 한 글자만 포함돼도 매칭)
    if (text.includes("파란") || text.includes("파랑") || text.includes("블루") || text.includes("파랗")) {
      updatedCode = updatedCode.replace(/--theme-color:\s*#[^;]+;/, "--theme-color: #6EC6FF;");
    } else if (text.includes("빨간") || text.includes("빨강") || text.includes("레드") || text.includes("핑크") || text.includes("빨갛")) {
      updatedCode = updatedCode.replace(/--theme-color:\s*#[^;]+;/, "--theme-color: #FF6B9D;");
    } else if (text.includes("초록") || text.includes("그린")) {
      updatedCode = updatedCode.replace(/--theme-color:\s*#[^;]+;/, "--theme-color: #7BED9F;");
    } else if (text.includes("노란") || text.includes("노랑") || text.includes("옐로우") || text.includes("노랗")) {
      updatedCode = updatedCode.replace(/--theme-color:\s*#[^;]+;/, "--theme-color: #FFE156;");
    }

    // 2. 색상이 안 바뀌면 제목에 텍스트를 추가해서 수정된 척 함
    if (updatedCode === code) {
      updatedCode = updatedCode.replace(
        /<h2>우주에서 제일 맛있는/,
        "<h2>✨ AI가 뚝딱 수정한 ✨<br/>우주에서 제일 맛있는"
      );
    }

    setCode(updatedCode);
  };

  // 최종 배포 URL 제출: 강사 관제탑에 실시간으로 반영됨
  const handleSubmitFinalUrl = async (e) => {
    e.preventDefault();
    const studentId = searchParams.get("studentId");
    if (!finalUrl.trim() || !studentId) return;

    setIsSubmittingUrl(true);
    try {
      await supabase
        .from("students")
        .update({ final_url: finalUrl.trim(), final_url_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", studentId);
      setUrlSubmitted(true);
    } catch (err) {
      // Supabase 연동이 안 되어 있어도 수업 흐름은 막지 않음
      setUrlSubmitted(true);
    } finally {
      setIsSubmittingUrl(false);
    }
  };

  // ZIP 파일 패키징 및 다운로드
  const handleDownload = () => {
    const businessName = searchParams.get("name") || "비즈니스앱";
    const brandColor = searchParams.get("color") || "yellow";
    const studentId = searchParams.get("studentId");

    // 색상 매핑
    const colorMap = { yellow: "#FFE156", pink: "#FF6B9D", blue: "#6EC6FF", green: "#7BED9F" };
    const themeColor = colorMap[brandColor] || "#FFE156";

    // PWA용 파일 생성
    const manifest = generateManifest({ businessName, themeColor });
    const sw = generateServiceWorker();
    const icon = generateIconSvg({ businessName, themeColor });

    // JSZip으로 압축
    const zip = new JSZip();
    zip.file("index.html", code); // 현재 우측에 렌더링되고 있는 코드
    zip.file("manifest.json", manifest);
    zip.file("service-worker.js", sw);
    zip.file("icon.svg", icon);

    // ZIP 다운로드
    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, `${businessName}_PWA.zip`);
    });

    // 관제탑에 다운로드 완료 기록
    if (studentId) {
      supabase
        .from("students")
        .update({ pwa_downloaded: true, pwa_downloaded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", studentId)
        .then(() => {});
    }
  };

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-brutal-cream flex flex-col">
      {/* 상단 네비게이션 */}
      <header className="bg-brutal-white border-b-4 border-brutal-black p-4 flex items-center justify-between gap-4 shrink-0 z-10">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter cursor-pointer inline-block" onClick={() => router.push("/")}>
            🚀 Antigravity <span className="text-sm font-bold tracking-normal text-brutal-black/50 ml-2 whitespace-nowrap">우주선 건조소</span>
          </h1>
        </div>

        <div className="flex-1 flex justify-center">
          {searchParams.get("studentName") && (
            <div className="flex items-center gap-3">
              <span className="font-black text-2xl md:text-3xl bg-brutal-green px-8 py-3 border-4 border-brutal-black brutal-shadow-sm whitespace-nowrap">
                {searchParams.get("studentName")}님
              </span>
              <button
                onClick={handleSelfReset}
                title="초기화하고 처음부터 다시 하기"
                aria-label="초기화하고 처음부터 다시 하기"
                className="brutal-btn bg-brutal-white px-4 py-3 text-sm font-bold whitespace-nowrap"
              >
                🔄 초기화하고 처음부터 다시 하기
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex justify-end">
          <button
            onClick={handleDownload}
            className="brutal-btn bg-brutal-green px-6 py-2 text-sm md:text-base font-bold whitespace-nowrap"
          >
            📦 PWA 패키징 다운로드
          </button>
        </div>
      </header>

      {/* 최종 배포 URL 제출: Netlify 재배포까지 마친 뒤 여기로 돌아와 제출 */}
      <div className="bg-brutal-blue border-b-4 border-brutal-black px-4 py-3 shrink-0">
        {urlSubmitted ? (
          <p className="font-black text-sm md:text-base">✅ 제출 완료! 강사님 관제탑에 반영됩니다 🎉</p>
        ) : (
          <form onSubmit={handleSubmitFinalUrl} className="flex flex-col md:flex-row gap-2 md:items-center">
            <span className="font-black text-sm md:text-base whitespace-nowrap">
              🏁 Antigravity 수정 + 재배포까지 끝냈다면, 최종 URL을 알려주세요:
            </span>
            <input
              type="url"
              required
              value={finalUrl}
              onChange={(e) => setFinalUrl(e.target.value)}
              placeholder="https://내앱이름.netlify.app"
              className="brutal-input flex-1 px-3 py-2 text-sm font-semibold"
            />
            <button
              type="submit"
              disabled={isSubmittingUrl}
              className="brutal-btn bg-brutal-black text-brutal-white px-6 py-2 text-sm font-bold whitespace-nowrap disabled:opacity-50"
            >
              {isSubmittingUrl ? "제출 중..." : "제출"}
            </button>
          </form>
        )}
      </div>

      {/* 메인 레이아웃: 좌측 채팅창(40%) / 우측 프리뷰(60%) */}
      <main className="flex-1 md:min-h-0 flex flex-col md:flex-row p-4 gap-6 overflow-hidden">
        {/* 좌측 패널 */}
        <div className="w-full md:w-[40%] flex flex-col h-[calc(100vh-100px)] md:h-full md:min-h-0">
          <ChatPanel 
            onUpdateCode={handleUpdateCode} 
            initialData={{
              name: searchParams.get("name") || "",
              product: searchParams.get("product") || "",
              customer: searchParams.get("customer") || "",
              color: searchParams.get("color") || ""
            }}
          />
        </div>

        {/* 우측 패널 */}
        <div className="w-full md:w-[60%] flex flex-col h-[calc(100vh-100px)] md:h-full md:min-h-0 animate-slide-in-right bg-brutal-white">
          <PreviewFrame code={code} />
        </div>
      </main>

      {/* 하단 푸터 */}
      <footer className="w-full px-4 md:px-8 py-2 shrink-0 text-center text-xs md:text-sm font-bold text-brutal-black/50">
        Copyright © 2026 주식회사 에이아이캠프. All rights reserved.
      </footer>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="p-10 font-black text-2xl">우주선 불러오는 중... 🚀</div>}>
      <PreviewContent />
    </Suspense>
  );
}
