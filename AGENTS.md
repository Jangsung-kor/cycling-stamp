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

## 배포 및 Git 규칙
* **명시적 승인 필수**: 사용자의 명시적 요청이 있을 때만 원격 Git 푸시(`git push`) 및 Firebase 배포(`yarn deploy`)를 수행합니다.
