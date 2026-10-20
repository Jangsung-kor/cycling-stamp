<template>
  <div class="map-wrapper">
    <div id="map" :class="['kakao-map', `theme-${themeStore.bgThemeKey}`]"></div>
    
    <!-- 좌측 상단: 자전거도로 및 보급소(편의점) 퀵 토글 버튼 -->
    <div :class="['supply-control-panel', { 'is-dark': themeStore.bgThemeKey === 'dark' }]">
      <div class="toggle-btn-row">
        <!-- 1. 카카오 공식 자전거 도로망 레이어 토글 버튼 -->
        <button 
          :class="['supply-toggle-btn', { active: isBicycleLayerActive }]"
          @click="toggleBicycleLayer"
          :style="isBicycleLayerActive ? {
            backgroundColor: '#059669',
            borderColor: '#059669',
            color: '#ffffff'
          } : {}"
        >
          <span class="supply-icon">🚲</span>
          <span class="supply-label">자전거길</span>
        </button>

        <!-- 2. 보급소(편의점) 퀵 토글 버튼 -->
        <button 
          :class="['supply-toggle-btn', { active: isStoreFilterActive }]"
          @click="toggleStoreFilter"
          :style="isStoreFilterActive ? {
            backgroundColor: themeStore.currentTheme.main,
            borderColor: themeStore.currentTheme.main,
            color: '#ffffff'
          } : {}"
        >
          <span class="supply-icon">🏪</span>
          <span class="supply-label">편의점</span>
          <span v-if="isStoreFilterActive && storeList.length > 0" class="supply-badge">
            {{ storeList.length }}
          </span>
        </button>

        <!-- 3. 친구 주행 궤적 레이어 퀵 토글 버튼 -->
        <button 
          v-if="gpxStore.friendTracksCount > 0"
          :class="['supply-toggle-btn', { active: isFriendTracksLayerActive }]"
          @click="toggleFriendTracksLayer"
          :style="isFriendTracksLayerActive ? {
            backgroundColor: '#06b6d4',
            borderColor: '#06b6d4',
            color: '#ffffff'
          } : {}"
        >
          <span class="supply-icon">👥</span>
          <span class="supply-label">친구 궤적</span>
          <span class="supply-badge">
            {{ gpxStore.friendTracksCount }}
          </span>
        </button>
      </div>

      <!-- 지도 이동 시 노출되는 '이 지역 재검색' 버튼 -->
      <button 
        v-if="isStoreFilterActive && showRefreshBtn" 
        class="refresh-area-btn" 
        @click="searchConvenienceStores(true)"
      >
        <span>🔄 이 지역 재검색</span>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue' 
import { showToast } from 'vant'
import { useStampManager } from '../composables/useStampManager'
import { useGpxStore } from '../stores/gpx'
import { useKakaoStoreLayer } from '../composables/useKakaoStoreLayer'
import { useKakaoGpxLayer } from '../composables/useKakaoGpxLayer'

const stampManager = useStampManager()
const { stampStore, themeStore, certCenters, getStampSvg: getStampImageUrl } = stampManager
const gpxStore = useGpxStore()

let mapInstance = null
const markerList = []

// 1. 카카오 공식 자전거 도로망(BICYCLE) 오버레이 레이어 상태 (기본 활성화)
const isBicycleLayerActive = ref(true)

const toggleBicycleLayer = () => {
  if (!mapInstance || !window.kakao || !window.kakao.maps.MapTypeId) return
  isBicycleLayerActive.value = !isBicycleLayerActive.value
  if (isBicycleLayerActive.value) {
    mapInstance.addOverlayMapTypeId(window.kakao.maps.MapTypeId.BICYCLE)
    showToast({ message: '🚲 카카오 공식 자전거 도로망을 켰습니다.', duration: 1500 })
  } else {
    mapInstance.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.BICYCLE)
    showToast({ message: '자전거 도로망을 껐습니다.', duration: 1500 })
  }
}

// 2. 보급소(편의점) 검색 레이어 매니저 (퍼사드 추출)
const storeLayer = useKakaoStoreLayer(() => mapInstance)
const {
  isStoreFilterActive,
  storeList,
  showRefreshBtn,
  toggleStoreFilter,
  searchConvenienceStores,
  handleMapMovement
} = storeLayer

// 3. 나만의 주행 기록(GPX 궤적) 레이어 매니저 (퍼사드 추출)
const gpxLayer = useKakaoGpxLayer(() => mapInstance, themeStore, gpxStore)
const {
  isFriendTracksLayerActive,
  renderGpxPolylines,
  updateGpxHoverState,
  updateFriendGpxHoverState,
  toggleFriendTracksLayer,
  zoomToTrack
} = gpxLayer

onMounted(() => {
  if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
    initMap()
    return
  }

  const existingScript = document.getElementById('kakao-map-script')
  if (existingScript) {
    if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
      window.kakao.maps.load(() => initMap())
    }
    return
  }

  const script = document.createElement('script')
  script.id = 'kakao-map-script'
  script.src = '//dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=52a76eb060cfe58c3e0117e4976e11e5&libraries=services,clusterer'
  
  script.onload = () => {
    window.kakao.maps.load(() => {
      initMap()
    })
  }
  
  document.head.appendChild(script)
})

const updateMarkers = () => {
  if (!mapInstance || !window.kakao || !window.kakao.maps.MarkerImage) return

  const inkColor = themeStore.currentTheme.main

  certCenters.forEach(center => {
    const isAcquired = stampStore.hasStamp(center.id)
    const imageUrl = getStampImageUrl(center, isAcquired, inkColor)
    const size = isAcquired ? 40 : 32
    const imageSize = new window.kakao.maps.Size(size, size)
    const markerImage = new window.kakao.maps.MarkerImage(imageUrl, imageSize)
    
    const existing = markerList.find(m => m.id === center.id)
    if (existing) {
      existing.marker.setImage(markerImage)
    }
  })
}

// 스탬프 획득 내역 및 컬러/배경 테마 변경 시 마커와 GPX 궤적 실시간 동기화
watch([
  () => stampStore.acquiredStamps, 
  () => themeStore.stampThemeKey,
  () => themeStore.bgThemeKey
], () => {
  updateMarkers()
  renderGpxPolylines()
}, { deep: true })

// GPX 트랙 목록 변경 시 폴리라인 갱신
watch(() => gpxStore.visibleTracks, () => {
  renderGpxPolylines()
}, { deep: true })

// GPX 호버 상태 실시간 반응 (즉각적인 선 두께 & 투명도 변경)
watch(() => gpxStore.hoveredTrackId, (newId) => {
  updateGpxHoverState(newId)
})

// GPX 선택 상태 실시간 반응 (지도 포커스 줌 & 하이라이트)
watch(() => gpxStore.selectedTrackId, (newId) => {
  updateGpxHoverState(gpxStore.hoveredTrackId)
  if (newId) {
    zoomToTrack(newId)
  }
})

// 친구 GPX 트랙 목록 변경 시 폴리라인 갱신
watch(() => gpxStore.visibleFriendTracks, () => {
  renderGpxPolylines()
}, { deep: true })

// 친구 GPX 호버 상태 실시간 반응 (즉각적인 선 두께 & 투명도 변경)
watch(() => gpxStore.hoveredFriendTrackId, (newId) => {
  updateFriendGpxHoverState(newId)
})

// 친구 GPX 선택 상태 실시간 반응 (지도 포커스 줌 & 하이라이트)
watch(() => gpxStore.selectedFriendTrackId, (newId) => {
  updateFriendGpxHoverState(gpxStore.hoveredFriendTrackId)
  if (newId) {
    zoomToTrack(newId)
  }
})

const initMap = () => {
  const container = document.getElementById('map')
  if (!container || !window.kakao.maps.LatLng) return
  
  const options = {
    center: new window.kakao.maps.LatLng(37.5348, 126.9329), // 여의도 중심
    level: 8
  }
  const map = new window.kakao.maps.Map(container, options)
  mapInstance = map
  window.kakaoMap = map

  // 0. 카카오 공식 자전거 도로망(BICYCLE) 레이어 기본 활성화
  if (isBicycleLayerActive.value && window.kakao.maps.MapTypeId?.BICYCLE) {
    map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.BICYCLE)
  }
  
  // 1. 나만의 주행 기록 (GPX 궤적) 렌더링
  renderGpxPolylines()

  // 2. 인증센터 마커 렌더링
  const inkColor = themeStore.currentTheme.main

  certCenters.forEach(center => {
    const position = new window.kakao.maps.LatLng(center.lat, center.lng)
    const isAcquired = stampStore.hasStamp(center.id)
    const imageUrl = getStampImageUrl(center, isAcquired, inkColor)
    
    const size = isAcquired ? 40 : 32
    const imageSize = new window.kakao.maps.Size(size, size)
    const markerImage = new window.kakao.maps.MarkerImage(imageUrl, imageSize)
    
    const marker = new window.kakao.maps.Marker({
      position: position,
      map: map,
      title: center.name,
      image: markerImage,
      zIndex: 10
    })

    markerList.push({ id: center.id, marker })

    const infowindow = new window.kakao.maps.InfoWindow({
      content: `<div style="padding:5px; font-size:13px; font-weight:bold; color: #333; text-align:center;">${center.name}</div>`
    })

    window.kakao.maps.event.addListener(marker, 'click', () => {
      const stamp = stampStore.getStamp ? stampStore.getStamp(center.id) : null
      const isAcquired = stampStore.hasStamp(center.id)
      const visitSuffix = isAcquired 
        ? ` <span style="display:inline-block; margin-left:4px; font-size:11px; font-weight:800; color:#fff; background:${themeStore.currentTheme.main}; padding:1px 5px; border-radius:4px;">x${stamp?.visitCount || 1}</span>` 
        : ''
      const addressLine = center.address 
        ? `<div style="font-size:11px; color:#64748b; margin-top:3px; font-weight:normal; max-width:200px; white-space:normal; line-height:1.3;">${center.address}</div>` 
        : ''
      const content = `<div style="padding:6px 10px; font-size:13px; font-weight:bold; color: #1e293b; text-align:center;">${center.name}${visitSuffix}${addressLine}</div>`
      infowindow.setContent(content)
      infowindow.open(map, marker)
      setTimeout(() => infowindow.close(), 3000)
    })
  })

  // 3. 지도 이동 및 줌 변경 시 '이 지역 재검색' 버튼 노출 (레이어 매니저 위임)
  window.kakao.maps.event.addListener(map, 'dragend', () => {
    handleMapMovement()
  })

  window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
    handleMapMovement()
  })
}
</script>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.kakao-map {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background-color: #f7f8fa;
  transition: filter 0.3s ease, background-color 0.3s ease;
}

/* 테마별 타일 필터 설정 (마커 제외, 카카오 지도 배경 타일만 타겟팅) */
:deep(.theme-mono img[src*="daumcdn.net"]),
:deep(.theme-mono img[src*="kakaocdn.net"]) {
  filter: grayscale(100%) contrast(85%) brightness(105%);
}

:deep(.theme-soft img[src*="daumcdn.net"]),
:deep(.theme-soft img[src*="kakaocdn.net"]) {
  filter: grayscale(80%) contrast(70%) opacity(90%);
}

.theme-dark {
  background-color: #1a1a1a !important;
}

:deep(.theme-dark img[src*="daumcdn.net"]),
:deep(.theme-dark img[src*="kakaocdn.net"]) {
  filter: invert(95%) hue-rotate(180deg) grayscale(85%) contrast(90%);
}

/* 좌측 상단: 보급소(편의점) 컨트롤 패널 */
.supply-control-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.toggle-btn-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.supply-toggle-btn {
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

.supply-toggle-btn:active {
  transform: scale(0.96);
}

.supply-control-panel.is-dark .supply-toggle-btn:not(.active) {
  background: rgba(30, 41, 59, 0.92);
  color: #f1f5f9;
  border-color: rgba(51, 65, 85, 0.85);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
}

.supply-toggle-btn.active {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.supply-icon {
  font-size: 15px;
}

.supply-label {
  letter-spacing: -0.2px;
}

.supply-badge {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.3);
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 800;
  margin-left: 2px;
}

.refresh-area-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(8px);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 11.5px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  animation: supplyFadeIn 0.22s ease;
  user-select: none;
}

.refresh-area-btn:active {
  transform: scale(0.96);
}

@keyframes supplyFadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
