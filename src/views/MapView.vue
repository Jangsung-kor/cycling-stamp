<template>
  <div class="map-view">
    <KakaoMap />
    
    <!-- 스탬프 인증 버튼 (화면 하단 플로팅) -->
    <van-button 
      class="stamp-btn" 
      type="primary" 
      round 
      icon="location-o"
      @click="handleStampAuth"
      :loading="isLoading"
    >
      내 위치 인증 및 스탬프 획득
    </van-button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast, showSuccessToast, showFailToast } from 'vant'
import KakaoMap from '../components/KakaoMap.vue'
import { certCenters } from '../utils/certCenters'
import { calculateDistance } from '../utils/geo'
import { useStampStore } from '../stores/stamp'

const isLoading = ref(false)
const stampStore = useStampStore()

const handleStampAuth = () => {
  if (!navigator.geolocation) {
    showFailToast('GPS를 지원하지 않는 브라우저입니다.')
    return
  }

  isLoading.value = true
  showToast({ message: '현재 위치를 확인 중입니다...', duration: 1500 })

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const userLat = position.coords.latitude
      const userLng = position.coords.longitude
      
      // 내 위치 마커 표시 (옵션 - KakaoMap 컴포넌트에 이벤트로 넘겨서 그릴 수도 있음)
      console.log(`내 위치: ${userLat}, ${userLng}`)

      // 가장 가까운 인증센터 찾기
      let nearestCenter = null
      let minDistance = Infinity

      certCenters.forEach(center => {
        const dist = calculateDistance(userLat, userLng, center.lat, center.lng)
        if (dist < minDistance) {
          minDistance = dist
          nearestCenter = center
        }
      })

      // 반경 50m 이내일 경우 스탬프 획득 처리
      if (nearestCenter && minDistance <= 50) {
        const success = await stampStore.addStamp(nearestCenter)
        if (success) {
          showSuccessToast(`'${nearestCenter.name}' 스탬프를 획득했습니다! 🎉`)
        } else {
          showToast(`'${nearestCenter.name}' 스탬프는 이미 획득했습니다.`)
        }
      } else {
        const distStr = Math.round(minDistance)
        showFailToast(`가장 가까운 인증센터(${nearestCenter.name})와 ${distStr}m 떨어져 있습니다. (50m 이내 접근 필요)`)
      }
      
      isLoading.value = false
    },
    (error) => {
      console.error(error)
      showFailToast('위치 정보를 가져오는데 실패했습니다.')
      isLoading.value = false
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  )
}
</script>

<style scoped>
.map-view {
  width: 100vw;
  height: calc(100vh - 50px);
  position: relative;
}

.stamp-btn {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
</style>
