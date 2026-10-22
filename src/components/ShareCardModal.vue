<template>
  <van-popup
    :show="isModalOpen"
    @update:show="handlePopupShowChange"
    position="bottom"
    round
    closeable
    :style="{ height: '94%', maxHeight: '860px' }"
    class="share-card-popup"
  >
    <div class="share-card-modal">
      <!-- 헤더 -->
      <div class="modal-header">
        <h3 class="modal-title">완주 인증 포토 카드</h3>
        <p class="modal-subtitle">인스타그램, 스트라바, 자전거 커뮤니티에 주행 기록을 공유하세요.</p>
      </div>

      <div class="modal-body">
        <!-- 1. 실시간 캔버스 프리뷰 영역 -->
        <div class="preview-container">
          <div 
            :class="['preview-frame', `ratio-${selectedRatio}`]"
            :style="{ borderColor: themeStore.isDark ? '#333' : '#e2e8f0' }"
          >
            <canvas ref="canvasRef" class="card-canvas"></canvas>
            
            <div v-if="isRendering" class="rendering-overlay">
              <van-loading size="24px" vertical>카드 생성 중...</van-loading>
            </div>
          </div>
        </div>

        <!-- 2. 카드 스타일 옵션 설정 -->
        <div class="options-container">
          <!-- 2-1. 화면 비율 선택 -->
          <div class="option-group">
            <div class="option-label">카드 비율</div>
            <div class="segmented-control">
              <button
                type="button"
                :class="['segment-btn', { active: selectedRatio === 'story' }]"
                :style="selectedRatio === 'story' ? { backgroundColor: themeStore.currentTheme.main, color: '#fff' } : {}"
                @click="changeRatio('story')"
              >
                9:16 스토리
              </button>
              <button
                type="button"
                :class="['segment-btn', { active: selectedRatio === 'square' }]"
                :style="selectedRatio === 'square' ? { backgroundColor: themeStore.currentTheme.main, color: '#fff' } : {}"
                @click="changeRatio('square')"
              >
                1:1 피드
              </button>
            </div>
          </div>

          <!-- 2-2. 테마 스타일 선택 -->
          <div class="option-group">
            <div class="option-label">배경 테마</div>
            <div class="segmented-control">
              <button
                type="button"
                :class="['segment-btn', { active: selectedTheme === 'dark' }]"
                :style="selectedTheme === 'dark' ? { backgroundColor: themeStore.currentTheme.main, color: '#fff' } : {}"
                @click="changeTheme('dark')"
              >
                미니멀 다크
              </button>
              <button
                type="button"
                :class="['segment-btn', { active: selectedTheme === 'ink' }]"
                :style="selectedTheme === 'ink' ? { backgroundColor: themeStore.currentTheme.main, color: '#fff' } : {}"
                @click="changeTheme('ink')"
              >
                스탬프 잉크
              </button>
              <button
                type="button"
                :class="['segment-btn', { active: selectedTheme === 'photo' }]"
                :style="selectedTheme === 'photo' ? { backgroundColor: themeStore.currentTheme.main, color: '#fff' } : {}"
                @click="changeTheme('photo')"
              >
                내 사진 배경
              </button>
            </div>
          </div>

          <!-- 2-3. 내 사진 업로드 / 변경 컨트롤 (사진 테마 활성 시) -->
          <div v-if="selectedTheme === 'photo'" class="photo-upload-group">
            <input 
              type="file" 
              ref="photoInputRef" 
              accept="image/*" 
              class="hidden-file-input" 
              @change="handlePhotoSelect" 
            />
            
            <div class="photo-btn-row">
              <button 
                type="button" 
                class="photo-action-btn cycling-btn-subtle"
                @click="photoInputRef?.click()"
              >
                {{ userPhotoUrl ? '사진 변경' : '라이딩 사진 선택' }}
              </button>
              <button 
                v-if="userPhotoUrl" 
                type="button" 
                class="photo-action-btn cycling-btn-subtle delete"
                @click="handleRemovePhoto"
              >
                사진 제거
              </button>
            </div>
            <div class="photo-hint">
              * 사진은 외부 서버로 전송되지 않고 브라우저에서 100% 안전하게 즉시 합성됩니다.
            </div>
          </div>
        </div>
      </div>

      <!-- 모달 푸터 액션 버튼 -->
      <div class="modal-footer">
        <button
          type="button"
          class="action-btn download-btn cycling-btn-subtle"
          :disabled="isRendering || isSharing"
          @click="handleDownload"
        >
          이미지 저장 (PNG)
        </button>
        <button
          type="button"
          class="action-btn share-btn"
          :style="{ backgroundColor: themeStore.currentTheme.main }"
          :disabled="isRendering || isSharing"
          @click="handleShare"
        >
          {{ isSharing ? '공유 창 여는 중...' : 'SNS 공유하기' }}
        </button>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useShareCard } from '../composables/useShareCard.js'
import { useThemeStore } from '../stores/theme.js'

const themeStore = useThemeStore()
const {
  isModalOpen,
  isRendering,
  isSharing,
  selectedRatio,
  selectedTheme,
  userPhotoUrl,
  cardData,
  closeModal,
  setUserPhoto,
  clearUserPhoto,
  renderCardToCanvas,
  downloadCardImage,
  shareCardImage
} = useShareCard()

const canvasRef = ref(null)
const photoInputRef = ref(null)

// 팝업 표시 상태 핸들러
const handlePopupShowChange = (val) => {
  if (!val) {
    closeModal()
  }
}

// 캔버스 다시 그리기
const requestRender = async () => {
  await nextTick()
  if (canvasRef.value) {
    await renderCardToCanvas(canvasRef.value)
  }
}

// 모달 오픈 또는 옵션 변경 시 자동 렌더링
watch(isModalOpen, (open) => {
  if (open) {
    requestRender()
  }
})

// 비율 변경
const changeRatio = (ratio) => {
  selectedRatio.value = ratio
  requestRender()
}

// 테마 변경
const changeTheme = (themeId) => {
  selectedTheme.value = themeId
  if (themeId === 'photo' && !userPhotoUrl.value) {
    photoInputRef.value?.click()
  }
  requestRender()
}

// 사진 파일 선택 핸들러
const handlePhotoSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) {
    setUserPhoto(file)
    requestRender()
  }
  e.target.value = ''
}

// 사진 제거
const handleRemovePhoto = () => {
  clearUserPhoto()
  requestRender()
}

// 다운로드 액션
const handleDownload = () => {
  if (canvasRef.value) {
    downloadCardImage(canvasRef.value)
  }
}

// 공유 액션
const handleShare = () => {
  if (canvasRef.value) {
    shareCardImage(canvasRef.value)
  }
}
</script>

<style scoped>
.share-card-popup {
  background-color: var(--card-bg, #ffffff);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  overflow: hidden;
}

.share-card-modal {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--text-main, #1f2937);
  background-color: var(--card-bg, #ffffff);
}

.modal-header {
  padding: 16px 20px 10px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  text-align: left;
}

.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main, #1f2937);
  letter-spacing: -0.02em;
}

.modal-subtitle {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--text-sub, #6b7280);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* 캔버스 프리뷰 */
.preview-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--app-bg, #f7f8fa);
  border-radius: 14px;
  padding: 12px;
}

.preview-frame {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  max-width: 100%;
}

.preview-frame.ratio-story {
  height: 340px;
  width: 191px; /* 1080:1920 */
}

.preview-frame.ratio-square {
  height: 280px;
  width: 280px; /* 1080:1080 */
}

.card-canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.rendering-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff;
}

/* 컨트롤 옵션 */
.options-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.option-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-sub, #6b7280);
}

.segmented-control {
  display: flex;
  background-color: var(--app-bg, #f1f5f9);
  padding: 3px;
  border-radius: 10px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.segment-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-sub, #64748b);
  cursor: pointer;
  transition: all 0.2s ease;
}

.segment-btn.active {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* 사진 업로드 컨트롤 */
.photo-upload-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background-color: var(--app-bg, #f8fafc);
  border-radius: 10px;
  border: 1px dashed var(--border-color, #cbd5e1);
}

.hidden-file-input {
  display: none;
}

.photo-btn-row {
  display: flex;
  gap: 8px;
}

.photo-action-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.photo-action-btn.delete {
  color: #ef4444;
}

.photo-hint {
  font-size: 0.72rem;
  color: var(--text-sub, #94a3b8);
  line-height: 1.3;
}

/* 모달 푸터 액션 */
.modal-footer {
  padding: 12px 20px 18px;
  display: flex;
  gap: 10px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  background-color: var(--card-bg, #ffffff);
}

.action-btn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 800;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: opacity 0.2s;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.share-btn {
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-btn.download-btn {
  border: 1px solid var(--border-color, #d1d5db);
}
</style>
