<template>
  <div id="app-container">
    <router-view />
    
    <van-tabbar v-model="active" route>
      <van-tabbar-item replace to="/" icon="location-o">지도</van-tabbar-item>
      <van-tabbar-item replace to="/stamp" icon="award-o">스탬프</van-tabbar-item>
      <van-tabbar-item replace to="/profile" icon="user-o">내 정보</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const active = ref(0)
</script>

<style>
body {
  margin: 0;
  padding: 0;
  overflow: hidden; /* 모바일 앱처럼 스크롤 방지 */
}

#app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
