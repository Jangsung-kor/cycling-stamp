<template>
  <div class="map-view">
    <KakaoMap />

    <!-- 우측 상단: 나만의 주행(GPX 색칠 지도) 열기 플로팅 버튼 -->
    <button 
      :class="['gpx-floating-trigger', { 'is-dark': themeStore.bgThemeKey === 'dark' }]"
      @click="showGpxDrawer = true"
      :style="totalTracksCount > 0 ? {
        borderColor: themeStore.currentTheme.main,
        boxShadow: `0 4px 14px ${themeStore.currentTheme.main}30`
      } : {}"
    >
      <span class="trigger-icon">🗺️</span>
      <span class="trigger-text">나만의 주행</span>
      <span 
        v-if="totalTracksCount > 0" 
        class="trigger-badge" 
        :style="{ backgroundColor: themeStore.currentTheme.main }"
      >
        {{ totalTracksCount }}
      </span>
    </button>

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

    <!-- 나만의 주행 기록 GPX 서랍 (바텀 시트) -->
    <GpxDrawer v-model:show="showGpxDrawer" />

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
import GpxDrawer from '../components/GpxDrawer.vue'
import { useStampManager } from '../composables/useStampManager'
import { useGpxManager } from '../composables/useGpxManager'

const isLoading = ref(false)
const stampManager = useStampManager()
const { themeStore } = stampManager
const gpxManager = useGpxManager()
const { totalTracksCount } = gpxManager

const showGpxDrawer = ref(false)

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

/* 우측 상단 나만의 주행 플로팅 버튼 */
.gpx-floating-trigger {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 7px 13px;
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  font-size: 12.5px;
  font-weight: 700;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
}

.gpx-floating-trigger:active {
  transform: scale(0.96);
}

.gpx-floating-trigger.is-dark {
  background: rgba(30, 41, 59, 0.92);
  color: #f1f5f9;
  border-color: rgba(51, 65, 85, 0.85);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
}

.trigger-icon {
  font-size: 14px;
}

.trigger-text {
  letter-spacing: -0.2px;
}

.trigger-badge {
  color: #ffffff;
  font-size: 10.5px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.3;
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
