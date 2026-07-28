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
- Docker Desktop (MongoDB replica set + Redis 구동용)

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

   `apps/web/.env.local`에는 아래 한 줄만 있으면 됩니다.

   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
   ```

3. MongoDB / Redis 기동 (Docker)

   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

   Prisma는 트랜잭션/change stream 때문에 MongoDB replica set을 요구합니다. `mongo-init` 컨테이너가 최초 기동 시 `rs0`을 자동으로 초기화합니다.

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
| MongoDB | 27017 |
| Redis | 6379 |

## 트러블슈팅

- **Prisma가 트랜잭션/replica set 오류를 내는 경우**: `docker compose -f docker/docker-compose.yml ps`로 `mongo-init` 컨테이너가 정상 종료(exit 0)됐는지 확인하세요. 재초기화가 필요하면 `docker compose -f docker/docker-compose.yml down -v` 후 다시 `up -d` 합니다 (볼륨이 삭제되어 데이터가 초기화되니 주의).
- **로그인/시드 계정이 안 보이는 경우**: `.env`의 `ADMIN_EMAIL`/`ADMIN_PASSWORD` 값과 `pnpm --filter @psyche/api prisma:seed` 실행 여부를 확인하세요.
