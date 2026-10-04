"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { STAGE_DEFS, RESET_STUDENT_FIELDS, resetStudentProgress } from "@/lib/studentProgress";
import { fetchTeacherClasses, createClass, closeClass, extendClass, isExpired } from "@/lib/classes";

// 학생 데이터로부터 단계별 완료 여부를 계산 (별도 stage 컬럼 없이 파생)
function getStages(student) {
  return STAGE_DEFS.map((stage) => ({ label: stage.label, done: !!student[stage.key] }));
}

// 링 차트 반지름(바깥 = 설치 ~ 안쪽 = 최종 제출)과 무지개 배색
const RING_RADII = [44, 35, 26, 17, 8];
const RING_COLORS = [
  "var(--color-brutal-red)",
  "var(--color-brutal-orange)",
  "var(--color-brutal-green)",
  "var(--color-brutal-blue)",
  "var(--color-brutal-purple)",
];

// 가로 막대에서 수강생별로 고정되는 색 (명단 순서 기준, 12명 초과 시 순환)
const STUDENT_COLORS = [
  "#FF6B6B", "#FFA94D", "#FFE156", "#7BED9F", "#6EC6FF", "#B197FC",
  "#FF6B9D", "#38D9A9", "#74C0FC", "#F783AC", "#C0EB75", "#E599F7",
];

// '관리자' 계정이 명단에 있으면 맨 위로 올린다 (나머지는 id 정렬 순서 유지 — sort는 안정 정렬)
function orderStudents(students) {
  return [...students].sort((a, b) => {
    if (a.name === "관리자") return -1;
    if (b.name === "관리자") return 1;
    return 0;
  });
}

// 전체 수강생 기준, 각 단계를 완료한 인원 수/비율로 진행 현황을 보여주는 대시보드
function StageDashboard({ students }) {
  const total = students.length;
  const studentColor = new Map(
    students.map((s, i) => [s.id, STUDENT_COLORS[i % STUDENT_COLORS.length]])
  );

  const stageStats = STAGE_DEFS.map((stage) => {
    // 완료 시각 오름차순(먼저 끝낸 사람이 왼쪽). 시각 기록이 없으면 맨 뒤, 동률은 등록 순서 유지.
    const doneStudents = students
      .filter((s) => !!s[stage.key])
      .sort((a, b) => {
        const ta = a[`${stage.key}_at`] ? Date.parse(a[`${stage.key}_at`]) : Infinity;
        const tb = b[`${stage.key}_at`] ? Date.parse(b[`${stage.key}_at`]) : Infinity;
        if (ta === tb) return 0;
        return ta < tb ? -1 : 1;
      });
    const done = doneStudents.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { ...stage, done, pct, doneStudents };
  });

  return (
    <div className="brutal-card bg-brutal-white p-5 mb-8">
      <h2 className="text-xl font-black mb-6">📊 전체 진행 현황 Dashboard</h2>
      <div className="flex items-center gap-10">
        <div className="shrink-0 flex justify-center">
          {/* 설치(바깥) → 최종 제출(안쪽) 순 6겹 링. 각 링은 실제 완료 비율만큼만 무지개색으로 채워지고,
              나머지는 회색 트랙(=100%)으로 남는다. -rotate-90으로 12시 방향에서 시작한다. */}
          <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90" aria-hidden="true">
            {stageStats.map((stage, idx) => {
              const r = RING_RADII[idx];
              const circumference = 2 * Math.PI * r;
              const filled = (stage.pct / 100) * circumference;
              return (
                <g key={stage.key}>
                  <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-brutal-gray)" strokeWidth="7" />
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke={RING_COLORS[idx]}
                    strokeWidth="7"
                    strokeDasharray={`${filled} ${circumference - filled}`}
                  />
                </g>
              );
            })}
          </svg>
        </div>
        {/* 단계별 가로 막대: 회색 트랙 = 전체 인원(100%). 완료한 수강생마다 1/전체 폭의 칸(구분선 + 이름)이 수강생 고유 색으로 채워진다. */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {stageStats.map((stage, idx) => (
            <div key={stage.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 font-black text-sm whitespace-nowrap">
                {idx + 1}. {stage.label}
              </span>
              <div className="flex flex-1 min-w-0 h-9 bg-brutal-gray border-2 border-brutal-black">
                {stage.doneStudents.map((s) => (
                  <div
                    key={s.id}
                    title={s.name}
                    className="h-full min-w-0 flex items-center justify-center border-r-2 border-brutal-black last:border-r-0 px-0.5 transition-all duration-300"
                    style={{ width: `${100 / total}%`, backgroundColor: studentColor.get(s.id) }}
                  >
                    <span className="font-black text-sm truncate">{s.name}</span>
                  </div>
                ))}
              </div>
              <span className="w-28 shrink-0 font-black text-sm text-right whitespace-nowrap">
                {stage.done}/{total} ({stage.pct}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 이메일만 기억한다. 비밀번호는 저장하지 않는다.
const REMEMBERED_EMAIL_KEY = "admin-remembered-email";

function LoginForm({ onSubmit, error, isSubmitting }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const passwordRef = useRef(null);

  // 정적 내보내기라 빌드 시점에는 localStorage가 없다. 렌더 이후에 읽는다.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (saved) {
        // 정적 내보내기라 렌더 중에는 localStorage를 못 읽는다. 렌더 중 읽으면
        // 빌드 시점에 터지거나 hydration 불일치가 나므로 마운트 후 한 번만 채운다.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEmail(saved);
        passwordRef.current?.focus();
      }
    } catch (err) {
      // 시크릿 모드 등 저장소를 못 쓰는 환경 — 기억 기능만 건너뛴다
    }
  }, []);

  return (
    <main className="mt-24 px-4">
      <div className="text-center mb-10">
        <p className="text-4xl md:text-5xl font-black tracking-tighter whitespace-nowrap">🚀 Antigravity</p>
        <p className="text-3xl md:text-4xl font-black text-brutal-pink mt-6 whitespace-nowrap">
          우주선 건조소 관제탑
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (rememberEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
            else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
          } catch (err) {
            // 저장에 실패해도 로그인 자체는 막지 않는다
          }
          onSubmit(email, password);
        }}
        className="brutal-card bg-brutal-white p-8 flex flex-col gap-4 max-w-sm mx-auto"
      >
        <h2 className="text-2xl font-black mb-2">🔐 관리자 로그인</h2>
        <input
          type="email"
          required
          autoFocus
          autoComplete="username"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="brutal-input px-4 py-3 text-lg"
        />
        <input
          ref={passwordRef}
          type="password"
          required
          autoComplete="current-password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="brutal-input px-4 py-3 text-lg"
        />

        <label className="flex items-center gap-3 font-bold text-base cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(e) => setRememberEmail(e.target.checked)}
            className="w-6 h-6 accent-brutal-black border-4 border-brutal-black cursor-pointer"
          />
          이메일 기억하기
        </label>

        {error && <p className="text-red-600 font-semibold text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="brutal-btn bg-brutal-yellow py-3 text-lg"
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [classes, setClasses] = useState([]);
  const [activeClassCode, setActiveClassCode] = useState(null); // 지금 보고 있는 수업
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 로그인 세션 확인 및 변경 감지
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch((err) => {
        console.error("세션 확인 실패:", err);
        setSession(null);
      })
      .finally(() => {
        setIsAuthChecked(true);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (email, password) => {
    setIsLoggingIn(true);
    setLoginError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoginError("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 내가 만든 수업 목록 (다른 강사 수업은 보이지 않는다)
  useEffect(() => {
    if (!session?.user?.email) return;

    fetchTeacherClasses(session.user.email).then(({ classes: rows }) => {
      setClasses(rows);
      setActiveClassCode((prev) => prev ?? rows[0]?.code ?? null);
    });
  }, [session]);

  const activeClass = classes.find((row) => row.code === activeClassCode) ?? null;

  // 선택한 수업의 수강생만 — 명단·통계·카운트가 모두 이 배열을 쓴다
  const classStudents = activeClassCode
    ? students.filter((student) => student.class_code === activeClassCode)
    : students;

  const handleCreateClass = async () => {
    const label = window.prompt("수업 이름을 입력해 주세요.\n(수강생 화면에 그대로 보입니다)");
    if (!label?.trim()) return;

    const { newClass, error } = await createClass({
      teacherEmail: session.user.email,
      label: label.trim(),
    });

    if (error || !newClass) {
      window.alert(`수업 개설에 실패했어요.\n\n${error?.message || "알 수 없는 오류"}`);
      return;
    }

    setClasses((prev) => [newClass, ...prev]);
    setActiveClassCode(newClass.code);
  };

  // 수업 마감 / 다시 열기 — 등록만 막을 뿐 수강생 기록은 그대로 남는다
  const handleToggleClassOpen = async (classRow) => {
    const willClose = !isExpired(classRow);

    if (willClose) {
      const confirmed = window.confirm(
        `'${classRow.label || classRow.code}' 수업을 지금 마감할까요?\n` +
          `수강생 화면의 수업 목록에서 사라져 더 이상 등록할 수 없습니다.\n` +
          `이미 등록한 수강생의 기록은 그대로 남습니다.`
      );
      if (!confirmed) return;
    }

    const { expiresAt, error } = willClose
      ? await closeClass(classRow.code)
      : await extendClass(classRow.code, 12);

    if (error) {
      window.alert(`변경에 실패했어요.\n\n${error.message}`);
      return;
    }

    setClasses((prev) =>
      prev.map((row) => (row.code === classRow.code ? { ...row, expires_at: expiresAt } : row))
    );
  };

  // 로그인 상태일 때만 수강생 데이터 조회 및 실시간 구독
  useEffect(() => {
    if (!session) return;

    async function fetchAll() {
      const { data } = await supabase.from("students").select("*").order("id");
      setStudents(data || []);
      setIsLoading(false);
    }
    fetchAll();

    const channel = supabase
      .channel("students-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        (payload) => {
          setStudents((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((s) => s.id !== payload.old.id);
            }
            const exists = prev.some((s) => s.id === payload.new.id);
            if (exists) {
              return prev.map((s) => (s.id === payload.new.id ? payload.new : s));
            }
            return [...prev, payload.new].sort((a, b) => a.id - b.id);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const toggleActive = async (student) => {
    const nextValue = !student.is_active;

    // 낙관적 업데이트: Realtime 신호를 기다리지 않고 클릭 즉시 화면에 반영
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, is_active: nextValue } : s))
    );

    const { error } = await supabase
      .from("students")
      .update({ is_active: nextValue, updated_at: new Date().toISOString() })
      .eq("id", student.id);

    if (error) {
      // 저장 실패 시 되돌림
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, is_active: student.is_active } : s))
      );
    }
  };

  // 진행 상황을 초기 상태로 되돌린다 (설치/가입/제작중/다운로드/최종 제출 + 저장된 4문항 입력값 삭제)
  const resetStudent = async (student) => {
    const confirmed = window.confirm(
      `${student.name}님의 진행 상황을 초기 상태로 되돌릴까요?\n설치/가입/제작중/다운로드/최종 제출 기록이 모두 지워지며 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    const previous = student;

    // 낙관적 업데이트: Realtime 신호를 기다리지 않고 클릭 즉시 화면에 반영
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, ...RESET_STUDENT_FIELDS } : s))
    );

    const { error } = await resetStudentProgress(student.id);

    if (error) {
      // 저장 실패 시 되돌림
      setStudents((prev) => prev.map((s) => (s.id === student.id ? previous : s)));
    }
  };

  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-brutal-cream py-10 px-4">
        <p className="text-center font-semibold text-lg mt-24">확인 중...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-brutal-cream py-10 px-4 flex flex-col">
        <div className="flex-1">
          <LoginForm onSubmit={handleLogin} error={loginError} isSubmitting={isLoggingIn} />
        </div>

        {/* 하단 푸터 */}
        <footer className="w-full pt-10 shrink-0 text-center text-xs md:text-sm font-bold text-brutal-black/50">
          Copyright © 2026 주식회사 에이아이캠프. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-cream py-10 px-12 md:px-24">
      {/* 헤더 + 전체 진행 현황을 한 덩어리로 상단 고정 (둘을 묶으면 top 오프셋 계산이 필요 없다) */}
      <div className="sticky top-0 z-20 bg-brutal-cream pt-10 -mt-10 pb-2">
        <header className="mb-10 flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-brutal-pink">🚀 우주선 건조소 관제탑</h1>
          <div className="flex items-center gap-3">
            <div className="brutal-card bg-brutal-white w-32 px-4 py-2 font-bold text-sm text-center whitespace-nowrap">
              수강생 {classStudents.length}명
            </div>
            <div className="brutal-card bg-brutal-green w-32 px-4 py-2 font-bold text-sm text-center whitespace-nowrap">
              활성 {classStudents.filter((s) => s.is_active).length}명
            </div>
            <div className="brutal-card bg-brutal-gray w-32 px-4 py-2 font-bold text-sm text-center whitespace-nowrap">
              비활성 {classStudents.filter((s) => !s.is_active).length}명
            </div>
            <button
              onClick={handleLogout}
              className="brutal-btn brutal-btn-card-shadow bg-brutal-white px-4 py-2 text-sm whitespace-nowrap"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* 수업(기수) 선택 — 다른 강사 수업은 목록에 없다. 수가 늘어도 폭이 일정하도록 드롭다운. */}
        <div className="flex items-center gap-3 flex-wrap mb-6">
          <label htmlFor="class-select" className="font-black text-base whitespace-nowrap">
            🎓 강의 선택하기
          </label>

          <select
            id="class-select"
            value={activeClassCode ?? ""}
            onChange={(e) => setActiveClassCode(e.target.value || null)}
            className="brutal-input px-4 py-2 text-sm font-bold min-w-[18rem]"
          >
            {classes.length === 0 && <option value="">개설된 수업이 없습니다</option>}
            {classes.map((row) => (
              <option key={row.code} value={row.code}>
                {row.label || row.code} ({row.code}){isExpired(row) ? " — 마감됨" : ""}
              </option>
            ))}
          </select>

          {activeClass && (
            <button
              onClick={() => handleToggleClassOpen(activeClass)}
              className={`brutal-btn px-4 py-2 text-sm font-bold whitespace-nowrap ${
                isExpired(activeClass) ? "bg-brutal-blue" : "bg-brutal-white"
              }`}
            >
              {isExpired(activeClass) ? "🔓 다시 열기" : "🔒 지금 마감"}
            </button>
          )}

          {activeClass && (
            <span className="font-bold text-sm text-brutal-black/60 whitespace-nowrap">
              {isExpired(activeClass)
                ? "수강생이 등록할 수 없는 상태입니다"
                : "수강생이 등록할 수 있는 상태입니다"}
            </span>
          )}

          <button
            onClick={handleCreateClass}
            className="brutal-btn bg-brutal-yellow px-4 py-2 text-sm font-bold whitespace-nowrap"
          >
            ➕ 새 수업 개설
          </button>
        </div>

        {!isLoading && <StageDashboard students={classStudents} />}
      </div>

      <main className="w-full">
        {isLoading ? (
          <p className="font-semibold text-lg">불러오는 중...</p>
        ) : (
          <div className="flex flex-col gap-4">
            {orderStudents(classStudents).map((student) => (
              <div
                key={student.id}
                className={`brutal-card p-5 flex flex-col gap-3 ${
                  student.is_active ? "bg-brutal-white" : "bg-brutal-gray opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* 이름 칸은 스크롤 밖에 고정 — 단계 박스를 밀어도 누구 행인지 항상 보이게 */}
                    <div className="w-40 mr-5 shrink-0 flex items-center justify-start gap-8">
                      <span className="font-black text-xl truncate min-w-0" title={student.name}>{student.name}</span>
                      <button
                        onClick={() => resetStudent(student)}
                        title={`${student.name}님 진행 상황 초기화`}
                        aria-label={`${student.name}님 진행 상황 초기화`}
                        className="shrink-0 w-9 h-9 flex items-center justify-center text-brutal-blue hover:opacity-70 transition-opacity cursor-pointer"
                      >
                        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                          />
                        </svg>
                      </button>
                    </div>
                    {/* 단계 박스 + 링크만 가로 스크롤 */}
                    <div className="flex items-center gap-3 min-w-0 overflow-x-auto">
                      {getStages(student).map((stage, idx, arr) => {
                        const isCurrent = !stage.done && (idx === 0 || arr[idx - 1].done);
                        return (
                          <span
                            key={stage.label}
                            className={`w-28 shrink-0 text-center text-sm font-black px-2 py-3 border-2 border-brutal-black whitespace-nowrap ${
                              stage.done
                                ? "bg-brutal-green"
                                : isCurrent
                                  ? "bg-brutal-blue"
                                  : "bg-brutal-gray opacity-50"
                            }`}
                          >
                            {idx + 1}. {stage.label} {stage.done ? "✅" : "☐"}
                          </span>
                        );
                      })}
                      {student.final_url && (
                        <a
                          href={student.final_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="brutal-btn bg-brutal-orange px-4 py-2 text-xs font-black shrink-0 whitespace-nowrap"
                        >
                          🔗 사이트 이동
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-black text-sm">
                      {student.is_active ? "활성" : "비활성"}
                    </span>
                    <button
                      onClick={() => toggleActive(student)}
                      role="switch"
                      aria-checked={student.is_active}
                      aria-label={`${student.name} 활성 상태 전환`}
                      className={`relative w-20 h-11 border-4 border-brutal-black shrink-0 brutal-shadow-sm brutal-hover transition-colors ${
                        student.is_active ? "bg-brutal-green" : "bg-brutal-white"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-8 h-8 bg-brutal-black transition-transform duration-200 ${
                          student.is_active ? "translate-x-9" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 하단 푸터 */}
      <footer className="w-full pt-10 text-center text-xs md:text-sm font-bold text-brutal-black/50">
        Copyright © 2026 주식회사 에이아이캠프. All rights reserved.
      </footer>
    </div>
  );
}
