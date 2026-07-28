# Psyche — 프로젝트 설계 문서 (v0.2, MVP)

> 상태: **개발 진행 중**. CTO 권한으로 설계 결정 및 리팩토링을 자율적으로 수행하며 개발을 계속합니다.

## 프로젝트 비전

이 프로젝트의 핵심은 **AI 리포트가 아니라 Psychological Integration(심리 통합)**입니다. 검사 하나의 결과는 그 자체로는 의미가 작습니다 — 이 서비스의 가치는 여러 검사가 서로를 보완·검증하며 **하나의 통합된 Person Model**을 만들어내는 데 있습니다.

이 통합에는 두 단계가 있고, 각 단계의 주체가 다릅니다.

1. **표준화(코드/Rule 담당)** — 검사마다 제각각인 원점수·척도·밴드를, 검증된 자기 채점 기준 그대로 정규화된 공통 포맷으로 변환하고 구조화하는 단계. 여기서는 새로운 심리학적 규칙을 만들지 않습니다. 오직 채점·정규화·표준화·메타데이터 생성만 수행합니다.
2. **통합 해석(LLM 담당)** — 표준화된 여러 검사 결과를 놓고 상관관계를 찾고, 패턴을 해석하고, 원인 가설을 세우고, 하나의 인물상으로 종합하는 단계. 이 실질적인 "통합(Integration)" 행위 자체가 LLM의 역할입니다. 즉 **Psychological Integration Engine의 정체는 LLM**이며, `IntegrationModule`(코드)의 역할은 그 LLM이 정확하게 통합할 수 있도록 **깨끗하고 표준화된 재료(Person Model)를 만들어 제공하는 것**입니다.

수백 개의 상관관계 규칙을 코드로 직접 구현하지 않습니다 — 그것은 검증되지 않은 심리학 규칙을 이 서비스가 새로 만드는 것이 되어 "새로운 심리검사를 만들지 않는다"는 선정 원칙과 충돌합니다. 상관관계 발견과 심리적 의미 해석은 LLM에 맡기고, 코드는 그 해석의 재료가 되는 데이터 품질(표준화)에 집중합니다. 따라서 이 시스템의 진짜 엔진은 `ReportEngine`이 아니라 **`Psychological Integration Engine`**이며, 모든 도메인 설계는 "검사를 어떻게 저장할 것인가"가 아니라 **"여러 검사 결과를 어떻게 LLM이 통합 해석하기 좋은 형태로 표준화할 것인가"**를 중심으로 이루어집니다. (상세 설계: 1.3절 IntegrationModule, 5.3절 PersonModel). AI는 진단·질병판정·치료행위를 하지 않고, 표준화된 Person Model에 대한 해석(가설 형태의 원인 분석 포함)만 수행합니다. 모든 기능 추가는 "이 기능이 사용자가 자기 자신을 더 잘 이해하도록 돕는가"를 기준으로 판단합니다.

## 프로젝트 범위 — 개인용 도구 (Personal Tool)

이 프로젝트는 **당분간 공개 서비스가 아니라, 사용자 1명(개발자 본인)을 위한 개인용 도구**입니다. 따라서 결제/구독, 관리자 페이지, 대규모 트래픽 대응, 멀티테넌트, 수평 확장 같은 SaaS 성격의 기능은 지금 단계에서 고려하지 않습니다. 대신 다음 네 가지를 핵심 가치로 두고, 여기에 개발 역량을 집중합니다.

1. **심리검사 엔진** — 검사 문항·채점 로직의 정확성과 확장 용이성 (TestDefinition, TestScorer)
2. **Psychological Integration Engine** — 여러 검사를 표준화해 하나의 Person Model로 만드는 파이프라인 (IntegrationModule)
3. **Person Model** — 그 표준화의 산출물 자체의 품질과 구조
4. **AI Report Engine** — Person Model을 통합 해석해 서사형 리포트로 만드는 품질

확장성보다 **정확성·유지보수성·심리학적 완성도·AI 리포트 품질**을 우선합니다. 예를 들어 심리검사를 하나 더 추가하는 일이 결제 기능을 만드는 일보다 이 프로젝트에서는 더 중요합니다. 다만 이후 공개 서비스로 발전할 가능성을 열어두기 위해, 클린 아키텍처/모듈 경계 같은 구조는 그대로 유지하고, "지금 당장 불필요한 기능만" 만들지 않습니다.

**Auth에 대한 구체적 결정**: 사용자가 1명뿐이므로 공개 회원가입(`POST /auth/signup`)은 만들지 않습니다. 단일 계정은 시드 스크립트(환경변수 `ADMIN_EMAIL`/`ADMIN_PASSWORD`)로 생성하고, API는 로그인(JWT 발급)과 그 토큰으로 보호되는 나머지 엔드포인트만 제공합니다. Redis 기반 Refresh Token 회전처럼 다중 세션·탈취 대응을 위한 인프라는 지금은 과설계이므로 만들지 않고, 단일 Access Token(만료 기간을 넉넉히, 예: 30일)으로 단순화합니다. User 컬렉션/모듈 구조 자체는 유지해, 훗날 공개 서비스로 전환할 때 이 부분만 확장하면 되게 합니다.

## 확정된 설계 전제 (사용자 확인 완료)

| 항목 | 결정 |
|---|---|
| 고위험 응답(PHQ-9 Q9 등) 안전장치 | **MVP에 포함** |
| 통합 리포트 생성 조건 | **필수 검사 7종 전부 완료 시에만** 생성 가능 |
| 검사 응시 중도 이탈 후 재개 | **이어하기 지원** |
| 파일 저장소(PDF 등) | **로컬 디스크 + Docker volume** (추후 S3 호환 스토리지로 교체 가능한 구조로 설계) |

---

## 1. 프로젝트 전체 구조

### 1.1 리포지토리 전략 — 모노레포

```
psyche/
├── apps/
│   ├── api/        # NestJS 백엔드
│   └── web/         # Next.js 프론트엔드
├── packages/
│   └── shared/       # API 간 공유 타입/enum (DTO, TestCode, Severity 등)
├── docker/
│   └── docker-compose.yml   # mongo, redis, api, web
└── docs/
```

**이유**: 개발자가 1인(또는 소수)이고, 백엔드·프론트가 같은 도메인 개념(TestCode, Severity band 등)을 공유해야 합니다. 폴리레포로 나누면 타입 동기화 비용이 커지고, 초기 버전관리/배포가 번거로워집니다. 다만 Turborepo/Nx 같은 고급 모노레포 툴은 이 규모에서 과설계이므로, npm/pnpm workspaces만으로 충분합니다.

**주의**: `packages/shared`에는 **검사 채점 로직을 절대 넣지 않습니다.** 채점은 서버(API)에서만 수행되어야 하며, 클라이언트가 점수 산출 로직을 알 수 있으면 결과 조작 위험이 생깁니다. 공유 패키지는 순수 타입/상수만 포함합니다.

### 1.2 아키텍처 레이어 (Clean Architecture / DDD-lite)

```
Controller (HTTP I/O, DTO 검증)
   ↓
Application Service (유스케이스 오케스트레이션)
   ↓
Domain (엔티티, 값 객체, 채점 전략 — 프레임워크 비의존)
   ↓
Infrastructure (Prisma Repository, AIProvider 구현체(Gemini/OpenAI/Groq), BullMQ, PDF Generator, FileStorage)
```

**이유**: "과도한 복잡성은 피하되 DDD를 참고"하라는 원칙에 따라, 레이어드 아키텍처 정도로 단순화합니다. 채점 로직(Domain)은 처음에 검사별 `TestScorer` 클래스(Strategy 패턴)를 하나씩 만드는 안을 검토했지만, 실제로 필수 7종은 물론 향후 선택 9종(OCI-R, ASRS 등)까지 포함해도 전부 "역채점 보정 후 합산 → (×배수)÷(나눗수) → 밴드 매핑"이라는 **동일한 공식**을 따르는 Likert 합산 척도입니다. 검사마다 다른 것은 로직이 아니라 데이터(문항 수·방향·배점·밴드 구간)뿐이므로, 검사 수만큼 거의 동일한 클래스를 복제하는 대신 **하나의 데이터 기반 `GenericTestScorer`**로 구현합니다(5.2절 ScoringConfig). 이는 "3줄 반복이 섣부른 추상화보다 낫다"는 단순성 원칙을 반대로 적용한 경우로, 다수의 동일 패턴 앞에서 억지로 클래스를 나누는 것이 오히려 과설계입니다. 다만 향후 스킵 로직이나 비선형 채점처럼 이 공식을 벗어나는 검사가 추가되면, 그때 해당 검사만 별도 Scorer로 분리합니다.

이 레이어 구조에서 Domain 레이어 안의 **IntegrationModule**이 하는 일은 "여러 검사의 원점수/밴드 → 표준화된 Person Model" 변환까지입니다. 여기까지는 결정론적 코드(정규화·표준화·메타데이터 생성)로 처리해 단위테스트·감사·버전관리가 가능합니다. 그 다음 단계 — Person Model을 놓고 상관관계를 찾고 원인 가설을 세우고 하나의 인물상으로 통합 서술하는 것 — 은 의도적으로 코드가 아닌 **AI(Application 레이어가 호출하는 Infrastructure 구현체)**에 맡깁니다. 이유: 검사 간 상관관계·인과 해석은 조합의 수가 매우 많고 맥락 의존적이라 규칙으로 일반화하면 이 서비스가 스스로 "검증되지 않은 심리학 규칙"을 만들어내는 결과가 되기 때문입니다. 대신 코드는 LLM이 잘못 해석할 여지를 줄이도록 **표준화된 고품질 입력을 만드는 데만** 집중합니다.

### 1.3 핵심 모듈 (NestJS Feature Modules)

- `AuthModule` — 단일 계정 로그인/JWT 발급 (공개 회원가입 없음 — 시드 스크립트로 계정 생성)
- `UsersModule` — 내 프로필 조회
- `TestDefinitionsModule` — 검사 정의(문항, 채점규칙) 조회
- `SessionsModule` — 검사 응시(시작/이어하기/제출/채점) + **위험 응답 감지**
- **`IntegrationModule`** — 완료된 TestSession들의 원점수/밴드/하위척도를 정규화·표준화하여 Person Model을 조립·저장 (5.3절). **상관관계·인과 해석은 여기서 하지 않습니다** — 오직 채점 결과의 정규화와 구조화만 담당합니다.
  - `domain/trait-normalizer.ts` — 검사별 원점수/밴드를 공통 정규화 척도(0-100)로 변환하는 검사별 Normalizer (Strategy 패턴)
  - `domain/person-model-builder.service.ts` — 정규화된 결과들을 Person Model 문서로 조립 (메타데이터: 완료 검사 수, 버전, 이전 Person Model과의 diff 등)
- `ReportsModule` — Person Model을 **입력받아 AI가 실제 통합 해석(상관관계, 가설, 서사)을 수행**하도록 오케스트레이션 (IntegrationModule에 의존, Psychological Integration의 실제 수행자는 AI)
  - `ai/` — `AIProvider` 인터페이스 + Gemini/OpenAI/Groq 구현체(환경변수 `AI_PROVIDER` 하나로 교체), 프롬프트 빌더(Person Model → 14섹션 통합 해석·서술). 특정 LLM 벤더에 종속되지 않는다.
  - `pdf/` — PDF 생성
  - `queue/` — BullMQ 프로세서
- `FilesModule` — 파일 저장(로컬 디스크 추상화 — 후술)
- `CommonModule` — Guard, Interceptor, Filter, Decorator, Pipe

---

## 2. 기능 명세

### 2.1 인증/계정 (개인용 도구 범위로 최소화)
- 공개 회원가입 없음 — 계정은 시드 스크립트(`ADMIN_EMAIL`/`ADMIN_PASSWORD`)로 1개만 생성
- 로그인 → 단일 Access Token 발급 (만료 30일, Refresh Token/세션 회전 없음)
- 내 프로필 조회
- 비밀번호 변경(선택)

향후 공개 서비스로 전환할 경우에만 회원가입/Refresh Token/회원탈퇴를 다시 설계한다 (지금은 구현하지 않음).

### 2.2 검사(Assessment)
- 검사 목록 조회 (필수 7종 / 선택 9종 구분, 소요시간, 문항 수, 라이선스 고지 여부 표시)
- 검사 시작 → 세션 생성
- **이어하기**: 미완료 세션이 있으면 이어서 진행 (문항별 답변을 즉시 저장)
- 문항 응답 저장 (문항 단위 autosave)
- **위험 응답 감지**: PHQ-9 9번 문항 등 사전 정의된 "위기 신호 문항"에 임계 응답 시, 저장 API 응답에 `riskFlag: true` + 안내 메시지를 즉시 포함 → 프론트가 즉시 안전 안내 배너/모달 표시 (검사 완료를 기다리지 않음)
- 검사 제출 → 서버에서 즉시 채점 (원점수, 하위척도, 심각도 밴드 산출)
- 개별 결과 조회
- 내 응시 이력 조회

### 2.3 AI 통합 리포트
- 생성 가능 조건: **필수 7종 전부 `completed` 상태**일 때만 "리포트 생성" 버튼 활성화 (서버에서도 이중 검증)
- 리포트 생성 요청 → 비동기 큐 처리 → 상태 폴링
- 14개 섹션 리포트 조회 (섹션 정의는 5.2절 AIReport 참조 — 개별 검사 결과 나열이 아니라 **하나의 인물상으로 통합된 서술**)
- PDF 다운로드
- 리포트 이력 조회

### 2.4 안전(Safety) — MVP 필수 기능
- 위기 신호 문항 응답 감지 로직 (설정 기반: 어떤 문항이 어떤 값 이상일 때 트리거되는지 `TestDefinition`에 메타데이터로 기술)
- 위기 안내 컴포넌트: 생명의전화(1588-9191), 정신건강 상담전화(1577-0199), 자살예방상담전화(1393) 등 안내 — **문구는 의료 자문 없이 임의 작성하지 않고, 실제 서비스 배포 전 관련 기관 안내 문구를 그대로 인용하도록 별도 확인 필요** (지금은 플레이스홀더로 설계)
- 모든 AI 리포트 화면/PDF 상단에 "본 리포트는 의학적 진단이 아니며 전문가 상담을 대체하지 않습니다" 고지 고정 노출

### 2.5 관리자(최소 범위)
- MVP에는 **관리자 UI를 만들지 않습니다.** 검사 정의(문항/채점규칙)는 시드 스크립트로 DB에 주입합니다.
- 이유: 관리자 CMS는 그 자체로 하나의 서브시스템이며, MVP 목표(회원가입→검사→AI리포트→PDF→이력)에 직접 기여하지 않습니다. 문항 데이터는 자주 바뀌지 않으므로 코드/시드로 관리해도 충분합니다.

---

## 3. 사용자 플로우

```
[랜딩 페이지]
     ↓
[회원가입/로그인]
     ↓
[대시보드] ── 필수 7종 진행 현황(체크리스트) + 선택 검사 목록
     ↓
[검사 선택] → 소개 페이지(문항 수/소요시간/라이선스 고지)
     ↓
[검사 응시] ── 문항별 응답(autosave) ──(이탈 시)── [재접속 → 이어하기 감지 → 응시 화면 복귀]
     ↓ (전체 응답 완료)
[제출] → 서버 채점
     ↓
[개별 결과 화면] (점수/밴드/간단 설명)
     ↓ (필수 7종 전부 완료 시)
[대시보드에 "통합 리포트 생성하기" 버튼 활성화]
     ↓
[생성 요청] → [생성 중 상태 화면(폴링)] → [완료 알림]
     ↓
[리포트 상세 화면] (14개 섹션)
     ↓
[PDF 다운로드]
     ↓
[마이페이지 → 검사 이력 / 리포트 이력 조회]
```

**분기 — 위기 신호 감지**: 검사 응시 중 어느 시점이든 위기 신호 문항에 고위험 응답 시, 해당 문항 저장 직후 안전 안내 모달이 검사 흐름과 무관하게 즉시 노출됩니다(검사는 계속 진행 가능).

---

## 4. 페이지 구성 (Next.js)

| 경로 | 설명 |
|---|---|
| `/` | 랜딩 |
| `/login`, `/signup` | 인증 |
| `/dashboard` | 필수/선택 검사 진행 현황, 리포트 생성 진입점 |
| `/tests` | 전체 검사 목록 |
| `/tests/[code]` | 검사 소개 (시작하기 / 이어하기 버튼) |
| `/tests/[code]/session` | 문항 응시 화면 (진행바, autosave, 위기신호 모달) |
| `/tests/[code]/result` | 개별 결과 |
| `/reports` | 리포트 이력 목록 |
| `/reports/[id]` | 리포트 상세 (생성 중이면 진행 상태, 완료 시 14섹션 + PDF 다운로드) |
| `/account` | 프로필 |
| `/account/security` | 비밀번호 변경 / 회원탈퇴 |

**이유**: `/reports/[id]`를 상태(생성중/완료)에 따라 하나의 라우트에서 분기 렌더링하도록 설계 — 별도의 `/generating` 라우트를 만들면 상태 전이 시 라우팅 로직이 늘어나고, 새로고침 시 URL이 꼬일 수 있습니다.

---

## 5. DB 모델 설계 (MongoDB + Prisma)

### 5.1 설계 원칙 — Mongo + Prisma의 제약 반영

Prisma의 MongoDB 커넥터는 (1) JOIN 없이 애플리케이션 레벨 조합만 가능하고, (2) 다중 문서 트랜잭션은 Replica Set이 필요하며 비용이 크고, (3) 마이그레이션이 아닌 `db push` 방식입니다. 따라서:

- **항상 함께 조회/쓰기되는 데이터 → embed** (예: 검사 문항, 세션 내 답변)
- **독립적으로 조회되거나 여러 곳에서 참조되는 개체 → 별도 컬렉션 + ObjectId 참조** (User, TestDefinition, TestSession, PersonModel, AIReport)
- 세션 완료 처리처럼 여러 문서를 동시에 갱신해야 하는 지점을 최소화하도록 스키마를 짭니다 (예: 집계 카운터를 별도 문서로 두지 않고, "필수 7종 완료 여부"는 조회 시점에 세션 컬렉션을 쿼리해서 계산 — 강한 일관성이 필요 없는 값이므로 트랜잭션 불필요)

### 5.2 컬렉션

**User**
```
id, email(unique), passwordHash, name,
createdAt, updatedAt
```
(Refresh Token은 DB가 아닌 Redis에 저장 — 무효화/만료 관리가 훨씬 간단하고, 민감한 인증 상태를 영구 저장소에 남기지 않기 위함)

**TestDefinition**
```
id, code (e.g. "PHQ9", unique), name, category (essential|optional),
description, estimatedMinutes, version,
license: { required: boolean, notice: string, url?: string },
questions: [ { id, order, text, type, options: [{value,label}], reverseScored } ],   // embedded
scoringConfig: {                                                                     // embedded
  bands: [ { min, max, label, description } ],
  subscales?: [ { name, questionIds: [] } ],
  riskFlags?: [ { questionId, triggerValue, message } ]   // 안전장치의 근거 데이터
}
```
**이유**: 문항/채점규칙은 검사를 조회할 때 항상 통째로 필요하고, 독립적으로 문항 하나만 조회할 일이 없으므로 embed. `riskFlags`를 여기 두는 이유는 "어떤 문항이 위기 신호인지"가 검사 정의에 종속된 데이터이기 때문 — 하드코딩 대신 데이터로 관리하면 향후 검사 추가 시 코드 변경 없이 시드만으로 확장됩니다.

**TestSession** (응시 1회 = 세션 1개)
```
id, userId (ref), testDefinitionId (ref), testCode, testDefinitionVersion,
status: in_progress | completed | abandoned,
answers: [ { questionId, value, answeredAt } ],   // embedded, 이어하기의 근거
currentPosition,   // 이어하기 시 재개 지점
startedAt, completedAt,
rawScore, subscaleScores?, band,
riskTriggered: boolean
```
**이유**: `testDefinitionVersion`을 스냅샷으로 남기는 이유는, 향후 검사 문항/채점기준이 개정되어도 과거 리포트의 점수 산출 근거를 그대로 재현할 수 있어야 하기 때문입니다(감사 가능성). `answers`를 embed한 이유는 이어하기 기능이 "이 세션의 답변 목록"을 통째로 읽고 쓰는 패턴이라 참조 분리의 이점이 없기 때문입니다.

**PersonModel** — IntegrationModule의 산출물. 상관관계/해석 없이 표준화된 재료만 담습니다.
```
id, userId (ref), sourceSessionIds: [ObjectId], version,
testResults: [                        // embedded, 검사별 표준화 결과 — 해석 없는 순수 데이터
  {
    testCode, testDefinitionVersion,
    rawScore, normalizedScore (0-100 정규화, bands 기준 선형 변환),
    band,                              // 해당 검사 자체의 검증된 채점기준상 밴드 (새로 만든 기준 아님)
    subscaleScores?: [ { name, rawScore, normalizedScore } ],
    completedAt
  }
],
metadata: {
  completedEssentialCount, totalEssentialCount: 7,
  previousPersonModelId?,             // 재검사로 갱신된 경우 이전 버전 참조 (V2 추적의 토대)
  generatedAt
}
```
**이유**: `testResults`에는 상관관계 필드나 "취약점/보호요인" 같은 해석적 필드를 두지 않습니다. 이 컬렉션은 순수하게 "검사 결과의 표준화된 사실"만 담고, 검사 간 관계를 발견하고 의미를 해석하는 것은 전적으로 다음 단계인 AI(ReportsModule)의 몫입니다. `normalizedScore`는 각 검사가 이미 가진 검증된 밴드 구간(TestDefinition.scoringConfig.bands)을 0-100 스케일로 선형 변환한 것일 뿐, 새로운 심리학적 기준을 만드는 것이 아닙니다. `previousPersonModelId`로 이력을 연결해 두면 향후(V2) "이전 대비 어떻게 변했는가" 비교 리포트를 만들 때 재계산 없이 바로 활용할 수 있습니다.

**AIReport**
```
id, userId (ref), personModelId (ref),
status: pending | processing | completed | failed,
model, promptVersion,
sections: {                          // packages/shared/src/types/ai-report.ts와 1:1 대응
  overallSummary,                    // 1. 전체 요약 (사람 전체를 하나의 인물상으로)
  personalityProfile,                // 2. 성격 프로파일
  currentMentalHealthStatus,         // 3. 현재 정신건강 상태
  primaryConcern,                    // 4. 현재 가장 큰 문제
  primaryStrength,                   // 5. 현재 가장 큰 강점
  crossTestCorrelations,             // 6. 검사 결과 간 연관성
  possibleCausalHypotheses,          // 7. 왜 이런 결과가 나왔을 가능성이 있는가 (가설 형태로만 서술)
  maintainingFactors,                // 8. 현재 상태를 유지시키는 요인
  aggravatingFactors,                // 9. 현재 상태를 악화시키는 요인
  highestLeverageChangeFactor,       // 10. 개선 가능성이 가장 높은 요소
  priorityIssues,                    // 11. 우선적으로 해결해야 할 문제
  improvementRoadmap,                // 12. 개선 로드맵
  metricsToTrack,                    // 13. 향후 추적하면 좋은 지표
  recommendedRetestTiming,           // 14. 재검사를 추천하는 시점
},
pdfFileId (ref)?,
failureReason?,
createdAt, completedAt
```
**이유**: 섹션 구성을 "검사별 결과 나열형(성격/우울/불안/스트레스…을 각각 설명)"에서 **"한 사람을 통합 설명하는 서사형"**으로 재설계했습니다. 각 필드는 특정 검사 하나에 대응되지 않고 7종 검사 결과 전체를 종합한 결론이며, `possibleCausalHypotheses`처럼 원인을 다루는 섹션은 프롬프트 레벨에서 반드시 "가능성/가설" 어조로만 서술하도록 강제합니다(진단 금지 원칙 준수). `promptVersion`/`model`을 기록하는 이유는 프롬프트나 모델이 바뀌어도 과거 리포트가 "어떤 조건에서 생성됐는지" 추적 가능해야 하기 때문(재현성 + 향후 품질 비교).

**PdfFile**
```
id, reportId (ref), storageKey, path, generatedAt
```
**이유**: 지금은 `path`가 로컬 디스크 경로지만, `storageKey` 필드를 별도로 둬서 나중에 S3 등으로 옮길 때 `FileStorage` 인터페이스 구현체만 교체하면 되도록 스토리지 종류에 의존적이지 않은 키 개념을 분리했습니다.

---

## 6. API 설계

```
GET    /tests                       # 필수/선택 목록
GET    /tests/:code                 # 문항 포함 상세

POST   /tests/:code/sessions        # 시작 또는 진행 중 세션 반환(이어하기)
POST   /tests/:code/restart         # 진행 중 세션을 ABANDONED 처리하고 새 세션 시작("다시 검사하기")
PATCH  /sessions/:id/answers        # 문항 단위 autosave, 위험감지 시 riskFlag 응답
POST   /sessions/:id/submit         # 제출 + 채점
GET    /sessions/:id
GET    /sessions                    # 내 응시 이력
POST   /sessions/reset              # 진행 중인 필수 검사를 모두 ABANDONED 처리("초기화", 완료된 결과는 보존)
POST   /sessions/reset-all          # (위험) 모든 검사 결과·PersonModel·AIReport를 삭제("검사 결과 모두 초기화")

GET    /reports/preview             # 어떤 검사의 어떤 응시 결과로 만들어질지 미리보기(날짜 간격 경고 포함)
POST   /reports                     # 생성 요청 (서버에서 필수 7종 완료 + 날짜 간격 확인 재검증)
GET    /reports/:id                 # 상태 + 내용(폴링용)
GET    /reports/:id/pdf             # PDF 다운로드
GET    /reports                     # 이력
DELETE /reports/:id                 # 리포트 삭제

POST   /auth/login                  # 단일 계정 로그인 (계정은 시드로 생성, 회원가입 없음)
GET    /users/me
```

전 엔드포인트(로그인 제외) JWT Guard 적용, Swagger 자동 문서화, class-validator로 DTO 검증. Auth는 개인용 도구 범위상 우선순위가 가장 낮아 마지막 Phase에서 구현한다(9절).

---

## 7. 폴더 구조

```
apps/api/src/
  common/
    guards/  interceptors/  filters/  decorators/  pipes/
  config/
  modules/
    auth/
    users/
    test-definitions/
    sessions/
      domain/
        scoring/
          generic-test-scorer.ts   # ScoringConfig(배수/나눗수/밴드/하위척도) 데이터 기반 단일 채점기
        risk-detector.ts
    integration/
      domain/
        score-normalizer.ts        # (rawScore - min) / (max - min) × 100 선형 정규화 (검사 무관, 순수함수)
        person-model-builder.service.ts   # 정규화 결과 → PersonModel 조립 (해석 없음)
    reports/
      ai/
        openai.client.ts
        prompt-builder.ts       # PersonModel → 통합 해석 프롬프트 (실제 Integration은 여기서 LLM이 수행)
        report-schema.ts        # 응답 스키마 검증
      pdf/
        pdf-generator.ts
      queue/
        report-generation.processor.ts
        report-pdf.processor.ts
    files/
      storage.interface.ts
      local-disk-storage.provider.ts
  prisma/
    schema.prisma
  main.ts

apps/web/
  app/                # 4장 페이지 구성과 1:1 대응
  components/
  lib/api-client.ts
  hooks/
  types/

packages/shared/
  enums/ (TestCode, Severity ...)
  dto/
```

**이유**: `sessions/domain/scoring`을 별도 폴더로 뽑은 이유는 1.2절에서 설명한 대로 채점 로직을 프레임워크(NestJS DI 등)와 최대한 독립시켜, 순수 함수/클래스 단위테스트가 가능하게 하기 위함입니다. `files/storage.interface.ts`를 둔 이유는 질문에서 확정한 "로컬 디스크"가 MVP 이후 S3 호환 스토리지로 바뀔 가능성이 명시적으로 있으므로, 처음부터 구현체 교체가 가능한 인터페이스로 분리합니다(과설계가 아니라 이미 확정된 향후 변경에 대한 대비).

---

## 8. AI 리포트 생성 플로우

```
1. 사용자가 필수 7종 전부 completed
      ↓
2. POST /reports
   → 서버가 "필수 7종 completed" 재검증(클라이언트 신뢰 안 함)
   ↓
3. [IntegrationModule] PersonModel 조립 (동기, 순수 계산 — LLM 호출 없음)
   → 기존 PersonModel이 동일 sourceSessionIds로 이미 있으면 재사용, 아니면 새 버전 생성
   → 각 TestSession의 rawScore/band를 검사별 Normalizer로 0-100 정규화 → testResults[] 조립
      ↓
4. AIReport(status=pending, personModelId) 생성 → BullMQ에 "report.generate" job enqueue
      ↓
5. [Worker] report-generation.processor
   a. personModelId로 PersonModel.testResults 로드
      → 원문항 답변은 절대 로드/전달하지 않음(개인정보 최소화 + 토큰 절약), 표준화된 결과만 사용
   b. prompt-builder가 PersonModel을 구조화 JSON + 시스템 프롬프트로 변환
      → 시스템 프롬프트 고정 지침: (1) 의학적 진단/질병판정/치료권고 금지, (2) 검사별로 결과를 나열하지 말고 전체를 하나의 인물상으로 통합 해석, (3) 원인을 다루는 섹션(possibleCausalHypotheses)은 반드시 "~일 가능성이 있습니다/~라는 가설을 세울 수 있습니다" 형태로만 서술하고 단정적 인과 표현 금지
      → **실제 상관관계 발견·패턴 해석·통합(=Psychological Integration)은 이 단계에서 LLM이 수행합니다.** 코드가 미리 정답을 만들어 LLM에게 베끼게 하지 않습니다.
   c. `AIProvider`(현재 선택된 벤더 — Gemini/OpenAI/Groq) 호출 (JSON 스키마 강제 — 5.2절 AIReport.sections 14개 필드 고정, zod `z.toJSONSchema()`로 생성)
   d. 응답을 report-schema.ts(zod)로 검증
      → 실패 시 최대 N회 재시도, 그래도 실패하면 status=failed + failureReason 기록
   e. AIReport.sections 저장, status=completed
      ↓
6. "report.pdf" job enqueue
   → PDF 생성 후 로컬 디스크 저장, PdfFile 문서 생성, AIReport.pdfFileId 연결
      ↓
7. 프론트는 GET /reports/:id 폴링으로 상태 확인, completed 시 렌더링
```

**PersonModel 조립과 AI 호출을 분리한 이유**: PersonModel 조립(3단계)은 결정론적 계산이라 동기로 즉시 처리해도 무리가 없고, 실패할 이유가 거의 없습니다(외부 API 의존 없음). 반면 AI 호출(5단계)은 수초~수십 초가 걸리고 실패 가능성(rate limit, timeout)이 있어 큐로 분리합니다. 이 분리 덕분에 "표준화까지는 항상 즉시 성공"하고 "LLM 통합 해석만 재시도 대상"이 되어, 장애 지점이 명확해집니다.

---

## 9. MVP 개발 순서

개인용 도구로서 우선순위는 **① 심리검사 품질 → ② AI 리포트 품질 → ③ 사용성 → ④ 데이터 저장 → ⑤ PDF** 순이며, 서비스 운영 기능(Auth 포함)은 모두 후순위입니다. Phase 순서를 이 우선순위에 맞춰 재배열했습니다.

1. **Phase 0** — 프로젝트 셋업: 모노레포, ESLint/Prettier, Docker Compose(mongo, redis), CI 스켈레톤 *(완료)*
2. **Phase 1** — **심리검사 엔진**: TestDefinition 시드 데이터(필수 7종 문항/채점규칙/riskFlags) + 검사별 TestScorer + 조회 API — 최우선 순위
3. **Phase 2** — Sessions API(시작/이어하기/autosave/제출/채점) + 위기 신호 감지 로직
4. **Phase 3** — **IntegrationModule**: 검사별 Normalizer + PersonModel 조립/저장
5. **Phase 4** — **AI Report Engine**: PersonModel → 프롬프트/스키마/큐 — 프롬프트 품질에 가장 많은 시간을 투자하는 구간
6. **Phase 5** — **사용성**: 검사 응시 UI, 개별 결과 화면, 리포트 뷰어 등 핵심 프론트 플로우
7. **Phase 6** — **데이터 저장 다듬기**: 검사/리포트 이력 조회, 민감정보 저장 방식 점검
8. **Phase 7** — PDF 생성/다운로드 (로컬 디스크 저장)
9. **Phase 8** — **Auth(최소)**: 시드 계정 + 단일 JWT 로그인 게이트 — 로컬 개인 사용 중에는 없어도 무방하므로 마지막에 추가
10. **Phase 9** — QA, 에러 핸들링, 로깅, Swagger 정리

각 Phase 종료 시 동작 확인(수동 테스트 또는 자동 테스트) 후 다음 단계로 진행하는 것을 원칙으로 합니다.

---

## 10. 향후 확장

**V2**
- 기분/수면/운동 기록, 장기 추적(재검사 알림, 시계열 그래프)
- 관리자 CMS(검사 문항/채점규칙 관리 UI)
- 소셜 로그인, 이메일 알림
- 다국어 지원
- S3 등 클라우드 스토리지로 파일 저장소 교체 (7절의 `storage.interface.ts` 덕분에 구현체 교체만으로 가능)

**V3**
- Apple Health / Google Fit 연동
- 전문가(상담사) 매칭/연계
- 기업/그룹용 웰빙 대시보드
- 모바일 앱

---

## 부록 — 설계 중 발견한 이슈 및 제안

1. **검사 라이선스 검증은 개발 착수 전 별도 확인 필요.** ASRS v1.1, ECR-RS, DERS 등 선택 검사는 검사에 따라 상업적 이용에 라이선스/사용료가 필요할 수 있습니다. "선정 원칙"에 라이선스 표시 의무가 있으므로, `TestDefinition.license` 필드는 마련해뒀지만 **실제 각 검사의 라이선스 상태(무료/유료/저작권자 승인 필요)는 법률/저작권 검토가 선행되어야** 합니다. (필수 7종 중 성격검사는 저작권이 있는 BFI-2 대신 완전한 공개 도메인인 IPIP-50으로 이미 대체했습니다 — 9절 시드 데이터 참고.) 이는 코드로 해결할 수 없는 부분이라 별도 확인을 제안드립니다.
2. **위기 안내 문구**는 임의로 창작하지 않고 실제 정신건강 상담기관의 공식 안내 문구를 그대로 인용해야 합니다. 설계 문서에는 자리표시자만 두었습니다.
3. **민감정보 암호화**: 심리검사 응답/결과는 민감정보이므로, MVP라도 최소한 응답 필드(answers, sections)에 대한 저장 시 암호화(application-level encryption) 또는 최소한 접근 로그를 고려하는 것을 제안합니다. 이 부분은 별도 승인 후 상세 설계하겠습니다.
