<template>
  <div class="map-view">
    <KakaoMap />
    
    <!-- 스탬프 인증 버튼 (화면 하단 플로팅, 도장 테마 컬러 연동) -->
    <van-button 
      class="stamp-btn" 
      round 
      icon="location-o"
      @click="handleStampAuth"
      :loading="isLoading"
      :style="{
        backgroundColor: themeStore.currentTheme.main,
        borderColor: themeStore.currentTheme.main,
        color: '#ffffff'
      }"
    >
      내 위치 인증 및 스탬프 획득
    </van-button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast, showSuccessToast, showFailToast } from 'vant'
import KakaoMap from '../components/KakaoMap.vue'
import { useStampManager } from '../composables/useStampManager'

const isLoading = ref(false)
const stampManager = useStampManager()
const { themeStore } = stampManager

const handleStampAuth = async () => {
  isLoading.value = true
  showToast({ message: '현재 위치를 확인 중입니다...', duration: 1500 })

  const result = await stampManager.authenticateCurrentLocation()

  if (result.success) {
    showSuccessToast(result.message)
  } else if (result.code === 'COOLDOWN' || result.code === 'ALREADY_ACQUIRED') {
    showToast({ message: result.message, duration: 2500 })
  } else {
    showFailToast(result.message)
  }

  isLoading.value = false
}
</script>

<style scoped>
.map-view {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.stamp-btn {
  position: absolute;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}
</style>
