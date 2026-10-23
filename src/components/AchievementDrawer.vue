<template>
  <van-popup
    :show="show"
    @update:show="val => $emit('update:show', val)"
    position="bottom"
    round
    closeable
    :style="{ height: '84%', maxHeight: '760px' }"
    class="achievement-popup cycling-modal-popup"
  >
    <div class="achievement-drawer cycling-modal-container">
      <!-- 헤더 -->
      <div class="drawer-header cycling-modal-header">
        <h3 class="drawer-title cycling-modal-title">종주 뱃지</h3>
        <p class="drawer-subtitle cycling-modal-subtitle">13개 개별 코스부터 4대강·국토종주, 국토완주까지 공식 뱃지를 수집하세요.</p>
        
        <!-- 달성 요약 카드 -->
        <div class="summary-card">
          <div class="summary-top">
            <span class="summary-label">전체 종주 현황</span>
            <span class="summary-score tabular-nums">
              {{ summary.unlockedCount }} / {{ summary.totalCount }}개 완주 ({{ summary.percentage }}%)
            </span>
          </div>

          <!-- 등급별 뱃지 카운트 -->
          <div class="tier-counts-row tabular-nums">
            <div class="tier-badge-pill bronze">
              <span class="pill-dot"></span>
              <span class="pill-name">브론즈</span>
              <span class="pill-num">{{ summary.tierCounts.bronze }}</span>
            </div>
            <div class="tier-badge-pill silver">
              <span class="pill-dot"></span>
              <span class="pill-name">실버</span>
              <span class="pill-num">{{ summary.tierCounts.silver }}</span>
            </div>
            <div class="tier-badge-pill gold">
              <span class="pill-dot"></span>
              <span class="pill-name">골드</span>
              <span class="pill-num">{{ summary.tierCounts.gold }}</span>
            </div>
            <div class="tier-badge-pill titanium">
              <span class="pill-dot"></span>
              <span class="pill-name">티타늄</span>
              <span class="pill-num">{{ summary.tierCounts.titanium }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 카테고리 세그먼트 필터 바 -->
      <div class="category-filter-bar no-scrollbar">
        <button
          v-for="cat in Object.values(categories)"
          :key="cat.id"
          type="button"
          :class="['category-tab-btn', { active: selectedCategory === cat.id }]"
          :style="selectedCategory === cat.id ? { borderColor: themeStore.currentTheme.main, color: themeStore.currentTheme.main } : {}"
          @click="setCategory(cat.id)"
        >
          {{ cat.label }} ({{ summary.totalCount }})
        </button>
      </div>

      <!-- 업적 목록 카드 그리드 -->
      <div class="drawer-body cycling-modal-body">
        <div 
          v-for="item in filteredAchievements" 
          :key="item.id" 
          :class="[
            'achievement-card',
            item.tier,
            {
              'status-idle': item.progress === 0 && !item.unlocked,
              'status-progress': item.progress > 0 && !item.unlocked,
              'status-unlocked': item.unlocked
            }
          ]"
          :style="getCardStyle(item)"
        >
          <div class="card-top">
            <div class="card-top-left">
              <span class="category-chip cycling-chip">종주</span>
              <!-- 등급 뱃지 태그 -->
              <span :class="['tier-tag cycling-tier-tag', item.tier]">
                {{ tiers[item.tier]?.label || item.tier }}
              </span>
            </div>
            
            <!-- 상태 인디케이터 (달성 완료 vs 진행 중) -->
            <span 
              v-if="item.unlocked" 
              class="status-badge unlocked" 
              :style="{ color: getStatusTextColor(item) }"
            >
              달성 완료
            </span>
            <span v-else class="status-badge locked tabular-nums">
              진행 중 <span v-if="item.progress > 0" class="progress-num" :style="{ color: getProgressNumberColor(item) }">{{ item.progress }}%</span><span v-else>0%</span>
            </span>
          </div>

          <!-- 타이틀 & 설명 -->
          <h4 class="card-title">{{ item.title }}</h4>
          <p class="card-desc">{{ item.description }}</p>

          <!-- 미달성 시 힌트 & 프로그레스 바 -->
          <div v-if="!item.unlocked" class="progress-box">
            <div class="hint-text">{{ item.hint }}</div>
            <div class="progress-track cycling-progress-track">
              <div 
                class="progress-fill cycling-progress-fill" 
                :style="{ width: `${item.progress}%`, backgroundColor: tiers[item.tier]?.color || '#94a3b8' }"
              ></div>
            </div>
          </div>

          <!-- 달성 완료 시 달성 일자 -->
          <div v-else class="unlocked-footer tabular-nums">
            <span class="footer-label">달성 일시:</span>
            <span class="footer-val">{{ formatCardDate(item.unlockedAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { watch } from 'vue'
import { useAchievementManager } from '../composables/useAchievementManager.js'
import { useThemeStore } from '../stores/theme.js'
import { useStampStore } from '../stores/stamp.js'
import { useGpxStore } from '../stores/gpx.js'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:show'])

const themeStore = useThemeStore()
const stampStore = useStampStore()
const gpxStore = useGpxStore()

const {
  filteredAchievements,
  selectedCategory,
  categories,
  tiers,
  summary,
  setCategory,
  checkAchievements
} = useAchievementManager()

// 서랍이 열릴 때 최신 스탬프 및 트랙을 바탕으로 업적 즉각 재평가
watch(() => props.show, (isOpen) => {
  if (isOpen) {
    const safeTracks = gpxStore.tracks || []
    const safeStamps = stampStore.acquiredStamps || []
    checkAchievements(safeTracks, safeStamps)
  }
}, { immediate: true })

// 날짜 포맷팅 헬퍼 (YYYY.MM.DD)
const formatCardDate = (isoStr) => {
  if (!isoStr) return '달성 완료'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return '달성 완료'
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// 티어별 RGB 기본값 정의 (반투명 틴트 계산용)
const TIER_RGB = {
  bronze: '205, 127, 50',
  silver: '148, 163, 184',
  gold: '234, 179, 8',
  titanium: '14, 165, 233'
}

/**
 * 진행률(1% -> 100%)에 비례하여 테두리와 배경색이 서서히 스며드는 동적 스타일
 */
const getCardStyle = (item) => {
  const rgb = TIER_RGB[item.tier] || '148, 163, 184'

  if (item.unlocked) {
    // 100% 달성 완료: 티어 컬러 테두리 + 테마 적응형 반투명 틴트(15%) + 소프트 글로우
    return {
      borderColor: `rgb(${rgb})`,
      borderWidth: '1.5px',
      backgroundColor: 'var(--card-bg, #ffffff)',
      backgroundImage: `linear-gradient(135deg, rgba(${rgb}, 0.15) 0%, rgba(${rgb}, 0.05) 100%)`,
      boxShadow: `0 4px 16px rgba(${rgb}, 0.15)`
    }
  }

  if (item.progress > 0) {
    // 1% ~ 99% 진행 중: 진행률에 비례하여 테두리 진하기와 배경 틴트가 서서히 스며듦
    const ratio = Math.min(Math.max(item.progress / 100, 0.01), 0.99)
    // 테두리 불투명도: 0.40(1%) -> 0.95(99%)
    const borderAlpha = (0.40 + ratio * 0.55).toFixed(2)
    // 배경 시작 틴트: 0.02(1%) -> 0.10(99%)
    const bgAlphaStart = (0.02 + ratio * 0.08).toFixed(3)
    // 배경 끝 틴트: 0.005(1%) -> 0.035(99%)
    const bgAlphaEnd = (ratio * 0.035).toFixed(3)

    return {
      borderColor: `rgba(${rgb}, ${borderAlpha})`,
      borderWidth: '1.5px',
      backgroundColor: 'var(--card-bg, #ffffff)',
      backgroundImage: `linear-gradient(135deg, rgba(${rgb}, ${bgAlphaStart}) 0%, rgba(${rgb}, ${bgAlphaEnd}) 100%)`
    }
  }

  // 0% 미시작: 기본 회색 테두리 및 기본 카드 배경
  return {}
}

/**
 * [달성 완료] 텍스트 색상을 tier-tag 색상과 1:1 통일 (다크모드 명도 대비 보정)
 */
const getStatusTextColor = (item) => {
  if (!item.unlocked) return 'var(--text-sub, #94a3b8)'
  if (themeStore.isDark) {
    const darkColors = {
      bronze: '#d97706',
      silver: '#cbd5e1',
      gold: '#fbbf24',
      titanium: '#38bdf8'
    }
    return darkColors[item.tier] || tiers[item.tier]?.color || '#10b981'
  }
  const lightColors = {
    bronze: '#cd7f32',
    silver: '#64748b',
    gold: '#b45309',
    titanium: '#0284c7'
  }
  return lightColors[item.tier] || tiers[item.tier]?.color || '#10b981'
}

/**
 * 진행 중(1%~99%) 뱃지의 진행률 숫자(N%) 하이라이트 색상 (WCAG 가독성 및 명도 대비 보정)
 */
const getProgressNumberColor = (item) => {
  if (themeStore.isDark) {
    const darkColors = {
      bronze: '#f59e0b',
      silver: '#cbd5e1',
      gold: '#fbbf24',
      titanium: '#38bdf8'
    }
    return darkColors[item.tier] || '#94a3b8'
  }
  const lightColors = {
    bronze: '#b45309',
    silver: '#475569',
    gold: '#b45309',
    titanium: '#0284c7'
  }
  return lightColors[item.tier] || '#64748b'
}
</script>

<style scoped>
/* 헤더 여백 미세 조정 (공통 .cycling-modal-header 확장) */
.drawer-header {
  padding-bottom: 10px;
}

.drawer-subtitle {
  margin-bottom: 12px;
}

/* 요약 카드 */
.summary-card {
  padding: 12px 14px;
  background-color: var(--app-bg, #f8fafc);
  border-radius: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.summary-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.82rem;
  font-weight: 700;
}

.summary-label {
  color: var(--text-sub, #64748b);
}

.summary-score {
  color: var(--text-main, #0f172a);
}

.tier-counts-row {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tier-badge-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background-color: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
}

.tier-badge-pill .pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.tier-badge-pill.bronze .pill-dot { background-color: #cd7f32; }
.tier-badge-pill.silver .pill-dot { background-color: #94a3b8; }
.tier-badge-pill.gold .pill-dot { background-color: #eab308; }
.tier-badge-pill.titanium .pill-dot { background-color: #0ea5e9; }

.tier-badge-pill .pill-num {
  color: var(--text-main, #0f172a);
}

/* 카테고리 필터 바 */
.category-filter-bar {
  display: flex;
  gap: 6px;
  padding: 10px 16px;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-color, #f1f5f9);
  scrollbar-width: none;
}

.category-filter-bar::-webkit-scrollbar {
  display: none;
}

.category-tab-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e8f0);
  background-color: var(--card-bg, #ffffff);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-sub, #64748b);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.category-tab-btn.active {
  background-color: var(--badge-bg, rgba(16, 185, 129, 0.08));
}

/* 본문 업적 카드 리스트 */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.achievement-card {
  padding: 14px;
  border-radius: 12px;
  background-color: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  text-align: left;
  transition: all 0.25s ease;
}

/* 1) 0% 미시작: 차분한 회색 기본 테두리 및 기본 카드 배경 */
.achievement-card.status-idle {
  border-color: var(--border-color, #e2e8f0);
  background-color: var(--card-bg, #ffffff);
  opacity: 0.92;
}

/* 2) 1% ~ 99% 진행 중: 테두리 티어 색상 1.5px 하이라이트 */
.achievement-card.status-progress {
  border-width: 1.5px;
  background-color: var(--card-bg, #ffffff);
}

.achievement-card.status-progress.bronze {
  border-color: #cd7f32;
}

.achievement-card.status-progress.silver {
  border-color: #94a3b8;
}

.achievement-card.status-progress.gold {
  border-color: #eab308;
}

.achievement-card.status-progress.titanium {
  border-color: #0ea5e9;
}

/* 3) 100% 달성 완료: 테두리 티어 색상 + 테마 적응형 반투명 틴트 배경 & 소프트 글로우 (다크모드 완벽 호환) */
.achievement-card.status-unlocked {
  border-width: 1.5px;
}

.achievement-card.status-unlocked.bronze {
  border-color: #cd7f32;
  background-color: var(--card-bg, #ffffff);
  background-image: linear-gradient(135deg, rgba(205, 127, 50, 0.14) 0%, rgba(205, 127, 50, 0.04) 100%);
  box-shadow: 0 4px 14px rgba(205, 127, 50, 0.12);
}

.achievement-card.status-unlocked.silver {
  border-color: #94a3b8;
  background-color: var(--card-bg, #ffffff);
  background-image: linear-gradient(135deg, rgba(148, 163, 184, 0.16) 0%, rgba(148, 163, 184, 0.05) 100%);
  box-shadow: 0 4px 14px rgba(148, 163, 184, 0.12);
}

.achievement-card.status-unlocked.gold {
  border-color: #eab308;
  background-color: var(--card-bg, #ffffff);
  background-image: linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%);
  box-shadow: 0 4px 14px rgba(234, 179, 8, 0.15);
}

.achievement-card.status-unlocked.titanium {
  border-color: #0ea5e9;
  background-color: var(--card-bg, #ffffff);
  background-image: linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%);
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.15);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-top-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 카테고리 칩은 공통 .cycling-chip 클래스 활용 */
.category-chip {
  border-radius: 4px;
}

/* 티어 태그 스타일은 공통 .cycling-tier-tag 클래스 활용 */
.tier-tag {
  border-radius: 4px;
}

.status-badge {
  font-size: 0.72rem;
  font-weight: 700;
}

.status-badge.unlocked {
  font-weight: 800;
  letter-spacing: -0.01em;
}

.status-badge.locked {
  color: var(--text-sub, #94a3b8);
}

.status-badge.locked .progress-num {
  font-weight: 800;
  transition: color 0.3s ease;
}

.card-title {
  margin: 0 0 4px;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-main, #0f172a);
}

.card-desc {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-sub, #64748b);
  line-height: 1.4;
}

/* 미해금 진행률 */
.progress-box {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-color, #e2e8f0);
}

.hint-text {
  font-size: 0.74rem;
  color: var(--text-sub, #94a3b8);
  margin-bottom: 6px;
}

.progress-track {
  height: 5px;
  background-color: var(--app-bg, #f1f5f9);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
}

/* 해금 푸터 */
.unlocked-footer {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color, #f1f5f9);
  display: flex;
  gap: 6px;
  font-size: 0.74rem;
}

.unlocked-footer .footer-label {
  color: var(--text-sub, #94a3b8);
}

.unlocked-footer .footer-val {
  font-weight: 700;
  color: var(--text-main, #334155);
}
</style>
