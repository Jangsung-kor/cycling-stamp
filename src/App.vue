<template>
  <div 
    id="app-container" 
    :class="['app-container', `bg-${themeStore.bgThemeKey}`, { 'is-dark': themeStore.isDark }]"
    :style="{
      '--app-bg': themeStore.currentBg.appBg,
      '--card-bg': themeStore.currentBg.cardBg,
      '--text-main': themeStore.currentBg.textMain,
      '--text-sub': themeStore.currentBg.textSub,
      '--border-color': themeStore.currentBg.border,
      '--brand-color': themeStore.currentTheme.main
    }"
  >
    <main class="app-main">
      <router-view />
    </main>

    <!-- 글로벌 완주 인증 포토 카드 모달 -->
    <ShareCardModal />
    
    <!-- 하단 탭바: 배경 및 활성 색상이 테마와 일체화 -->
    <van-tabbar 
      v-model="active" 
      route 
      fixed
      :active-color="themeStore.currentTheme.main"
      :inactive-color="themeStore.isDark ? '#71717a' : '#94a3b8'"
      class="global-tabbar"
      :style="{
        backgroundColor: themeStore.currentBg.barBg,
        borderTopColor: themeStore.currentBg.barBorder
      }"
    >
      <van-tabbar-item replace to="/" icon="location-o">지도</van-tabbar-item>
      <van-tabbar-item replace to="/stamp" icon="award-o">스탬프</van-tabbar-item>
      <van-tabbar-item replace to="/profile" icon="user-o">내 정보</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './services/firebase'
import { useStampStore } from './stores/stamp'
import { useThemeStore } from './stores/theme'
import { useGpxStore } from './stores/gpx'
import ShareCardModal from './components/ShareCardModal.vue'

const active = ref(0)
const stampStore = useStampStore()
const themeStore = useThemeStore()
const gpxStore = useGpxStore()

onMounted(() => {
  // 앱 실행 시 로컬 IndexedDB에 보관된 GPX 트랙 1차 로드
  gpxStore.loadTracks()

  // 앱이 켜질 때 글로벌하게 로그인 상태를 감지하여 스탬프 및 GPX 데이터를 동기화합니다.
  onAuthStateChanged(auth, (user) => {
    if (user) {
      stampStore.fetchUserStamps()
      gpxStore.loadTracks() // 로그인 시 클라우드 동기화 수행
    } else {
      stampStore.acquiredStamps = [] // 로그아웃 시 스탬프 초기화
      gpxStore.loadTracks() // 로그아웃 시 로컬 트랙 로드
    }
  })
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden; /* 모바일 브라우저 주소창 숨김 및 하단 탭바 사라짐 방지 */
  background-color: var(--app-bg, #f7f8fa);
  color: var(--text-main, #1f2937);
  transition: background-color 0.3s ease, color 0.3s ease;
  -webkit-text-size-adjust: 100%;
}

#app-container {
  width: 100%;
  height: 100%;
  height: 100dvh; /* 모바일 동적 뷰포트 지원 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--app-bg, #f7f8fa);
  color: var(--text-main, #1f2937);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.app-main {
  flex: 1;
  width: 100%;
  height: calc(100% - 50px - env(safe-area-inset-bottom, 0px));
  max-height: calc(100% - 50px - env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}

/* 글로벌 탭바 스타일: 항상 최상단 레이어에 고정 유지 */
.global-tabbar {
  flex-shrink: 0;
  height: 50px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 999 !important;
  transition: background-color 0.3s ease, border-color 0.3s ease;
  border-top: 1px solid var(--border-color);
}

/* 다크 모드 시 Vant 네비게이션 바 및 공통 컴포넌트 글로벌 다크화 */
.is-dark .van-nav-bar {
  background-color: var(--card-bg) !important;
  border-bottom: 1px solid var(--border-color) !important;
}

.is-dark .van-nav-bar__title,
.is-dark .van-nav-bar .van-icon {
  color: var(--text-main) !important;
}

.is-dark .van-dialog {
  background-color: var(--card-bg) !important;
  color: var(--text-main) !important;
}

.is-dark .van-dialog__title {
  color: var(--text-main) !important;
}

.is-dark .van-cell {
  background-color: var(--card-bg) !important;
  color: var(--text-main) !important;
}

.is-dark .van-cell__title,
.is-dark .van-cell__value {
  color: var(--text-main) !important;
}

.is-dark .van-cell-group {
  background-color: var(--card-bg) !important;
}

.is-dark .van-cell-group__title {
  color: var(--text-sub) !important;
}
</style>
