"use client";

/**
 * ChatPanel — AI 코드 수정 요청을 위한 채팅창 컴포넌트
 */
export default function ChatPanel({ onUpdateCode, initialData }) {
  // 사용자가 입력한 데이터를 보기 좋게 정리
  const dataSummary = initialData ? `입력하신 정보는 다음과 같습니다:
- 사업장 이름: ${initialData.name || "미입력"}
- 판매 상품: ${initialData.product || "미입력"}
- 타겟 고객: ${initialData.customer || "미입력"}
- 브랜드 컬러: ${initialData.color || "미입력"}` : "";

  return (
    <div className="flex flex-col h-full min-h-[600px] md:min-h-0 brutal-card bg-brutal-white">
      {/* 헤더 */}
      <div className="bg-brutal-blue border-b-4 border-brutal-black p-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-brutal-black">🤖 Antigravity AI</h2>
        <span className="bg-brutal-white px-2 py-1 text-xs font-bold border-2 border-brutal-black">디자이너 모드</span>
      </div>

      {/* 체험판 안내: 실제 편집은 다운로드 후 Google Antigravity에서 진행 */}
      <div className="bg-brutal-yellow border-b-4 border-brutal-black px-4 py-2 text-xs md:text-sm font-bold">
        🎬 체험판이에요! 다운로드 받은 뒤, 진짜 수정은 본인의 Google Antigravity에서 채팅으로 요청하시면 돼요.
      </div>

      {/* 채팅 내역 */}
      <div className="flex-1 overflow-y-auto p-4 bg-brutal-cream/50">
        <p className="font-semibold text-sm md:text-base leading-relaxed whitespace-pre-wrap">
          {dataSummary}
        </p>
      </div>

    </div>
  );
}
