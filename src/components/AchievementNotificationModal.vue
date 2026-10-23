<template>
  <van-dialog
    v-if="isOpen"
    :show="isOpen"
    @update:show="handleClose"
    :title="null"
    :show-cancel-button="false"
    confirm-button-text="확인"
    :confirm-button-color="themeStore.currentTheme.main"
    class="achievement-notice-dialog"
  >
    <div v-if="currentAch" class="notice-body">
      <!-- 티어 인디케이터 태그 -->
      <div class="notice-top">
        <span :class="['notice-tier-tag cycling-tier-tag', currentAch.tier]">
          {{ tiers[currentAch.tier]?.label || currentAch.tier }} 업적 달성
        </span>
      </div>

      <!-- 타이틀 & 설명 -->
      <h3 class="notice-title">{{ currentAch.title }}</h3>
      <p class="notice-desc">{{ currentAch.description }}</p>

      <div class="notice-hint-badge">
        새로운 뱃지가 마이페이지 업적 서랍에 보관되었습니다.
      </div>
    </div>
  </van-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useAchievementManager } from '../composables/useAchievementManager.js'
import { useThemeStore } from '../stores/theme.js'

const themeStore = useThemeStore()
const {
  recentUnlockedQueue,
  tiers,
  popRecentUnlocked
} = useAchievementManager()

const currentAch = computed(() => {
  return recentUnlockedQueue.value[0] || null
})

const isOpen = computed(() => {
  return Boolean(currentAch.value)
})

const handleClose = () => {
  popRecentUnlocked()
}
</script>

<style scoped>
.notice-body {
  padding: 24px 20px 10px;
  text-align: center;
}

.notice-top {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

/* 티어 태그 스타일은 공통 .cycling-tier-tag 활용 (모달 전용 패딩 확장) */
.notice-tier-tag {
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: 20px;
}

.notice-title {
  margin: 0 0 8px;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-main, #0f172a);
}

.notice-desc {
  margin: 0 0 16px;
  font-size: 0.85rem;
  color: var(--text-sub, #64748b);
  line-height: 1.45;
}

.notice-hint-badge {
  font-size: 0.74rem;
  color: var(--text-sub, #94a3b8);
  padding: 8px 12px;
  background-color: var(--app-bg, #f8fafc);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e8f0);
}
</style>
