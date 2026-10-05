<template>
  <div id="map" class="kakao-map"></div>
</template>

<script setup>
import { onMounted, watch } from 'vue' 
import { useStampStore } from '../stores/stamp'
import { certCenters, getStampImageUrl } from '../utils/certCenters'

const stampStore = useStampStore()
let mapInstance = null;
const markerList = [];

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

const updateMarkers = () => {
  if (!mapInstance || !window.kakao || !window.kakao.maps.MarkerImage) return;

  certCenters.forEach(center => {
    const isAcquired = stampStore.hasStamp(center.id);
    const imageUrl = getStampImageUrl(center, isAcquired);
    const imageSize = new window.kakao.maps.Size(36, 36);
    const markerImage = new window.kakao.maps.MarkerImage(imageUrl, imageSize);
    
    const existing = markerList.find(m => m.id === center.id);
    if (existing) {
      existing.marker.setImage(markerImage);
    }
  });
}

// 스탬프 획득 내역이 변경될 때마다 마커 이미지 업데이트
watch(() => stampStore.acquiredStamps, () => {
  updateMarkers();
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
  
  certCenters.forEach(center => {
    const position = new window.kakao.maps.LatLng(center.lat, center.lng);
    const isAcquired = stampStore.hasStamp(center.id);
    const imageUrl = getStampImageUrl(center, isAcquired);
    
    // 마커 커스텀 이미지 (실제 앱처럼 둥근 스탬프 느낌)
    const imageSize = new window.kakao.maps.Size(36, 36);
    const markerImage = new window.kakao.maps.MarkerImage(imageUrl, imageSize);
    
    const marker = new window.kakao.maps.Marker({
      position: position,
      map: map,
      title: center.name,
      image: markerImage
    });

    markerList.push({ id: center.id, marker });

    const infowindow = new window.kakao.maps.InfoWindow({
      content: `<div style="padding:5px; font-size:13px; font-weight:bold; color: #333; text-align:center;">${center.name}</div>`
    });

    window.kakao.maps.event.addListener(marker, 'click', () => {
      infowindow.open(map, marker);
      setTimeout(() => infowindow.close(), 2500); // 모바일 편의를 위해 자동 닫힘
    });
  });
}
</script>

<style scoped>
.kakao-map {
  width: 100%;
  height: 100%;
}
</style>
