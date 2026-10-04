-- 수업(기수) 분리: 강사별로 본인 수강생만 보이게 한다.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 한 번 실행하면 된다.

-- 1) 수업 테이블
create table if not exists classes (
  code          text primary key,              -- 수강생에게 보여줄 수업 코드 (예: AICAMP4)
  teacher_email text not null,                 -- 이 수업의 주인 (로그인 계정과 대조)
  label         text,                          -- 화면에 표시할 수업 이름
  expires_at    timestamptz,                   -- 이 시각이 지나면 등록을 받지 않는다
  created_at    timestamptz default now()
);

-- 2) 수강생이 어느 수업 소속인지
alter table students add column if not exists class_code text;

create index if not exists students_class_code_idx on students (class_code);

-- 2-1) RLS 끄기. Supabase는 새 테이블에 RLS를 켜둔 채로 만드는데, 정책이 없으면
--      anon 조회가 '에러 없이 빈 결과'로 나오고 등록은 42501로 거부된다.
--      기존 students 테이블과 동일한 수준으로 맞춘다.
alter table classes disable row level security;

-- 3) 기존 수강생 백필 — 이걸 빼먹으면 기존 명단이 관제탑에서 사라진다.
--    아래 세 값(<...>)은 실제에 맞게 고쳐서 실행할 것.
--    teacher_email 은 관제탑에 로그인하는 강사 계정과 정확히 같아야 수업이 보인다.
insert into classes (code, teacher_email, label, expires_at)
values ('<수업코드>', '<강사이메일>', '<수업이름>', null)
on conflict (code) do nothing;

update students
set class_code = '<수업코드>'
where class_code is null;
