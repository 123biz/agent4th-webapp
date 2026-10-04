/**
 * codeGenerator.js
 * AI가 생성해 주는 코드를 흉내 내는(Mock) 템플릿 엔진입니다.
 * 수강생이 입력한 데이터를 바탕으로 풀스크린 반응형 + 동적 콘텐츠(이미지/지도)를 생성합니다.
 */
export function generateInitialCode({ businessName, product, targetCustomer, brandColor }) {
  // 1. 브랜드 컬러 매핑
  const colorMap = {
    yellow: "#FFE156",
    pink: "#FF6B9D",
    blue: "#6EC6FF",
    green: "#7BED9F",
  };
  const themeColor = colorMap[brandColor] || "#FFE156";

  // 2. 스마트 키워드 분석 (Mock AI)
  // 2-1. 위치 키워드 분석 -> 구글 맵 URL
  // 전국 17개 시·도 매핑 (강남/홍대는 서울 내 특정 동네라 역 이름을 우선 사용)
  const cityMap = [
    { keyword: "부산", location: "부산시청" },
    { keyword: "대구", location: "대구시청" },
    { keyword: "인천", location: "인천시청" },
    { keyword: "광주", location: "광주시청" },
    { keyword: "대전", location: "대전시청" },
    { keyword: "울산", location: "울산시청" },
    { keyword: "세종", location: "세종시청" },
    { keyword: "경기", location: "경기도청" },
    { keyword: "강원", location: "강원도청" },
    { keyword: "충북", location: "충청북도청" },
    { keyword: "충남", location: "충청남도청" },
    { keyword: "전북", location: "전라북도청" },
    { keyword: "전남", location: "전라남도청" },
    { keyword: "경북", location: "경상북도청" },
    { keyword: "경남", location: "경상남도청" },
    { keyword: "제주", location: "제주도청" },
  ];

  let location = "서울역"; // 기본값
  if (businessName.includes("강남")) location = "강남역";
  else if (businessName.includes("홍대")) location = "홍대입구역";
  else {
    const matchedCity = cityMap.find((c) => businessName.includes(c.keyword));
    if (matchedCity) location = matchedCity.location;
  }

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(location)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  // 2-2. 상품/업종 키워드 분석 -> 고화질 배경 이미지 (Unsplash)
  const imageMap = [
    { keywords: ["붕어", "빵", "베이커리"], image: "https://images.unsplash.com/photo-1596450514735-111a2fe02935?auto=format&fit=crop&w=1920&q=80" }, // 페이스트리/빵
    { keywords: ["커피", "카페"], image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1920&q=80" }, // 커피
    { keywords: ["치킨"], image: "https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=1920&q=80" }, // 치킨
    { keywords: ["고기", "삼겹살", "구이", "바베큐", "고깃집"], image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1920&q=80" }, // 고기/BBQ
    { keywords: ["피자"], image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1920&q=80" }, // 피자
    { keywords: ["헬스", "피트니스", "짐"], image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1920&q=80" }, // 헬스장
    { keywords: ["미용실", "헤어"], image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1920&q=80" }, // 미용실
    { keywords: ["꽃집", "꽃"], image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1920&q=80" }, // 꽃집
    { keywords: ["술집", "포차", "이자카야", "호프"], image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1920&q=80" }, // 술집/바
    { keywords: ["옷가게", "의류", "패션"], image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80" }, // 옷가게
    { keywords: ["애견", "펫샵", "강아지"], image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1920&q=80" }, // 애견/펫샵
    { keywords: ["케이크", "디저트"], image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1920&q=80" }, // 디저트/케이크
    { keywords: ["해산물", "횟집", "생선"], image: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?auto=format&fit=crop&w=1920&q=80" }, // 해산물/횟집
  ];

  let bgImage = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1920&q=80"; // 기본 맛집 사진
  const matchedImage = imageMap.find((entry) =>
    entry.keywords.some((kw) => businessName.includes(kw) || product.includes(kw))
  );
  if (matchedImage) bgImage = matchedImage.image;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName || "나만의 비즈니스 앱"}</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="${themeColor}">
  <style>
    /* 네오 브루탈리즘 기본 스타일 */
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
    
    :root {
      --bg-color: #FFF8E7;
      --text-color: #1A1A2E;
      --theme-color: ${themeColor};
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      overflow-x: hidden;
    }

    /* 반응형 네비게이션 바 */
    .navbar {
      background-color: var(--theme-color);
      border-bottom: 4px solid var(--text-color);
      padding: 20px 5%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .navbar h1 {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -1px;
    }
    .hamburger {
      font-size: 28px;
      cursor: pointer;
    }

    /* 반응형 메인 히어로 배너 (화면 꽉 차게) */
    .hero {
      position: relative;
      width: 100%;
      min-height: 70vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 40px 5%;
      background-image: url('${bgImage}');
      background-size: cover;
      background-position: center;
      border-bottom: 4px solid var(--text-color);
    }
    /* 배경 어둡게 깔아서 글씨 잘 보이게 */
    .hero::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(26, 26, 46, 0.6);
      z-index: 1;
    }
    .hero-content {
      position: relative;
      z-index: 2;
    }
    .hero-badge {
      display: inline-block;
      background-color: var(--theme-color);
      color: var(--text-color);
      font-weight: 900;
      font-size: 20px;
      padding: 8px 16px;
      border: 4px solid var(--text-color);
      margin-bottom: 24px;
      transform: rotate(-3deg);
      box-shadow: 4px 4px 0px var(--text-color);
    }
    .hero h2 {
      font-size: clamp(36px, 8vw, 64px);
      font-weight: 900;
      line-height: 1.2;
      color: #FFF;
      text-shadow: 4px 4px 0px var(--text-color);
      margin-bottom: 20px;
      word-break: keep-all;
    }

    /* 본문 컨텐츠 영역 (화면 중앙 정렬, 최대 너비 제한) */
    .container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 60px 5%;
    }

    /* 그리드 레이아웃 (PC에서는 가로로 2개, 모바일은 세로로) */
    .grid-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      margin-bottom: 60px;
    }

    /* 브루탈리즘 카드 */
    .card {
      background-color: #FFF;
      border: 4px solid var(--text-color);
      box-shadow: 8px 8px 0px var(--text-color);
      padding: 30px;
      transition: transform 0.2s;
      height: 100%;
    }
    .card:hover {
      transform: translate(-4px, -4px);
      box-shadow: 12px 12px 0px var(--text-color);
    }
    .card-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .card h3 {
      font-size: 28px;
      font-weight: 900;
      margin-bottom: 12px;
      background-color: var(--theme-color);
      display: inline-block;
      padding: 4px 8px;
      border: 2px solid var(--text-color);
    }
    .card p {
      font-size: 18px;
      font-weight: 600;
      line-height: 1.6;
    }

    /* 지도 섹션 */
    .map-section {
      border: 4px solid var(--text-color);
      box-shadow: 8px 8px 0px var(--text-color);
      background-color: #FFF;
      padding: 20px;
    }
    .map-section h2 {
      font-size: 32px;
      font-weight: 900;
      margin-bottom: 20px;
      text-align: center;
    }
    .map-container {
      width: 100%;
      height: 400px;
      border: 4px solid var(--text-color);
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    /* 하단 푸터 */
    .site-footer {
      background-color: var(--text-color);
      color: #FFF;
      text-align: center;
      padding: 32px 5%;
      border-top: 4px solid var(--text-color);
    }
    .site-footer .footer-brand {
      font-size: 24px;
      font-weight: 900;
      color: var(--theme-color);
      margin-bottom: 8px;
    }
    .site-footer p {
      font-size: 14px;
      font-weight: 700;
      opacity: 0.8;
    }

    /* PWA 설치 배너 */
    .pwa-install-banner {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999;
      display: none;
      align-items: center;
      gap: 16px;
      background-color: var(--theme-color);
      border: 4px solid var(--text-color);
      box-shadow: 8px 8px 0px var(--text-color);
      padding: 16px 24px;
      font-weight: 800;
      max-width: 90vw;
      flex-wrap: wrap;
      justify-content: center;
    }
    .pwa-install-banner button {
      border: 3px solid var(--text-color);
      background-color: #FFF;
      font-weight: 900;
      padding: 8px 16px;
      cursor: pointer;
      transition: transform 0.15s;
    }
    .pwa-install-banner button:hover {
      transform: translate(-2px, -2px);
    }
    #pwa-install-btn {
      background-color: var(--text-color);
      color: #FFF;
    }
  </style>
</head>
<body>
  
  <!-- 네비게이션 바 -->
  <div class="navbar">
    <h1>${businessName || "비즈니스 이름"}</h1>
    <div class="hamburger">☰</div>
  </div>
  
  <!-- 메인 배너 (Hero - 반응형 풀스크린 이미지) -->
  <div class="hero">
    <div class="hero-content">
      <div class="hero-badge">NEW OPEN</div>
      <h2>우주에서 제일 맛있는<br/>${product || "특별한 상품"}</h2>
    </div>
  </div>
  
  <!-- 상세 컨텐츠 -->
  <div class="container">
    
    <div class="grid-container">
      <!-- 특징 카드 1 -->
      <div class="card">
        <div class="card-icon">🛍️</div>
        <h3>시그니처 메뉴</h3>
        <p>저희 매장의 자랑, <strong>${product || "비법 상품"}</strong>입니다. 최상의 재료로 정성껏 준비했습니다. 한 번 맛보면 멈출 수 없어요!</p>
      </div>

      <!-- 특징 카드 2 -->
      <div class="card">
        <div class="card-icon">🎯</div>
        <h3>이런 분들께 추천해요</h3>
        <p><strong>${targetCustomer || "특별한 당신"}</strong>을 위해 준비했습니다. 지친 하루에 확실한 힐링이 되어 드릴게요.</p>
      </div>
    </div>

    <!-- 오시는 길 (스마트 구글 지도) -->
    <div class="map-section">
      <h2>📍 오시는 길 (${location})</h2>
      <div class="map-container">
        <iframe src="${mapUrl}" allowfullscreen="" loading="lazy"></iframe>
      </div>
    </div>

  </div>

  <!-- 하단 푸터 -->
  <footer class="site-footer">
    <div class="footer-brand">${businessName || "비즈니스 이름"}</div>
    <p>${targetCustomer || "고객"}을 위한 ${product || "특별한 상품"}</p>
    <p>Copyright © 2026 ${businessName || "비즈니스 이름"}. All rights reserved.</p>
  </footer>

  <!-- PWA 설치 배너 -->
  <div id="pwa-install-banner" class="pwa-install-banner">
    <span>📲 이 앱을 홈 화면에 설치하시겠습니까?</span>
    <button id="pwa-install-btn" type="button">설치하기</button>
    <button id="pwa-dismiss-btn" type="button">나중에</button>
  </div>

  <script>
    // 서비스 워커 등록 (오프라인 지원)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
      });
    }

    // 설치 프롬프트를 가로채서 커스텀 배너로 안내
    let deferredInstallPrompt = null;
    const pwaBanner = document.getElementById('pwa-install-banner');
    const pwaInstallBtn = document.getElementById('pwa-install-btn');
    const pwaDismissBtn = document.getElementById('pwa-dismiss-btn');

    // 모바일 기기에서만 설치 배너를 노출 (데스크톱 웹에서는 숨김)
    const isMobileDevice =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      window.matchMedia('(max-width: 768px)').matches;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      if (isMobileDevice) {
        pwaBanner.style.display = 'flex';
      }
    });

    pwaInstallBtn.addEventListener('click', async () => {
      pwaBanner.style.display = 'none';
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
    });

    pwaDismissBtn.addEventListener('click', () => {
      pwaBanner.style.display = 'none';
    });

    window.addEventListener('appinstalled', () => {
      pwaBanner.style.display = 'none';
    });
  </script>

</body>
</html>`;
}
