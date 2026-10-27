/**
 * courseRoadmap — 오늘 2시간 수업에서 다루는 주제 로드맵 (세션 구분 없이 단일 목록).
 * 문구는 마이스터 2기 커리큘럼(courseMap)에서 그대로 가져왔다.
 */
export const courseRoadmap = [
  {
    id: "ai-ecosystem",
    label: "AI Ecosystem",
    desc: "생성형 AI와 관련하여 AI생태계를 구축하고 있는 카테고리를 6개 범주로 구분합니다.",
    // 카드형 렌더링용 데이터: label/subtitle=헤더, icon=이모지, bg=헤더 배경색, tags=대표 서비스
    children: [
      {
        label: "① LLM 보유 업체",
        subtitle: "모든 서비스의 두뇌",
        icon: "🧠",
        bg: "#CDE8FB",
        desc: "직접 대규모 언어모델을 만들어 API로 제공하는 회사입니다.",
        tags: ["OpenAI", "Anthropic", "Google", "Meta", "Mistral", "xAI", "DeepSeek", "Alibaba", "네이버", "업스테이지"],
      },
      {
        label: "② LLM 활용 프로그램",
        subtitle: "콘텐츠를 만드는 손",
        icon: "🎨",
        bg: "#FFDDB8",
        desc: "다른 회사의 LLM을 가져와 특정 서비스로 만든 프로그램입니다. 글쓰기·챗봇, AI 검색, 이미지·영상·음악 생성, 문서·PPT·디자인 등이 있습니다.",
        tags: ["뤼튼", "Notion AI", "미드저니", "DALL·E", "Higgsfield", "Sora", "Kling", "Suno", "ElevenLabs", "Gamma", "Canva", "Figma"],
      },
      {
        label: "③ 에이전트 특화 프로그램",
        subtitle: "스스로 일하는 직원",
        icon: "🤖",
        bg: "#E0D4F7",
        desc: "목표만 주면 스스로 계획을 세우고 여러 단계를 실행하는 자율형 AI입니다.",
        tags: ["Manus", "Genspark", "AutoGPT", "Flowith", "MiniMax Agent", "Lindy", "Lovable", "OpenAI Dots", "OpenClaw", "Hermes Agent"],
      },
      {
        label: "④ 자동화 툴",
        subtitle: "멈추지 않는 디지털 공장",
        icon: "⚙️",
        bg: "#C5F2D0",
        desc: "여러 앱을 연결해 반복 업무를 자동으로 처리해주는 도구입니다.",
        tags: ["Zapier", "Make", "n8n", "IFTTT", "Pipedream", "Activepieces", "Dify"],
      },
      {
        label: "⑤ 코딩 에이전트",
        subtitle: "개발 전문 AI 팀원",
        icon: "💻",
        bg: "#FBEBA0",
        desc: "코드 작성·수정·실행을 대신 해주는 AI 도구입니다.",
        tags: ["Cursor", "Antigravity", "Claude Code", "ChatGPT Codex", "Gemini CLI"],
      },
      {
        label: "⑥ AI 브라우저",
        subtitle: "웹을 대신 돌아다니는 비서",
        icon: "🌐",
        bg: "#F9C6D8",
        desc: "웹 브라우저에 AI가 들어가, 보고 있는 페이지를 이해하고 클릭·입력까지 대신 해주는 도구입니다.",
        tags: ["Comet", "Claude in Chrome", "Aside", "ChatGPT Atlas", "Dia", "Opera Neon", "Edge Copilot Mode", "Gemini in Chrome"],
      },
    ],
  },
  {
    id: "front-backend",
    label: "Front/Backend",
    desc: "웹 서비스는 사용자가 보는 부분과, 뒤에서 데이터를 처리하는 부분으로 나뉩니다.",
    children: [
      { label: "Frontend", desc: "사용자가 직접 보고 클릭하는 화면(UI)을 만드는 영역입니다. HTML/CSS/JavaScript가 대표적입니다." },
      { label: "Backend", desc: "데이터 저장, 로그인 처리 등 화면 뒤에서 로직을 처리하는 영역입니다. 서버와 데이터베이스가 여기 속합니다." },
      { label: "API", desc: "프론트엔드와 백엔드가 데이터를 주고받는 약속된 통로입니다." },
      { label: "Full Stack", desc: "프론트엔드와 백엔드를 모두 다룰 줄 아는 개발자·개발 방식을 가리키는 업계 용어입니다." },
    ],
  },
  {
    id: "git-vs-github",
    label: "Git vs GitHub",
    desc: "이름은 비슷하지만 역할이 다른 두 도구입니다.",
    children: [
      { label: "Git", desc: "내 컴퓨터에서 코드 변경 이력을 기록·관리하는 버전 관리 프로그램입니다." },
      { label: "GitHub", desc: "Git으로 관리한 코드를 온라인에 올려 백업하고 다른 사람과 공유하는 웹 서비스입니다." },
      { label: "Repository", desc: "코드와 변경 이력이 저장되는 공간입니다. 줄여서 '레포(repo)'라고 부르며, 로컬 저장소와 GitHub의 원격 저장소로 나뉩니다." },
      { label: "git clone", desc: "GitHub 같은 원격 저장소의 코드를 내 컴퓨터로 통째로 복제해오는 명령어입니다." },
    ],
  },
  {
    id: "vanilla-webapp",
    label: "Vanilla Webapp 제작",
    desc: "프레임워크 없이 순수 HTML/CSS/JavaScript만으로 나만의 웹앱을 만듭니다.",
    children: [
      { label: "HTML", desc: "웹페이지의 뼈대(구조)를 만드는 마크업 언어입니다." },
      { label: "CSS", desc: "색상, 레이아웃, 폰트 등 디자인을 입히는 스타일 언어입니다." },
      { label: "JavaScript", desc: "버튼 클릭, 데이터 처리 등 웹페이지에 동작을 부여하는 프로그래밍 언어입니다." },
      {
        label: "Head와 Body",
        desc: "HTML 문서는 크게 head와 body로 나뉩니다. head에는 눈에 보이지 않는 설정(제목, 메타 정보 등)이 들어가고, body에는 화면에 실제로 보이는 내용이 들어갑니다.",
      },
      {
        label: "Body의 구성",
        desc: "body 안은 보통 header(상단 영역), hero(첫 화면을 채우는 큰 배너), section(본문 콘텐츠 구역들), footer(하단 영역) 등으로 구성됩니다.",
      },
    ],
  },
  {
    id: "deploy",
    label: "Deploy",
    desc: "만든 웹앱을 인터넷에 올려 누구나 접속할 수 있게 만드는 과정입니다. 대표적인 무료 배포 툴들을 살펴봅니다.",
    children: [
      { label: "GitHub Pages", desc: "GitHub 저장소에 올린 파일을 그대로 무료 웹사이트로 공개해주는 기능입니다. 순수 정적 파일(HTML/CSS/JS)에 적합합니다." },
      { label: "Netlify", desc: "파일을 드래그 앤 드롭하거나 Git 저장소를 연결해 무료로 배포할 수 있는 서비스입니다. 설정 없이 가장 쉽게 시작할 수 있지만, 무료 플랜은 한 달 빌드 시간이 300분으로 제한됩니다." },
      { label: "Vercel", desc: "React 같은 프레임워크 프로젝트 배포에 특화된 서비스로, Git과 연동하면 자동 재배포됩니다. Next.js와 궁합이 특히 좋습니다." },
      { label: "Cloudflare Pages", desc: "Cloudflare의 빠른 글로벌 네트워크를 이용해 정적 사이트를 무료로 배포하는 서비스입니다. 트래픽이 많아져도 속도가 안정적입니다." },
    ],
  },
  {
    id: "netlify-drop",
    label: "Netlify Drop\n(간단 수동 배포)",
    desc: "만든 웹앱 파일을 드래그 앤 드롭만으로 인터넷에 무료 배포합니다.",
    children: [
      { label: "정적 사이트 호스팅", desc: "서버 코드 없이 HTML/CSS/JS 파일만으로 동작하는 웹사이트를 올려두는 방식입니다." },
      { label: "배포 URL", desc: "업로드하면 즉시 전 세계 어디서나 접속 가능한 주소가 생성됩니다." },
      { label: "PWA", desc: "홈 화면에 추가해서 앱처럼 쓸 수 있게 해주는 웹 기술입니다." },
      { label: "netlify.app 도메인", desc: "별도 도메인을 구매하기 전에는, 배포하면 'myproject.netlify.app' 형태의 Netlify 도메인 주소가 자동으로 발급됩니다." },
    ],
  },
  {
    id: "git-commit",
    label: "Git Commit & Push",
    desc: "코드가 바뀐 시점을 기록하고 되돌릴 수 있게 관리하는 버전 관리 습관입니다.",
    children: [
      { label: "git add .", desc: "바뀐 파일들을 커밋 대상으로 담는 명령어입니다. 마침표(.)는 '현재 폴더의 모든 변경사항'을 뜻합니다." },
      {
        label: 'git commit -m "fix: 변경 내용"',
        desc: "담아둔 변경사항을 하나의 기록으로 남기는 명령어입니다. -m 뒤에 무엇을, 왜 바꿨는지 적습니다.\n앞에 종류를 붙이는 게 관례입니다.\n・feat: 새 기능 추가\n・fix: 버그 수정\n・docs: 문서 수정",
      },
      { label: "git push", desc: "로컬에 쌓인 커밋 기록을 GitHub 같은 원격 저장소로 올려 백업·공유하는 명령어입니다." },
      { label: "git ignore", desc: ".gitignore 파일에 적어둔 파일·폴더는 커밋 대상에서 제외됩니다. API 키, node_modules처럼 올리면 안 되는 것들을 걸러낼 때 씁니다." },
    ],
  },
  {
    id: "vercel-deploy",
    label: "자동 배포 프로세스\n(Github 연동)",
    desc: "React 같은 프레임워크 프로젝트를 Git 저장소와 연결해 자동으로 배포합니다.",
    children: [
      { label: "Git 연동 배포", desc: "GitHub 저장소를 연결하면 코드를 푸시할 때마다 자동으로 재배포됩니다." },
      { label: "환경변수", desc: "API 키처럼 코드에 직접 넣으면 안 되는 값을 안전하게 설정하는 곳입니다." },
      { label: "vercel.app / netlify.app 도메인", desc: "별도 도메인을 구매하기 전에는, 배포하면 'myproject.vercel.app'(Vercel) 또는 'myproject.netlify.app'(Netlify) 형태의 도메인 주소가 자동으로 발급됩니다." },
    ],
  },
];
