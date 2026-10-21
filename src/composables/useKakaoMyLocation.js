import { ref } from 'vue'
import { showToast, showFailToast } from 'vant'

/**
 * 카카오맵 '내 위치' 탐색 및 펄스 마커 오버레이 매니저
 * - 고정밀 GPS 기반 현재 위치 획득
 * - 부드러운 지도 카메라 이동(panTo) 및 주행 최적 줌(level 4) 보정
 * - 내 위치 시각화: 블루 펄스 닷(Blue Pulse Dot) CustomOverlay 렌더링
 */
export function useKakaoMyLocation(getMapInstance) {
  const isLocating = ref(false)
  const myLocation = ref(null)

  let locationOverlay = null

  /**
   * 내 위치 마커(CustomOverlay) 생성 또는 업데이트
   */
  const updateLocationOverlay = (map, lat, lng) => {
    if (!map || !window.kakao?.maps?.LatLng || !window.kakao?.maps?.CustomOverlay) return

    const position = new window.kakao.maps.LatLng(lat, lng)

    if (!locationOverlay) {
      const content = document.createElement('div')
      content.className = 'my-location-pulse-marker'
      content.innerHTML = `
        <div class="pulse-ring"></div>
        <div class="dot-core"></div>
      `

      locationOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content,
        zIndex: 32, // 최상단 오버레이로 다른 마커들과 분리
        clickable: false
      })
      locationOverlay.setMap(map)
    } else {
      locationOverlay.setPosition(position)
      locationOverlay.setMap(map)
    }
  }

  /**
   * 내 위치 마커 제거
   */
  const clearLocationMarker = () => {
    if (locationOverlay) {
      locationOverlay.setMap(null)
      locationOverlay = null
    }
  }

  /**
   * 내 현재 위치로 지도 중심 이동 실행
   */
  const moveToMyLocation = () => {
    const map = getMapInstance()
    if (!map) return

    if (!navigator.geolocation) {
      showFailToast('GPS를 지원하지 않는 브라우저입니다.')
      return
    }

    isLocating.value = true

    navigator.geolocation.getCurrentPosition(
      (position) => {
        isLocating.value = false
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const accuracy = position.coords.accuracy

        myLocation.value = { lat, lng, accuracy }

        if (window.kakao?.maps?.LatLng) {
          const latlng = new window.kakao.maps.LatLng(lat, lng)

          // 1. 부드러운 카메라 이동
          if (typeof map.panTo === 'function') {
            map.panTo(latlng)
          } else if (typeof map.setCenter === 'function') {
            map.setCenter(latlng)
          }

          // 2. 광역 뷰(level > 5)인 경우 주행 시야에 적합한 level 4로 자연스럽게 줌인
          if (typeof map.getLevel === 'function' && map.getLevel() > 5) {
            map.setLevel(4)
          }

          // 3. 내 위치 펄스 마커 갱신
          updateLocationOverlay(map, lat, lng)
        }

        showToast({ message: '현재 위치로 이동했습니다.', duration: 1200 })
      },
      (err) => {
        isLocating.value = false
        console.warn('[useKakaoMyLocation] Geolocation error:', err)

        if (err.code === 1) {
          // PERMISSION_DENIED
          showFailToast('위치 권한이 차단되어 있습니다. 브라우저 설정에서 위치를 허용해주세요.')
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          showFailToast('현재 GPS 신호를 수신할 수 없습니다.')
        } else if (err.code === 3) {
          // TIMEOUT
          showFailToast('위치 수신 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')
        } else {
          showFailToast('위치를 확인할 수 없습니다.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    )
  }

  return {
    isLocating,
    myLocation,
    moveToMyLocation,
    clearLocationMarker
  }
}
