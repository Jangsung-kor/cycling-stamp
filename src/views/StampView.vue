<template>
  <div class="stamp-view">
    <van-nav-bar title="국토종주 스탬프 수첩" fixed placeholder />

    <!-- 상단 종합 현황 카드 -->
    <div class="summary-card">
      <div class="summary-header">
        <div class="summary-title">종주 달성 현황</div>
        <div class="summary-badge">
          <span class="count-highlight" :style="{ color: themeStore.currentTheme.main }">
            {{ acquiredCount }}
          </span> / {{ totalCount }} 완료
          <span v-if="totalVisitCount > 0" class="total-visit-pill" :style="{ color: themeStore.currentTheme.main }">
            (총 {{ totalVisitCount }}회)
          </span>
        </div>
      </div>
      
      <van-progress 
        :percentage="progressRate" 
        stroke-width="8" 
        :color="themeStore.currentTheme.gradient" 
        :track-color="themeStore.isDark ? '#27272a' : '#f0f2f5'"
      />
      
      <div class="summary-footer">
        <span class="rate-text">전체 달성률: <strong>{{ progressRate }}%</strong></span>
        <span class="cheer-text" :style="{ color: themeStore.currentTheme.main }">{{ cheerMessage }}</span>
      </div>
    </div>

    <!-- 코스별 필터 탭 -->
    <van-tabs 
      v-model:active="activeTab" 
      class="route-tabs" 
      line-width="24px" 
      shrink
      :color="themeStore.currentTheme.main"
    >
      <van-tab v-for="tab in tabList" :key="tab" :title="tab" :name="tab" />
    </van-tabs>

    <!-- 스탬프 그리드 뷰 (여권 도장 스타일) -->
    <div class="stamp-grid">
      <div 
        v-for="center in filteredCenters" 
        :key="center.id" 
        :class="['stamp-slot', { acquired: center.isAcquired }]"
        :style="center.isAcquired ? { 
          borderColor: themeStore.isDark ? themeStore.currentTheme.cardBorderDark : themeStore.currentTheme.cardBorderLight, 
          backgroundColor: themeStore.isDark ? themeStore.currentTheme.cardBgDark : themeStore.currentTheme.cardBgLight,
          boxShadow: `0 2px 10px ${themeStore.currentTheme.cardShadow}`
        } : {
          backgroundColor: themeStore.isDark ? '#1a1a1a' : '#ffffff',
          borderColor: themeStore.isDark ? '#2a2a2a' : '#e2e8f0'
        }"
        @click="showDetail(center)"
      >
        <!-- 도장 프레임 & 그래픽 -->
        <div class="seal-container">
          <!-- xN 배지 (1회 이상 달성 시 우측 상단 표시) -->
          <span 
            v-if="center.isAcquired" 
            class="visit-badge" 
            :style="{ 
              backgroundColor: themeStore.currentTheme.main,
              boxShadow: `0 2px 6px ${themeStore.currentTheme.cardShadow}`
            }"
          >
            x{{ center.visitCount || 1 }}
          </span>

          <img 
            :src="getStampImageUrl(center, center.isAcquired, themeStore.currentTheme.main)" 
            :alt="center.name" 
            :class="['seal-image', { 'seal-stamped': center.isAcquired }]" 
            :style="center.isAcquired ? { filter: `drop-shadow(0 2px 5px ${themeStore.currentTheme.sealShadow})` } : {}"
          />
          <div v-if="!center.isAcquired" class="lock-overlay" :style="themeStore.isDark ? { background: '#262626', borderColor: '#404040' } : {}">
            <van-icon name="lock" size="13" :color="themeStore.isDark ? '#737373' : '#aaa'" />
          </div>
        </div>

        <!-- 텍스트 정보 (확대된 폰트 사이즈 적용) -->
        <div class="slot-info">
          <div class="center-name" :style="themeStore.isDark ? { color: '#e2e8f0' } : {}">{{ center.name }}</div>
          <div 
            v-if="center.isAcquired" 
            class="acquired-time"
            :style="{ color: themeStore.currentTheme.main }"
          >
            {{ formatDate(center.acquiredAt) }}
          </div>
          <div v-else class="unacquired-label" :style="themeStore.isDark ? { color: '#71717a' } : {}">
            미방문
          </div>
        </div>
      </div>
    </div>

    <!-- 스탬프 상세 팝업 -->
    <van-dialog 
      v-model:show="isDetailOpen" 
      :title="selectedCenter?.name" 
      show-cancel-button 
      cancel-button-text="닫기" 
      confirm-button-text="지도에서 보기" 
      :confirm-button-color="themeStore.currentTheme.main"
      @confirm="goToMap"
    >
      <div v-if="selectedCenter" class="dialog-content">
        <div class="dialog-seal">
          <img :src="getStampImageUrl(selectedCenter, selectedCenter.isAcquired, themeStore.currentTheme.main)" width="88" height="88" />
        </div>
        <div class="dialog-desc">
          <p><strong>소속 코스:</strong> {{ selectedCenter.route }}</p>
          <p>
            <strong>인증 상태:</strong> 
            <span :style="{ color: selectedCenter.isAcquired ? themeStore.currentTheme.main : '#999', fontWeight: 'bold' }">
              {{ selectedCenter.isAcquired ? `인증 완료 (x${selectedCenter.visitCount || 1})` : '미방문 🔒' }}
            </span>
          </p>

          <!-- 방문 이력 타임라인 (1회 달성 시에도 표시) -->
          <div v-if="selectedCenter.isAcquired" class="history-box">
            <div class="history-title"><strong>방문 이력 (총 {{ selectedCenter.visitCount || 1 }}회)</strong></div>
            <div class="history-list">
              <div 
                v-for="(h, idx) in (selectedCenter.history && selectedCenter.history.length > 0 ? selectedCenter.history : [{ round: 1, acquiredAt: selectedCenter.acquiredAt }])" 
                :key="idx" 
                class="history-item"
              >
                <span class="badge-mini" :style="{ backgroundColor: themeStore.currentTheme.main }">x{{ h.round || idx + 1 }}</span>
                <span class="history-date">{{ formatDate(h.acquiredAt) }}</span>
              </div>
            </div>
          </div>
          <p v-else-if="selectedCenter.isAcquired">
            <strong>획득 일시:</strong> {{ formatDate(selectedCenter.acquiredAt) }}
          </p>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStampManager } from '../composables/useStampManager'

const router = useRouter()
const stampManager = useStampManager()

const {
  themeStore,
  totalCount,
  acquiredCount,
  totalVisitCount,
  progressRate,
  cheerMessage,
  formatStampDate: formatDate,
  getStampSvg: getStampImageUrl,
  filterCentersByRoute
} = stampManager

// 탭 필터 목록
const activeTab = ref('전체')
const tabList = [
  '전체',
  '아라자전거길',
  '한강(서울)',
  '남한강자전거길',
  '북한강자전거길',
  '새재자전거길',
  '낙동강종주자전거길',
  '금강종주자전거길',
  '영산강종주자전거길'
]

// 상세 모달 상태
const isDetailOpen = ref(false)
const selectedCenter = ref(null)

// 탭 필터링 (매니저 위임)
const filteredCenters = computed(() => filterCentersByRoute(activeTab.value))

const showDetail = (center) => {
  selectedCenter.value = center
  isDetailOpen.value = true
}

const goToMap = () => {
  isDetailOpen.value = false
  router.push('/')
}
</script>

<style scoped>
.stamp-view {
  width: 100%;
  max-width: 100%;
  min-height: 100%;
  background-color: var(--app-bg, #f6f7f9);
  padding-bottom: 30px;
  box-sizing: border-box;
  overflow-x: hidden;
  transition: background-color 0.3s ease;
}

/* 상단 통계 카드 */
.summary-card {
  margin: 12px 16px;
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  padding: 16px 18px;
  box-sizing: border-box;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color, transparent);
  transition: all 0.3s ease;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.summary-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main, #1f2937);
}

.summary-badge {
  font-size: 13px;
  color: var(--text-sub, #6b7280);
  background: var(--app-bg, #f3f4f6);
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid var(--border-color, transparent);
}

.count-highlight {
  font-weight: 800;
}

.summary-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-sub, #6b7280);
}

.rate-text strong {
  color: var(--text-main, #1f2937);
  font-size: 13px;
}

.cheer-text {
  font-weight: 700;
}

/* 탭 바 */
.route-tabs {
  margin-bottom: 10px;
  background: var(--card-bg, #ffffff);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

:deep(.van-tabs__nav) {
  background-color: var(--card-bg, #ffffff) !important;
}

:deep(.van-tab) {
  color: var(--text-sub, #64748b);
}

:deep(.van-tab--active) {
  color: var(--text-main, #0f172a);
  font-weight: 700;
}

/* 스탬프 그리드: 모바일 너비 초과 방지 minmax(0, 1fr) 필수 적용 */
.stamp-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 0 16px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.stamp-slot {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 14px;
  padding: 12px 6px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border: 1px dashed var(--border-color, #e2e8f0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
  min-height: 132px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.stamp-slot:active {
  transform: scale(0.97);
}

.seal-container {
  position: relative;
  width: 64px;
  height: 64px;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.seal-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 획득 도장은 손으로 쾅 찍은 듯한 아날로그 틸트 효과 */
.seal-stamped {
  transform: rotate(-3deg);
}

.lock-overlay {
  position: absolute;
  bottom: 0;
  right: 0;
  background: #f1f5f9;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #cbd5e1;
}

.slot-info {
  margin-top: 8px;
  text-align: center;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

/* 텍스트 줄임표 처리로 가로폭 확장 완벽 차단 */
.center-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-main, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  max-width: 100%;
  display: block;
  box-sizing: border-box;
  padding: 0 2px;
}

/* 텍스트 크기 확대 적용: 9px -> 10px */
.acquired-time {
  font-size: 10px;
  font-weight: 700;
  margin-top: 3px;
}

.unacquired-label {
  font-size: 10px;
  color: var(--text-sub, #94a3b8);
  margin-top: 3px;
}

/* 다이얼로그 */
.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 20px 8px;
}

.dialog-seal {
  margin-bottom: 12px;
}

.dialog-desc {
  width: 100%;
  font-size: 13px;
  color: var(--text-main, #4b5563);
  line-height: 1.6;
}

.dialog-desc p {
  margin: 4px 0;
}

/* N회차 콤팩트 배지 (x2, x3...) */
.visit-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  z-index: 3;
  font-size: 10px;
  font-weight: 800;
  color: #ffffff;
  padding: 1px 6px;
  border-radius: 10px;
  letter-spacing: -0.2px;
  line-height: 1.4;
  border: 1.5px solid #ffffff;
}

.total-visit-pill {
  font-size: 11px;
  font-weight: 700;
  margin-left: 4px;
}

/* 상세 팝업 방문 이력 타임라인 */
.history-box {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-color, #e2e8f0);
}

.history-title {
  font-size: 12px;
  margin-bottom: 6px;
  color: var(--text-main, #334155);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 120px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  background: var(--app-bg, #f8fafc);
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.badge-mini {
  font-size: 10px;
  font-weight: 800;
  color: #ffffff;
  padding: 1px 5px;
  border-radius: 4px;
}

.history-date {
  color: var(--text-main, #334155);
  font-weight: 600;
}
</style>
