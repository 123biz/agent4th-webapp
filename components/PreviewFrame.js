"use client";

/**
 * PreviewFrame — 생성된 HTML 코드를 렌더링하는 iFrame 래퍼 컴포넌트
 */
export default function PreviewFrame({ code }) {
  return (
    <div className="w-full h-full min-h-[600px] md:min-h-0 border-4 border-brutal-black brutal-shadow-lg bg-brutal-white relative overflow-hidden">
      {/* 브라우저 상단 탭 모양 (장식) */}
      <div className="h-10 bg-brutal-black flex items-center px-4 gap-2">
        <div className="w-3 h-3 rounded-full bg-brutal-red"></div>
        <div className="w-3 h-3 rounded-full bg-brutal-yellow"></div>
        <div className="w-3 h-3 rounded-full bg-brutal-green"></div>
        <div className="ml-4 text-brutal-white text-xs font-bold font-sans">
          미리보기
        </div>
      </div>
      
      {/* 실제 프리뷰 iFrame */}
      <iframe
        srcDoc={code}
        title="App Preview"
        className="w-full h-[calc(100%-2.5rem)] border-none bg-brutal-cream"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
