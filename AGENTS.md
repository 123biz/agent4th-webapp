<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 권한·소유 데이터 작업 규칙

이 앱은 강사마다 자기 수업의 수강생만 봐야 한다. 과거에 남의 수강생 명단이
노출된 사고가 있었다(e9dd2b2, 13d29dd). 아래는 그 재발을 막기 위한 절차다.

## 발동 조건

다음 중 하나라도 수정하면 이 절 전체를 수행한다. 수정 규모와 무관하다.

- 세션·인증: `supabase.auth`, `onAuthStateChange`, 로그인/로그아웃 처리
- 소유 데이터 조회·필터: `app/admin/`, `fetchTeacherClasses`, `students`,
  `classes`, `activeClassCode`, `class_code`
- `sql/` 의 RLS 정책

## 1. 화면 필터만으로 끝내지 않는다

클라이언트 필터는 우회된다. 권한 변경은 **화면과 RLS 양쪽**을 함께 바꾼다.

`sql/002_rls.sql`은 경고를 없애려고 모든 정책을 `using (true)`로 열어 두었고,
그래서 화면 필터를 우회하면 전체 명단을 읽을 수 있었다. `using (true)`는
"정책 있음"이 아니라 "전체 공개"다. `sql/003_rls_tighten.sql`이 현재 기준이다.

## 2. 계정이 바뀌면 이전 사용자의 state를 비운다

`AdminPage`는 로그아웃해도 언마운트되지 않는다. 직접 비우지 않으면
`students` / `classes` / `activeClassCode`가 살아남아 다음 로그인 사용자에게
노출된다. 계정 비교 기준은 `state`가 아니라 `ref`를 쓴다 — 리스너가 낡은 값을
보기 때문이다(`currentUserIdRef`).

`prev ??` 로 이전 선택을 유지하는 패턴은 소유 데이터에 쓰지 않는다.
내 수업 목록에 없는 `activeClassCode`는 버린다.

## 3. 조회는 처음부터 소유 범위로 좁힌다

`select("*")` 후 화면에서 거르지 않는다. `.in("class_code", 내 수업들)` 처럼
쿼리 단계에서 좁힌다. Realtime 콜백도 내 수업 밖의 변경은 무시한다.

수업이 하나도 없는 강사에게는 빈 명단을 보여준다. 수업 목록을 받아오기 전에는
수강생을 조회하지 않는다.

## 4. 교차 계정으로 확인한 뒤에만 완료라고 말한다

아래 4개를 **실제로 실행하고 결과를 보고한 뒤에만** 작업이 끝났다고 말한다.
하나라도 건너뛰면 미완료다.

1. A 강사로 로그인 → 본인 수강생이 보이는가
2. 로그아웃 → B 강사로 로그인 → **새로고침 없이** A의 수강생이 사라지는가
3. 수업이 없는 강사로 로그인 → 명단이 비어 있는가
4. 화면 필터를 우회해도(쿼리 직접 호출) RLS가 막는가

## 변명 차단

| 떠오르는 생각 | 실제 |
|---|---|
| "RLS 경고만 없애면 된다" | `using (true)`는 전체 공개다. 002가 실제로 그래서 뚫렸다 |
| "화면에서 필터링하니 괜찮다" | 화면 필터는 우회된다. 서버에서 한 번 더 막아라 |
| "새로고침하면 사라진다" | 새로고침 전에 보이는 그 순간이 유출이다 |
| "간단한 수정이라 교차 확인은 생략" | e9dd2b2가 바로 그 간단한 수정에서 났다 |
| "로그아웃했으니 state도 비워졌을 것" | 컴포넌트가 언마운트되지 않는다. 직접 비워라 |

## 알려진 예외

수강생 화면은 로그인이 없어 서버가 열람자를 식별할 수 없다. 그래서 `students`의
anon 조회는 열려 있다. 막으려면 `service_role` 서버 라우트가 필요한데 현재는
정적 내보내기라 별도 작업이다. 이 예외를 "권한 검증 불필요"로 확대 적용하지 않는다.
