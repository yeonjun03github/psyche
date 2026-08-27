# Psyche

심리검사 결과를 표준화하고, 여러 검사를 하나의 Person Model로 통합해 AI 리포트를 생성하는 개인용 도구입니다. 설계 배경과 도메인 개념은 [docs/DESIGN.md](docs/DESIGN.md)를 참고하세요.

## 기술 스택

- **모노레포**: pnpm workspaces + Turborepo
- **API** (`apps/api`): NestJS, Prisma (MongoDB), BullMQ (Redis), JWT 인증
- **Web** (`apps/web`): Next.js, React, Tailwind CSS
- **공유 타입** (`packages/shared`): DTO/enum 등 API-Web 공통 타입 (채점 로직 없음)

## 사전 준비

- Node.js ≥ 20
- pnpm 9 (`corepack enable` 하면 `packageManager` 필드로 자동 설치됨)
- Docker Desktop (완전 로컬로 띄울 경우 Mongo+Redis 구동용, Atlas를 쓸 경우 Redis만)
- (온라인 모드를 쓸 경우) MongoDB Atlas 계정 및 클러스터 (아래 참고)

## 데이터베이스: 로컬 또는 Atlas

이 프로젝트는 **온라인(배포) 환경과 로컬 실행을 둘 다 지원**하도록 설계되어 있습니다 — 코드는
어느 쪽인지 전혀 모르고, `DATABASE_URL` 하나로만 결정됩니다. 배포된 서비스(Atlas)가 무료 티어
만료 등으로 안 되더라도 로컬 실행에는 영향이 없고, 반대도 마찬가지입니다.

### 옵션 A — 완전 로컬 (인터넷 없이 동작, Google 로그인/AI 리포트만 예외)

```bash
docker compose -f docker/docker-compose.yml up -d
```

이 컴포즈 파일이 replica set으로 초기화된 로컬 Mongo(`mongo`/`mongo-init`)와 Redis를 함께
띄웁니다. `apps/api/.env`의 `DATABASE_URL`을 아래처럼 두면 됩니다(`.env.example` 기본값).

```
DATABASE_URL="mongodb://localhost:27017/psyche?replicaSet=rs0"
```

로컬 Mongo는 Atlas와 완전히 별개의 빈 DB이므로, 최초 1회 [최초 설정](#최초-설정)의 시드
단계까지 그대로 따라야 관리자 계정과 검사 정의가 생성됩니다.

### 옵션 B — MongoDB Atlas (배포 환경, 또는 로컬에서 배포 DB에 직접 붙고 싶을 때)

[Atlas](https://www.mongodb.com/cloud/atlas/register)는 무료 M0 티어로 충분합니다.

1. Atlas에서 클러스터 생성(M0) → Database Access에서 사용자 생성 → Network Access에 접속을 허용할 IP 추가(배포 환경에서 접속하려면 `0.0.0.0/0` 필요)
2. 클러스터의 "Connect → Drivers"에서 연결 문자열을 복사
3. 문자열에 데이터베이스 이름을 추가해 `DATABASE_URL`에 채워 넣습니다:
   ```
   mongodb+srv://<user>:<password>@<cluster-host>/psyche?appName=Cluster0
   ```

Atlas는 M0부터 이미 replica set으로 동작하므로, 로컬 Docker Mongo와 달리 별도의 replica set
초기화 과정이 필요 없습니다.

## 최초 설정

1. 의존성 설치

   ```bash
   pnpm install
   ```

2. 환경 변수 파일 생성

   루트의 `.env.example`을 참고해 각 앱에 필요한 `.env` 파일을 만듭니다.

   ```bash
   cp .env.example apps/api/.env
   ```

   `DATABASE_URL`은 로컬 Mongo 또는 본인의 Atlas 클러스터 연결 문자열로 채웁니다(위 "데이터베이스: 로컬 또는 Atlas" 참고).

   `apps/web/.env.local`에는 아래 한 줄만 있으면 됩니다.

   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
   ```

3. Mongo + Redis 기동 (Docker) — Atlas를 쓸 경우 mongo/mongo-init 컨테이너는 무시하고 Redis만 있으면 됩니다.

   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

4. Prisma 클라이언트 생성 및 스키마 반영

   ```bash
   pnpm --filter @psyche/api prisma:generate
   pnpm --filter @psyche/api prisma:push
   ```

5. 관리자 계정 시드 (공개 회원가입이 없는 개인용 도구이므로 필수)

   ```bash
   pnpm --filter @psyche/api prisma:seed
   ```

   `.env`의 `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`으로 계정이 생성됩니다.

## 개발 서버 실행

```bash
pnpm dev
```

Turborepo가 `apps/api`(포트 4000)와 `apps/web`(포트 3000)을 동시에 실행합니다. 개별 실행이 필요하면:

```bash
pnpm --filter @psyche/api dev
pnpm --filter @psyche/web dev
```

## WebStorm에서 실행하기

1. **Node/패키지 매니저 설정**: `Settings → Languages & Frameworks → Node.js`에서 Node 인터프리터가 20 이상인지 확인하고, Package manager는 `pnpm`을 선택합니다.
2. **의존성 설치**: `npm scripts` 툴 윈도우(`View → Tool Windows → npm`)에서 루트 `package.json`을 찾을 수 없다면, 대신 터미널에서 `pnpm install`을 한 번 실행해주세요 (WebStorm의 npm 툴 윈도우는 pnpm workspace 구조를 완전히 인식하지 못할 수 있습니다).
3. **Run/Debug Configuration 만들기**: 우측 상단 `Add Configuration → npm`
   - **API 서버**: package.json을 `apps/api/package.json`으로, script를 `dev`로 지정
   - **Web 서버**: package.json을 `apps/web/package.json`으로, script를 `dev`로 지정
   - 두 Configuration을 만든 뒤 `Compound` 타입 Configuration을 하나 더 만들어 둘을 묶으면, 실행 버튼 한 번으로 API+Web을 동시에 띄울 수 있습니다.
4. **디버깅**: API Configuration에 `--inspect` 옵션을 붙이거나, WebStorm의 Node.js Run 구성에서 JavaScript 디버거를 그대로 붙이면 `nest start --watch` 프로세스에 브레이크포인트를 걸 수 있습니다.
5. **Prettier/ESLint 연동**: 루트에 `.prettierrc.json`과 `eslint.config.mjs`가 있으므로 `Settings → Languages & Frameworks → JavaScript → Prettier`와 `Code Quality Tools → ESLint`에서 각각 "Automatic ESLint configuration"과 프로젝트 Prettier 패키지를 선택해두면 저장 시 자동 포맷/린트가 적용됩니다.
6. **Docker Compose**: `docker/docker-compose.yml`을 WebStorm에서 열면 서비스별 실행/중지 아이콘이 노출됩니다. Services 툴 윈도우에서 Mongo/Redis 컨테이너 상태와 로그를 바로 확인할 수 있습니다.

## 주요 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm dev` | api + web 동시 개발 서버 실행 |
| `pnpm build` | 전체 빌드 (Turborepo) |
| `pnpm lint` | 전체 ESLint 검사 |
| `pnpm typecheck` | 전체 TypeScript 타입 검사 |
| `pnpm test` | 전체 유닛 테스트 (Jest) |
| `pnpm --filter @psyche/api test:e2e` | API e2e 테스트 |
| `pnpm --filter @psyche/api prisma:seed` | 관리자 계정 시드 |
| `pnpm format` | Prettier로 전체 포맷 |

## 포트

| 서비스 | 포트 |
|---|---|
| Web (Next.js) | 3000 |
| API (NestJS) | 4000 (기본값, `.env`의 `PORT`로 변경 가능) |
| MongoDB | 27017 (로컬) 또는 Atlas(클라우드) |
| Redis | 6379 |

## 트러블슈팅

- **`DATABASE_URL` 관련 연결 오류가 나는 경우(로컬)**: `docker compose -f docker/docker-compose.yml up -d`로 `mongo`/`mongo-init` 컨테이너가 떠 있는지, `DATABASE_URL`에 `?replicaSet=rs0`가 빠지지 않았는지 확인하세요.
- **`DATABASE_URL` 관련 연결 오류가 나는 경우(Atlas)**: Atlas의 Network Access에 현재 접속 환경의 IP(또는 `0.0.0.0/0`)가 허용되어 있는지, `DATABASE_URL`에 데이터베이스 이름(`/psyche`)이 빠지지 않았는지 확인하세요.
- **로그인/시드 계정이 안 보이는 경우**: `.env`의 `ADMIN_EMAIL`/`ADMIN_PASSWORD` 값과 `pnpm --filter @psyche/api prisma:seed` 실행 여부를 확인하세요.
