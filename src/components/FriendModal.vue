<template>
  <van-popup
    :show="show"
    @update:show="$emit('update:show', $event)"
    position="bottom"
    round
    closeable
    :style="{ height: '85%', maxHeight: '720px' }"
    class="friend-modal-popup cycling-modal-popup"
  >
    <div class="friend-modal cycling-modal-container">
      <!-- 헤더 -->
      <div class="modal-header cycling-modal-header">
        <h3 class="modal-title cycling-modal-title">라이딩 친구 관리</h3>
        <p class="modal-subtitle cycling-modal-subtitle">친구와 주행 경로(GPX)를 공유하고 함께 지도를 색칠하세요.</p>
      </div>

      <div class="modal-body cycling-modal-body">
        <!-- 1. 내 친구 코드 카드 -->
        <div class="my-code-card">
          <div class="my-code-info">
            <span class="my-code-label">내 친구 코드</span>
            <span class="my-code-val tabular-nums">{{ currentUserCode || '발급 대기' }}</span>
          </div>
          <button type="button" class="copy-btn cycling-btn-subtle" @click="copyUserCode">
            복사
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

          <div v-if="isFriendLimitReached" class="limit-warning-banner">
            최대 친구 정원({{ maxFriendsLimit }}명)에 도달하여 추가 친구 신청을 할 수 없습니다.
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
              <span v-if="isFriend(searchedUser.uid)" class="status-badge cycling-badge friend">친구</span>
              <span v-else-if="hasSentRequestTo(searchedUser.uid)" class="status-badge cycling-badge">신청됨</span>
              <button
                v-else-if="isFriendLimitReached"
                type="button"
                class="action-btn request disabled"
                disabled
              >
                정원 초과
              </button>
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
                  :class="{ disabled: isFriendLimitReached }"
                  :style="isFriendLimitReached ? {} : { backgroundColor: themeColor }"
                  :disabled="isFriendLimitReached"
                  @click="acceptRequest(req)"
                >
                  {{ isFriendLimitReached ? '정원 초과' : '수락' }}
                </button>
                <button
                  type="button"
                  class="action-btn reject cycling-btn-subtle"
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
            <span class="sub-count tabular-nums">({{ friendCount }}/{{ maxFriendsLimit }}명)</span>
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
                  <span class="friend-code tabular-nums">{{ friend.userCode }}</span>
                  <span v-if="friend.since" class="friend-since tabular-nums">· {{ formatFriendSince(friend.since) }}</span>
                </div>
              </div>
              <div class="friend-actions">
                <button
                  type="button"
                  class="action-btn unfriend cycling-btn-subtle"
                  @click="unfriend(friend)"
                >
                  끊기
                </button>
              </div>
            </div>
          </div>

          <!-- 친구 목록 비었을 때 -->
          <div v-else class="empty-friends cycling-empty-state">
            <p class="empty-text cycling-empty-desc">아직 등록된 친구가 없습니다.<br/>친구 코드를 검색하여 라이딩 메이트를 맺어보세요.</p>
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
  isFriendLimitReached,
  maxFriendsLimit,
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
.modal-header {
  padding: 20px 20px 12px;
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
  background: var(--card-bg, #ffffff);
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
}

/* 공통 섹션 카드 */
.section-card {
  background: var(--card-bg, #ffffff);
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
  background: var(--color-danger, #ef4444);
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
  border: 1px solid var(--border-color, #cbd5e1);
  background-color: var(--card-bg, #ffffff);
  color: var(--text-main, #0f172a);
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
  background: var(--app-bg, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
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
  color: var(--text-main, #0f172a);
}

.user-tag {
  font-size: 11px;
  color: var(--text-sub, #64748b);
  font-weight: 500;
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
  color: var(--text-sub, #64748b);
}

.action-btn.unfriend {
  color: var(--color-danger, #e11d48);
}

.action-btn:active {
  transform: scale(0.96);
}

.action-btn.disabled,
.action-btn:disabled {
  background: var(--border-color, #cbd5e1) !important;
  color: var(--text-sub, #64748b) !important;
  cursor: not-allowed;
  opacity: 0.8;
  transform: none !important;
}

.limit-warning-banner {
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
  font-size: 11.5px;
  color: #ef4444;
  line-height: 1.4;
  font-weight: 500;
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
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
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
  color: var(--text-main, #1e293b);
}

.request-code {
  font-size: 11px;
  color: var(--color-danger, #ef4444);
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
  background: var(--app-bg, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
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
  color: var(--text-main, #0f172a);
}

.friend-sub {
  font-size: 11px;
  color: var(--text-sub, #64748b);
  display: flex;
  gap: 4px;
  align-items: center;
}

/* 빈 상태는 공통 .cycling-empty-state / desc 활용 */
.empty-friends {
  padding: 24px 12px;
}
</style>
