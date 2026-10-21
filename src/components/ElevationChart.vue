<template>
  <div v-if="showElevationProfile && activeElevationTrack" class="elevation-chart-card">
    <!-- 상단 헤더: 트랙명 및 고도 요약 지표 (시각적 잡음 없는 정갈한 텍스트 기반) -->
    <div class="chart-header">
      <div class="header-left">
        <span 
          class="track-indicator-dot" 
          :style="{ backgroundColor: isFriendTrack ? '#06b6d4' : themeStore.currentTheme.main }"
        ></span>
        <span class="track-name" :title="activeElevationTrack.title">
          {{ activeElevationTrack.title }}
        </span>
        <span v-if="isFriendTrack" class="friend-badge">
          {{ activeElevationTrack.authorName || '친구' }}
        </span>
      </div>

      <!-- 실시간 스크러빙 또는 전체 요약 지표 -->
      <div class="header-stats">
        <template v-if="activeScrubbingPoint">
          <span class="stat-item active">
            <span class="stat-label">거리</span>
            <span class="stat-value">{{ activeScrubbingPoint.distKm }}km</span>
          </span>
          <span class="stat-item active">
            <span class="stat-label">고도</span>
            <span class="stat-value">{{ activeScrubbingPoint.ele }}m</span>
          </span>
          <span v-if="scrubbingGradient !== null" class="stat-item active">
            <span class="stat-label">경사도</span>
            <span :class="['stat-value', { 'steep-climb': scrubbingGradient >= 8 }]">
              {{ scrubbingGradient > 0 ? `+${scrubbingGradient}` : scrubbingGradient }}%
            </span>
          </span>
        </template>
        <template v-else>
          <span class="stat-item">
            <span class="stat-label">최고</span>
            <span class="stat-value">{{ stats.maxEle }}m</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">최저</span>
            <span class="stat-value">{{ stats.minEle }}m</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">획득</span>
            <span class="stat-value">{{ stats.elevationGainM }}m</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">거리</span>
            <span class="stat-value">{{ stats.distanceKm }}km</span>
          </span>
        </template>
      </div>

      <!-- 닫기 버튼 -->
      <button 
        type="button" 
        class="chart-close-btn" 
        @click="closeElevationProfile"
        aria-label="고도 차트 닫기"
        title="고도 차트 닫기"
      >
        ✕
      </button>
    </div>

    <!-- 메인 SVG 차트 캔버스 -->
    <div 
      class="chart-body" 
      ref="containerRef"
      @mousemove="handlePointerMove"
      @mouseleave="handlePointerLeave"
      @touchstart.passive="handleTouchMove"
      @touchmove.passive="handleTouchMove"
      @touchend="handlePointerLeave"
      @touchcancel="handlePointerLeave"
    >
      <template v-if="hasProfileData">
        <svg 
          class="elevation-svg" 
          viewBox="0 0 600 120" 
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="eleGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="lineColor" stop-opacity="0.55" />
              <stop offset="70%" :stop-color="lineColor" stop-opacity="0.15" />
              <stop offset="100%" :stop-color="lineColor" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          <!-- 가로 기준 그리드 선 (상단 최고고도 / 중간 / 최저고도) -->
          <line 
            :x1="padLeft" 
            :y1="padTop" 
            :x2="padLeft + plotW" 
            :y2="padTop" 
            class="grid-line" 
          />
          <line 
            :x1="padLeft" 
            :y1="padTop + plotH / 2" 
            :x2="padLeft + plotW" 
            :y2="padTop + plotH / 2" 
            class="grid-line" 
          />
          <line 
            :x1="padLeft" 
            :y1="padTop + plotH" 
            :x2="padLeft + plotW" 
            :y2="padTop + plotH" 
            class="grid-line" 
          />

          <!-- Y축 고도 텍스트 라벨 -->
          <text :x="padLeft - 6" :y="padTop + 4" class="axis-label y-axis" text-anchor="end">
            {{ stats.maxEle }}m
          </text>
          <text :x="padLeft - 6" :y="padTop + plotH / 2 + 4" class="axis-label y-axis" text-anchor="end">
            {{ stats.midEle }}m
          </text>
          <text :x="padLeft - 6" :y="padTop + plotH + 4" class="axis-label y-axis" text-anchor="end">
            {{ stats.minEle }}m
          </text>

          <!-- X축 거리 텍스트 라벨 -->
          <text :x="padLeft" :y="padTop + plotH + 16" class="axis-label x-axis" text-anchor="start">
            0km
          </text>
          <text :x="padLeft + plotW / 2" :y="padTop + plotH + 16" class="axis-label x-axis" text-anchor="middle">
            {{ Math.round(stats.distanceKm / 2 * 10) / 10 }}km
          </text>
          <text :x="padLeft + plotW" :y="padTop + plotH + 16" class="axis-label x-axis" text-anchor="end">
            {{ stats.distanceKm }}km
          </text>

          <!-- 면적 그라디언트 영역 -->
          <path :d="areaPathD" fill="url(#eleGradient)" />

          <!-- 고도 윤곽선 -->
          <path 
            :d="linePathD" 
            fill="none" 
            :stroke="lineColor" 
            stroke-width="2.2" 
            stroke-linecap="round" 
            stroke-linejoin="round" 
          />

          <!-- 인터랙티브 스크러빙 커서 및 인디케이터 -->
          <template v-if="scrubCursor">
            <!-- 수직 안내선 -->
            <line 
              :x1="scrubCursor.x" 
              :y1="padTop" 
              :x2="scrubCursor.x" 
              :y2="padTop + plotH" 
              class="scrub-line" 
            />
            <!-- 현재 고도 포인트 원 -->
            <circle 
              :cx="scrubCursor.x" 
              :cy="scrubCursor.y" 
              r="4.5" 
              class="scrub-point-circle" 
              :fill="lineColor" 
            />
          </template>
        </svg>
      </template>

      <!-- 고도 데이터가 없는 경우 안내 -->
      <div v-else class="empty-profile">
        <span>해당 GPX 파일에 고도(ele) 정보가 포함되어 있지 않습니다.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGpxManager } from '../composables/useGpxManager.js'

const {
  themeStore,
  showElevationProfile,
  activeElevationTrack,
  activeScrubbingPoint,
  closeElevationProfile,
  setActiveScrubbingPoint
} = useGpxManager()

const containerRef = ref(null)

// 친구 트랙 여부 판별
const isFriendTrack = computed(() => {
  return !!activeElevationTrack.value?.authorUid
})

// 메인 라인 컬러
const lineColor = computed(() => {
  if (isFriendTrack.value) return '#06b6d4'
  return themeStore.currentTheme?.main || '#22c55e'
})

// SVG 내부 좌표계 파라미터 (ViewBox: 600 x 120)
const padLeft = 40
const padRight = 14
const padTop = 14
const padBottom = 22
const plotW = 600 - padLeft - padRight // 546
const plotH = 120 - padTop - padBottom // 84

// 고도 프로필 샘플 데이터
const rawProfile = computed(() => {
  const t = activeElevationTrack.value
  if (!t) return []
  return t.elevationProfile || []
})

const hasProfileData = computed(() => rawProfile.value.length >= 2)

// 통계 요약
const stats = computed(() => {
  const t = activeElevationTrack.value
  if (!t) {
    return { minEle: 0, maxEle: 0, midEle: 0, elevationGainM: 0, distanceKm: 0 }
  }

  const distanceKm = Math.round((t.distanceKm || 0) * 10) / 10
  const elevationGainM = Math.round(t.elevationGainM || 0)

  let minEle = t.minElevationM
  let maxEle = t.maxElevationM

  if (minEle === undefined || maxEle === undefined) {
    if (rawProfile.value.length > 0) {
      const eles = rawProfile.value.map(p => p.ele)
      minEle = Math.min(...eles)
      maxEle = Math.max(...eles)
    } else {
      minEle = 0
      maxEle = 0
    }
  }

  // 평지 코스 방어 (동일 고도인 경우 10m 마진 부여)
  if (maxEle <= minEle) {
    maxEle = minEle + 10
  }

  const midEle = Math.round((minEle + maxEle) / 2)

  return {
    minEle: Math.round(minEle),
    maxEle: Math.round(maxEle),
    midEle,
    elevationGainM,
    distanceKm
  }
})

// 정규화된 SVG 포인트 계산
const svgPoints = computed(() => {
  const pts = rawProfile.value
  if (pts.length < 2) return []

  const maxDist = stats.value.distanceKm || 1
  const minEle = stats.value.minEle
  const maxEle = stats.value.maxEle
  const eleSpan = maxEle - minEle || 1

  return pts.map((p, idx) => {
    const x = padLeft + (Math.min(p.distKm, maxDist) / maxDist) * plotW
    const ratio = (p.ele - minEle) / eleSpan
    const y = padTop + (1 - Math.max(0, Math.min(1, ratio))) * plotH
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      distKm: p.distKm,
      ele: p.ele,
      lat: p.lat,
      lng: p.lng,
      index: idx
    }
  })
})

// SVG 선 경로
const linePathD = computed(() => {
  const pts = svgPoints.value
  if (pts.length < 2) return ''
  return pts.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
  }, '')
})

// SVG 하단 닫힌 영역 경로 (그라디언트 채우기용)
const areaPathD = computed(() => {
  const pts = svgPoints.value
  if (pts.length < 2) return ''
  const bottomY = padTop + plotH
  const firstX = pts[0].x
  const lastX = pts[pts.length - 1].x
  const linePart = pts.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
  }, '')
  return `${linePart} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
})

// 현재 스크러빙 커서 좌표
const scrubCursor = computed(() => {
  const active = activeScrubbingPoint.value
  if (!active || svgPoints.value.length === 0) return null

  // 활성 포인트와 가장 일치하는 svg 포인트 탐색
  const pts = svgPoints.value
  let best = pts[0]
  let bestDiff = Math.abs(best.distKm - active.distKm)

  for (let i = 1; i < pts.length; i++) {
    const diff = Math.abs(pts[i].distKm - active.distKm)
    if (diff < bestDiff) {
      bestDiff = diff
      best = pts[i]
    }
  }

  return best
})

// 스크러빙 지점의 경사도 계산 (%)
const scrubbingGradient = computed(() => {
  const active = activeScrubbingPoint.value
  if (!active || svgPoints.value.length === 0) return null

  const pts = svgPoints.value
  const curIdx = scrubCursor.value?.index ?? -1
  if (curIdx < 0) return null

  // 이전 포인트와의 고도차/거리차 기반 경사도 (%) 산출
  const prev = curIdx > 0 ? pts[curIdx - 1] : pts[0]
  const next = curIdx < pts.length - 1 ? pts[curIdx + 1] : pts[curIdx]

  const dDistM = (next.distKm - prev.distKm) * 1000
  const dEleM = next.ele - prev.ele

  if (dDistM <= 10) return 0
  const slope = (dEleM / dDistM) * 100
  return Math.round(slope * 10) / 10
})

// 마우스 / 터치 포인터 좌표로부터 거리 계산 및 스크러빙 포인트 활성화
const updateScrubFromClientX = (clientX) => {
  if (!containerRef.value || svgPoints.value.length === 0) return
  const rect = containerRef.value.getBoundingClientRect()
  if (rect.width <= 0) return

  // 컨테이너 내 X 비율 (0.0 ~ 1.0)
  const relX = (clientX - rect.left) / rect.width
  const clampedX = Math.max(0, Math.min(1, relX))
  const targetDistKm = clampedX * stats.value.distanceKm

  // 가장 가까운 샘플 포인트 탐색
  const pts = svgPoints.value
  let closest = pts[0]
  let minDiff = Math.abs(closest.distKm - targetDistKm)

  for (let i = 1; i < pts.length; i++) {
    const diff = Math.abs(pts[i].distKm - targetDistKm)
    if (diff < minDiff) {
      minDiff = diff
      closest = pts[i]
    }
  }

  setActiveScrubbingPoint({
    distKm: closest.distKm,
    ele: closest.ele,
    lat: closest.lat,
    lng: closest.lng
  })
}

const handlePointerMove = (e) => {
  updateScrubFromClientX(e.clientX)
}

const handleTouchMove = (e) => {
  if (e.touches && e.touches.length > 0) {
    updateScrubFromClientX(e.touches[0].clientX)
  }
}

const handlePointerLeave = () => {
  setActiveScrubbingPoint(null)
}
</script>

<style scoped>
.elevation-chart-card {
  position: absolute;
  bottom: 24px;
  left: 16px;
  right: 16px;
  max-width: 720px;
  margin: 0 auto;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 12px 14px 8px 14px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 8px;
  user-select: none;
  animation: slideUpFade 0.22s ease-out;
}

@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 상단 헤더 */
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.track-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.track-name {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.friend-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(6, 182, 212, 0.2);
  color: #38bdf8;
  border: 1px solid rgba(6, 182, 212, 0.35);
  flex-shrink: 0;
}

/* 지표 디스플레이 */
.header-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.stat-item {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-size: 11px;
}

.stat-item.active {
  animation: pulseHighlight 0.15s ease-out;
}

@keyframes pulseHighlight {
  0% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.stat-label {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 500;
}

.stat-value {
  color: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stat-value.steep-climb {
  color: #f87171;
}

/* 닫기 버튼 */
.chart-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.chart-close-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

/* SVG 본문 */
.chart-body {
  position: relative;
  width: 100%;
  height: 105px;
  cursor: crosshair;
  touch-action: none;
}

.elevation-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* 그리드 & 축 텍스트 */
.grid-line {
  stroke: rgba(255, 255, 255, 0.08);
  stroke-dasharray: 3, 3;
  stroke-width: 1;
}

.axis-label {
  fill: #64748b;
  font-size: 9px;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
  user-select: none;
}

/* 스크러빙 커서 */
.scrub-line {
  stroke: #ffffff;
  stroke-width: 1.2;
  stroke-dasharray: 2, 2;
}

.scrub-point-circle {
  stroke: #ffffff;
  stroke-width: 2;
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5));
}

.empty-profile {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  font-size: 12px;
}

/* 모바일 화면 최적화 */
@media (max-width: 640px) {
  .elevation-chart-card {
    left: 8px;
    right: 8px;
    bottom: 16px;
    padding: 10px 10px 6px 10px;
  }

  .chart-header {
    flex-wrap: wrap;
    gap: 4px 8px;
  }

  .header-left {
    flex: 1 1 100%;
  }

  .header-stats {
    flex: 1 1 auto;
    gap: 6px;
  }

  .chart-close-btn {
    margin-left: auto;
  }

  .chart-body {
    height: 90px;
  }
}
</style>
