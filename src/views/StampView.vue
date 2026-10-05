<template>
  <div class="stamp-view">
    <van-nav-bar title="내 스탬프 보관함" fixed placeholder />

    <van-empty 
      v-if="stampStore.acquiredStamps.length === 0" 
      description="아직 획득한 스탬프가 없어요!" 
      image="search"
    >
      <van-button round type="primary" class="bottom-button" @click="$router.push('/')">
        지도에서 인증센터 찾기
      </van-button>
    </van-empty>

    <div v-else class="stamp-list">
      <van-cell-group inset title="획득 내역">
        <van-cell 
          v-for="stamp in stampStore.acquiredStamps" 
          :key="stamp.id" 
          :title="stamp.name" 
          :label="stamp.route"
          icon="award-o"
        >
          <template #right-icon>
            <div class="date-text">
              {{ formatDate(stamp.acquiredAt) }}
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { useStampStore } from '../stores/stamp'

const stampStore = useStampStore()

const formatDate = (isoString) => {
  const date = new Date(isoString)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}
</script>

<style scoped>
.stamp-view {
  width: 100vw;
  height: calc(100vh - 50px);
  background-color: #f7f8fa;
  overflow-y: auto;
}

.stamp-list {
  padding: 10px 0;
}

.bottom-button {
  width: 160px;
  height: 40px;
}

.date-text {
  font-size: 12px;
  color: #969799;
  display: flex;
  align-items: center;
}
</style>
