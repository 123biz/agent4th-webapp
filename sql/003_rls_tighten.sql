-- RLS 조이기: 강사는 '본인 수업의 수강생'만 읽고 쓸 수 있게 한다.
--
-- 002_rls.sql 은 경고만 없애려고 모든 정책을 using (true) 로 열어 두었다.
-- 그래서 강사 B가 로그인해도 서버는 전체 수강생을 내려준다 (화면 필터만으로 가려졌을 뿐이다).
-- 이 파일은 그 서버 쪽 구멍을 막는다. Supabase 대시보드 → SQL Editor 에 붙여넣고 한 번 실행한다.
--
-- 정리하면:
--   · 강사(authenticated) → 본인 수업의 수강생만 조회/수정
--   · 수업(classes)       → 본인 수업만 개설/수정 (남의 수업을 마감할 수 없다)
--   · 수강생(anon)        → 열려 있는 수업에만 등록, 진행 상황 컬럼만 수정
--
-- 문제가 생기면 맨 아래 롤백 블록을 실행하면 002 상태로 돌아간다.


-- ─────────────────── 0) 판정 헬퍼 ───────────────────
-- security definer 로 두는 이유: 정책 안에서 classes 를 조회하면 그 조회에도 다시
-- classes 의 RLS가 걸려 판정이 꼬인다. 소유자 권한으로 돌려 그 문제를 피한다.

create or replace function public.is_my_class(p_code text)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (
    select 1 from classes
    where code = p_code
      and teacher_email = auth.jwt() ->> 'email'
  );
$$;

create or replace function public.is_open_class(p_code text)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (
    select 1 from classes
    where code = p_code
      and (expires_at is null or expires_at > now())
  );
$$;

grant execute on function public.is_my_class(text)  to anon, authenticated;
grant execute on function public.is_open_class(text) to anon, authenticated;


-- ─────────────────── 1) classes ───────────────────
drop policy if exists classes_select on classes;
drop policy if exists classes_insert on classes;
drop policy if exists classes_update on classes;

-- 조회: 수강생 화면은 열려 있는 수업을 봐야 하고, 강사는 본인의 마감된 수업까지 봐야 한다.
create policy classes_select_anon on classes
  for select to anon
  using (expires_at is null or expires_at > now());

create policy classes_select_auth on classes
  for select to authenticated
  using (
    teacher_email = auth.jwt() ->> 'email'
    or expires_at is null
    or expires_at > now()
  );

-- 개설: 로그인한 강사가 본인 이메일로만. (수강생은 수업을 만들지 않는다)
create policy classes_insert_auth on classes
  for insert to authenticated
  with check (teacher_email = auth.jwt() ->> 'email');

-- 수정(마감/다시 열기): 본인 수업만. 소유자를 남에게 넘기는 것도 막는다.
create policy classes_update_auth on classes
  for update to authenticated
  using (teacher_email = auth.jwt() ->> 'email')
  with check (teacher_email = auth.jwt() ->> 'email');


-- ─────────────────── 2) students ───────────────────
drop policy if exists students_select on students;
drop policy if exists students_insert on students;
drop policy if exists students_update on students;

-- 조회(강사): 본인 수업의 수강생만. 이게 이번 수정의 핵심이다.
create policy students_select_auth on students
  for select to authenticated
  using (public.is_my_class(class_code));

-- 조회(수강생): 그대로 열어 둔다.
-- 수강생 화면은 로그인이 없어서 '누가 보는지'를 서버가 알 수 없고, 이름 고르기 화면이
-- 같은 수업 명단을 읽어야 동작한다. 수업을 마감한 뒤에도 진행 중인 수강생이 본인 기록을
-- 불러와야 하므로 열린 수업으로도 좁힐 수 없다.
-- 여기를 진짜로 막으려면 조회를 서버 라우트(service_role)로 옮겨야 한다 — 별도 작업.
create policy students_select_anon on students
  for select to anon
  using (true);

-- 등록: 열려 있는 수업에만. 마감된 수업이나 없는 코드로는 들어올 수 없다.
create policy students_insert on students
  for insert to anon, authenticated
  with check (public.is_open_class(class_code));

-- 수정(강사): 본인 수업의 수강생만. 활성 토글·진행 초기화가 여기에 해당한다.
create policy students_update_auth on students
  for update to authenticated
  using (public.is_my_class(class_code))
  with check (public.is_my_class(class_code));

-- 수정(수강생): 본인 진행을 기록해야 하므로 허용한다. 단 아래 컬럼 권한으로
-- 이름·활성 상태·소속 수업은 손대지 못하게 막는다.
create policy students_update_anon on students
  for update to anon
  using (true)
  with check (true);


-- ─────────────── 3) 수강생이 쓸 수 있는 컬럼 제한 ───────────────
-- RLS는 '어떤 행'까지만 정한다. '어떤 컬럼'은 컬럼 권한으로 막아야 한다.
-- 이게 없으면 로그인하지 않은 사람이 남의 이름을 바꾸거나 전원을 비활성으로 돌릴 수 있다.
-- 아래 목록은 수강생 화면(app/page.js, app/preview/page.js)이 실제로 쓰는 컬럼 전부다.

revoke update on students from anon;

grant update (
  antigravity_installed, antigravity_installed_at,
  netlify_signed_up,     netlify_signed_up_at,
  preview_started,       preview_started_at,
  pwa_downloaded,        pwa_downloaded_at,
  final_url,             final_url_at,
  business_name, product, target_customer, brand_color,
  updated_at
) on students to anon;


-- ─────────────────────────── 롤백 ───────────────────────────
-- 아래를 실행하면 002_rls.sql 상태(전부 허용)로 돌아간다.
--
-- grant update on students to anon;
-- drop policy if exists classes_select_anon  on classes;
-- drop policy if exists classes_select_auth  on classes;
-- drop policy if exists classes_insert_auth  on classes;
-- drop policy if exists classes_update_auth  on classes;
-- drop policy if exists students_select_auth on students;
-- drop policy if exists students_select_anon on students;
-- drop policy if exists students_insert     on students;
-- drop policy if exists students_update_auth on students;
-- drop policy if exists students_update_anon on students;
-- drop function if exists public.is_my_class(text);
-- drop function if exists public.is_open_class(text);
-- create policy classes_select on classes
--   for select to anon, authenticated using (true);
-- create policy classes_insert on classes
--   for insert to anon, authenticated with check (true);
-- create policy classes_update on classes
--   for update to anon, authenticated using (true) with check (true);
-- create policy students_select on students
--   for select to anon, authenticated using (true);
-- create policy students_insert on students
--   for insert to anon, authenticated with check (true);
-- create policy students_update on students
--   for update to anon, authenticated using (true) with check (true);
