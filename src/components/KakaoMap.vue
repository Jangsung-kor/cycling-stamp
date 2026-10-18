<template>
  <div class="map-wrapper">
    <div id="map" :class="['kakao-map', `theme-${themeStore.bgThemeKey}`]"></div>
    
    <!-- 화면 맨 앞단: 배경 & 스탬프 테마 통합 컨트롤러 -->
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
            {{ st.shortName }}
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

    const path = [
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
      const content = `<div style="padding:6px 10px; font-size:13px; font-weight:bold; color: #1e293b; text-align:center; white-space:nowrap;">${center.name}${visitSuffix}</div>`;
      infowindow.setContent(content);
      infowindow.open(map, marker);
      setTimeout(() => infowindow.close(), 2500); // 모바일 편의를 위해 자동 닫힘
    });
  });
}
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
</style>
