<template>
  <van-popup
    :show="showRegionListModal"
    @update:show="val => setModal(val)"
    position="bottom"
    round
    closeable
    :style="{ height: '75%', maxHeight: '680px' }"
    class="regions-popup cycling-modal-popup"
  >
    <div class="regions-modal cycling-modal-container">
      <!-- 헤더 -->
      <div class="modal-header cycling-modal-header">
        <h3 class="modal-title cycling-modal-title">정복한 행정구역</h3>
        <p class="modal-subtitle cycling-modal-subtitle">
          전국 250개 시·군·구 중 <span class="highlight tabular-nums">{{ stats.conqueredCount }}곳</span>을 직접 달렸습니다.
        </p>

        <!-- 프로그레스 요약 바 -->
        <div class="progress-bar-wrap">
          <div class="progress-bar-track cycling-progress-track">
            <div 
              class="progress-bar-fill cycling-progress-fill" 
              :style="{ width: `${stats.regionRate}%`, backgroundColor: themeStore.currentTheme.main }"
            ></div>
          </div>
          <div class="progress-label tabular-nums">
            전국 정복률 {{ stats.regionRate }}% (탐험 면적 {{ stats.explorationRate }}%)
          </div>
        </div>
      </div>

      <!-- 시도별 정복 지역 목록 -->
      <div class="modal-body cycling-modal-body">
        <div v-if="groupedConqueredRegions.length > 0" class="province-group-list">
          <div 
            v-for="grp in groupedConqueredRegions" 
            :key="grp.province" 
            class="province-group-card"
          >
            <div class="province-header">
              <span class="province-name">{{ grp.province }}</span>
              <span class="province-count tabular-nums">{{ grp.regions.length }}개 지역 정복</span>
            </div>
            
            <div class="region-chips-grid">
              <span 
                v-for="reg in grp.regions" 
                :key="reg.id" 
                class="region-chip cycling-chip"
                :style="{ borderColor: themeStore.currentTheme.main, color: themeStore.currentTheme.main }"
              >
                {{ reg.name }}
              </span>
            </div>
          </div>
        </div>

        <!-- 미정복 상태 안내 -->
        <div v-else class="empty-state cycling-empty-state">
          <p class="empty-title cycling-empty-title">아직 정복한 지역이 없습니다.</p>
          <p class="empty-sub cycling-empty-desc">GPX 트랙을 업로드하고 지도를 달려 전국을 개척해보세요.</p>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { computed } from 'vue'
import { useExplorationManager } from '../composables/useExplorationManager.js'
import { useThemeStore } from '../stores/theme.js'

const themeStore = useThemeStore()
const {
  stats,
  showRegionListModal,
  closeRegionList
} = useExplorationManager()

const setModal = (val) => {
  if (!val) closeRegionList()
}

// 시도별 정복 시군구 그룹핑 (서울: [마포구, ...], 경기: [양평군, ...])
const groupedConqueredRegions = computed(() => {
  const map = {}
  stats.value.conqueredRegions.forEach(reg => {
    if (!map[reg.province]) {
      map[reg.province] = []
    }
    map[reg.province].push(reg)
  })

  return Object.keys(map).map(prov => ({
    province: prov,
    regions: map[prov]
  }))
})
</script>

<style scoped>
.modal-subtitle {
  margin-bottom: 10px;
}

.highlight {
  font-weight: 800;
  color: var(--text-main, #0f172a);
}

.progress-bar-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 프로그레스 바는 공통 .cycling-progress-track / fill 활용 */

.progress-label {
  font-size: 0.72rem;
  color: var(--text-sub, #94a3b8);
  text-align: right;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.province-group-card {
  padding: 12px;
  background-color: var(--app-bg, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  text-align: left;
  margin-bottom: 10px;
}

.province-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.province-name {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text-main, #0f172a);
}

.province-count {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-sub, #64748b);
}

.region-chips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.region-chip {
  padding: 4px 9px;
  background-color: var(--card-bg, #ffffff);
}

/* 빈 상태는 공통 .cycling-empty-state 활용 */
</style>
