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

    <!-- 스탬프 획득 & 쿨다운 축하 애니메이션 모달 -->
    <StampCelebrationModal
      v-model:show="modalShow"
      :type="modalType"
      :center="modalCenter"
      :visit-count="modalVisitCount"
      :course-name="modalCourseName"
      :remaining-time-text="modalRemainingTime"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast, showFailToast } from 'vant'
import KakaoMap from '../components/KakaoMap.vue'
import StampCelebrationModal from '../components/StampCelebrationModal.vue'
import { useStampManager } from '../composables/useStampManager'

const isLoading = ref(false)
const stampManager = useStampManager()
const { themeStore } = stampManager

// 모달 제어 상태
const modalShow = ref(false)
const modalType = ref('first') // 'first' | 'revisit' | 'course_complete' | 'cooldown'
const modalCenter = ref({})
const modalVisitCount = ref(1)
const modalCourseName = ref('')
const modalRemainingTime = ref('')

// 실제 GPS 인증 핸들러
const handleStampAuth = async () => {
  isLoading.value = true
  showToast({ message: '현재 위치를 확인 중입니다...', duration: 1500 })

  const result = await stampManager.authenticateCurrentLocation()

  if (result.success) {
    modalCenter.value = result.center
    modalVisitCount.value = result.visitCount || 1
    modalType.value = result.code === 'RE_ACQUIRED' ? 'revisit' : 'first'
    modalShow.value = true
  } else if (result.code === 'COOLDOWN' || result.code === 'ALREADY_ACQUIRED') {
    modalCenter.value = result.center
    modalVisitCount.value = result.visitCount || 1
    modalRemainingTime.value = result.remainingHours ? `약 ${result.remainingHours}시간 남음` : '약 24시간 남음'
    modalType.value = 'cooldown'
    modalShow.value = true
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
