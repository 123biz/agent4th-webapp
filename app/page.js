"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProgressBar from "@/components/ProgressBar";
import StepCard from "@/components/StepCard";
import ColorPicker from "@/components/ColorPicker";
import GateStep from "@/components/GateStep";
import CourseRoadmap from "@/components/CourseRoadmap";
import { setupGuides } from "@/lib/setupGuides";

// 이미 진행을 시작했거나 제출까지 마친 수강생인지 판단 (다른 사람이 실수로 선택하는 것 방지)
function hasProgress(student) {
  return Boolean(
    student.antigravity_installed ||
      student.netlify_signed_up ||
      student.preview_started ||
      student.pwa_downloaded ||
      student.final_url
  );
}

// '관리자' 계정이 명단에 있으면 맨 위로 올린다 (나머지는 기존 순서 유지 — sort는 안정 정렬)
function orderStudents(students) {
  return [...students].sort((a, b) => {
    if (a.name === "관리자") return -1;
    if (b.name === "관리자") return 1;
    return 0;
  });
}

// 수강생이 마지막으로 진행했던 단계를 기준으로 재진입 지점을 계산
function getResumePoint(student) {
  if (!student.antigravity_installed) return { type: "gate", gateStep: "antigravity" };
  if (!student.netlify_signed_up) return { type: "gate", gateStep: "netlify" };
  // 4문항까지 마치고 제작 화면(제작중/다운로드)까지 진행했었다면, 저장된 입력값으로 미리보기로 바로 이동
  if (student.preview_started && student.business_name) return { type: "preview" };
  return { type: "form" };
}

export default function Home() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0); // 0: 수강생 선택, 1~4: 입력폼
  const [gateStep, setGateStep] = useState(null); // null | "antigravity" | "netlify" | "done"
  const [isConfirmingGate, setIsConfirmingGate] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // 새로고침 시 항상 시작 화면부터 보여주기 위한 로컬 상태

  // 상태 관리
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 진행 도중 관리자가 비활성화하면(realtime으로 selectedStudent가 갱신됨) 즉시 진행을 막는다
  const isBlocked = selectedStudent?.is_active === false;

  // "예시 채우기" 버튼은 이름이 '관리자'인 수강생에게만 노출 (일반 수강생은 직접 입력)
  const isAdminStudent = selectedStudent?.name === "관리자";

  const [businessName, setBusinessName] = useState("");
  const [product, setProduct] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [brandColor, setBrandColor] = useState("");

  // 각 단계별 예시 데이터 채우기 함수
  const fillStep1 = () => setBusinessName("강남 붕어빵 연구소");
  const fillStep2 = () => setProduct("프리미엄 슈크림 붕어빵");
  const fillStep3 = () => setTargetCustomer("점심시간 당이 떨어지는 직장인");

  // 수강생 목록 가져오기 (Supabase 연동 또는 Mock)
  useEffect(() => {
    async function fetchStudents() {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .order("id");

        if (error || !data || data.length === 0) {
          // 환경변수가 없거나 에러 시 테스트 데이터 표시
          setStudents([
            { id: 1, name: "테스터 홍길동" },
            { id: 2, name: "테스터 김철수" },
            { id: 3, name: "강사 임시계정" },
          ]);
        } else {
          setStudents(data);
        }
      } catch (err) {
        setStudents([
          { id: 1, name: "테스터 홍길동" },
          { id: 2, name: "테스터 김철수" },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchStudents();
  }, []);

  // 관리자 로그인 세션 감지 (/admin에서 로그인한 경우, 중복 선택 방지 경고를 건너뛸 수 있도록)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(Boolean(data.session));
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setIsAdmin(Boolean(newSession));
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("students-home")
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

          // 현재 화면에 선택되어 있는 학생이면, 스냅샷도 함께 최신화해야
          // 관제탑에서의 되돌리기 등이 새로고침 없이 실시간으로 반영된다.
          if (payload.eventType !== "DELETE") {
            setSelectedStudent((prev) =>
              prev && prev.id === payload.new.id ? payload.new : prev
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  // 게이트(설치/가입 확인) 통과 처리: Supabase에 기록 후 다음 게이트 또는 본 흐름으로 전환
  const handleGateConfirm = async (columnName, nextGate) => {
    setIsConfirmingGate(true);
    try {
      const now = new Date().toISOString();
      await supabase
        .from("students")
        .update({ [columnName]: true, [`${columnName}_at`]: now, updated_at: now })
        .eq("id", selectedStudent.id);
    } catch (err) {
      // Supabase 연동이 안 되어 있어도 수업 진행에는 지장 없도록 조용히 넘어감
    } finally {
      setIsConfirmingGate(false);
      if (nextGate === "done") {
        setGateStep("done");
        setCurrentStep(1);
      } else {
        setGateStep(nextGate);
      }
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-brutal-cream flex flex-col">
      {/* 상단 로고/헤더 */}
      <header className="w-full px-4 md:px-8 pt-4 pb-4 shrink-0 sticky top-0 z-20 bg-brutal-cream">
        <div className="flex items-center justify-between gap-4">
          {/* 좌측: 로고 */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter cursor-pointer inline-block" onClick={() => setCurrentStep(0)}>
              🚀 Antigravity
            </h1>
          </div>

          {/* 중앙: 타이틀 또는 수강생 이름 */}
          <div className="flex-1 flex justify-center">
            {selectedStudent ? (
              <span className="font-black text-2xl md:text-3xl bg-brutal-green px-8 py-3 border-4 border-brutal-black brutal-shadow-sm whitespace-nowrap">
                {selectedStudent.name}님
              </span>
            ) : (
              <p className="font-black text-2xl md:text-4xl tracking-tighter text-center leading-tight text-brutal-pink whitespace-nowrap">
                스타트업 웹앱 빌더 맛보기
              </p>
            )}
          </div>

          {/* 우측: 관제탑 뱃지 */}
          <div className="flex-1 flex justify-end">
            <div className="brutal-card bg-brutal-white px-5 py-3 font-bold text-lg hidden md:block">
              2시간 완성 관제탑
            </div>
          </div>
        </div>

        {!selectedStudent && (
          <div className="flex justify-center mt-3">
            <p className="inline-block bg-brutal-yellow border-4 border-brutal-black brutal-shadow-sm px-6 py-2 font-black text-base md:text-lg text-brutal-black">
              <span className="mr-2">2026-09-06</span>AI에이전트 3기 4회차(홍용기 박사) 강의 노트
            </p>
          </div>
        )}
      </header>

      {/* 헤더 아래 나머지 전체 영역 */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

      {!hasStarted ? (
        <div className="flex-1 min-h-0 flex items-center justify-center pb-40">
          <button
            onClick={() => setHasStarted(true)}
            className="brutal-btn bg-brutal-pink text-white px-16 py-8 text-3xl md:text-4xl animate-pulse-subtle"
          >
            🚀 시작하기
          </button>
        </div>
      ) : (
      <>
      {/* Step 0: 수강생 선택 화면 */}
      {currentStep === 0 && gateStep === null && (
        <div className="flex-1 min-h-0 w-full px-4 md:px-6 pb-4 grid grid-cols-1 md:grid-cols-[320px_1fr_300px] md:grid-rows-[minmax(0,1fr)] gap-4">
          <CourseRoadmap />

          <main className="h-full min-h-0 mt-8 overflow-y-auto animate-slide-in-up">
          <div className="brutal-card bg-brutal-white p-6">
            <h2 className="text-3xl font-black mb-6">👋 환영합니다!</h2>
            <p className="font-semibold text-lg mb-8">본인의 이름을 선택하고 시작해 주세요.</p>

            {isLoading ? (
              <p>명단 불러오는 중...</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {orderStudents(students).map((student) => {
                  const isDisabled = student.is_active === false;
                  return (
                    <button
                      key={student.id}
                      onClick={() => {
                        if (isDisabled) return;
                        if (!isAdmin && hasProgress(student)) {
                          window.alert(
                            "이미 진행 중이거나 제출을 마친 수강생입니다. 이름을 다시 확인하고 선택해 주세요."
                          );
                          return;
                        }
                        setSelectedStudent(student);
                        const resume = getResumePoint(student);
                        if (resume.type === "gate") {
                          setGateStep(resume.gateStep);
                          setCurrentStep(0);
                        } else if (resume.type === "preview") {
                          const params = new URLSearchParams({
                            name: student.business_name || "",
                            product: student.product || "",
                            customer: student.target_customer || "",
                            color: student.brand_color || "",
                            studentId: student.id,
                          });
                          router.push(`/preview?${params.toString()}`);
                        } else {
                          setBusinessName(student.business_name || "");
                          setProduct(student.product || "");
                          setTargetCustomer(student.target_customer || "");
                          setBrandColor(student.brand_color || "");
                          setGateStep("done");
                          setCurrentStep(1);
                        }
                      }}
                      disabled={isDisabled}
                      className={`brutal-btn py-3 text-lg ${
                        isDisabled
                          ? "bg-brutal-gray opacity-50 cursor-not-allowed"
                          : "bg-brutal-yellow"
                      }`}
                    >
                      {student.name}
                      {isDisabled && " (비활성)"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          </main>
        </div>
      )}

      {/* 관리자가 진행 도중 비활성화한 경우: 모든 흐름을 막고 안내만 노출 */}
      {isBlocked && (
        <main className="flex-1 min-h-0 overflow-y-auto max-w-xl mx-auto mt-24 px-4">
          <div className="brutal-card bg-brutal-white p-8 text-center">
            <h2 className="text-2xl font-black mb-4">⛔ 접근이 제한되었습니다</h2>
            <p className="font-semibold text-lg">
              관리자에 의해 계정이 비활성화되었습니다.
              <br />
              관리자에게 문의해 주세요.
            </p>
          </div>
        </main>
      )}

      {/* 게이트: Antigravity 설치 확인 / Netlify 가입 확인 */}
      {!isBlocked && currentStep === 0 && gateStep === "antigravity" && (
        <main className="flex-1 min-h-0 overflow-y-auto mt-10 px-4">
          <GateStep
            guide={setupGuides.antigravity}
            isConfirming={isConfirmingGate}
            onConfirm={() => handleGateConfirm("antigravity_installed", "netlify")}
          />
        </main>
      )}

      {!isBlocked && currentStep === 0 && gateStep === "netlify" && (
        <main className="flex-1 min-h-0 overflow-y-auto mt-10 px-4">
          <GateStep
            guide={setupGuides.netlify}
            extraGuide={setupGuides.github}
            isConfirming={isConfirmingGate}
            onConfirm={() => handleGateConfirm("netlify_signed_up", "done")}
          />
        </main>
      )}

      {/* Step 1~4: 본격적인 입력 화면 */}
      {!isBlocked && currentStep > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          <div className="mb-12 px-4">
            <ProgressBar currentStep={currentStep} totalSteps={4} />
          </div>

          <main className="max-w-4xl mx-auto flex flex-col items-center px-4">
            {currentStep === 1 && (
              <StepCard
                stepNumber={1}
                emoji="🏪"
                title="당신의 멋진 사업장 이름은 무엇인가요?"
                placeholder="예: 강남 붕어빵 연구소"
                value={businessName}
                onChange={setBusinessName}
                onAutoFill={isAdminStudent ? fillStep1 : undefined}
                bgColor="bg-brutal-yellow"
                isActive={true}
              />
            )}
            
            {currentStep === 2 && (
              <StepCard
                stepNumber={2}
                emoji="🛍️"
                title="무엇을 판매하시나요?"
                placeholder="예: 프리미엄 단팥/슈크림 붕어빵"
                value={product}
                onChange={setProduct}
                onAutoFill={isAdminStudent ? fillStep2 : undefined}
                bgColor="bg-brutal-pink"
                isActive={true}
              />
            )}

            {currentStep === 3 && (
              <StepCard
                stepNumber={3}
                emoji="🎯"
                title="어떤 고객에게 파실 건가요?"
                placeholder="예: 점심시간 디저트를 찾는 직장인"
                value={targetCustomer}
                onChange={setTargetCustomer}
                onAutoFill={isAdminStudent ? fillStep3 : undefined}
                bgColor="bg-brutal-blue"
                isActive={true}
              />
            )}

            {currentStep === 4 && (
              <ColorPicker
                value={brandColor}
                onChange={setBrandColor}
                isActive={true}
              />
            )}

            {/* 하단 네비게이션 버튼 */}
            <div className="mt-12 flex gap-4 w-full max-w-xl justify-between">
              <button
                onClick={prevStep}
                className="brutal-btn bg-brutal-gray px-6 md:px-8 py-4 text-lg whitespace-nowrap"
              >
                👈 이전
              </button>
              
              {currentStep < 4 ? (
                <button
                  onClick={nextStep}
                  disabled={
                    (currentStep === 1 && !businessName.trim()) ||
                    (currentStep === 2 && !product.trim()) ||
                    (currentStep === 3 && !targetCustomer.trim())
                  }
                  className="brutal-btn bg-brutal-green px-10 py-4 text-lg w-full whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  다음 단계로 👉
                </button>
              ) : (
                <button
                  onClick={() => {
                    // 나중에 이 수강생을 다시 선택했을 때 미리보기로 바로 복원할 수 있도록 입력값 저장
                    if (selectedStudent?.id) {
                      supabase
                        .from("students")
                        .update({
                          business_name: businessName,
                          product: product,
                          target_customer: targetCustomer,
                          brand_color: brandColor,
                          updated_at: new Date().toISOString(),
                        })
                        .eq("id", selectedStudent.id)
                        .then(() => {});
                    }
                    const params = new URLSearchParams({
                      name: businessName,
                      product: product,
                      customer: targetCustomer,
                      color: brandColor,
                      studentId: selectedStudent?.id ?? ""
                    });
                    router.push(`/preview?${params.toString()}`);
                  }}
                  className="brutal-btn bg-brutal-black text-brutal-white px-10 py-4 text-lg w-full animate-pulse-subtle whitespace-nowrap"
                  disabled={!brandColor}
                >
                  🚀 우주선 생성하기
                </button>
              )}
            </div>
          </main>
        </div>
      )}
      </>
      )}
      </div>
    </div>
  );
}
