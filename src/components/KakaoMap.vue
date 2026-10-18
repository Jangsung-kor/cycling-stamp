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

    <!-- 우측 상단: 배경 & 스탬프 테마 통합 컨트롤러 -->
    <div :class="['theme-control-panel', { 'is-dark': themeStore.bgThemeKey === 'dark' }]">
      <!-- 1행: 지도 배경 테마 -->
      <div class="control-row">
        <span class="control-label">배경</span>
        <div class="pill-group">
          <button 
            v-for="t in mapThemes" 
            :key="t.key" 
            :class="['theme-pill', { active: themeStore.bgThemeKey === t.key }]"
            @click="themeStore.setBgTheme(t.key)"
          >
            {{ t.name }}
          </button>
        </div>
      </div>

      <!-- 2행: 스탬프 도장 테마 -->
      <div class="control-row">
        <span class="control-label">도장</span>
        <div class="pill-group">
          <button 
            v-for="st in themeStore.themeList" 
            :key="st.key" 
            :class="['theme-pill', 'stamp-pill', { active: themeStore.stampThemeKey === st.key }]"
            @click="themeStore.setStampTheme(st.key)"
          >
            <span class="stamp-dot" :style="{ backgroundColor: st.main }"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue' 
import { showToast } from 'vant'
import { useStampManager } from '../composables/useStampManager'

const stampManager = useStampManager()
const { stampStore, themeStore, certCenters, getStampSvg: getStampImageUrl, getCourseSegments } = stampManager

let mapInstance = null;
const markerList = [];
let polylineList = [];

// 카카오 공식 자전거 도로망(BICYCLE) 오버레이 레이어 상태 (기본 활성화)
const isBicycleLayerActive = ref(true);

const toggleBicycleLayer = () => {
  if (!mapInstance || !window.kakao || !window.kakao.maps.MapTypeId) return;
  isBicycleLayerActive.value = !isBicycleLayerActive.value;
  if (isBicycleLayerActive.value) {
    mapInstance.addOverlayMapTypeId(window.kakao.maps.MapTypeId.BICYCLE);
    showToast({ message: '🚲 카카오 공식 자전거 도로망을 켰습니다.', duration: 1500 });
  } else {
    mapInstance.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.BICYCLE);
    showToast({ message: '자전거 도로망을 껐습니다.', duration: 1500 });
  }
};

// 보급소(편의점) 검색 및 마커 상태
const isStoreFilterActive = ref(false);
const isSearchingStores = ref(false);
const storeList = ref([]);
const showRefreshBtn = ref(false);
let storeMarkerList = [];
let activeStoreInfoWindow = null;
let placesService = null;

const mapThemes = themeStore.bgThemeList
const courseSegments = getCourseSegments()

onMounted(() => {
  if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
    initMap();
    return;
  }

  const existingScript = document.getElementById('kakao-map-script')
  if (existingScript) {
    if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
      window.kakao.maps.load(() => initMap());
    }
    return;
  }

  const script = document.createElement('script')
  script.id = 'kakao-map-script'
  script.src = '//dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=52a76eb060cfe58c3e0117e4976e11e5&libraries=services,clusterer'
  
  script.onload = () => {
    window.kakao.maps.load(() => {
      initMap();
    });
  }
  
  document.head.appendChild(script)
})

// 인증센터 간 자전거길 코스 경로선(Polyline) 렌더링
const renderPolylines = () => {
  if (!mapInstance || !window.kakao || !window.kakao.maps.Polyline) return;

  // 기존 폴리라인 제거
  polylineList.forEach(item => {
    if (item.polyline) {
      item.polyline.setMap(null);
    }
  });
  polylineList = [];

  // 주행 완료 구간은 사용자가 선택한 스탬프 테마 컬러와 100% 동일하게 연동
  const activeColor = themeStore.currentTheme.main;
  const isDark = themeStore.bgThemeKey === 'dark';
  const inactiveColor = isDark ? '#64748B' : '#94A3B8';

  courseSegments.forEach(seg => {
    const isFromAcquired = stampStore.hasStamp(seg.fromId);
    const isToAcquired = stampStore.hasStamp(seg.toId);
    // 양쪽 인증센터를 모두 획득하면 주행 완료 구간으로 실선 강조
    const isCompleted = isFromAcquired && isToAcquired;

    // 실제 자전거길 도로 굴곡/웨이포인트가 포함된 path 렌더링
    const path = (seg.path && seg.path.length > 0)
      ? seg.path.map(pt => new window.kakao.maps.LatLng(pt.lat, pt.lng))
      : [
          new window.kakao.maps.LatLng(seg.fromCenter.lat, seg.fromCenter.lng),
          new window.kakao.maps.LatLng(seg.toCenter.lat, seg.toCenter.lng)
        ];

    const polyline = new window.kakao.maps.Polyline({
      map: mapInstance,
      path: path,
      strokeWeight: isCompleted ? 5 : 3,
      strokeColor: isCompleted ? activeColor : inactiveColor,
      strokeOpacity: isCompleted ? 0.95 : 0.45,
      strokeStyle: isCompleted ? 'solid' : 'shortdash',
      zIndex: isCompleted ? 2 : 1
    });

    // 경로선 클릭 시 코스 및 주행 완료 상태 안내
    window.kakao.maps.event.addListener(polyline, 'click', () => {
      const statusText = isCompleted ? '🎉 주행 완료 구간' : '🚲 미주행 구간';
      showToast({
        message: `${seg.courseName}\n${seg.fromCenter.name} ↔ ${seg.toCenter.name}\n(${statusText})`,
        duration: 2000
      });
    });

    polylineList.push({
      id: seg.id,
      polyline,
      seg
    });
  });
}

const updateMarkers = () => {
  if (!mapInstance || !window.kakao || !window.kakao.maps.MarkerImage) return;

  const inkColor = themeStore.currentTheme.main;

  certCenters.forEach(center => {
    const isAcquired = stampStore.hasStamp(center.id);
    const imageUrl = getStampImageUrl(center, isAcquired, inkColor);
    const size = isAcquired ? 40 : 32;
    const imageSize = new window.kakao.maps.Size(size, size);
    const markerImage = new window.kakao.maps.MarkerImage(imageUrl, imageSize);
    
    const existing = markerList.find(m => m.id === center.id);
    if (existing) {
      existing.marker.setImage(markerImage);
    }
  });
}

// 스탬프 획득 내역 및 컬러/배경 테마 변경 시 마커와 경로선 즉시 실시간 동기화
watch([
  () => stampStore.acquiredStamps, 
  () => themeStore.stampThemeKey,
  () => themeStore.bgThemeKey
], () => {
  updateMarkers();
  renderPolylines();
}, { deep: true })

const initMap = () => {
  const container = document.getElementById('map')
  if (!container || !window.kakao.maps.LatLng) return;
  
  const options = {
    center: new window.kakao.maps.LatLng(37.5348, 126.9329), // 여의도 중심
    level: 8
  }
  const map = new window.kakao.maps.Map(container, options)
  mapInstance = map;
  window.kakaoMap = map;

  // 0. 카카오 공식 자전거 도로망(BICYCLE) 레이어 기본 활성화
  if (isBicycleLayerActive.value && window.kakao.maps.MapTypeId?.BICYCLE) {
    map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.BICYCLE);
  }
  
  // 1. 자전거길 코스 경로선(Polyline) 렌더링 (마커 아래 레이어)
  renderPolylines();

  // 2. 인증센터 마커 렌더링
  const inkColor = themeStore.currentTheme.main;

  certCenters.forEach(center => {
    const position = new window.kakao.maps.LatLng(center.lat, center.lng);
    const isAcquired = stampStore.hasStamp(center.id);
    const imageUrl = getStampImageUrl(center, isAcquired, inkColor);
    
    // 마커 커스텀 이미지 (획득 40px, 미획득 32px)
    const size = isAcquired ? 40 : 32;
    const imageSize = new window.kakao.maps.Size(size, size);
    const markerImage = new window.kakao.maps.MarkerImage(imageUrl, imageSize);
    
    const marker = new window.kakao.maps.Marker({
      position: position,
      map: map,
      title: center.name,
      image: markerImage,
      zIndex: 10
    });

    markerList.push({ id: center.id, marker });

    const infowindow = new window.kakao.maps.InfoWindow({
      content: `<div style="padding:5px; font-size:13px; font-weight:bold; color: #333; text-align:center;">${center.name}</div>`
    });

    window.kakao.maps.event.addListener(marker, 'click', () => {
      const stamp = stampStore.getStamp ? stampStore.getStamp(center.id) : null;
      const isAcquired = stampStore.hasStamp(center.id);
      const visitSuffix = isAcquired 
        ? ` <span style="display:inline-block; margin-left:4px; font-size:11px; font-weight:800; color:#fff; background:${themeStore.currentTheme.main}; padding:1px 5px; border-radius:4px;">x${stamp?.visitCount || 1}</span>` 
        : '';
      const addressLine = center.address 
        ? `<div style="font-size:11px; color:#64748b; margin-top:3px; font-weight:normal; max-width:200px; white-space:normal; line-height:1.3;">${center.address}</div>` 
        : '';
      const content = `<div style="padding:6px 10px; font-size:13px; font-weight:bold; color: #1e293b; text-align:center;">${center.name}${visitSuffix}${addressLine}</div>`;
      infowindow.setContent(content);
      infowindow.open(map, marker);
      setTimeout(() => infowindow.close(), 3000); // 모바일 편의를 위해 자동 닫힘
    });
  });

  // 3. 지도 이동 및 줌 변경 시 '이 지역 재검색' 버튼 노출
  window.kakao.maps.event.addListener(map, 'dragend', () => {
    if (isStoreFilterActive.value) {
      showRefreshBtn.value = true;
    }
  });

  window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
    if (isStoreFilterActive.value) {
      showRefreshBtn.value = true;
    }
  });
}

// ==================== 보급소(편의점) 검색 및 마커 관리 ====================
const storeMarkerSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
  </filter>
  <circle cx="17" cy="17" r="14" fill="%232563EB" stroke="%23FFFFFF" stroke-width="2.2" filter="url(%23shadow)"/>
  <text x="17" y="22" font-size="15" text-anchor="middle">🏪</text>
</svg>`;

const clearStoreMarkers = () => {
  if (activeStoreInfoWindow) {
    activeStoreInfoWindow.close();
    activeStoreInfoWindow = null;
  }
  storeMarkerList.forEach(m => m.setMap(null));
  storeMarkerList = [];
};

const renderStoreMarkers = (places) => {
  if (!mapInstance || !window.kakao || !window.kakao.maps.Marker) return;

  const imageSize = new window.kakao.maps.Size(34, 34);
  const imageOption = { offset: new window.kakao.maps.Point(17, 17) };
  const markerImage = new window.kakao.maps.MarkerImage(storeMarkerSvg, imageSize, imageOption);

  places.forEach(place => {
    const position = new window.kakao.maps.LatLng(place.y, place.x);
    const marker = new window.kakao.maps.Marker({
      position,
      map: mapInstance,
      title: place.place_name,
      image: markerImage,
      zIndex: 25 // 인증센터 마커보다 위에 노출하여 손쉬운 터치 지원
    });

    const infoContent = `
      <div style="padding:10px 12px; font-family:-apple-system,BlinkMacSystemFont,sans-serif; min-width:190px; max-width:240px; color:#1e293b; line-height:1.4;">
        <div style="display:flex; align-items:center; gap:5px; margin-bottom:4px;">
          <span style="font-size:14px;">🏪</span>
          <strong style="font-size:13px; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${place.place_name}</strong>
        </div>
        <div style="font-size:11px; color:#64748b; margin-bottom:5px; line-height:1.3;">
          ${place.road_address_name || place.address_name}
        </div>
        ${place.phone ? `<div style="font-size:11px; color:#0284c7; margin-bottom:5px;">📞 ${place.phone}</div>` : ''}
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; padding-top:6px; border-top:1px dashed #e2e8f0;">
          <span style="font-size:11px; font-weight:700; color:#2563eb;">${place.distance ? `${place.distance}m` : '보급소'}</span>
          <a href="https://map.kakao.com/link/to/${encodeURIComponent(place.place_name)},${place.y},${place.x}" target="_blank" rel="noopener noreferrer" style="display:inline-block; font-size:11px; font-weight:700; color:#ffffff; background:#2563eb; padding:3px 9px; border-radius:6px; text-decoration:none;">
            길찾기 ↗
          </a>
        </div>
      </div>
    `;

    const infowindow = new window.kakao.maps.InfoWindow({
      content: infoContent,
      removable: true
    });

    window.kakao.maps.event.addListener(marker, 'click', () => {
      if (activeStoreInfoWindow) {
        activeStoreInfoWindow.close();
      }
      infowindow.open(mapInstance, marker);
      activeStoreInfoWindow = infowindow;
    });

    storeMarkerList.push(marker);
  });
};

const searchConvenienceStores = (isManual = false) => {
  if (!mapInstance || !window.kakao || !window.kakao.maps.services) return;
  if (!placesService) {
    placesService = new window.kakao.maps.services.Places();
  }

  isSearchingStores.value = true;
  showRefreshBtn.value = false;

  const center = mapInstance.getCenter();
  const searchRadius = 3000; // 반경 3km

  placesService.categorySearch('CS2', (data, status) => {
    isSearchingStores.value = false;
    clearStoreMarkers();

    if (status === window.kakao.maps.services.Status.OK) {
      storeList.value = data;
      renderStoreMarkers(data);
      if (isManual) {
        showToast({ message: `주변 편의점 ${data.length}곳을 찾았습니다.`, duration: 1500 });
      }
    } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
      storeList.value = [];
      showToast({ message: '반경 3km 내에 편의점이 없습니다.', duration: 1500 });
    } else {
      showToast({ message: '편의점 정보를 불러오지 못했습니다.', duration: 1500 });
    }
  }, {
    location: center,
    radius: searchRadius,
    sort: window.kakao.maps.services.SortBy.DISTANCE
  });
};

const toggleStoreFilter = () => {
  isStoreFilterActive.value = !isStoreFilterActive.value;
  if (isStoreFilterActive.value) {
    showToast({ message: '주변 보급소(편의점)를 검색합니다...', duration: 1000 });
    searchConvenienceStores(true);
  } else {
    clearStoreMarkers();
    storeList.value = [];
    showRefreshBtn.value = false;
  }
};
</script>

<style scoped>
.map-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.kakao-map {
  width: 100%;
  height: 100%;
  transition: background-color 0.3s ease;
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

/* 상단 플로팅 테마 통합 컨트롤 패널 (화면 맨 앞단) */
.theme-control-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
  padding: 8px 10px;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(226, 232, 240, 0.85);
  transition: all 0.3s ease;
}

.theme-control-panel.is-dark {
  background: rgba(30, 41, 59, 0.92);
  border-color: rgba(51, 65, 85, 0.8);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.control-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  min-width: 22px;
}

.theme-control-panel.is-dark .control-label {
  color: #94a3b8;
}

.pill-group {
  display: flex;
  gap: 4px;
}

.theme-pill {
  border: 1px solid transparent;
  background: #f1f5f9;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.theme-control-panel.is-dark .theme-pill {
  background: #334155;
  color: #cbd5e1;
}

.theme-pill.active {
  background: #0f172a;
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.25);
}

.theme-control-panel.is-dark .theme-pill.active {
  background: #f8fafc;
  color: #0f172a;
}

.stamp-pill.active {
  background: #ffffff;
  color: #0f172a;
  border-color: #0f172a;
}

.theme-control-panel.is-dark .stamp-pill.active {
  background: #1e293b;
  color: #f8fafc;
  border-color: #64748b;
}

.stamp-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
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
