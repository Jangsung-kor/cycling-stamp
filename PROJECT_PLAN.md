# 자전거 스탬프 PWA 프로젝트 계획서

## 1. 프로젝트 배경 및 기존 앱 분석
행정안전부에서 제공하는 기존 **'자전거 행복나눔'** 앱은 국토종주 자전거길 안내 및 사이버 인증(QR/GPS) 기능을 제공하는 유용한 서비스입니다. 하지만 다음과 같은 불편함이 있었습니다.
*   **핵심 페인 포인트 (Pain Point)**: 지도 전체를 한눈에 볼 수 없고, 부분적으로만 확인이 가능하여 자전거 여행 시 전체적인 코스 파악 및 계획 수립에 어려움이 있습니다.

## 2. 프로젝트 목표
기존 앱의 불편함을 개선하여, **나와 여자친구가 함께 사용할 수 있는 커스텀 자전거 스탬프 PWA(Progressive Web App)**를 개발합니다.
*   **전체 지도 뷰 제공**: 전국 자전거 코스와 인증 센터를 전체 지도에서 한눈에 볼 수 있는 UI/UX 제공.
*   **스탬프(인증) 기능**: GPS 또는 QR 기반의 자체 스탬프 인증 기능 구현.
*   **PWA 지원**: 앱스토어를 거치지 않고 웹 브라우저에서 바로 설치 가능하며, 오프라인 환경에서도 일부 동작할 수 있도록 PWA 적용.

## 3. 기술 스택 (Tech Stack)
*   **프론트엔드**: Vue.js (Vite 기반)
*   **UI 라이브러리**: Vant (모바일 Vue UI 컴포넌트)
*   **패키지 매니저**: Yarn
*   **지도 API**: 카카오맵(Kakao Map) 적용 (전체 지도 뷰 제공)
*   **백엔드/DB**: Firebase (인증, Firestore DB 활용한 스탬프 데이터 저장)
*   **PWA**: Vite PWA 플러그인 등 활용

## 4. 현재 진행 상황
*   Node.js 및 Yarn 환경 구축 완료
*   Vue.js (Vite 기반) 초기 프로젝트 세팅 및 디렉토리 구조 생성 완료 (`C:\cycling-app`)
*   모바일 UI 라이브러리 `vant` 설치 완료
*   Vue Router 및 Pinia 기본 세팅 완료 (`App.vue` 하단 탭바 구현)
*   **카카오맵 API 컴포넌트(`KakaoMap.vue`) 동적 로딩 및 렌더링 완벽 구현 (403/HMR 에러 해결)**

## 5. 앞으로 해야 할 일 (To-Do List)

### Phase 1: 기본 지도 구현 및 PWA 세팅
- [x] **지도 API 선정 및 연동**: 카카오맵 SDK 연동 및 렌더링 성공
- [x] **PWA 설정**: `vite-plugin-pwa` 세팅 및 서비스 워커 자동 등록 완료
- [x] **UI 컴포넌트 설계**: 하단 탭 바(Vant), 전체 지도 화면(`MapView`) 기본 레이아웃 구성 완료

### Phase 2: 코스 및 인증센터 데이터 렌더링
- [x] **데이터 수집**: 한강/아라자전거길 주요 인증센터 더미 데이터 적용 완료 (추후 공공데이터 연동 확장)
- [x] **지도 위 마커 표시**: 인증센터 데이터를 기반으로 지도 위에 마커 및 인포윈도우 표시 완료

### Phase 3: 스탬프(인증) 및 Firebase 연동
- [x] **Firebase 연동**: Firebase Auth(구글 소셜 로그인) 연동 완료
- [x] **GPS 위치 추적**: 사용자의 현재 위치를 받아와 인증센터와 가까워졌을 때 스탬프 획득 활성화 기능
- [x] **상태 관리 및 DB 저장**: 획득한 스탬프 데이터를 Pinia로 상태 관리하고, Firebase Firestore에 저장하여 기기 간 동기화 완료
- [x] **스탬프 보관함 UI**: 획득한 스탬프를 시각적으로 보여주는 화면 구현
- [x] **기존 스탬프 마이그레이션**: 사용자가 이미 획득한 19개 인증센터 스탬프 데이터를 Firestore 사용자 계정에 일괄 마이그레이션 완료

### Phase 4: 클라우드 연동 및 인프라 구축
- [x] **Firebase Hosting 배포**: 앱 빌드(`dist`) 및 Firebase 배포 정상화 (`https://cycling-stamp.web.app`)
- [x] **실시간 데이터 동기화 및 핫픽스**: 
  - 스탬프 인증 반경 상수를 200m로 확대 (`src/constants/stamp.js`)
  - 스탬프 이력 시간 포맷을 H:m(시:분)까지 상세 표시하도록 개선 (`StampView.vue`)
  - 실제 주행 이력 기반 Firestore DB 보정(여자친구 계정 이포보/여주보/강천보/비내섬)

### Phase 5: 신규 기능 로드맵 (Roadmap)

#### [Step 1] 스탬프 도장 디자인 변경
- [x] **Step 1-1 (기본) 획득 vs 비획득 도장의 디자인 및 색상 대조 강화**
    *   **벡터 SVG 도장 생성기 도입 (`src/utils/stampGenerator.js`)**: 외부 서버 의존 없이 오프라인(PWA)에서도 100% 동작하는 고화질 인주 도장 그래픽 렌더링.
    *   **지도 마커 시각 분리**: 미획득 상태(32px 회색 점선/반투명)와 획득 상태(40px 진한 인주 빨간색 이중 테두리)의 크기 및 색상 차등화.
    *   **스탬프 보관함 여권형 개편 (`StampView.vue`)**: 전체 달성률 프로그레스 바(예: 19/45 완료), 코스별 탭 필터링, 사각 도장 슬롯 그리드 뷰, 손으로 찍은 듯한 아날로그 틸트(-3deg) 효과 및 상세 팝업 모달 구현.
- [x] **Step 1-2 (심화) 인증센터마다 고유의 디자인 적용**
    *   **랜드마크 심볼 매핑**: 45개 인증센터별 고유 상징(서해갑문, 세종대왕, 백두대간, 디아크 등)을 도장 중앙 심볼에 개별 매핑하여 고유 디자인 구현.

#### [Step 2] 인증센터 간의 길 표현 (자전거길 코스 Polyline) -> 사용자 실측 GPX 색칠 방식으로 전환
- [x] **고정 코스 경로선 제거 및 사용자 중심 주행 궤적 체계 전환**:
    *   기존에는 인증센터 간 82개 정형화된 경로선이 지도에 기본 노출되었으나, "라이더마다 자전거도로/공도 등 주행 코스가 제각각 다르다"는 현실을 반영하여 고정 경로선을 지도에서 제거.
    *   대신 사용자가 직접 달린 실제 **GPX 파일 업로드 기반의 '나만의 지도 색칠하기'** 방식으로 전면 개편.
    *   카카오 공식 실시간 자전거 도로망(`[ 🚲 자전거길 ]`) 레이어는 그대로 유지하여 필요 시 공식 도로망을 언제든 조회 가능.

#### [Step 3] 인증센터 다회전 기능 (N회차 종주 & 다회 방문 스탬프)
- [x] **아키텍처 및 데이터 스키마 개편**:
    *   **100% 하위 호환성 보장 데이터 모델 (`src/stores/stamp.js`)**: 기존 단일 스탬프 데이터를 안전하게 보존하며 `visitCount`(방문 횟수) 및 `history`(회차별 일시 배열) 확장 및 자동 정규화.
    *   **24시간 쿨다운(재인증 방지) 규칙 탑재**: 동일 인증센터에서 마지막 획득 시점 기준 24시간 이내 재인증 시도 시 남은 시간 안내 및 어뷰징 차단.
    *   **24시간 경과 후 재방문 인증**: 성공 시 `visitCount` 1씩 증가(x2, x3...) 및 Firestore 자동 동기화.
- [x] **다회차 배지 및 통계 UI**:
    *   **스탬프 수첩 ([`StampView.vue`](file:///C:/cycling-app/src/views/StampView.vue))**: 2회 이상 방문 시 우측 상단에 콤팩트한 `x2`, `x3` 배지 표시 및 도장 터치 시 회차별 방문 이력 타임라인 모달 제공.
    *   **지도 인포윈도우 ([`KakaoMap.vue`](file:///C:/cycling-app/src/components/KakaoMap.vue))**: 마커 클릭 시 센터명 옆에 `xN` 회차 배지 연동.
    *   **마이페이지 ([`ProfileView.vue`](file:///C:/cycling-app/src/views/ProfileView.vue))**: 고유 코스 달성률 외에 '누적 인증 횟수(총 N회)' 지표 추가.

#### [Step 4] 전국 인증센터 데이터 완성 및 고유 심볼 전면 적용
- [x] **전국 85개 인증센터 주소 데이터 완비 (`src/utils/certCenters.js`)**:
    *   ID 46번(향가유원지)부터 ID 85번(송악산)까지 총 40개 인증센터의 도로명/지번 주소 데이터 완벽 구축.
    *   스탬프 상세 팝업 및 지도 마커 인포윈도우에 주소 정보 연동 표기.
- [x] **85개 전 인증센터 고유 도장 심볼 매핑 (`src/utils/stampGenerator.js`)**:
    *   46번부터 85번까지 기본 자전거(`🚴`) 아이콘으로 획일화되어 있던 문제를 해결하고, 각 지역 명소/특산물(섬진강 수달 🦦, 장군목 요강바위 🪨, 광양 매화 🌸, 영덕 대게 🦀, 울진 은어 🐟, 성산일출봉 🌋, 쇠소깍 테우 🛶, 법환 해녀 🤿 등)을 반영한 100% 고유 아이콘 구축 완료.

#### [Step 5] 애쉬 레드(Ash Red) 스탬프 테마 추가
- [x] **전통 인주 감성의 고풍스러운 톤다운 레드 테마 (`src/stores/theme.js`)**:
    *   원색의 쨍함을 덜어내고 은은한 회색빛이 감도는 `#B84A48` 애쉬 레드 테마 추가.
    *   지도 도장 테마 선택 바(🔴), 스탬프 수첩 테마, 프로필 뷰 버튼 전역 동기화.

#### [Step 6] 탭 하위 '접이식 코스별 달성 현황 카드' 구현
- [x] **모바일 뷰포트 최적화 접이식 UI (`src/views/StampView.vue`, `src/composables/useStampManager.js`)**:
    *   화면을 많이 차지하지 않는 약 38px 슬림 배너 기반으로, 스탬프 도장 그리드가 위로 시원하게 올라오도록 설계.
    *   **개별 코스 탭**: `X / Y 완료 (N%)` 슬림 게이지 및 `[상세 ▼]` 터치 시 아직 방문하지 않은 '남은 인증센터' 태그 목록 제공 (완주 시 `🏆 완주` 뱃지 및 축하 문구).
    *   **전체 탭**: `13개 코스 중 N개 완주` 요약 및 `[코스 목록 ▼]` 터치 시 13개 전국 코스 2열 그리드 대시보드 노출 (코스 터치 시 해당 탭 자동 전환).
    *   탭 전환 시 자동으로 콤팩트(접힘) 모드로 유지하여 모바일 사용성 극대화.

#### [Step 7] 실시간 보급소(편의점) 탐색 및 카카오맵 길찾기 연동
- [x] **카카오맵 Places 카테고리 검색(`CS2`) 기반 실시간 편의점 렌더링 (`src/components/KakaoMap.vue`)**:
    *   지도 좌측 상단 원터치 `[ 🏪 편의점 ]` 플로팅 토글 버튼 배치 (활성 시 도장 테마 컬러 점등 및 발견 편의점 개수 뱃지 노출).
    *   현재 지도 중심 반경 3km 내 편의점 마커(🏪)를 인증센터보다 높은 z-index로 렌더링.
    *   편의점 마커 탭 시 상호명, 거리(m), 도로명 주소, 전화번호 및 **[카카오맵 길찾기 ↗]** 원클릭 연동 지원.
    *   지도 이동 및 확대/축소 시 **`[ 🔄 이 지역 재검색 ]`** 플로팅 칩 자동 노출로 라이딩 예정 코스 보급 계획 지원.

#### [Step 8] 실시간 숙소(숙박) 탐색 및 야놀자 하이브리드 연동 (완료)
- [x] **카카오맵 Places 카테고리 검색(`AD5`) 기반 실시간 숙소 렌더링 (`src/composables/useKakaoAccomLayer.js`, `KakaoMap.vue`)**:
    *   지도 좌측 상단에 `[ 🏨 숙소 ]` 원터치 토글 버튼 배치 (모텔, 호텔, 펜션, 게스트하우스).
    *   현재 지도 중심 반경 5km 내 숙소 마커(인디고 컬러) 렌더링 및 실시간 개수 뱃지 표기.
    *   마커 터치 시 인포윈도우: 상호명, 카테고리 상세, 거리(m/km), 도로명 주소, **전화 바로 걸기(`tel:`) 버튼**, **카카오맵 길찾기 딥링크**, **야놀자 실시간 요금/사진 확인 딥링크(`nol.yanolja.com`)** 제공.
    *   지도 이동 시 `[ 이 지역 재검색 ]` 칩 연동으로 라이딩 예정 코스 및 다음 인증센터 인근 숙소 사전 탐색 지원.
- [ ] **자전거 친화 숙소 태깅 및 나만의 숙소 찜/메모 기능 (추후)**:
    *   라이더 핵심 니즈인 '자전거 실내/객실 보관 가능 여부' 태그 표기.
    *   사용자가 직접 다녀온 숙소의 자전거 보관 후기 메모를 기록하고 저장(Firestore 연동).

#### [Step 9] 사용자 커스텀 GPX 주행 궤적 업로드 및 나만의 지도 색칠하기 (완료)
- [x] **고성능 경량화 GPX 파서 & RDP 압축 유틸리티 (`src/utils/gpxParser.js`)**:
    *   XML DOMParser 및 브라우저/Node.js 호환 정규식 폴백 지원 (다양한 GPX 태그 `trkpt`, `rtept`, `wpt`, 셀프 클로징 완벽 호환).
    *   Haversine 거리, 획득 고도, 소요 시간, 바운딩 박스 정밀 연산.
    *   Ramer-Douglas-Peucker (RDP) 궤적 단순화 알고리즘 탑재로 대용량 좌표 데이터 80~95% 무손실 경량화 달성.
- [x] **오프라인 우선 하이브리드 영속 스토어 (`src/stores/gpx.js`, `src/utils/indexedDb.js`)**:
    *   대용량 궤적 좌표의 로컬 영구 저장을 위한 브라우저 무의존성 IndexedDB 스토리지 탑재.
    *   Firebase Firestore(`users/{uid}/gpx_tracks/{trackId}`) 양방향 동기화 지원으로 기기 간 자동 백업 및 복원.
    *   트랙 CRUD(추가, 제목 수정, 지도 표시 토글, 삭제) 및 마우스 호버/선택 즉각 반응형 상태 관리.
- [x] **지도 렌더링 및 인터랙티브 하이라이트 (`src/components/KakaoMap.vue`)**:
    *   사용자가 업로드한 주행 궤적을 활성 스탬프 테마 컬러로 지도 위에 동적 렌더링.
    *   목록 마우스 호버(Hover) 시 두께 8px, 불투명도 1.0, 최상단 zIndex 35로 즉각적인 실시간 글로우 하이라이트.
    *   트랙 선택 시 카카오맵 바운딩 박스(`setBounds`) 자동 줌 & 포커스.
- [x] **주행 기록 관리 서랍 및 업로드 UI (`src/components/GpxDrawer.vue`, `src/views/MapView.vue`)**:
    *   지도 우측 상단 `[ 🗺️ 나만의 주행 (N개) ]` 글래스모피즘 플로팅 버튼 배치.
    *   드래그 & 드롭 및 다중 GPX 파일 일괄 업로드 지원.
    *   누적 주행 거리 배지, 주행 통계 칩(거리, 고도, 시간, 일자, 압축률), 인라인 제목 수정, 표시 토글, 삭제 확인 다이얼로그 제공.
- [x] **엄격한 자동화 단위/통합 테스트 스위트 구축 (`yarn test`)**:
    *   파서 테스트(`tests/test_gpx_parser.js`, 8개 케이스), 스토어 영속성 테스트(`tests/test_gpx_store.js`, 6개 케이스), E2E 통합 파이프라인 테스트(`tests/test_integration_gpx_flow.js`, 5개 케이스), 매니저 테스트(`tests/test_gpx_manager.js`, 4개 케이스) 총 24개 테스트 100% 통과.

#### [Step 10] N:N 친구 소셜 그래프 및 2단계 GPX 경로 공유 (Private / Friends) 시스템 (방안 C 채택)
- [x] **Step 10-1: N:N 소셜 그래프 & 친구 시스템 코어 (`src/stores/friend.js`, `src/composables/useFriendManager.js`, `src/utils/userCodeGenerator.js`) (완료)**
    *   **고유 친구 코드 발급 & O(1) 검색 시스템**: 사용자 식별을 위한 고유 6자리 태그(`userCode`, 예: `CY-7K8P`) 발급 및 `user_codes` 인덱스 문서를 통한 단일 조회(이메일 비노출).
    *   **N:N 친구 관계 및 요청 라이프사이클**: 
        - 서브컬렉션: `users/{uid}/friends/{friendUid}`, `users/{uid}/friend_requests/{senderUid}`
        - 친구 요청 전송, 수신 대기, 수락(양방향 동기화), 거절, 친구 삭제.
    *   **퍼사드 매니저 (`useFriendManager.js`)**: 친구 목록/요청 상태, UI 알림 뱃지, 실시간 리스너 단일 진입점 제공.
    *   **엄격한 단위 테스트 (`tests/test_friend_system.js`)**: 고유 태그 검증, 친구 요청/수락/거절 상태 전이, 중복 신청 방어 및 친구 최대 정원(MAX_FRIENDS_LIMIT = 20) 상한선 방어 15개 테스트 100% 통과.
- [x] **Step 10-2: GPX 2단계 공개 범위 및 친구 공유 엔진 (`src/stores/gpx.js`, `src/composables/useGpxManager.js`) (완료)**
    *   **트랙 모델 확장**: `visibility: 'private' | 'friends'` (기본값: `'private'`).
    *   **친구 공유 파이프라인**:
        - `'private'`: 개인 로컬/문서에만 보관, 외부 공유 컬렉션(`shared_tracks`) 미노출/자동 삭제.
        - `'friends'`: 맞팔/수락된 친구들만 조회 가능한 `shared_tracks/{trackId}` 컬렉션 동기화.
    *   **엄격한 단위 테스트 (`tests/test_gpx_visibility.js`)**: 공개 범위 변경에 따른 스토리지/공유 컬렉션 동기화, 좌표 포맷 무결성, 친구 트랙 표시 제어 등 9개 테스트 100% 통과.
- [x] **Step 10-3: 친구 관리 UI 및 알림 센터 (`src/views/ProfileView.vue`, `src/components/FriendModal.vue`) (완료)**
    *   **내 친구 코드 원클릭 복사 & 칩**: 프로필 상단 및 모달 내 고유 친구 코드 칩(`CY-7K8P 📋`) 배치.
    *   **친구 검색 및 즉시 신청 카드**: 친구 코드 입력 시 유저 실시간 조회 및 상태별(친구/신청됨/신청) 분기 처리.
    *   **받은 친구 요청 센터**: 대기 중인 친구 요청 실시간 목록 및 원터치 수락/거절 액션, 미확인 알림 뱃지(🔴).
    *   **친구 목록 관리**: 맞팔된 라이딩 메이트 목록, 친구 맺은 날짜(`YYYY.MM.DD`) 및 확인 다이얼로그 기반 친구 끊기.
- [x] **Step 10-4: GPX 관리 서랍 친구 공개 토글 및 친구 궤적 탭 (`src/components/GpxDrawer.vue`) (완료)**
    *   **트랙 카드 공개 범위 토글**: `[ 🔒 나만보기 ]` $\leftrightarrow$ `[ 👥 친구 공개 ]` 원클릭 스위칭 칩 및 상태 연동.
    *   **서랍 상단 2개 탭 분리**:
        - `[🚴 내 주행]` : 내가 직접 달린 기록 관리, 드롭존 업로드, 이름 수정, 삭제.
        - `[👥 친구 주행]` : 맞팔된 친구들의 라이딩 궤적 목록, 작성자 프로필/코드, 개별 지도 표시 토글(`👁️`), 새로고침(`🔄`).
- [x] **Step 10-5: 카카오맵 멀티 유저 궤적 레이어 오버레이 (`src/composables/useKakaoGpxLayer.js`, `KakaoMap.vue`) (완료)**
    *   **내 주행선 vs 친구 주행선 시각 분리**: 내 주행선(선택된 스탬프 테마 컬러)과 친구 주행선(일렉트릭 시안 `#06b6d4` 컬러)을 차등화하여 렌더링.
    *   **지도 컨트롤 바 친구 궤적 원터치 토글**: `[ 👥 친구 궤적 (N) ]` 플로팅 버튼 배치 (친구 트랙 존재 시 자동 노출 및 일괄 켜기/끄기).
    *   **친구 궤적 인터랙션 & 팝업**: 친구 폴리라인 터치 시 라이더 닉네임, 트랙명, 거리 안내 Toast 노출 및 선택 시 바운딩 박스 줌.
- [x] **Step 10-6: 통합 E2E 테스트 및 배포 검증 (`tests/test_integration_social_gpx.js`) (완료)**
    *   **E2E 풀 파이프라인 검증**: 유저 코드 생성 $\rightarrow$ 친구 신청/수락 $\rightarrow$ GPX 업로드(private) $\rightarrow$ 친구 공개 전환(friends) $\rightarrow$ 친구 계정 공유 궤적 실시간 로드 $\rightarrow$ 개별 지도 표시 토글 $\rightarrow$ 비공개 복원 시 파기 $\rightarrow$ 친구 끊기까지 6개 시나리오 100% 통과.
    *   **프로덕션 빌드 & 회귀 검증**: 총 54개 자동화 단위/통합 테스트 100% 통과 및 `yarn build` 번들 무결성 확인.

#### [Step 11] GPX 고도 프로필 차트 및 지도 실시간 스크러빙 (완료)
- [x] **고도 프로필 샘플링 & 극값 산출 엔진 (`src/utils/gpxParser.js`)**: 120포인트 정밀 샘플링, `minElevationM`/`maxElevationM` 연산.
- [x] **순수 SVG 반응형 차트 컴포넌트 (`src/components/ElevationChart.vue`)**: 외부 라이브러리 없이 60fps 즉각 렌더링, 정갈한 통계 지표.
- [x] **카카오맵 실시간 스크러빙 동기화 (`src/composables/useKakaoGpxLayer.js`, `KakaoMap.vue`)**: 차트 호버 시 지도 위 앰버 핀 50ms 초저지연 연동.

#### [Step 12] 미니멀 모던 공통 디자인 시스템 구축 및 핫픽스 (완료)
- [x] **스크러빙 핀/차트 정합성 보정**: CustomOverlay 중심축 일치 및 SVG 축 오프셋 보정으로 거리 오차 100% 해결.
- [x] **공통 스타일 모듈화 (`src/styles/`)**: `variables.css`, `typography.css`, `components.css` 토큰화 및 레거시 제거.

#### [Step 13] 멀티 디바이스 GPX 삭제 동기화 및 좀비 복구 버그 해결 (완료)
- [x] **라이프사이클 플래그 및 톰스톤 시스템 (`src/stores/gpx.js`)**: `isSynced` 플래그 및 Firestore `deleted_track_ids` 기반 타 기기 삭제 감지 및 로컬 DB 자동 영구 제거(Pruning).

#### [Step 14] 완주 인증 포토 카드 내보내기 & 커뮤니티 바이럴 엔진 (완료)
- [x] **Step 14-1: 100% 클라이언트 캔버스 렌더러 엔진 구축 (`src/utils/cardRenderer.js`, `tests/test_share_card.js`)**
    *   인스타그램 스토리(9:16) 및 피드(1:1) 듀얼 해상도 렌더링.
    *   GPX 위경도 Mercator 투영 및 자동 중앙 스케일링, 테마별(다크/잉크/사진) 배경 및 아날로그 틸트(-5도) 벡터 도장 합성.
    *   Firebase Storage 0원(서버 미전송, 브라우저 인메모리 Blob/Canvas 즉시 합성 처리).
- [x] **Step 14-2: 포토 카드 파사드 컴포저블 구현 (`src/composables/useShareCard.js`)**
    *   트랙/코스 모달 제어, Web Share API(`navigator.share`) 및 PNG 다운로드 폴백 연동.
- [x] **Step 14-3: 미니멀 모던 포토 카드 모달 컴포넌트 구축 (`src/components/ShareCardModal.vue`)**
    *   라이브 캔버스 프리뷰, 비율/테마 토글, 사진 첨부/제거, 공통 디자인 시스템 토큰 적용.
    *   아이콘 남발 금지 규칙을 엄격히 준수한 프리미엄 미니멀 타이포그래피.
- [x] **Step 14-4: 사용자 진입점 연동 (`App.vue`, `GpxDrawer.vue`, `StampView.vue`)**
    *   `App.vue`: 글로벌 단일 인스턴스 모달 배치.
    *   `GpxDrawer.vue`: 내 주행 및 친구 주행 트랙 카드 통계 행에 `[인증 카드]` 버튼 배치.
    *   `StampView.vue`: 코스 완주 시 펼침 영역에 `[완주 인증 카드 내보내기]` 및 도장 상세 팝업에 `[인증 카드 내보내기]` 연동.
- [x] **Step 14-5: 단위/통합 테스트 및 프로덕션 빌드 검증 (`yarn test`, `yarn build`)**
    *   11개 단위 테스트 추가, 총 12개 스위트 82개 테스트 100% 통과 및 프로덕션 빌드 무결성 확인.

---

## 6. 다음 세션을 위한 인수인계 노트 (Handover Notes)
*   **최근 완료된 작업**: 
    - **Step 10: N:N 친구 소셜 그래프 및 2단계 GPX 공유 시스템 전 과정 완벽 구현 완료**:
      - **Step 10-1**: 고유 친구 코드(`CY-XXXX`), N:N 친구 관계 수명주기, 피니아 스토어(`src/stores/friend.js`), 퍼사드 매니저(`src/composables/useFriendManager.js`).
      - **Step 10-2**: GPX 2단계 공개 범위(`private` / `friends`), `shared_tracks` 컬렉션 자동 미러링 및 영구 삭제 동기화 파이프라인 (`src/stores/gpx.js`).
      - **Step 10-3**: 친구 관리 바텀시트 모달(`FriendModal.vue`), 프로필 뷰(`ProfileView.vue`) 내 코드 칩 및 미확인 친구 요청 실시간 알림 뱃지.
      - **Step 10-4**: `GpxDrawer.vue` 2열 탭 분리(`[내 주행]` / `[친구 주행]`), 원클릭 공개 범위 토글 칩(`vis-toggle-chip`), 친구 트랙 카드 및 개별 표시 토글.
      - **Step 10-5**: `useKakaoGpxLayer.js` 멀티 유저 시각 분리(내 주행: 테마색, 친구 주행: 시안 `#06b6d4`), 지도 상단 `[ 👥 친구 궤적 (N) ]` 플로팅 퀵 토글, 호버/선택 줌 연동.
      - **Step 10-6**: E2E 통합 테스트 파이프라인(`tests/test_integration_social_gpx.js`) 구축, 총 54개 테스트 100% 통과 및 프로덕션 빌드(`yarn build`) 검증 완료.
      - **Firebase 무료 할당량(Spark Plan) 보호 조치 완료**:
        - `src/constants/friend.js`: 사용자 1인당 최대 친구 등록 수 20명(`MAX_FRIENDS_LIMIT = 20`) 및 궤적 쿼리 상한(`MAX_SHARED_TRACKS_QUERY_LIMIT = 40`) 설정.
        - `src/stores/friend.js`: 친구 신청(`sendFriendRequest`) 및 수락(`acceptFriendRequest`) 시 20명 초과 방어 로직 적용.
        - `src/stores/gpx.js`: `shared_tracks` 쿼리 시 `limit(40)` 적용 및 최대 20명 슬라이싱으로 reads 폭증 방지.
        - `FriendModal.vue`: 친구 목록 헤더 `(N/20명)` 표기, 정원 도달 시 단정한 안내 배너 노출 및 버튼 비활성화 (아이콘 남발 금지 규칙 준수).
      - **결함 및 UI 최적화 조치 완료**:
        - `ProfileView.vue`: `.user-code-chip` 배경색 하드코딩(`#ffffff`)을 제거하고 `:class="{ 'is-dark': themeStore.isDark }"` 클래스 바인딩 및 다크 테마 고대비 스타일(다크 배경 `#27272a`, 흰색 텍스트 `#ffffff`, 테두리 `#3f3f46`) 적용 완료.
        - `FriendModal.vue`: 모달 내부 코드 카드, 검색창, 친구 목록 및 요청 아이템에 대해 다크 테마 클래스(`.friend-modal.is-dark`) 대응 스타일을 전면 적용하여 일관된 다크 UI 시인성 확보.
        - `GpxDrawer.vue`: 사용자에게 불필요한 내부 기술 정보인 `[⚡ N% 압축]` 뱃지를 트랙 카드에서 숨김 처리하여 주행 핵심 통계(거리/고도/시간/일자) 중심의 깔끔한 UI로 개선 완료.
    - **Step 8: 실시간 숙소(숙박) 탐색 및 야놀자 하이브리드 연동 완료**:
      - `src/composables/useKakaoAccomLayer.js`: 카카오 Places `AD5`(숙박) 기반 반경 5km 실시간 탐색, 인디고 원형 마커, 인포윈도우(상호명/거리/주소/전화 바로걸기/카카오 길찾기/야놀자 모바일 딥링크).
      - `src/components/KakaoMap.vue`: 좌측 상단 `[ 🏨 숙소 ]` 퀵 토글 배치, 지도 이동/줌 시 `[ 이 지역 재검색 ]` 칩 연동.
    - **지도 뷰 UI 정리 및 '내 위치' 바로가기 기능 완료**:
      - `KakaoMap.vue`: 불필요한 '자전거길' 토글 버튼 삭제.
      - `useKakaoMyLocation.js`: 고정밀 GPS 기반 내 위치 카메라 이동(panTo), level 4 줌인, 블루 펄스 닷(Blue Pulse Dot) CustomOverlay 렌더링.
      - 지도 우측 하단 44×44px 원형 타겟 조준경 플로팅 버튼 배치 (다크 모드 대응 및 로딩 스핀 효과).
      - `tests/test_my_location.js`: 5개 단위 테스트 구축, 총 9개 스위트 64개 테스트 100% 통과 및 프로덕션 빌드 검증 완료.
    - **Step 11: GPX 고도 프로필(Elevation Profile) 차트 및 실시간 지도 스크러빙 구현 완료**:
      - **GPX 고도 샘플링 및 극값 산출 엔진 (`src/utils/gpxParser.js`)**:
        - GPX 파일 파싱 시 `minElevationM`, `maxElevationM` 자동 계산 및 120포인트 균등 샘플링 `elevationProfile: [{ distKm, ele, lat, lng }]` 구조 생성 (경량 1.5KB 크기로 IndexedDB/Firestore 직렬화 호환).
      - **스토어 및 퍼사드 확장 (`src/stores/gpx.js`, `src/composables/useGpxManager.js`)**:
        - `showElevationProfile`, `activeScrubbingPoint`, `activeElevationTrack` 상태 및 게터 구현.
        - `openElevationProfile(trackId)`, `closeElevationProfile()`, `setActiveScrubbingPoint(point)` 액션 탑재.
        - 트랙 삭제(`removeTrack`) 및 전체 초기화 시 고도 차트 자동 닫힘 방어 로직 내장.
      - **초경량 반응형 SVG 차트 컴포넌트 (`src/components/ElevationChart.vue`)**:
        - 외부 차트 라이브러리(300KB+) 없이 순수 반응형 SVG(`viewBox="0 0 600 120"`)와 선형 그라디언트(`linearGradient`) 영역 채우기 방식으로 구현하여 60fps 즉각적인 모바일 렌더링 제공.
        - 기본 통계(최고/최저/획득고도/거리) 및 스크러빙 시 실시간 통계(거리/현재고도/구간 경사도 %) 정갈한 타이포그래피 표시.
        - 아이콘 남발 금지 규칙을 엄격히 준수하여 불필요한 이모지를 일체 배제하고 단정한 텍스트 및 표준 단위(`km`, `m`, `%`) 중심 UI 구성.
        - 마우스 및 모바일 터치(`touchstart`, `touchmove`, `touchend`) 스크러빙 제스처 완벽 지원.
      - **카카오맵 실시간 스크러빙 마커 동기화 (`src/composables/useKakaoGpxLayer.js`, `src/components/KakaoMap.vue`)**:
        - 차트 스크러빙 지점의 위경도(`lat`, `lng`)에 맞춰 카카오맵 위에 앰버 핀(`scrubbing-pin-dot`)과 실시간 고도 뱃지(`scrubbing-pin-badge`)를 갖춘 `CustomOverlay`를 50ms 이내 초저지연 연동.
        - 컴포넌트 언마운트 시 오버레이 메모리 누수 방지 클린업 탑재.
      - **주행 서랍 연동 및 UI 정돈 (`src/components/GpxDrawer.vue`)**:
        - 내 주행 및 친구 주행 트랙 카드에 정갈한 `[고도 차트]` 버튼 추가 (클릭 시 서랍을 접고 지도 상에 고도 차트 팝업 즉시 노출).
        - 기존 친구 트랙 카드 내 장식용 이모지(`🚴`, `⛰️`, `⏱️`, `📅`)를 전면 정리하여 일관된 미니멀 모던 디자인 확립.
      - **테스트 및 빌드 검증 (`tests/test_elevation_profile.js`)**:
        - 고도 프로필 차트 7개 단위 테스트 추가, 총 10개 스위트 71개 테스트 100% 통과 및 프로덕션 빌드(`yarn build`) 검증 완료.
      - **Step 12: 고도 차트-지도 정합성 핫픽스 및 공통 디자인 시스템 구축 완료**:
        - **스크러빙 핀 정합성 100% 보정**: Kakao CustomOverlay의 `yAnchor: 1.0`과 CSS `transform: translateY(-100%)` 중복 적용으로 인한 40px 공중 부양 버그 제거. 14×14px 점 중심을 `xAnchor: 0.5, yAnchor: 0.5`로 완벽 일치시키고 고도 뱃지는 상단 플로팅(`bottom: 20px`) 처리.
        - **차트 스크러빙 거리 비율 보정**: SVG 좌측 축 라벨 영역(`padLeft = 40px`)을 고려하여 마우스 X 좌표를 `(svgX - padLeft) / plotW` 구간으로 정밀 매핑하여 마우스 커서와 지도 핀 간의 거리 오차(~6.7%) 원천 해결.
        - **미니멀 모던 공통 디자인 시스템 구축 (`src/styles/`)**:
          - 레거시 미사용 `src/style.css` 제거.
          - `variables.css`(디자인 토큰), `typography.css`(`.tabular-nums`, 단일행 말줄임), `components.css`(`.cycling-chip`, `.cycling-badge`, `.cycling-fab`, `.cycling-glass-card`, `.cycling-btn-subtle`) 모듈화 구축.
          - `main.js` 글로벌 임포트 및 `ElevationChart.vue`, `GpxDrawer.vue` 공통 클래스 연동.
          - 테마 변경 시에도 버튼/텍스트 가독성이 100% 유지되도록 `AGENTS.md` 및 규칙 파일에 '공통 스타일 우선 원칙 (Common Style First)' 등록.
      - **Step 13: 멀티 디바이스 GPX 삭제 동기화 및 좀비 복구 버그 해결 완료**:
        - **문제 원인**: A 기기에서 트랙 삭제 후 B 기기 접속 시, B 기기의 IndexedDB에 남아있던 트랙을 '신규 오프라인 트랙'으로 착각하여 Firestore로 역동기화(부활)하는 현상 발생.
        - **해결 방안 (방안 1 채택)**:
          - 클라우드 동기화 라이프사이클 플래그 `isSynced: boolean` 도입 (업로드 완료 및 서버 다운로드 트랙에 `true` 부여).
          - Firestore `users/{uid}` 문서에 `deleted_track_ids` 톰스톤 배열 필드 관리 (`arrayUnion` 원자적 추가).
          - `removeTrack` 및 `clearAllTracks` 시 로컬 상태/IndexedDB 정리와 함께 Firestore `deleted_track_ids` 및 `shared_tracks` 정리 일괄 수행.
          - `loadTracks` 시 Firestore에 없거나 `deleted_track_ids`에 포함된 동기화 트랙(`isSynced: true`)은 다른 기기에서 삭제된 것으로 판별하여 로컬 IndexedDB에서도 자동 영구 제거(Pruning). 순수 오프라인 신규 트랙(`isSynced === false`)만 보존하여 Firestore로 안전 업로드.
        - **테스트 및 검증 (`tests/test_gpx_sync_deletion.js`)**:
          - 4개 핵심 시나리오(신규/원격 `isSynced` 식별, 원격 삭제 감지 및 로컬 자동 정리, 오프라인 트랙 보존, 트랙 삭제 시 스토어/IndexedDB/Firestore 톰스톤 기록) 단위 테스트 완비.
          - 총 11개 스위트 75개 테스트 100% 통과 및 프로덕션 빌드(`yarn build`) 검증 완료.
      - **Step 14: 완주 인증 포토 카드 내보내기 & 커뮤니티 바이럴 엔진 구축 완료**:
        - **100% 브라우저 클라이언트 렌더러 (`src/utils/cardRenderer.js`)**: 인스타그램 스토리(9:16) 및 피드(1:1) 규격 지원, GPX 좌표 종횡비 보존(Mercator) 투영, 야간 라이딩/아날로그 수첩/내 사진 배경 3종 테마 및 아날로그 틸트(-5도) 벡터 도장 합성. Firebase Storage 0원(서버 미전송, 인메모리 Blob 처리).
        - **도메인 파사드 (`src/composables/useShareCard.js`)**: Web Share API(`navigator.share`) 1-Tap 인스타그램/카카오톡 공유 및 PNG 다운로드 자동 폴백 연동.
        - **모던 미니멀 UI 모달 (`src/components/ShareCardModal.vue`)**: 라이브 프리뷰, 비율/테마 선택, 공통 스타일 토큰 적용, 아이콘 남발 배제.
        - **모바일 갤러리 피커 연동 개선**: 구체적 이미지 MIME/확장자(`image/jpeg,image/png,...`)를 지정하여 모바일에서 카메라/앨범 통합 선택이 원활하도록 개선 및 중복 카메라 버튼 정돈.
        - **사용자 진입점 연동**: `App.vue`(글로벌 모달), `GpxDrawer.vue`(내 주행 및 친구 주행 트랙 카드 `[인증 카드]`), `StampView.vue`(코스 완주 영역 및 개별 도장 팝업 `[인증 카드 내보내기]`).
        - **테스트 및 검증 (`tests/test_share_card.js`)**: 11개 단위 테스트 완비, 총 12개 스위트 82개 자동화 테스트 100% 통과 및 프로덕션 빌드(`yarn build`) 완료.

      - **Step 15: 전 화면 공통 디자인 시스템 전면 일원화 & 상용 수준 비주얼 마감 완료**:
        - **스탬프 수첩 뷰 (`StampView.vue`)**: 인라인 테마/다크 하드코딩 스타일 전면 제거, `var(--card-bg)`, `var(--border-color)`, `var(--app-bg)` 일원화, 완주/현황 뱃지 내 장식용 이모지(`🏆`, `📍`, `🔒` 등) 정리, 수치 표시 영역 `.tabular-nums` 전면 적용.
        - **마이페이지 (`ProfileView.vue`)**: 친구 코드 복사 버튼 텍스트 정돈, 배경 테마 선택 바 내 장식용 이모지(`🌙`, `☀️`) 대신 미니멀 인디케이터 도트(`.bg-mode-dot`) 적용, 달성 통계 셀 `.tabular-nums` 적용.
        - **친구 관리 모달 (`FriendModal.vue`)**: 모달 타이틀 및 복사 버튼 내 장식용 이모지(`👥`, `📋`, `🚴💨`) 배제, 카드/목록/입력창 공통 디자인 시스템 토큰 적용.
        - **인증 포토 카드 [아날로그 수첩] & [심플] 테마 고도화 (`src/utils/cardRenderer.js`, `src/components/ShareCardModal.vue`)**:
          - **아날로그 수첩**: 웜톤 비네팅 및 여권 모눈 격자 질감, 클래식 이중 프레임 및 앤틱 코너 브래킷, 배경 공식 인증 원형 씰 워터마크 날인, 2-pass 인주 잉크 번짐 궤적 효과, 종이 라벨 통계 박스 적용으로 '실물 국토종주 수첩' 감성 차별화 확립.
          - **심플 테마 (서브 컬러: 블랙 / 네이비)**: 기존 '미니멀 다크/야간 라이딩'에서 '심플'로 상위 명칭 개편. 하위 서브 선택지로 `[블랙]`(Slate Deep Dark + Skyblue 궤적)과 `[네이비]`(Midnight Navy + Soft Blue 궤적) 2단계 선택 체계 구축. 불투명하고 답답한 통계 박스를 걷어내고 1px 슬림 헤어라인 프레임과 미니멀 타이포그래피 기반의 모던 스위스 디자인 적용.
        - **전 테마 명도 대비 & 품질 검증**: 5개 배경 테마 × 4개 스탬프 테마 전역에서 폰트 가독성 및 컴포넌트 대비 100% 보장. 총 12개 스위트 85개 자동화 단위/통합 테스트 100% 통과 및 `yarn build` 무결성 검증 완료.

      - **Step 16: 라이딩 게이미피케이션 Phase A (전국 탐험률 & 17개 공식 종주 뱃지 시스템) 구축 완료**:
        - **행정안전부 공인 종주 뱃지 계층 체계 정립 (`src/utils/achievementEngine.js`, `src/composables/useAchievementManager.js`)**:
          - **확장형 티어 체계 확립**: `브론즈` → `실버` → `골드` → `티타늄` → `그랜드` → `마스터` → `레전드`
          - **티타늄 (1개)**:
            - **[국토완주 x2]**: 전국 85개 공식 인증센터 모두 2회차(`visitCount >= 2`) 이상 도장 완료 시 해금 (더블 그랜드슬램).
          - **골드 (1개)**:
            - **[국토완주]**: 전국 85개 공식 인증센터 100% 도장 완료 시 해금.
          - **실버 (2개)**:
            - **[4대강 종주]**: 한강(서울/남한강), 낙동강, 금강, 영산강 35개 인증센터 완주 시 해금.
            - **[국토 종주]**: 아라뱃길, 한강(서울), 남한강, 새재, 낙동강 본선 27개 인증센터 완주 시 해금 (안동댐 제외).
          - **브론즈 (13개 - 간소화 명칭)**:
            - `[아라뱃길]`, `[한강]`, `[남한강]`, `[북한강]`, `[새재]`, `[낙동강]`, `[금강]`, `[영산강]`, `[섬진강]`, `[오천]`, `[동해안(강원)]`, `[동해안(경북)]`, `[제주]`
          - 뱃지 종류를 단일 **[종주]** 타이틀(`jongju`)로 통합하고 개별 뱃지 카드에 `[종주]` 식별 칩 연동.
        - **업적 서랍 UI & 마이페이지 연동 (`ProfileView.vue`, `AchievementDrawer.vue`)**:
          - 마이페이지 내 `종주 뱃지 (17개)` 섹션 배치, 최근 해금 뱃지 프리뷰 칩, 최상위 티타늄/골드/실버 마일스톤부터 13개 개별 코스까지 원터치 확인 가능한 서랍 UI 제공.
          - 브론즈, 실버, 골드, 티타늄 4개 티어 카운트 뱃지 필 및 장식용 이모지 배제된 정갈한 타이포그래피 유지.
        - **영토 탐험률 엔진 (`src/constants/geoRegions.js`, `src/utils/explorationEngine.js`, `useExplorationManager.js`)**:
          - 전국 250개 시군구 경량 바운딩 박스 기반 공간 매핑, 0.02도 격자 타일 수집으로 전국 탐험률(%) 및 정복 지자체 수치 1ms 이내 초고속 산출.
        - **카카오맵 기본 모드 vs 탐험 모드 (`KakaoMap.vue`, `useKakaoGpxLayer.js`, `ConqueredRegionsModal.vue`)**:
          - 상단 중앙 플로팅 세그먼트 컨트롤을 통해 기존 맑은 지도를 100% 유지하는 **[기본 모드]**와, 미개척지 안개 마스크(`rgba(15, 23, 42, 0.45)`) 위로 내가 달린 궤적만 32px 네온 웜홀로 환하게 밝혀지는 **[탐험 모드]** 간 원터치 전환 구현.
          - 기존 '내 주행 기록' 플로팅 버튼과의 겹침 현상 원천 해결 (상단 중앙 안전 영역으로 재배치).
          - '내 정보' 탭에서 '지도'/'스탬프' 탭 전환 시 발생하던 파사드 바인딩 결함(`useStampManager.acquiredStamps`) 원천 해결.
        - **단위/통합 테스트 및 빌드 검증 (`tests/test_achievements.js`, `tests/test_exploration.js`)**: 총 14개 스위트 **101개 테스트 100% 통과** 및 프로덕션 번들링(`yarn build`) 753ms 무결성 검증 완료.

      - **Step 17: 종주 뱃지 체계 정돈 & 전 화면 공통 디자인 시스템(Common Style First) 2단계 리팩토링 완료**:
        - **종주 뱃지 명칭 및 시각 위계 정돈 (`src/utils/achievementEngine.js`, `AchievementDrawer.vue`)**:
          - 국문 띄어쓰기 규격 통일: `[4대강 종주]`, `[국토 종주]`에 맞추어 골드 **`[국토 완주]`**, 티타늄 **`[국토 완주 x2]`** 띄어쓰기 일원화.
          - 상단 요약 카드 진행률 게이지 바 제거로 서랍 헤더 높이 16px 축소 및 첫 뱃지 카드 뷰포트 노출 비율 향상.
          - 뱃지 진행 중 수치(`N%`) 부분만 고대비 티어 색상으로 선명하게 하이라이트하여 WCAG AA 가독성 및 3박자 시각 위계(테두리/배경 스며듦 + 하단 프로그레스 + 숫자 강조) 확립.
        - **전체 Vue 컴포넌트 커스텀 스타일 전수 조사 및 공통 시스템 승격 (Phase 1 & Phase 2)**:
          - **Phase 1 (분류 A: 기존 공통 스타일 적용 & 중복 제거)**:
            - 플로팅 버튼 통일: `MapView.vue`(`.gpx-floating-trigger`) 및 `KakaoMap.vue`(`.supply-toggle-btn`, `.my-location-btn`)을 `.cycling-fab` 기반으로 일원화.
            - 라벨 칩/뱃지 단일화: `GpxDrawer.vue`(`.stat-chip`) 및 `ConqueredRegionsModal.vue`(`.region-chip`)을 `.cycling-chip`과 `.cycling-badge`로 단일화.
            - 다크모드 하드코딩 오버라이드 제거: `FriendModal.vue` 내 106줄 규모의 수동 `.is-dark` CSS를 테마 CSS 변수(`var(--card-bg)`, `var(--text-main)` 등)로 일원화하여 전량 삭제.
            - 말줄임(`.text-truncate`) 및 동적 수치(`.tabular-nums`) 타이포그래피 유틸리티 적용.
          - **Phase 2 (분류 B: 신규 공통 디자인 시스템 클래스 승격)**:
            - 모달 표준 레이아웃 승격: `.cycling-modal-popup`, `.cycling-modal-container`, `.cycling-modal-header`, `.cycling-modal-title`, `.cycling-modal-subtitle`, `.cycling-modal-body`
            - 세그먼트 컨트롤 승격: `.cycling-segment-control`, `.cycling-segment-btn` (`.active`)
            - 공통 진행률 바 승격: `.cycling-progress-track`, `.cycling-progress-fill`
            - 빈 상태 UI 승격: `.cycling-empty-state`, `.cycling-empty-title`, `.cycling-empty-desc`
            - 티어 태그 승격: `.cycling-tier-tag` (`.bronze`, `.silver`, `.gold`, `.titanium`)
            - 가로 스크롤 숨김 유틸리티: `.no-scrollbar`
            - 대상 컴포넌트(`AchievementDrawer`, `ConqueredRegionsModal`, `ShareCardModal`, `FriendModal`, `AchievementNotificationModal`, `ProfileView`) 전면 적용 완료.
        - **품질 지표 및 빌드 검증**:
          - CSS 번들 크기: `261.01 kB` → **`254.81 kB`** (약 6.2KB 순수 코드 감축).
          - 단위/통합 테스트: 14개 스위트 **101개 테스트 100% 통과**.
          - Vite 프로덕션 번들링(`yarn build`) 정상 완료.

*   **다음 세션 예정 작업 (Next Planned Step)**:
    - **후속 백로그 기능 구현 또는 실서버 배포 (`yarn deploy`)**:
      1. **라이더 숙소 꿀팁 메모 및 자전거 실내 보관 태깅**:
         - 라이더 핵심 관심사인 숙소별 '자전거 객실/실내 보관 가능 여부' 태깅 및 후기/메모 집단지성 DB 구축.
      2. **친구 라이딩 소셜 피드 & 응원하기 (Social Riding Feed)**:
         - 맞팔된 친구들의 최근 완주 기록과 인증 카드를 모아보는 피드 타임라인 및 응원 인터랙션.
      3. **사용자 요청 시 Firebase Hosting 실서버 배포 (`yarn deploy`)**.

*   **주의사항**:
    - 기존 퍼사드 패턴(`useStampManager`, `useGpxManager`, `useFriendManager`) 아키텍처 규칙을 엄격히 준수할 것.
    - 사용자의 별도 요청이 있을 때만 Git 원격 저장소 푸시(Push) 및 Firebase 배포를 진행할 것.
    - **UI/UX 아이콘 남발 절대 금지**: 버튼, 라벨, 뱃지, 모달, 토스트 등에 장식용 이모지/아이콘을 불필요하게 덧붙이지 않고, 지도 마커나 내비게이션 등 필수 식별 영역을 제외하고는 정갈한 텍스트와 타이포그래피, 여백 중심의 미니멀 모던 UI를 유지할 것.

---

## 7. 프로젝트 실행, 빌드 및 배포 명령어 가이드 (Cheat Sheet)

### 🚀 1. 원클릭 빌드 및 배포 (추천)
```powershell
yarn deploy
```
> `yarn build`(Vite 프로덕션 번들링) 완료 후 `npx firebase-tools deploy --only hosting`이 순차 실행되어 실서버(`https://cycling-stamp.web.app`)에 즉시 반영됩니다.

### 💻 2. 단계별 개별 명령어

| 작업 목적 | 명령어 | 설명 |
| :--- | :--- | :--- |
| **로컬 개발 서버 실행** | `yarn dev` | `http://localhost:5173` 로컬 테스트 환경 구동 |
| **프로덕션 빌드 (PWA 검증)** | `yarn build` | Vite 번들링 및 서비스 워커(`dist/`) 생성 |
| **빌드 결과물 로컬 미리보기** | `yarn preview` | 빌드된 `dist` 폴더를 로컬 웹서버로 사전 검증 |
| **Firebase 호스팅 단독 배포** | `npx firebase-tools deploy --only hosting` | `dist` 폴더를 Firebase 클라우드 실서버로 업로드 |

### 📦 3. Git 관리 명령어 (주의: 사용자 요청 시에만 실행)
```powershell
# 변경 사항 스테이징
git add .

# 커밋 생성
git commit -m "feat: 작업 내용 요약"

# 원격 저장소(GitHub) 푸시 (반드시 사용자 승인/요청 시에만 실행)
git push origin main
```

### 🔗 4. 서비스 관련 링크
*   **실제 배포 사이트 (PWA)**: [https://cycling-stamp.web.app](https://cycling-stamp.web.app)
*   **Firebase 관리자 콘솔**: [https://console.firebase.google.com](https://console.firebase.google.com)

