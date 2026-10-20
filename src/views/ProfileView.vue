<template>
  <div class="profile-view">
    <van-nav-bar title="내 정보" fixed placeholder />
    
    <div class="profile-content">
      <div v-if="user" class="user-info">
        <van-image round width="5rem" height="5rem" :src="user.photoURL" />
        <h3 :style="{ color: 'var(--text-main, #1f2937)' }">{{ user.displayName }}님 환영합니다!</h3>
        <p :style="{ color: 'var(--text-sub, #666)' }">{{ user.email }}</p>

        <!-- 친구 고유 코드 칩 -->
        <div 
          v-if="currentUserCode" 
          :class="['user-code-chip', { 'is-dark': themeStore.isDark }]" 
          @click="copyUserCode"
        >
          <span class="user-code-label">친구 코드:</span>
          <span class="user-code-val">{{ currentUserCode }}</span>
          <span class="copy-icon">📋</span>
        </div>
      </div>

      <!-- 1. 계정 및 라이딩 달성 정보 -->
      <van-cell-group inset title="라이딩 달성 현황">
        <van-cell title="로그인 상태" :value="user ? '로그인됨' : '비로그인'" />
        <van-cell 
          v-if="user" 
          title="라이딩 친구 관리" 
          is-link 
          @click="showFriendModal = true"
        >
          <template #value>
            <div class="friend-cell-value">
              <van-badge 
                v-if="pendingRequestCount > 0" 
                :content="pendingRequestCount" 
                class="friend-req-badge"
              />
              <span>{{ friendCount }}명</span>
            </div>
          </template>
        </van-cell>
        <van-cell title="코스 종주 달성" :value="`${acquiredCount} / ${totalCount} (${progressRate}%)`" />
        <van-cell title="누적 인증 횟수" :value="`총 ${totalVisitCount}회`" />
        <van-cell title="나만의 주행 기록" :value="`${totalTracksCount}개 (${totalDistanceKm} km)`" />
        <van-cell title="앱 버전" value="1.0.0 (PWA)" />
      </van-cell-group>

      <!-- 2. 화면 및 도장 테마 설정 -->
      <van-cell-group inset title="화면 및 도장 테마 설정" class="theme-setting-group">
        <!-- 1) 지도 배경 테마 -->
        <div class="theme-section">
          <div class="theme-section-header">
            <span class="theme-section-title">지도 배경 테마</span>
            <span class="theme-section-current">{{ themeStore.currentBg.name }}</span>
          </div>
          <div class="bg-theme-row">
            <button
              v-for="bg in themeStore.bgThemeList"
              :key="bg.key"
              type="button"
              :class="['bg-theme-btn', { active: themeStore.bgThemeKey === bg.key }]"
              @click="themeStore.setBgTheme(bg.key)"
            >
              <span class="bg-mode-icon">{{ bg.isDark ? '🌙' : '☀️' }}</span>
              <span class="bg-name">{{ bg.name }}</span>
            </button>
          </div>
        </div>

        <van-divider style="margin: 6px 16px 2px;" />

        <!-- 2) 스탬프 도장 및 포인트 컬러 -->
        <div class="theme-section">
          <div class="theme-section-header">
            <span class="theme-section-title">스탬프 및 포인트 컬러</span>
            <span class="theme-section-current" :style="{ color: themeStore.currentTheme.main, fontWeight: '700' }">
              {{ themeStore.currentTheme.name }}
            </span>
          </div>
          <div class="stamp-theme-grid">
            <button
              v-for="st in themeStore.themeList"
              :key="st.key"
              type="button"
              :class="['stamp-theme-btn', { active: themeStore.stampThemeKey === st.key }]"
              :style="themeStore.stampThemeKey === st.key ? { borderColor: st.main, backgroundColor: st.cardBgLight || '#f8fafc' } : {}"
              @click="themeStore.setStampTheme(st.key)"
            >
              <span class="stamp-theme-dot" :style="{ backgroundColor: st.main }"></span>
              <span class="stamp-theme-name" :style="themeStore.stampThemeKey === st.key ? { color: st.main, fontWeight: '700' } : {}">
                {{ st.name }}
              </span>
            </button>
          </div>
          <div class="theme-desc" :style="{ color: 'var(--text-sub, #64748b)' }">
            {{ themeStore.currentTheme.desc }}
          </div>
        </div>
      </van-cell-group>
      
      <div style="margin: 20px 16px 16px;">
        <van-button 
          v-if="!user" 
          round 
          block 
          @click="handleLogin" 
          :loading="isLoading"
          :style="{
            backgroundColor: themeStore.currentTheme.main,
            borderColor: themeStore.currentTheme.main,
            color: '#ffffff'
          }"
        >
          구글 계정으로 로그인
        </van-button>
        <van-button 
          v-else 
          round 
          block 
          @click="handleLogout" 
          :loading="isLoading"
          :style="{
            backgroundColor: themeStore.currentTheme.main,
            borderColor: themeStore.currentTheme.main,
            color: '#ffffff'
          }"
        >
          로그아웃
        </van-button>
      </div>

      <!-- 친구 관리 모달 팝업 -->
      <FriendModal v-model:show="showFriendModal" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider } from '../services/firebase'
import { useStampManager } from '../composables/useStampManager'
import { useGpxManager } from '../composables/useGpxManager'
import { useFriendManager } from '../composables/useFriendManager'
import FriendModal from '../components/FriendModal.vue'
import { showSuccessToast, showFailToast } from 'vant'

const user = ref(null)
const isLoading = ref(false)
const showFriendModal = ref(false)

const stampManager = useStampManager()
const { themeStore, acquiredCount, totalCount, totalVisitCount, progressRate } = stampManager

const gpxManager = useGpxManager()
const { totalTracksCount, totalDistanceKm } = gpxManager

const friendManager = useFriendManager()
const {
  currentUserCode,
  friendCount,
  pendingRequestCount,
  copyUserCode,
  initUserCode,
  startListening,
  stopListening
} = friendManager

// 로그인 상태 감지 및 친구 리스너 연동
onMounted(() => {
  onAuthStateChanged(auth, async (currentUser) => {
    user.value = currentUser
    if (currentUser) {
      await initUserCode(currentUser)
      startListening(currentUser.uid)
    } else {
      stopListening()
    }
  })
})

onUnmounted(() => {
  stopListening()
})

const handleLogin = async () => {
  isLoading.value = true
  try {
    const result = await signInWithPopup(auth, googleProvider)
    user.value = result.user
    if (result.user) {
      await initUserCode(result.user)
      startListening(result.user.uid)
    }
    showSuccessToast('로그인 성공!')
  } catch (error) {
    console.error('로그인 에러:', error)
    showFailToast('로그인에 실패했습니다.')
  } finally {
    isLoading.value = false
  }
}

const handleLogout = async () => {
  isLoading.value = true
  try {
    stopListening()
    await signOut(auth)
    user.value = null
    showSuccessToast('로그아웃 되었습니다.')
  } catch (error) {
    showFailToast('로그아웃 실패')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.profile-view {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  background-color: var(--app-bg, #f7f8fa);
  transition: background-color 0.3s ease;
  padding-bottom: 30px;
}

.profile-content {
  padding-top: 16px;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.user-info h3 {
  margin: 10px 0 5px 0;
  font-size: 17px;
}

.user-info p {
  margin: 0;
  font-size: 13px;
}

/* 친구 고유 코드 칩 */
.user-code-chip {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background-color: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.user-code-chip:active {
  transform: scale(0.96);
  background-color: var(--border-color, #f1f5f9);
}

.user-code-label {
  font-size: 11.5px;
  color: var(--text-sub, #64748b);
}

.user-code-val {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main, #0f172a);
  letter-spacing: 0.5px;
}

/* 다크 테마 명시적 스타일 지원 */
.user-code-chip.is-dark {
  background-color: #27272a;
  border-color: #3f3f46;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.user-code-chip.is-dark:active {
  background-color: #3f3f46;
}

.user-code-chip.is-dark .user-code-label {
  color: #a1a1aa;
}

.user-code-chip.is-dark .user-code-val {
  color: #ffffff;
}

.copy-icon {
  font-size: 12px;
  opacity: 0.7;
}

.friend-cell-value {
  display: flex;
  align-items: center;
  gap: 4px;
}

.friend-req-badge {
  display: inline-flex;
}

/* 테마 설정 스타일 */
.theme-setting-group {
  margin-top: 14px;
}

.theme-section {
  padding: 14px 16px;
}

.theme-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.theme-section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main, #1f2937);
}

.theme-section-current {
  font-size: 12px;
  color: var(--text-sub, #6b7280);
}

/* 배경 테마 가로 버튼 (4열) */
.bg-theme-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.bg-theme-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 10px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--app-bg, #f8fafc);
  color: var(--text-main, #334155);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bg-theme-btn:active {
  transform: scale(0.97);
}

.bg-theme-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
}

.bg-mode-icon {
  font-size: 14px;
}

/* 도장 테마 그리드 (2열 2행) */
.stamp-theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stamp-theme-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--border-color, #e2e8f0);
  background: var(--app-bg, #f8fafc);
  color: var(--text-main, #334155);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stamp-theme-btn:active {
  transform: scale(0.97);
}

.stamp-theme-btn.active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stamp-theme-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.theme-desc {
  font-size: 11.5px;
  margin-top: 8px;
  line-height: 1.4;
}
</style>
