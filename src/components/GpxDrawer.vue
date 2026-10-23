<template>
  <van-popup
    :show="show"
    @update:show="$emit('update:show', $event)"
    position="bottom"
    round
    :style="{ maxHeight: '82vh', height: 'auto', display: 'flex', flexDirection: 'column' }"
    class="gpx-drawer-popup"
  >
    <!-- 상단 헤더 -->
    <div class="drawer-header">
      <div class="header-title-box">
        <div class="header-title-row">

          <span class="header-title">주행 기록</span>
          <span class="track-count-badge cycling-badge" :style="{ backgroundColor: themeStore.currentTheme.main }">
            총 {{ activeTab === 'my' ? totalTracksCount : friendTracksCount }}개
          </span>
        </div>
        <div class="header-sub-row">
          <p class="header-sub">
            내 누적 주행 거리: <strong>{{ totalDistanceKm }} km</strong> (지도 색칠 완료)
          </p>
          <span v-if="isAuthenticated" class="sync-status online">☁️ 클라우드 동기화됨</span>
          <span v-else class="sync-status offline">📱 로컬 보관 (로그인 시 자동 동기화)</span>
        </div>
      </div>

      <button class="close-btn" @click="$emit('update:show', false)">✕</button>
    </div>

    <!-- 탭 세그먼트 (내 주행 / 친구 주행) -->
    <div class="drawer-tabs-row">
      <button
        type="button"
        :class="['tab-pill-btn', { active: activeTab === 'my' }]"
        :style="activeTab === 'my' ? { borderColor: themeStore.currentTheme.main, color: themeStore.currentTheme.main } : {}"
        @click="switchTab('my')"
      >
        <span>내 주행</span>
        <span class="tab-count-tag" :style="activeTab === 'my' ? { backgroundColor: themeStore.currentTheme.main, color: '#ffffff' } : {}">
          {{ totalTracksCount }}
        </span>
      </button>

      <button
        type="button"
        :class="['tab-pill-btn', { active: activeTab === 'friends' }]"
        :style="activeTab === 'friends' ? { borderColor: '#06b6d4', color: '#0891b2' } : {}"
        @click="switchTab('friends')"
      >
        <span>친구 주행</span>
        <span class="tab-count-tag friend" :style="activeTab === 'friends' ? { backgroundColor: '#06b6d4', color: '#ffffff' } : {}">
          {{ friendTracksCount }}
        </span>
      </button>
    </div>

    <!-- 스크롤 가능한 본문 영역 -->
    <div class="drawer-body">
      <!-- ============================================== -->
      <!-- TAB 1: 내 주행 궤적 관리                         -->
      <!-- ============================================== -->
      <template v-if="activeTab === 'my'">
        <!-- 파일 업로드 드롭존 (label + input 덮개 구조로 모바일 터치 및 데스크톱 드롭 완벽 지원) -->
        <label 
          for="gpx-native-file-input"
          :class="['upload-dropzone', { dragging: isDragging }]"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleFileDrop"
          :style="isDragging ? { borderColor: themeStore.currentTheme.main, backgroundColor: `${themeStore.currentTheme.main}10` } : {}"
        >
          <!-- 모바일/웹 공용 전체 덮개형 파일 입력창 (MIME + 확장자 범용 호환) -->
          <input 
            id="gpx-native-file-input"
            type="file" 
            ref="fileInputRef" 
            accept=".gpx,application/gpx+xml,application/xml,text/xml,application/octet-stream,*/*" 
            multiple 
            class="file-input-cover" 
            @change="handleFileInputChange"
            @click="e => { e.target.value = '' }"
          />
          <div class="dropzone-content">
            <div class="upload-icon-circle" :style="{ backgroundColor: `${themeStore.currentTheme.main}18`, color: themeStore.currentTheme.main }">
              <span class="upload-icon">📂</span>
            </div>
            <div class="upload-text-group">
              <div class="upload-main-text">GPX 주행 파일 업로드</div>
              <div class="upload-hint">가민, 와후, 스트라바, 산길샘 등 주행 파일 지원 (터치하여 파일 선택)</div>
            </div>
          </div>
        </label>

        <!-- 트랙 목록 -->
        <div v-if="tracks.length > 0" class="track-list-section">
          <div class="section-title-row">
            <span class="section-title">내 주행 궤적 목록</span>
            <span class="section-hint">항목을 탭하면 지도에서 하이라이트 및 확대됩니다.</span>
          </div>

          <div class="track-card-list">
            <div 
              v-for="track in tracks" 
              :key="track.id"
              :class="[
                'track-card', 
                { 
                  active: selectedTrackId === track.id,
                  hovered: hoveredTrackId === track.id,
                  hidden: track.visible === false
                }
              ]"
              :style="hoveredTrackId === track.id ? { borderColor: themeStore.currentTheme.main, boxShadow: `0 4px 18px ${themeStore.currentTheme.main}30` } : {}"
              @mouseenter="setHoveredTrack(track.id)"
              @mouseleave="setHoveredTrack(null)"
              @click="selectTrack(track)"
            >
              <!-- 좌측 컬러 인디케이터 바 -->
              <div 
                class="track-color-indicator" 
                :style="{ backgroundColor: track.visible !== false ? themeStore.currentTheme.main : '#cbd5e1' }"
              ></div>

              <div class="track-card-main">
                <!-- 1행: 트랙 제목 & 액션 버튼 -->
                <div class="card-top-row">
                  <div class="track-title-wrapper" @click.stop>
                    <template v-if="editingTrackId === track.id">
                      <input 
                        v-model="editingTitle" 
                        ref="titleInputRef"
                        class="title-edit-input"
                        @blur="saveTitle(track)"
                        @keyup.enter="saveTitle(track)"
                        @keyup.esc="cancelEditTitle"
                      />
                    </template>
                    <template v-else>
                      <span class="track-title text-truncate" :title="track.title">{{ track.title }}</span>
                      <button class="icon-btn edit-btn" @click="startEditTitle(track)" title="이름 수정">
                        ✏️
                      </button>
                    </template>
                  </div>

                  <div class="card-actions" @click.stop>
                    <!-- 공개 범위 토글 버튼 (나만보기 <-> 친구 공개) -->
                    <button
                      type="button"
                      :class="['vis-toggle-chip', { friends: track.visibility === 'friends' }]"
                      @click="toggleShareVisibility(track)"
                      :title="track.visibility === 'friends' ? '친구 공개 중 (클릭 시 나만보기로 변경)' : '나만보기 중 (클릭 시 친구 공개로 변경)'"
                    >
                      <span>{{ getVisibilityIcon(track.visibility) }}</span>
                      <span>{{ getVisibilityLabel(track.visibility) }}</span>
                    </button>

                    <!-- 지도 표시 토글 버튼 -->
                    <button 
                      :class="['icon-btn', 'visibility-btn', { off: track.visible === false }]"
                      @click="toggleVisibility(track.id)"
                      :title="track.visible !== false ? '지도에서 숨기기' : '지도에 표시하기'"
                    >
                      <span>{{ track.visible !== false ? '👁️' : '🕶️' }}</span>
                    </button>

                    <!-- 삭제 버튼 -->
                    <button 
                      class="icon-btn delete-btn" 
                      @click="deleteTrackWithConfirm(track)"
                      title="기록 삭제"
                    >
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>

                <!-- 2행: 주행 통계 정보 칩 -->
                <div class="card-stats-row">
                  <span class="cycling-chip highlight" :style="{ color: themeStore.currentTheme.main, backgroundColor: `${themeStore.currentTheme.main}12` }">
                    {{ track.distanceKm }} km
                  </span>
                  <span v-if="track.elevationGainM > 0" class="cycling-chip">
                    {{ track.elevationGainM }} m
                  </span>
                  <span v-if="track.durationMinutes > 0" class="cycling-chip">
                    {{ formatDuration(track.durationMinutes) }}
                  </span>
                  <span class="cycling-chip date">
                    {{ formatDate(track.startTime || track.createdAt) }}
                  </span>
                  <button
                    type="button"
                    class="elevation-btn cycling-btn-subtle"
                    @click.stop="handleOpenElevation(track)"
                    title="고도 프로필 차트 보기"
                  >
                    고도 차트
                  </button>
                  <button
                    type="button"
                    class="share-card-btn cycling-btn-subtle"
                    @click.stop="handleOpenShareCard(track, false)"
                    title="완주 인증 포토 카드 내보내기"
                  >
                    인증 카드
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 빈 상태 안내 (내 주행) -->
        <div v-else class="empty-state">
          <div class="empty-icon-wrap" :style="{ backgroundColor: `${themeStore.currentTheme.main}12` }">
            <span class="empty-emoji">🗺️</span>
          </div>
          <div class="empty-title">아직 등록된 주행 기록이 없습니다.</div>
          <p class="empty-desc">
            GPX 파일을 업로드하면 내가 실제로 달린 궤적이<br />
            회색 지도 위에 <strong>{{ themeStore.currentTheme.name }}</strong> 테마 색상으로 물듭니다!
          </p>
        </div>
      </template>

      <!-- ============================================== -->
      <!-- TAB 2: 맞팔 친구들의 공유 주행 궤적             -->
      <!-- ============================================== -->
      <template v-else-if="activeTab === 'friends'">
        <div class="friend-tab-header">
          <div class="friend-tab-hint">
            <span>👥 맞팔된 라이딩 친구가 '친구 공개'한 주행선입니다.</span>
          </div>
          <button 
            type="button" 
            class="refresh-friends-btn cycling-btn-subtle friend" 
            :disabled="isRefreshingFriends"
            @click="refreshFriendsTracks"
          >
            <span>🔄 {{ isRefreshingFriends ? '새로고침 중...' : '새로고침' }}</span>
          </button>
        </div>

        <!-- 친구 궤적 목록 -->
        <div v-if="friendTracks.length > 0" class="track-card-list">
          <div 
            v-for="fTrack in friendTracks" 
            :key="fTrack.id"
            :class="[
              'track-card', 
              'friend-card',
              { 
                active: selectedFriendTrackId === fTrack.id,
                hovered: hoveredFriendTrackId === fTrack.id,
                hidden: fTrack.visible === false
              }
            ]"
            @mouseenter="setHoveredFriendTrack(fTrack.id)"
            @mouseleave="setHoveredFriendTrack(null)"
            @click="selectFriendTrack(fTrack)"
          >
            <!-- 좌측 컬러 인디케이터 (시안 색상) -->
            <div 
              class="track-color-indicator friend" 
              :style="{ backgroundColor: fTrack.visible !== false ? '#06b6d4' : '#cbd5e1' }"
            ></div>

            <div class="track-card-main">
              <!-- 1행: 친구 작성자 정보 & 지도 토글 -->
              <div class="friend-card-top">
                <div class="friend-author-box">
                  <van-image 
                    round 
                    width="1.6rem" 
                    height="1.6rem" 
                    :src="fTrack.authorPhoto || defaultAvatar" 
                  />
                  <span class="friend-author-name">{{ fTrack.authorName || '친구' }}</span>
                  <span v-if="fTrack.authorCode" class="friend-author-code">{{ fTrack.authorCode }}</span>
                </div>

                <div class="card-actions" @click.stop>
                  <!-- 지도 표시 토글 버튼 -->
                  <button 
                    :class="['icon-btn', 'visibility-btn', { off: fTrack.visible === false }]"
                    @click="toggleFriendTrackVisibility(fTrack.id)"
                    :title="fTrack.visible !== false ? '지도에서 숨기기' : '지도에 표시하기'"
                  >
                    <span>{{ fTrack.visible !== false ? '👁️' : '🕶️' }}</span>
                  </button>
                </div>
              </div>

              <!-- 2행: 트랙 제목 -->
              <div class="friend-track-title text-truncate">
                <span>{{ fTrack.title }}</span>
              </div>

              <!-- 3행: 주행 통계 정보 칩 -->
              <div class="card-stats-row">
                <span class="cycling-chip friend">
                  {{ fTrack.distanceKm }} km
                </span>
                <span v-if="fTrack.elevationGainM > 0" class="cycling-chip friend">
                  {{ fTrack.elevationGainM }} m
                </span>
                <span v-if="fTrack.durationMinutes > 0" class="cycling-chip friend">
                  {{ formatDuration(fTrack.durationMinutes) }}
                </span>
                <span v-if="fTrack.date || fTrack.startTime || fTrack.createdAt" class="cycling-chip date">
                  {{ formatDate(fTrack.date || fTrack.startTime || fTrack.createdAt) }}
                </span>
                <button
                  type="button"
                  class="elevation-btn cycling-btn-subtle friend"
                  @click.stop="handleOpenElevation(fTrack)"
                  title="고도 프로필 차트 보기"
                >
                  고도 차트
                </button>
                <button
                  type="button"
                  class="share-card-btn cycling-btn-subtle friend"
                  @click.stop="handleOpenShareCard(fTrack, true)"
                  title="완주 인증 포토 카드 내보내기"
                >
                  인증 카드
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 친구 궤적 없음 빈 상태 -->
        <div v-else class="empty-state">
          <div class="empty-icon-wrap" style="background-color: #06b6d418;">
            <span class="empty-emoji">👥</span>
          </div>
          <div class="empty-title">
            {{ friendCount === 0 ? '아직 등록된 친구가 없습니다.' : '친구가 공유한 주행 기록이 없습니다.' }}
          </div>
          <p class="empty-desc">
            {{ friendCount === 0 
               ? '[내 정보]에서 라이딩 친구를 추가하면 서로의 주행 기록을 지도에 띄워 비교할 수 있습니다!' 
               : '친구에게 주행 기록을 [친구 공개]로 설정해달라고 요청해보세요!' }}
          </p>
        </div>
      </template>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useGpxManager } from '../composables/useGpxManager.js'
import { useFriendManager } from '../composables/useFriendManager.js'
import { useShareCard } from '../composables/useShareCard.js'
import { auth } from '../services/firebase.js'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show'])

const defaultAvatar = 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'

// GPX 통합 퍼사드 매니저
const gpxManager = useGpxManager()
const {
  tracks,
  totalDistanceKm,
  totalTracksCount,
  selectedTrackId,
  hoveredTrackId,
  themeStore,
  isAuthenticated,
  friendTracks,
  friendTracksCount,
  selectedFriendTrackId,
  hoveredFriendTrackId,
  uploadGpxFiles,
  selectTrack,
  setHoveredTrack,
  toggleVisibility,
  changeTrackVisibility,
  loadFriendsTracks,
  toggleFriendTrackVisibility,
  selectFriendTrack,
  setHoveredFriendTrack,
  updateTitle,
  deleteTrackWithConfirm,
  formatDuration,
  formatDate,
  getVisibilityLabel,
  getVisibilityIcon,
  openElevationProfile
} = gpxManager

const handleOpenElevation = (track) => {
  openElevationProfile(track.id)
  emit('update:show', false)
}

// 완주 인증 포토 카드 파사드
const shareCard = useShareCard()

const handleOpenShareCard = (track, isFriend = false) => {
  const riderName = isFriend
    ? (track.authorName || '친구')
    : (auth?.currentUser?.displayName || '라이더')
  const userCode = isFriend
    ? (track.authorCode || '')
    : (friendManager.currentUserCode.value || '')

  shareCard.openForTrack(track, { riderName, userCode })
  emit('update:show', false)
}

// 친구 시스템 매니저
const friendManager = useFriendManager()
const { friends, friendCount } = friendManager

// UI 상태
const activeTab = ref('my') // 'my' | 'friends'
const fileInputRef = ref(null)
const isDragging = ref(false)
const editingTrackId = ref(null)
const editingTitle = ref('')
const titleInputRef = ref(null)
const isRefreshingFriends = ref(false)

// 서랍 열릴 때 친구 트랙 자동 로드
watch(() => props.show, (newVal) => {
  if (newVal && friendCount.value > 0) {
    refreshFriendsTracks()
  }
})

// 탭 전환 핸들러
const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'friends' && friendCount.value > 0) {
    refreshFriendsTracks()
  }
}

// 친구 공유 트랙 새로고침
const refreshFriendsTracks = async () => {
  if (friendCount.value === 0) return
  isRefreshingFriends.value = true
  try {
    const friendUids = friends.value.map(f => f.friendUid)
    await loadFriendsTracks(friendUids)
  } finally {
    isRefreshingFriends.value = false
  }
}

// 공개 범위 토글 (나만보기 <-> 친구 공개)
const toggleShareVisibility = async (track) => {
  const targetVis = track.visibility === 'friends' ? 'private' : 'friends'
  await changeTrackVisibility(track.id, targetVis)
}

// 파일 선택 처리
const handleFileInputChange = (event) => {
  const files = event.target.files
  if (files && files.length > 0) {
    uploadGpxFiles(files)
  }
}

// 드래그 앤 드롭
const handleFileDrop = (event) => {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    uploadGpxFiles(files)
  }
}

// 제목 인라인 수정
const startEditTitle = (track) => {
  editingTrackId.value = track.id
  editingTitle.value = track.title
  nextTick(() => {
    if (titleInputRef.value) {
      titleInputRef.value.focus()
    }
  })
}

const saveTitle = async (track) => {
  if (editingTrackId.value === track.id) {
    const newTitle = editingTitle.value.trim()
    editingTrackId.value = null
    if (newTitle && newTitle !== track.title) {
      await updateTitle(track.id, newTitle)
    }
  }
}

const cancelEditTitle = () => {
  editingTrackId.value = null
}
</script>

<style scoped>
.gpx-drawer-popup {
  background-color: var(--card-bg, #ffffff);
  color: var(--text-main, #1e293b);
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.15);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px 12px 20px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 20px;
}

.header-title {
  font-size: 16.5px;
  font-weight: 800;
  letter-spacing: -0.3px;
}

.track-count-badge {
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 12px;
}

.header-sub-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
}

.header-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub, #64748b);
}

.header-sub strong {
  color: var(--text-main, #0f172a);
}

.sync-status {
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.sync-status.online {
  color: #059669;
}

.sync-status.offline {
  color: #ea580c;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 18px;
  color: var(--text-sub, #94a3b8);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--text-main, #1e293b);
}

/* 탭 세그먼트 */
.drawer-tabs-row {
  display: flex;
  gap: 8px;
  padding: 10px 20px;
  background-color: var(--app-bg, #f8fafc);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.tab-pill-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 12px;
  background: #ffffff;
  border: 1.5px solid var(--border-color, #cbd5e1);
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-pill-btn.active {
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.tab-count-tag {
  font-size: 10.5px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #64748b;
}

.drawer-body {
  padding: 14px 20px 24px 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 드롭존 영역 */
.upload-dropzone {
  position: relative;
  display: block;
  overflow: hidden;
  border: 2px dashed var(--border-color, #cbd5e1);
  border-radius: 14px;
  padding: 14px;
  background-color: var(--app-bg, #f8fafc);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.upload-dropzone:hover {
  border-color: #94a3b8;
  transform: translateY(-1px);
}

.file-input-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 20;
  -webkit-tap-highlight-color: transparent;
}

.dropzone-content {
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: none;
}

.upload-icon-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.upload-icon {
  font-size: 20px;
}

.upload-text-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.upload-main-text {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main, #1e293b);
}

.upload-hint {
  font-size: 11px;
  color: var(--text-sub, #64748b);
  line-height: 1.3;
}

/* 섹션 타이틀 */
.section-title-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main, #334155);
}

.section-hint {
  font-size: 10.5px;
  color: var(--text-sub, #94a3b8);
}

/* 친구 탭 상단 헤더 */
.friend-tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0 4px 0;
}

.friend-tab-hint {
  font-size: 11.5px;
  color: var(--text-sub, #64748b);
}

.refresh-friends-btn {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
}

.refresh-friends-btn:disabled {
  opacity: 0.6;
}

/* 트랙 카드 리스트 */
.track-card-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.track-card {
  position: relative;
  display: flex;
  border-radius: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  background-color: var(--card-bg, #ffffff);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
}

.track-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.07);
}

.track-card.active {
  border-width: 1.5px;
}

.track-card.hidden {
  opacity: 0.5;
  background-color: var(--app-bg, #f8fafc);
}

.track-color-indicator {
  width: 5px;
  flex-shrink: 0;
}

.track-card-main {
  flex: 1;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.track-title-wrapper {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  flex: 1;
}

.track-title {
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-main, #1e293b);
}

.title-edit-input {
  width: 100%;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  padding: 2px 6px;
  background-color: #ffffff;
  color: #1e293b;
  outline: none;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

/* 공개 범위 토글 칩 */
.vis-toggle-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  font-size: 10.5px;
  font-weight: 700;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  transition: all 0.2s;
}

.vis-toggle-chip.friends {
  background: #ecfeff;
  color: #0891b2;
  border-color: #a5f3fc;
}

.vis-toggle-chip:active {
  transform: scale(0.96);
}

.icon-btn {
  background: transparent;
  border: none;
  font-size: 13px;
  padding: 3px 5px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-sub, #64748b);
}

.icon-btn:hover {
  background-color: rgba(0, 0, 0, 0.06);
  transform: scale(1.08);
}

.visibility-btn.off {
  filter: grayscale(100%);
  opacity: 0.5;
}

.delete-btn:hover {
  background-color: #fee2e2;
  color: #ef4444;
}

/* 친구 카드 스타일 */
.friend-card {
  border-color: #e0f2fe;
}

.friend-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.friend-author-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.friend-author-name {
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
}

.friend-author-code {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  background: #e0f2fe;
  color: #0284c7;
  border-radius: 4px;
}

.friend-track-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #1e293b;
}

/* 통계 칩스 */
.card-stats-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

/* 통계 칩은 공통 .cycling-chip 클래스 사용 */

/* 빈 상태 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 28px 16px 20px 16px;
  gap: 8px;
}

.empty-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-emoji {
  font-size: 26px;
}

.empty-title {
  font-size: 14.5px;
  font-weight: 800;
  color: var(--text-main, #1e293b);
}

.empty-desc {
  font-size: 12px;
  color: var(--text-sub, #64748b);
  line-height: 1.5;
  margin: 0;
}
.elevation-btn {
  margin-left: auto;
}

.share-card-btn {
  margin-left: 4px;
}
</style>
