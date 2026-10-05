-- RLS 활성화 (Supabase 보안 경고 해소용).
--
-- 목적은 경고를 없애는 것이지 접근을 조이는 게 아니다. 그래서 지금 앱이 하는
-- 동작은 전부 그대로 허용한다. 적용해도 화면 동작은 달라지지 않는다.
--
-- 단 하나 달라지는 것: DELETE 정책을 만들지 않았으므로 삭제만 막힌다.
-- 앱은 어디에서도 삭제를 하지 않으니 영향이 없고, 수강생이 명단을 통째로
-- 지우는 사고만 예방된다.
--
-- 문제가 생기면 맨 아래 롤백 블록을 실행하면 즉시 원상복구된다.

-- ─────────────────────────────── classes ───────────────────────────────
alter table classes enable row level security;

create policy classes_select on classes
  for select to anon, authenticated using (true);

create policy classes_insert on classes
  for insert to anon, authenticated with check (true);

create policy classes_update on classes
  for update to anon, authenticated using (true) with check (true);

-- ─────────────────────────────── students ──────────────────────────────
alter table students enable row level security;

create policy students_select on students
  for select to anon, authenticated using (true);

create policy students_insert on students
  for insert to anon, authenticated with check (true);

create policy students_update on students
  for update to anon, authenticated using (true) with check (true);


-- ─────────────────────────────── 롤백 ──────────────────────────────────
-- drop policy if exists classes_select  on classes;
-- drop policy if exists classes_insert  on classes;
-- drop policy if exists classes_update  on classes;
-- drop policy if exists students_select on students;
-- drop policy if exists students_insert on students;
-- drop policy if exists students_update on students;
-- alter table classes  disable row level security;
-- alter table students disable row level security;
