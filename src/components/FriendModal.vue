<template>
  <van-popup
    :show="show"
    @update:show="$emit('update:show', $event)"
    position="bottom"
    round
    closeable
    :style="{ height: '85%', maxHeight: '720px' }"
    :class="['friend-modal-popup', { 'is-dark': themeStore.isDark }]"
  >
    <div :class="['friend-modal', { 'is-dark': themeStore.isDark }]">
      <!-- 헤더 -->
      <div class="modal-header">
        <h3 class="modal-title">👥 라이딩 친구 관리</h3>
        <p class="modal-subtitle">친구와 주행 경로(GPX)를 공유하고 함께 지도를 색칠하세요.</p>
      </div>

      <div class="modal-body">
        <!-- 1. 내 친구 코드 카드 -->
        <div class="my-code-card">
          <div class="my-code-info">
            <span class="my-code-label">내 친구 코드</span>
            <span class="my-code-val">{{ currentUserCode || '발급 대기' }}</span>
          </div>
          <button type="button" class="copy-btn" @click="copyUserCode">
            <span>📋</span> 복사
          </button>
        </div>

        <!-- 2. 친구 검색 및 신청 섹션 -->
        <div class="section-card">
          <div class="section-title">친구 찾기</div>
          <div class="search-bar-row">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="친구 코드 입력 (예: CY-7K8P)"
              class="code-input"
              maxlength="10"
              @keyup.enter="handleSearch"
            />
            <button
              type="button"
              class="search-btn"
              :style="{ backgroundColor: themeColor }"
              :disabled="isSearching"
              @click="handleSearch"
            >
              {{ isSearching ? '검색 중...' : '검색' }}
            </button>
          </div>

          <!-- 검색 결과 카드 -->
          <div v-if="searchedUser" class="search-result-card">
            <div class="user-avatar-col">
              <van-image
                round
                width="2.6rem"
                height="2.6rem"
                :src="searchedUser.photoURL || defaultAvatar"
              />
            </div>
            <div class="user-meta-col">
              <div class="user-name">{{ searchedUser.displayName }}</div>
              <div class="user-tag">{{ searchedUser.userCode }}</div>
            </div>
            <div class="user-action-col">
              <span v-if="isFriend(searchedUser.uid)" class="status-badge friend">친구</span>
              <span v-else-if="hasSentRequestTo(searchedUser.uid)" class="status-badge requested">신청됨</span>
              <button
                v-else
                type="button"
                class="action-btn request"
                :style="{ backgroundColor: themeColor }"
                @click="handleSendRequest"
              >
                신청
              </button>
            </div>
          </div>
        </div>

        <!-- 3. 받은 친구 요청 (대기 목록) -->
        <div v-if="incomingRequests.length > 0" class="section-card request-section">
          <div class="section-title highlight">
            <span>받은 친구 요청</span>
            <span class="badge-count">{{ incomingRequests.length }}</span>
          </div>

          <div class="request-list">
            <div
              v-for="req in incomingRequests"
              :key="req.senderUid"
              class="request-item"
            >
              <van-image
                round
                width="2.4rem"
                height="2.4rem"
                :src="req.senderPhoto || defaultAvatar"
              />
              <div class="request-meta">
                <span class="request-name">{{ req.senderName }}</span>
                <span class="request-code">{{ req.senderCode }}</span>
              </div>
              <div class="request-actions">
                <button
                  type="button"
                  class="action-btn accept"
                  :style="{ backgroundColor: themeColor }"
                  @click="acceptRequest(req)"
                >
                  수락
                </button>
                <button
                  type="button"
                  class="action-btn reject"
                  @click="rejectRequest(req.senderUid)"
                >
                  거절
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 내 친구 목록 -->
        <div class="section-card">
          <div class="section-title">
            <span>내 친구 목록</span>
            <span class="sub-count">({{ friendCount }}명)</span>
          </div>

          <div v-if="friendCount > 0" class="friend-list">
            <div
              v-for="friend in friends"
              :key="friend.friendUid"
              class="friend-item"
            >
              <van-image
                round
                width="2.5rem"
                height="2.5rem"
                :src="friend.photoURL || defaultAvatar"
              />
              <div class="friend-meta">
                <div class="friend-name">{{ friend.displayName }}</div>
                <div class="friend-sub">
                  <span class="friend-code">{{ friend.userCode }}</span>
                  <span v-if="friend.since" class="friend-since">· {{ formatFriendSince(friend.since) }}</span>
                </div>
              </div>
              <div class="friend-actions">
                <button
                  type="button"
                  class="action-btn unfriend"
                  @click="unfriend(friend)"
                >
                  끊기
                </button>
              </div>
            </div>
          </div>

          <!-- 친구 목록 비었을 때 -->
          <div v-else class="empty-friends">
            <div class="empty-icon">🚴💨</div>
            <p class="empty-text">아직 함께 달리는 친구가 없습니다.<br/>친구 코드를 검색하여 라이딩 메이트를 맺어보세요!</p>
          </div>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFriendManager } from '../composables/useFriendManager.js'
import { useThemeStore } from '../stores/theme.js'

defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:show'])

const defaultAvatar = 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'

const friendManager = useFriendManager()
const themeStore = useThemeStore()

const themeColor = computed(() => themeStore.currentTheme.main || '#3b82f6')

const {
  currentUserCode,
  friends,
  incomingRequests,
  friendCount,
  isFriend,
  hasSentRequestTo,
  searchUser,
  sendRequest,
  acceptRequest,
  rejectRequest,
  unfriend,
  copyUserCode,
  formatFriendSince
} = friendManager

const searchQuery = ref('')
const searchedUser = ref(null)
const isSearching = ref(false)

const handleSearch = async () => {
  if (!searchQuery.value || !searchQuery.value.trim()) return
  isSearching.value = true
  searchedUser.value = null
  try {
    const user = await searchUser(searchQuery.value)
    if (user) {
      searchedUser.value = user
    }
  } finally {
    isSearching.value = false
  }
}

const handleSendRequest = async () => {
  if (!searchedUser.value) return
  const success = await sendRequest(searchedUser.value)
  if (success) {
    // 신청 완료 후 검색창 초기화
    searchQuery.value = ''
  }
}
</script>

<style scoped>
.friend-modal-popup {
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  background-color: var(--app-bg, #f8fafc);
}

.friend-modal {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

.modal-header {
  padding: 20px 20px 12px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-main, #0f172a);
}

.modal-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-sub, #64748b);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 내 코드 카드 */
.my-code-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.my-code-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.my-code-label {
  font-size: 11px;
  color: var(--text-sub, #64748b);
  font-weight: 500;
}

.my-code-val {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--text-main, #0f172a);
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:active {
  background: #e2e8f0;
  transform: scale(0.97);
}

/* 공통 섹션 카드 */
.section-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 14px 16px;
  border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main, #1e293b);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sub-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-sub, #64748b);
}

.badge-count {
  background: #ef4444;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
}

/* 검색 바 */
.search-bar-row {
  display: flex;
  gap: 8px;
}

.code-input {
  flex: 1;
  padding: 9px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  text-transform: uppercase;
  transition: border-color 0.2s;
}

.code-input:focus {
  border-color: #3b82f6;
}

.search-btn {
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.search-btn:disabled {
  opacity: 0.6;
}

/* 검색 결과 카드 */
.search-result-card {
  margin-top: 10px;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  gap: 10px;
}

.user-meta-col {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
}

.user-tag {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.status-badge {
  font-size: 11.5px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
}

.status-badge.friend {
  background: #dcfce7;
  color: #166534;
}

.status-badge.requested {
  background: #f1f5f9;
  color: #64748b;
}

/* 공통 액션 버튼 */
.action-btn {
  border: none;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.request {
  color: #ffffff;
}

.action-btn.accept {
  color: #ffffff;
}

.action-btn.reject {
  background: #f1f5f9;
  color: #64748b;
}

.action-btn.unfriend {
  background: #fff1f2;
  color: #e11d48;
}

.action-btn:active {
  transform: scale(0.96);
}

/* 받은 요청 목록 */
.request-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.request-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 10px;
}

.request-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.request-name {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.request-code {
  font-size: 11px;
  color: #ef4444;
  font-weight: 600;
}

.request-actions {
  display: flex;
  gap: 6px;
}

/* 친구 목록 */
.friend-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.friend-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.friend-name {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
}

.friend-sub {
  font-size: 11px;
  color: #64748b;
  display: flex;
  gap: 4px;
  align-items: center;
}

.empty-friends {
  text-align: center;
  padding: 24px 12px;
}

.empty-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.empty-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #94a3b8;
}

/* 다크 테마 지원 */
.friend-modal-popup.is-dark {
  background-color: #18181b;
}

.friend-modal.is-dark .modal-header {
  border-bottom-color: #27272a;
}

.friend-modal.is-dark .modal-title {
  color: #f4f4f5;
}

.friend-modal.is-dark .modal-subtitle {
  color: #a1a1aa;
}

.friend-modal.is-dark .my-code-card {
  background-color: #27272a;
  border-color: #3f3f46;
}

.friend-modal.is-dark .my-code-label {
  color: #a1a1aa;
}

.friend-modal.is-dark .my-code-val {
  color: #ffffff;
}

.friend-modal.is-dark .copy-btn {
  background-color: #3f3f46;
  border-color: #52525b;
  color: #f4f4f5;
}

.friend-modal.is-dark .section-card {
  background-color: #27272a;
  border-color: #3f3f46;
}

.friend-modal.is-dark .section-title {
  color: #f4f4f5;
}

.friend-modal.is-dark .code-input {
  background-color: #18181b;
  border-color: #3f3f46;
  color: #f4f4f5;
}

.friend-modal.is-dark .search-result-card {
  background-color: #18181b;
  border-color: #3f3f46;
}

.friend-modal.is-dark .user-name {
  color: #f4f4f5;
}

.friend-modal.is-dark .user-tag {
  color: #a1a1aa;
}

.friend-modal.is-dark .friend-item {
  background-color: #18181b;
  border-color: #3f3f46;
}

.friend-modal.is-dark .friend-name {
  color: #f4f4f5;
}

.friend-modal.is-dark .friend-sub {
  color: #a1a1aa;
}

.friend-modal.is-dark .status-badge.requested {
  background-color: #27272a;
  color: #a1a1aa;
}

.friend-modal.is-dark .action-btn.reject {
  background-color: #3f3f46;
  color: #d4d4d8;
}

.friend-modal.is-dark .request-item {
  background-color: #3f1d1d;
  border-color: #7f1d1d;
}

.friend-modal.is-dark .request-name {
  color: #fecaca;
}
</style>
