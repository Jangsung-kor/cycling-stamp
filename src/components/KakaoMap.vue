<template>
  <div id="map" class="kakao-map"></div>
</template>

<script setup>
import { onMounted } from 'vue' 

onMounted(() => {
  // 이미 카카오맵 모듈(Map, LatLng)이 완전히 로드된 경우 (HMR 등)
  if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
    console.log('카카오맵 API 이미 완전히 로드됨');
    initMap();
    return;
  }

  // 스크립트 태그가 이미 존재하지만 모듈 로드가 안 끝난 경우
  const existingScript = document.getElementById('kakao-map-script')
  if (existingScript) {
    if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
      window.kakao.maps.load(() => initMap());
    }
    return;
  }

  console.log('카카오맵 API 동적 로드 시작');
  const script = document.createElement('script')
  script.id = 'kakao-map-script'
  script.src = '//dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=52a76eb060cfe58c3e0117e4976e11e5&libraries=services,clusterer'
  
  script.onload = () => {
    console.log('스크립트 로드 완료, 맵 초기화 시작');
    window.kakao.maps.load(() => {
      initMap();
    });
  }

  script.onerror = (err) => {
    console.error('카카오맵 스크립트 로드 실패!', err);
  }
  
  document.head.appendChild(script)
})

import { certCenters } from '../utils/certCenters'

const initMap = () => {
  const container = document.getElementById('map')
  if (!container) {
    console.error('맵 컨테이너(id="map")를 찾을 수 없습니다.');
    return;
  }
  
  if (!window.kakao.maps.LatLng) {
    console.error('카카오맵 모듈이 제대로 로드되지 않았습니다.');
    return;
  }
  
  const options = {
    // 여의도를 중심으로 기본 렌더링
    center: new window.kakao.maps.LatLng(37.5348, 126.9329),
    level: 7
  }
  const map = new window.kakao.maps.Map(container, options)
  window.kakaoMap = map;
  
  // 마커 렌더링
  certCenters.forEach(center => {
    const position = new window.kakao.maps.LatLng(center.lat, center.lng);
    
    // 마커 생성
    const marker = new window.kakao.maps.Marker({
      position: position,
      map: map,
      title: center.name
    });

    // 마커 클릭 시 정보창(인포윈도우) 표시
    const infowindow = new window.kakao.maps.InfoWindow({
      content: `<div style="padding:5px; font-size:12px;">${center.name}</div>`
    });

    window.kakao.maps.event.addListener(marker, 'click', () => {
      infowindow.open(map, marker);
    });
  });

  console.log('지도 및 마커 렌더링 성공!');
}
</script>

<style scoped>
.kakao-map {
  width: 100%;
  height: 100%;
}
</style>
