<template>
  <div class="profile-view">
    <van-nav-bar title="내 정보" fixed placeholder />
    
    <div class="profile-content">
      <div v-if="user" class="user-info">
        <van-image round width="5rem" height="5rem" :src="user.photoURL" />
        <h3 :style="{ color: 'var(--text-main, #1f2937)' }">{{ user.displayName }}님 환영합니다!</h3>
        <p :style="{ color: 'var(--text-sub, #666)' }">{{ user.email }}</p>
      </div>

      <van-cell-group inset>
        <van-cell title="로그인 상태" :value="user ? '로그인됨' : '비로그인'" />
        <van-cell title="코스 종주 달성" :value="`${acquiredCount} / ${totalCount} (${progressRate}%)`" />
        <van-cell title="누적 인증 횟수" :value="`총 ${totalVisitCount}회`" />
        <van-cell title="현재 테마" :value="`${themeStore.currentBg.name} 배경 / ${themeStore.currentTheme.name}`" />
        <van-cell title="앱 버전" value="1.0.0 (PWA)" />
      </van-cell-group>
      
      <div style="margin: 16px;">
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider } from '../services/firebase'
import { useStampManager } from '../composables/useStampManager'
import { showSuccessToast, showFailToast } from 'vant'

const user = ref(null)
const isLoading = ref(false)
const stampManager = useStampManager()
const { themeStore, acquiredCount, totalCount, totalVisitCount, progressRate } = stampManager

// 로그인 상태 감지
onMounted(() => {
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
  })
})

const handleLogin = async () => {
  isLoading.value = true
  try {
    const result = await signInWithPopup(auth, googleProvider)
    user.value = result.user
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
  padding-top: 20px;
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
</style>
