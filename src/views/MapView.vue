<template>
  <div class="map-view">
    <KakaoMap />
  </div>
</template>

<script setup>
import KakaoMap from '../components/KakaoMap.vue'
</script>

<style scoped>
.map-view {
  width: 100vw;
  /* 하단 탭바 높이(약 50px)를 제외한 전체 높이 */
  height: calc(100vh - 50px); 
}
</style>
