<template>
  <div class="map-wrapper">
    <div id="map" :class="['kakao-map', `theme-${themeStore.bgThemeKey}`]"></div>
    
    <!-- 좌측 상단: 자전거도로 및 보급소(편의점) 퀵 토글 버튼 -->
    <div :class="['supply-control-panel', { 'is-dark': themeStore.bgThemeKey === 'dark' }]">
      <div class="toggle-btn-row">

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

        <!-- 3. 숙소(숙박) 퀵 토글 버튼 -->
        <button 
          :class="['supply-toggle-btn', { active: isAccomFilterActive }]"
          @click="toggleAccomFilter"
          :style="isAccomFilterActive ? {
            backgroundColor: '#4f46e5',
            borderColor: '#4f46e5',
            color: '#ffffff'
          } : {}"
        >
          <span class="supply-icon">🏨</span>
          <span class="supply-label">숙소</span>
          <span v-if="isAccomFilterActive && accomList.length > 0" class="supply-badge">
            {{ accomList.length }}
          </span>
        </button>

        <!-- 4. 친구 주행 궤적 레이어 퀵 토글 버튼 -->
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
        v-if="(isStoreFilterActive && showStoreRefreshBtn) || (isAccomFilterActive && showAccomRefreshBtn)" 
        class="refresh-area-btn" 
        @click="handleRefreshArea"
      >
        <span>이 지역 재검색</span>
      </button>
    </div>

    <!-- 우측 하단: 내 위치 바로가기 플로팅 버튼 -->
    <button 
      type="button"
      :class="['my-location-btn', { 'is-loading': isLocating, 'is-dark': themeStore.bgThemeKey === 'dark' }]"
      @click="moveToMyLocation"
      :disabled="isLocating"
      title="내 위치로 이동"
    >
      <svg 
        class="location-icon" 
        viewBox="0 0 24 24" 
        width="20" 
        height="20" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2.2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="7" />
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
      </svg>
    </button>

    <!-- 5. GPX 고도 프로필 차트 (인터랙티브 스크러빙 & 카카오맵 연동) -->
    <ElevationChart />

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue' 
import { showToast } from 'vant'
import { useStampManager } from '../composables/useStampManager'
import { useGpxStore } from '../stores/gpx'
import { useKakaoStoreLayer } from '../composables/useKakaoStoreLayer'
import { useKakaoAccomLayer } from '../composables/useKakaoAccomLayer'
import { useKakaoMyLocation } from '../composables/useKakaoMyLocation'
import { useKakaoGpxLayer } from '../composables/useKakaoGpxLayer'
import ElevationChart from './ElevationChart.vue'

const stampManager = useStampManager()
const { stampStore, themeStore, certCenters, getStampSvg: getStampImageUrl } = stampManager
const gpxStore = useGpxStore()

let mapInstance = null
const markerList = []

// 2. 보급소(편의점) 검색 레이어 매니저 (퍼사드 추출)
const storeLayer = useKakaoStoreLayer(() => mapInstance)
const {
  isStoreFilterActive,
  storeList,
  showRefreshBtn: showStoreRefreshBtn,
  toggleStoreFilter,
  searchConvenienceStores,
  handleMapMovement: handleStoreMapMovement
} = storeLayer

// 3. 숙소(숙박) 검색 레이어 매니저 (퍼사드 추출)
const accomLayer = useKakaoAccomLayer(() => mapInstance)
const {
  isAccomFilterActive,
  accomList,
  showRefreshBtn: showAccomRefreshBtn,
  toggleAccomFilter,
  searchAccommodations,
  handleMapMovement: handleAccomMapMovement
} = accomLayer

const handleRefreshArea = () => {
  if (isStoreFilterActive.value) searchConvenienceStores(true)
  if (isAccomFilterActive.value) searchAccommodations(true)
}

// 3. 나만의 주행 기록(GPX 궤적) 레이어 매니저 (퍼사드 추출)
const gpxLayer = useKakaoGpxLayer(() => mapInstance, themeStore, gpxStore)
const {
  isFriendTracksLayerActive,
  renderGpxPolylines,
  updateGpxHoverState,
  updateFriendGpxHoverState,
  toggleFriendTracksLayer,
  zoomToTrack,
  updateScrubbingMarker,
  clearScrubbingMarker
} = gpxLayer

// 4. 내 위치 바로가기 매니저
const myLocationManager = useKakaoMyLocation(() => mapInstance)
const {
  isLocating,
  moveToMyLocation,
  clearLocationMarker
} = myLocationManager

onUnmounted(() => {
  clearLocationMarker()
  clearScrubbingMarker()
})

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

// GPX 고도 차트 스크러빙 마커 실시간 연동
watch(() => gpxStore.activeScrubbingPoint, (newPoint) => {
  updateScrubbingMarker(newPoint)
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
    handleStoreMapMovement()
    handleAccomMapMovement()
  })

  window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
    handleStoreMapMovement()
    handleAccomMapMovement()
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

/* 우측 하단 내 위치 플로팅 버튼 */
.my-location-btn {
  position: absolute;
  bottom: 74px;
  right: 16px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #1e293b;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
}

.my-location-btn:active {
  transform: scale(0.92);
  background: #f8fafc;
}

.my-location-btn.is-dark {
  background: #27272a;
  border-color: #3f3f46;
  color: #f4f4f5;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
}

.my-location-btn.is-dark:active {
  background: #3f3f46;
}

.my-location-btn.is-loading .location-icon {
  animation: loc-spin 1s infinite linear;
  color: #2563eb;
}

@keyframes loc-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 내 위치 펄스 마커 (카카오맵 CustomOverlay 내부) */
:deep(.my-location-pulse-marker) {
  position: relative;
  width: 24px;
  height: 24px;
  pointer-events: none;
}

:deep(.my-location-pulse-marker .dot-core) {
  position: absolute;
  width: 14px;
  height: 14px;
  top: 5px;
  left: 5px;
  background-color: #2563eb;
  border: 2.5px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  z-index: 2;
}

:deep(.my-location-pulse-marker .pulse-ring) {
  position: absolute;
  width: 32px;
  height: 32px;
  top: -4px;
  left: -4px;
  border-radius: 50%;
  background-color: rgba(37, 99, 235, 0.28);
  animation: my-loc-pulse 2s infinite ease-out;
  z-index: 1;
}

@keyframes my-loc-pulse {
  0% {
    transform: scale(0.5);
    opacity: 0.9;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}
/* GPX 고도 차트 실시간 스크러빙 마커 */
:deep(.gpx-scrubbing-marker) {
  position: relative;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

:deep(.scrubbing-pin-badge) {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.92);
  color: #38bdf8;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid rgba(56, 189, 248, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  pointer-events: none;
}

:deep(.scrubbing-pin-dot) {
  width: 14px;
  height: 14px;
  background-color: #f59e0b;
  border: 2.5px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.85);
  box-sizing: border-box;
}
</style>
