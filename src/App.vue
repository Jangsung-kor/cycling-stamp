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
import { ref, onMounted } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './services/firebase'
import { useStampStore } from './stores/stamp'

const active = ref(0)
const stampStore = useStampStore()

onMounted(() => {
  // 앱이 켜질 때 글로벌하게 로그인 상태를 감지하여 스탬프 데이터를 동기화합니다.
  onAuthStateChanged(auth, (user) => {
    if (user) {
      stampStore.fetchUserStamps()
    } else {
      stampStore.acquiredStamps = [] // 로그아웃 시 스탬프 초기화
    }
  })
})
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
