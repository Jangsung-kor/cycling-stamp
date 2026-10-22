# Agent Guidelines for cycling-stamp

## Core Principles
1. **시니어 레벨 커뮤니케이션**: 장황한 기초 설명 생략, 구조적 결정 이유(Why)와 코드 위주 전달.
2. **풀스택 아키텍처 준수**: 프론트/백엔드/IndexedDB/Firestore 간 영향도 선제 점검, 파사드 패턴(`useStampManager`, `useGpxManager`, `useFriendManager`) 준수.
3. **선제적 리팩토링**: 기술 부채 예방 및 모던 패턴 적용.

## UI/UX 및 디자인 규칙
* **아이콘 남발 금지 (Restrained Icon Usage)**:
  - 버튼, 텍스트 라벨, 뱃지, 모달 헤더, 토스트 알림 등에 장식용 이모지/아이콘을 습관적으로 남발하지 않습니다.
  - 지도 마커나 하단 탭바 등 콤팩트한 공간 식별이 필수적인 경우에만 최소한으로 제한하여 사용합니다.
  - 정갈한 텍스트, 타이포그래피, 적절한 여백 기반의 미니멀 모던 UI를 유지하여 라이더가 주행 핵심 정보(거리, 고도, 코스 등)에 집중할 수 있도록 시각적 잡음을 최소화합니다.
* **공통 스타일 우선 원칙 (Common Style First)**:
  - 앞으로 새로운 기능 및 컴포넌트를 개발할 때, 개별 파일에 임의로 커스텀 스타일을 작성하지 않고 `src/styles/` 내의 공통 디자인 시스템 클래스(`.cycling-chip`, `.cycling-badge`, `.cycling-fab`, `.cycling-glass-card`, `.cycling-btn-subtle`, `.tabular-nums` 등)와 테마 CSS 변수(`var(--text-main)`, `var(--text-sub)`, `var(--brand-color)`, `var(--card-bg)`, `var(--border-color)`)를 최우선으로 재사용합니다.
  - 이를 통해 모든 테마(라이트/다크/스탬프 잉크)에서 폰트 색상 및 컴포넌트의 가독성과 명도 대비가 100% 자동 유지되도록 합니다.

## 배포 및 Git 규칙
* **명시적 승인 필수**: 사용자의 명시적 요청이 있을 때만 원격 Git 푸시(`git push`) 및 Firebase 배포(`yarn deploy`)를 수행합니다.

## 에이전트 권한 및 실행 모드 가이드 (CLI Permissions & Autonomy Levels)

### 1. 도구 실행 권한 제어: `--dangerously-skip-permissions`
* **분류**: 보안 권한 바이패스 (Security Permission Bypass)
* **역할**: 파일 수정, 터미널 명령어 실행, 파일 생성/삭제 등 도구(Tool) 호출 시 사용자 터미널에 대화형 승인 프롬프트(Y/N)를 띄우지 않고 100% 자동 승인.
* **영향 범위**:
  - `write_file`, `edit_file`: 사전 승인 없이 즉시 파일 디스크 기록.
  - `run_command`: 터미널 셸(PowerShell) 명령어 즉각 실행.
* **위험도**: **High** (접두사 `dangerously`가 붙은 이유). 비신뢰 코드 실행이나 파괴적 명령어의 사전 차단 방어선이 해제되므로 신뢰할 수 있는 개발 환경에서만 활성화 권장.

### 2. 에이전트 의사결정 수명주기 제어: `--mode <auto | plan | accept-edits>`
* **분류**: 에이전트 자율도 수준 (Autonomy & Planning Strategy)
* **모드별 동작**:
  - `plan` (Level 1): 코드 수정 전 반드시 계획을 수립하고 사용자 승인을 기다림 (신중 모드).
  - `accept-edits` (Level 2): 코드 파일 편집은 자동 수락하되, 그 외 행동이나 주요 분기점에서는 확인을 요청 (절충 모드).
  - `auto` (Level 3): 사소한 선택지마다 질문하지 않고, 시니어 베스트 프랙티스 기준으로 계획 수립 -> 도구 실행 -> 테스트 검증까지 스스로 완수하는 자율 실행 모드.

### 3. 권한 레벨 매트릭스 (4단계 분류)

| 권한 레벨 | CLI 실행 플래그 | 자율도 수준 | 도구 실행 승인 | 주 사용 용도 |
| :--- | :--- | :--- | :--- | :--- |
| **Level 0 (완전 통제형)** | `agy` (기본값) | 대화형 확인 | 매 도구마다 확인 | 민감한 코드베이스, 학습/검토 목적 |
| **Level 1 (편집 자동형)** | `agy --mode accept-edits` | 대화형 확인 | 파일 편집만 자동 승인 | 일반적인 일상 페어 프로그래밍 |
| **Level 2 (자율 계획형)** | `agy --mode auto` | 자율 실행 | 도구 실행마다 확인 | 에이전트의 자체 해결 능력을 활용하되 실행만 감독 |
| **Level 3 (완전 무인 자율형)** | `agy --mode auto --dangerously-skip-permissions` | 완전 자율 | 100% 무인 자동 승인 | 야간 대규모 리팩토링, CI/CD, 고속 파이프라인 |

### 4. 대화창 런타임 제어 슬래시 명령어
* `/goal <작업 내용>`: 세션 모드와 무관하게 특정 목표를 달성할 때까지 중단 없이 자율 주행.
* `/mode <auto|plan|accept-edits>`: CLI 세션 재시작 없이 실행 모드 실시간 전환.
