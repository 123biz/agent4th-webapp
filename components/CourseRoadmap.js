"use client";

import { useEffect, useRef, useState } from "react";
import { courseRoadmap } from "@/lib/courseRoadmap";

/**
 * CourseRoadmap — 좌측 "제목 버튼" 네비게이션 + 우측 "설명" 패널을 한 쌍으로 렌더링한다.
 * 부모가 CSS grid일 때 두 컬럼으로 나란히 배치되도록 래핑 없이 Fragment로 반환한다.
 * 버튼 클릭 시 설명 패널이 해당 섹션으로 스크롤 이동하고, 반대로 설명 패널을 직접
 * 스크롤하면 IntersectionObserver가 현재 보이는 섹션에 맞춰 버튼 하이라이트를 갱신한다.
 * selectedTopicId가 바뀔 때마다(클릭이든 스크롤 감지든) 네비게이션 쪽도 해당 버튼이
 * 보이도록 자체 스크롤을 맞춘다.
 */
export default function CourseRoadmap() {
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const sectionRefs = useRef({});
  const buttonRefs = useRef({});
  const detailRef = useRef(null);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeoutRef = useRef(null);

  const handleSelect = (topicId) => {
    setSelectedTopicId(topicId);
    isProgrammaticScroll.current = true;
    sectionRefs.current[topicId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 700);
  };

  useEffect(() => {
    const container = detailRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setSelectedTopicId(visible[0].target.dataset.topicId);
        }
      },
      { root: container, rootMargin: "0px 0px -60% 0px", threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedTopicId) return;
    buttonRefs.current[selectedTopicId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedTopicId]);

  return (
    <>
      <nav className="brutal-card bg-brutal-purple p-6 mt-8 h-full min-h-0 overflow-y-auto animate-slide-in-up">
        <h2 className="font-black text-3xl mb-6">🗺️ 강의 로드맵</h2>

        <div className="flex flex-col gap-6">
          {courseRoadmap.map((topic) => {
            const isActive = selectedTopicId === topic.id;
            return (
              <button
                key={topic.id}
                ref={(el) => {
                  buttonRefs.current[topic.id] = el;
                }}
                onClick={() => handleSelect(topic.id)}
                className={`brutal-btn !normal-case text-xl px-4 h-28 flex items-center justify-center leading-tight text-center whitespace-pre-line ${
                  isActive ? "bg-brutal-pink text-white" : "bg-brutal-yellow"
                }`}
              >
                {topic.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div ref={detailRef} className="brutal-card bg-brutal-white p-6 mt-8 h-full min-h-0 overflow-y-auto animate-slide-in-up">
        {courseRoadmap.map((topic) => (
          <section
            key={topic.id}
            data-topic-id={topic.id}
            ref={(el) => {
              sectionRefs.current[topic.id] = el;
            }}
            className={`border-4 p-5 mb-5 last:mb-0 ${
              selectedTopicId === topic.id
                ? "bg-brutal-pink border-brutal-black text-white"
                : "bg-brutal-cream border-brutal-black"
            }`}
          >
            <div className="font-black text-3xl mb-2">{topic.label}</div>
            <p className="text-xl font-semibold mb-4 opacity-90">{topic.desc}</p>

            {topic.id === "ai-ecosystem" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 text-brutal-black">
                {topic.children.map((child) => (
                  <div key={child.label} className="border-4 border-brutal-black bg-brutal-white flex flex-col">
                    <div className="border-b-4 border-brutal-black px-4 py-3" style={{ backgroundColor: child.bg }}>
                      <div className="font-black text-2xl leading-tight">{child.label}</div>
                      <div className="text-lg font-bold opacity-70">{child.subtitle}</div>
                    </div>
                    <div className="p-4 flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-5xl leading-none shrink-0" aria-hidden="true">
                          {child.icon}
                        </span>
                        <p className="text-lg font-semibold opacity-80">{child.desc}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {child.tags.map((tag) => (
                          <span
                            key={tag}
                            className="border-2 border-brutal-black bg-brutal-cream px-2 py-1 text-base font-black"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {topic.children.map((child) => (
                  <div key={child.label} className="border-2 border-brutal-black bg-brutal-white text-brutal-black p-4">
                    <div className="font-black text-2xl mb-2">{child.label}</div>
                    <div className="text-xl font-semibold opacity-80 whitespace-pre-line">{child.desc}</div>
                    {child.note && <div className="mt-2 text-xl font-black text-blue-700">{child.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
