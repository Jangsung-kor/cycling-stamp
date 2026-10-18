<template>
  <van-overlay :show="show" :z-index="1000" @click="handleClose">
    <div class="celebration-container" @click.stop>
      <!-- 폭죽 컨페티 캔버스 (코스 완주 및 획득 시 팡팡 터짐) -->
      <canvas v-if="type !== 'cooldown'" ref="confettiCanvas" class="confetti-canvas"></canvas>

      <div class="card-box" :class="[type, { 'animate-in': show }]">
        <!-- 닫기 버튼 -->
        <div class="close-btn" @click="handleClose">✕</div>

        <!-- 1. 상단 타이틀 및 뱃지 -->
        <div class="header-section">
          <div v-if="type === 'first'" class="badge first-badge">
            <span class="badge-icon">✨</span> 첫 스탬프 획득!
          </div>
          <div v-else-if="type === 'revisit'" class="badge revisit-badge">
            <span class="badge-icon">🔥</span> x{{ visitCount }} 다회차 라이딩 달성!
          </div>
          <div v-else-if="type === 'course_complete'" class="badge trophy-badge">
            <span class="badge-icon">🏆</span> 코스 완주 달성!
          </div>
          <div v-else-if="type === 'cooldown'" class="badge cooldown-badge">
            <span class="badge-icon">⏳</span> 24시간 재인증 쿨다운
          </div>

          <h2 class="center-title">{{ center?.name || '인증센터' }}</h2>
          <p class="route-subtitle">{{ center?.route || courseName || '국토종주 자전거길' }}</p>
        </div>

        <!-- 2. 중앙 도장 애니메이션 영역 -->
        <div class="stamp-stage">
          <!-- 쿨다운 전용 모래시계/시계 모션 -->
          <div v-if="type === 'cooldown'" class="cooldown-visual">
            <div class="clock-pulse">
              <span class="clock-emoji">⏰</span>
            </div>
            <div class="cooldown-timer-box">
              <span class="timer-label">다음 재인증 가능까지</span>
              <span class="timer-value">{{ remainingTimeText || '약 14시간 남음' }}</span>
            </div>
          </div>

          <!-- 스탬프 획득 시: 인주 도장 쾅! 바운스 애니메이션 -->
          <div v-else class="stamp-slam-box">
            <!-- 충격파 이펙트 링 -->
            <div class="shockwave-ring" :style="{ borderColor: themeColor }"></div>
            
            <!-- 도장 본체 SVG -->
            <div class="stamp-graphic" v-html="stampSvgHtml"></div>

            <!-- 다회차 회차 스티커 (x2, x3) -->
            <div v-if="type === 'revisit' && visitCount > 1" class="round-sticker" :style="{ backgroundColor: themeColor }">
              x{{ visitCount }}
            </div>

            <!-- 완주 축하 리본 -->
            <div v-if="type === 'course_complete'" class="completion-ribbon">
              <span>ALL CLEAR!</span>
            </div>
          </div>
        </div>

        <!-- 3. 하단 상세 정보 카드 -->
        <div class="info-section">
          <div v-if="type === 'cooldown'" class="cooldown-desc">
            동일한 인증센터는 하루(24시간)에 1회만 인증할 수 있습니다.<br>
            내일 다시 방문하시면 <strong>x{{ (visitCount || 1) + 1 }}회차</strong> 도장을 획득할 수 있어요! 🚴
          </div>
          <div v-else-if="type === 'course_complete'" class="complete-desc">
            🎉 축하합니다! <strong>{{ courseName || center?.route }}</strong>의<br>
            모든 인증센터 도장을 완벽하게 수집하셨습니다!
          </div>
          <div v-else class="acquired-details">
            <div class="detail-row">
              <span class="row-label">인증 일시</span>
              <span class="row-val">{{ formattedTime }}</span>
            </div>
            <div class="detail-row" v-if="center?.address">
              <span class="row-label">위치 주소</span>
              <span class="row-val address-text">{{ center.address }}</span>
            </div>
          </div>
        </div>

        <!-- 4. 하단 액션 버튼 -->
        <div class="action-section">
          <van-button 
            round 
            block 
            class="confirm-btn"
            :style="{ backgroundColor: themeColor, borderColor: themeColor }"
            @click="handleClose"
          >
            {{ type === 'course_complete' ? '완주 축하 확인 🎉' : '스탬프 보관함 확인' }}
          </van-button>
        </div>
      </div>
    </div>
  </van-overlay>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useStampManager } from '../composables/useStampManager'

const props = defineProps({
  show: { type: Boolean, default: false },
  type: { type: String, default: 'first' }, // 'first' | 'revisit' | 'course_complete' | 'cooldown'
  center: { type: Object, default: () => ({}) },
  visitCount: { type: Number, default: 1 },
  courseName: { type: String, default: '' },
  remainingTimeText: { type: String, default: '' }
})

const emit = defineEmits(['update:show', 'close'])

const stampManager = useStampManager()
const { themeStore } = stampManager
const themeColor = computed(() => themeStore.currentTheme?.main || '#B84A48')

const confettiCanvas = ref(null)
let confettiInterval = null

// 도장 SVG HTML 렌더링
const stampSvgHtml = computed(() => {
  if (!props.center || !props.center.name) return ''
  return stampManager.getStampSvg(props.center, true, themeColor.value)
})

// 현재 시간 포맷
const formattedTime = computed(() => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${date} ${h}:${min}`
})

const handleClose = () => {
  stopConfetti()
  emit('update:show', false)
  emit('close')
}

// 캔버스 컨페티 (Zero-Dependency)
const runConfetti = () => {
  nextTick(() => {
    const canvas = confettiCanvas.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = []
    const colors = [themeColor.value, '#FFD700', '#FF6B6B', '#4D96FF', '#6BCB77', '#F472B6']

    for (let i = 0; i < 75; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.9) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 15,
        alpha: 1
      })
    }

    let frameCount = 0
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frameCount++

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.38 // 중력
        p.rotation += p.vr
        if (frameCount > 35) {
          p.alpha -= 0.015
        }

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.alpha)
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7)
        ctx.restore()
      })

      if (frameCount < 120 && props.show) {
        confettiInterval = requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    confettiInterval = requestAnimationFrame(animate)
  })
}

const stopConfetti = () => {
  if (confettiInterval) {
    cancelAnimationFrame(confettiInterval)
    confettiInterval = null
  }
}

watch(() => props.show, (newVal) => {
  if (newVal && props.type !== 'cooldown') {
    runConfetti()
  } else {
    stopConfetti()
  }
})
</script>

<style scoped>
.celebration-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.confetti-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 10;
}

.card-box {
  width: 88%;
  max-width: 340px;
  background: #ffffff;
  border-radius: 24px;
  padding: 24px 20px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 20;
  animation: pop-up 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes pop-up {
  0% { transform: scale(0.65); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.close-btn {
  position: absolute;
  top: 14px;
  right: 16px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}

/* 뱃지 */
.header-section {
  text-align: center;
  margin-bottom: 12px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.3px;
  margin-bottom: 8px;
}

.first-badge {
  background: #EFF6FF;
  color: #2563EB;
  border: 1px solid #BFDBFE;
}

.revisit-badge {
  background: #FEF3C7;
  color: #D97706;
  border: 1px solid #FDE68A;
  animation: pulse-badge 1.8s infinite;
}

.trophy-badge {
  background: #FEF08A;
  color: #854D0E;
  border: 1px solid #FACC15;
  box-shadow: 0 2px 8px rgba(250, 204, 21, 0.35);
}

.cooldown-badge {
  background: #F1F5F9;
  color: #475569;
  border: 1px solid #CBD5E1;
}

@keyframes pulse-badge {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.center-title {
  margin: 0 0 4px 0;
  font-size: 21px;
  font-weight: 900;
  color: #0f172a;
}

.route-subtitle {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

/* 도장 스테이지 */
.stamp-stage {
  width: 170px;
  height: 170px;
  margin: 10px 0 16px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.stamp-slam-box {
  position: relative;
  width: 130px;
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 쿵! 도장 찍히는 애니메이션 */
.stamp-graphic {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: stamp-slam 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.15));
}

.stamp-graphic :deep(svg) {
  width: 100%;
  height: 100%;
}

@keyframes stamp-slam {
  0% {
    transform: scale(3.5) rotate(-35deg);
    opacity: 0;
    filter: blur(8px);
  }
  60% {
    transform: scale(0.92) rotate(-4deg);
    opacity: 0.95;
    filter: blur(0);
  }
  80% {
    transform: scale(1.08) rotate(-2deg);
  }
  100% {
    transform: scale(1) rotate(-3deg);
    opacity: 1;
  }
}

/* 충격파 링 애니메이션 */
.shockwave-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120px;
  height: 120px;
  margin: -60px 0 0 -60px;
  border: 4px solid;
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  animation: shockwave 0.65s ease-out 0.3s forwards;
}

@keyframes shockwave {
  0% { transform: scale(0.6); opacity: 0.85; }
  100% { transform: scale(1.7); opacity: 0; }
}

/* 다회차 스티커 */
.round-sticker {
  position: absolute;
  top: -8px;
  right: -8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
  padding: 3px 8px;
  border-radius: 12px;
  border: 2px solid #ffffff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
  animation: sticker-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.45s both;
}

@keyframes sticker-pop {
  0% { transform: scale(0) rotate(-40deg); }
  100% { transform: scale(1) rotate(0deg); }
}

/* 코스 완주 리본 */
.completion-ribbon {
  position: absolute;
  bottom: -10px;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  color: #ffffff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.5px;
  padding: 3px 12px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(217, 119, 6, 0.4);
  animation: sticker-pop 0.4s ease 0.5s both;
}

/* 쿨다운 비주얼 */
.cooldown-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.clock-pulse {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: clock-tick 1.4s infinite ease-in-out;
}

.clock-emoji {
  font-size: 34px;
}

@keyframes clock-tick {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}

.cooldown-timer-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timer-label {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 2px;
}

.timer-value {
  font-size: 18px;
  font-weight: 900;
  color: #e11d48;
}

/* 상세 정보 */
.info-section {
  width: 100%;
  margin-bottom: 16px;
}

.cooldown-desc, .complete-desc {
  font-size: 13px;
  color: #334155;
  text-align: center;
  line-height: 1.5;
  background: #f8fafc;
  padding: 10px 12px;
  border-radius: 12px;
}

.acquired-details {
  background: #f8fafc;
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.row-label {
  color: #64748b;
  font-weight: 600;
}

.row-val {
  color: #1e293b;
  font-weight: 700;
}

.address-text {
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 버튼 */
.action-section {
  width: 100%;
}

.confirm-btn {
  height: 44px;
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
