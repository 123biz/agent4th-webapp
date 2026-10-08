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
import { resetStudentProgress, RESET_STUDENT_FIELDS, STAGE_DEFS } from "@/lib/studentProgress";
import StudentRegisterForm from "@/components/StudentRegisterForm";
import StudentResumeChoice from "@/components/StudentResumeChoice";
import ClassPicker from "@/components/ClassPicker";
import { fetchOpenClasses, SELECTED_CLASS_KEY } from "@/lib/classes";

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
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [pendingStudent, setPendingStudent] = useState(null); // 진행 기록이 있어 확인이 필요한 수강생
  const [selectedClass, setSelectedClass] = useState(null); // 참여 중인 수업 (기수 분리)

  // 상태 관리
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 진행 도중 관리자가 비활성화하면(realtime으로 selectedStudent가 갱신됨) 즉시 진행을 막는다
  const isBlocked = selectedStudent?.is_active === false;

  // 다른 기수 수강생이 섞이지 않도록 선택한 수업으로만 거른다
  const classStudents = selectedClass
    ? students.filter((student) => student.class_code === selectedClass.code)
    : [];

  // "예시 채우기" 버튼은 이름이 '관리자'인 수강생에게만 노출 (일반 수강생은 직접 입력)
  const isAdminStudent = selectedStudent?.name === "관리자";

  const [businessName, setBusinessName] = useState("");
  const [product, setProduct] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [brandColor, setBrandColor] = useState("");

  // 선택한 수강생의 마지막 진행 지점으로 들여보낸다 (명단 클릭 / '이어서 하기'가 공유)
  const enterStudent = (student) => {
    setSelectedStudent(student);

    const resume = getResumePoint(student);
    if (resume.type === "gate") {
      setGateStep(resume.gateStep);
      setCurrentStep(0);
      return;
    }

    if (resume.type === "preview") {
      const params = new URLSearchParams({
        name: student.business_name || "",
        product: student.product || "",
        customer: student.target_customer || "",
        color: student.brand_color || "",
        studentId: student.id,
        studentName: student.name || "",
      });
      router.push(`/preview?${params.toString()}`);
      return;
    }

    setBusinessName(student.business_name || "");
    setProduct(student.product || "");
    setTargetCustomer(student.target_customer || "");
    setBrandColor(student.brand_color || "");
    setGateStep("done");
    setCurrentStep(1);
  };

  // 진행 기록이 있는 본인 이름을 골라 '처음부터 다시'를 선택한 경우
  const handleRestartPending = async () => {
    if (!pendingStudent) return;

    const { error } = await resetStudentProgress(pendingStudent.id);
    if (error) {
      window.alert("초기화에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setPendingStudent(null);
      return;
    }

    // 방금 초기화했으므로 저장돼 있던 입력값 대신 빈 상태로 첫 단계부터 시작한다
    setBusinessName("");
    setProduct("");
    setTargetCustomer("");
    setBrandColor("");
    setSelectedStudent({ ...pendingStudent, ...RESET_STUDENT_FIELDS });
    setGateStep("antigravity");
    setCurrentStep(0);
    setPendingStudent(null);
  };

  // 수강생이 직접 진행 상황을 초기화하고 처음부터 다시 실습할 수 있게 한다
  const handleSelfReset = async () => {
    if (!selectedStudent?.id) return;

    const confirmed = window.confirm(
      `${selectedStudent.name}님, 진행 상황을 처음부터 다시 시작할까요?\n입력했던 4문항과 설치/가입/다운로드 기록이 모두 지워집니다.`
    );
    if (!confirmed) return;

    const { error } = await resetStudentProgress(selectedStudent.id);
    if (error) {
      window.alert("초기화에 실패했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setBusinessName("");
    setProduct("");
    setTargetCustomer("");
    setBrandColor("");
    setSelectedStudent(null);
    setGateStep(null);
    setCurrentStep(0);
  };

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

  // 한 번 고른 수업은 기억해 둔다 (정적 내보내기라 렌더 이후에 읽는다)
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem(SELECTED_CLASS_KEY);
      if (!savedCode) return;

      fetchOpenClasses().then(({ classes }) => {
        const found = classes.find((row) => row.code === savedCode);
        // 만료됐거나 사라진 수업이면 다시 고르게 둔다
        if (found) setSelectedClass(found);
        else localStorage.removeItem(SELECTED_CLASS_KEY);
      });
    } catch (err) {
      // 저장소를 못 쓰는 환경 — 매번 고르면 된다
    }
  }, []);

  const handleSelectClass = (classRow) => {
    setSelectedClass(classRow);
    try {
      if (classRow) localStorage.setItem(SELECTED_CLASS_KEY, classRow.code);
      else localStorage.removeItem(SELECTED_CLASS_KEY);
    } catch (err) {
      // 기억만 못 할 뿐 진행에는 지장 없다
    }
  };

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
      <header className="w-full px-4 md:px-8 pt-4 pb-4 shrink-0 bg-brutal-cream">
        <div className="flex items-center justify-between gap-4">
          {/* 좌측: 로고 */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter cursor-pointer inline-block" onClick={() => setCurrentStep(0)}>
              🚀 Antigravity <span className="text-sm font-bold tracking-normal text-brutal-black/50 ml-2 whitespace-nowrap">우주선 건조소</span>
            </h1>
          </div>

          {/* 중앙: 타이틀 또는 수강생 이름 */}
          <div className="flex-1 flex justify-center">
            {selectedStudent ? (
              <div className="flex items-center gap-3">
                <span className="font-black text-2xl md:text-3xl bg-brutal-green px-8 py-3 border-4 border-brutal-black brutal-shadow-sm whitespace-nowrap">
                  {selectedStudent.name}님
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
            <p className="inline-block bg-brutal-yellow border-4 border-brutal-black brutal-shadow-sm px-6 py-3 font-black text-xl md:text-3xl text-brutal-black">
              AI 에이전트 4기 홍용기 박사 강의 노트
            </p>
          </div>
        )}
      </header>

      {/* 헤더 아래 나머지 전체 영역 */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

      {!hasStarted ? (
        <div className="flex-1 min-h-0 flex items-center justify-center gap-6 pb-40">
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="brutal-btn bg-brutal-white px-10 py-8 text-2xl md:text-3xl whitespace-nowrap"
          >
            ✍️ 본인 이름 등록
          </button>
          <button
            onClick={() => setHasStarted(true)}
            className="brutal-btn bg-brutal-pink text-white px-16 py-8 text-3xl md:text-4xl"
          >
            🚀 시작하기
          </button>
        </div>
      ) : (
      <>
      {/* Step 0: 수강생 선택 화면 */}
      {currentStep === 0 && gateStep === null && (
        <div className="flex-1 min-h-0 w-full px-4 md:px-6 pb-8 grid grid-cols-1 md:grid-cols-[320px_1fr_300px] md:grid-rows-[minmax(0,1fr)] gap-4">
          <CourseRoadmap />

          <main className="h-full min-h-0 mt-8 overflow-y-auto animate-slide-in-up">
          {!selectedClass ? (
            <ClassPicker onSelect={handleSelectClass} />
          ) : (
          <div className="brutal-card bg-brutal-white p-6">
            <h2 className="text-3xl font-black mb-3 break-keep">
              수업명 : {selectedClass.label || selectedClass.code}
            </h2>

            <p className="font-semibold text-lg mb-2 break-keep">
              본인의 이름을 선택하고 시작해 주세요.
            </p>

            <button
              onClick={() => handleSelectClass(null)}
              className="underline font-bold text-sm text-brutal-black/60 mb-8"
            >
              수업 변경
            </button>

            {isLoading ? (
              <p>명단 불러오는 중...</p>
            ) : classStudents.length === 0 ? (
              <p className="font-bold">
                아직 등록된 수강생이 없어요. 시작 화면의 &lsquo;본인 이름 등록&rsquo;으로 먼저 등록해 주세요.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {orderStudents(classStudents).map((student) => {
                  const isDisabled = student.is_active === false;
                  return (
                    <button
                      key={student.id}
                      onClick={() => {
                        if (isDisabled) return;
                        // 진행 기록이 있으면 바로 들여보내지 않고, 이어서/처음부터/취소를 먼저 묻는다
                        if (!isAdmin && hasProgress(student)) {
                          setPendingStudent(student);
                          return;
                        }
                        enterStudent(student);
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
          )}
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
                      studentId: selectedStudent?.id ?? "",
                      studentName: selectedStudent?.name ?? ""
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

      {/* 하단 푸터 */}
      <footer className="w-full px-4 md:px-8 py-2 shrink-0 text-center text-xs md:text-sm font-bold text-brutal-black/50">
        Copyright © 2026 주식회사 에이아이캠프. All rights reserved.
      </footer>

      {pendingStudent && (
        <StudentResumeChoice
          student={pendingStudent}
          stageLabels={STAGE_DEFS.filter((stage) => pendingStudent[stage.key]).map((stage) => stage.label)}
          onResume={() => {
            const student = pendingStudent;
            setPendingStudent(null);
            enterStudent(student);
          }}
          onRestart={handleRestartPending}
          onCancel={() => setPendingStudent(null)}
        />
      )}

      {isRegisterOpen && (
        <StudentRegisterForm
          selectedClass={selectedClass}
          onSelectClass={handleSelectClass}
          onClose={() => setIsRegisterOpen(false)}
          onRegistered={(maskedName) => {
            setIsRegisterOpen(false);
            setHasStarted(true);
            window.alert(`'${maskedName}'님으로 등록됐어요! 명단에서 본인 이름을 선택해 주세요.`);
          }}
        />
      )}
    </div>
  );
}
