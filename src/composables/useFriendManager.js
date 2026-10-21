import { computed } from 'vue'
import { showToast, showSuccessToast, showFailToast, showConfirmDialog } from 'vant'
import { useFriendStore } from '../stores/friend.js'
import { auth } from '../services/firebase.js'
import { normalizeUserCode } from '../utils/userCodeGenerator.js'
import { MAX_FRIENDS_LIMIT } from '../constants/friend.js'

/**
 * N:N 친구 시스템 단일 관리 창구 (Facade Composable)
 * - 친구 목록, 친구 요청 수신/발신 상태 반응형 노출
 * - 친구 검색, 신청, 수락, 거절, 친구 끊기 통합 처리
 * - 사용자 확인 다이얼로그 및 Toast 피드백 단일 접점 총괄
 * - 고유 친구 코드 클립보드 복사 유틸리티
 */
export function useFriendManager() {
  const friendStore = useFriendStore()

  // 반응형 상태 및 Getters
  const currentUserCode = computed(() => friendStore.currentUserCode)
  const friends = computed(() => friendStore.friends)
  const incomingRequests = computed(() => friendStore.incomingRequests)
  const outgoingRequests = computed(() => friendStore.outgoingRequests)
  const friendCount = computed(() => friendStore.friendCount)
  const pendingRequestCount = computed(() => friendStore.pendingRequestCount)
  const selectedFriend = computed(() => friendStore.selectedFriend)
  const isLoading = computed(() => friendStore.isLoading)
  const isFriendLimitReached = computed(() => friendStore.isFriendLimitReached)
  const maxFriendsLimit = MAX_FRIENDS_LIMIT

  // 인증 여부
  const isAuthenticated = computed(() => !!auth?.currentUser)

  /**
   * 사용자 고유 친구 코드 초기화
   */
  const initUserCode = async (user = auth?.currentUser) => {
    if (!user) return null
    return await friendStore.initUserCode(user)
  }

  /**
   * 실시간 친구 데이터 리스너 등록
   */
  const startListening = (uid = auth?.currentUser?.uid) => {
    if (uid) {
      friendStore.subscribeFriendData(uid)
    }
  }

  /**
   * 리스너 정리
   */
  const stopListening = () => {
    friendStore.unsubscribeAll()
  }

  /**
   * 친구 코드로 사용자 검색
   */
  const searchUser = async (rawCode) => {
    if (!rawCode || !rawCode.trim()) {
      showFailToast('친구 코드를 입력해주세요.')
      return null
    }

    const res = await friendStore.searchUserByCode(rawCode)
    if (!res.success) {
      showFailToast(res.message || '검색에 실패했습니다.')
      return null
    }
    return res.user
  }

  /**
   * 친구 신청 전송
   */
  const sendRequest = async (targetUser) => {
    if (!targetUser) return false

    const res = await friendStore.sendFriendRequest(targetUser)
    if (res.success) {
      showSuccessToast(res.message)
      return true
    } else {
      showFailToast(res.message)
      return false
    }
  }

  /**
   * 받은 친구 요청 수락
   */
  const acceptRequest = async (request) => {
    if (!request) return false

    const res = await friendStore.acceptFriendRequest(request)
    if (res.success) {
      showSuccessToast(res.message)
      return true
    } else {
      showFailToast(res.message)
      return false
    }
  }

  /**
   * 받은 친구 요청 거절
   */
  const rejectRequest = async (senderUid) => {
    if (!senderUid) return false

    const res = await friendStore.rejectFriendRequest(senderUid)
    if (res.success) {
      showToast('친구 요청을 거절했습니다.')
      return true
    } else {
      showFailToast(res.message)
      return false
    }
  }

  /**
   * 친구 삭제 (확인 다이얼로그 후 진행)
   */
  const unfriend = async (friend) => {
    if (!friend || !friend.friendUid) return false

    try {
      if (typeof showConfirmDialog === 'function') {
        await showConfirmDialog({
          title: '친구 끊기',
          message: `'${friend.displayName}' 님과 친구를 끊으시겠습니까?\n서로의 비공개 GPX 궤적을 더 이상 볼 수 없습니다.`,
          confirmButtonText: '친구 끊기',
          confirmButtonColor: '#ee0a24',
          cancelButtonText: '취소'
        })
      }

      const res = await friendStore.removeFriend(friend.friendUid)
      if (res.success) {
        showSuccessToast('친구 목록에서 삭제되었습니다.')
        return true
      } else {
        showFailToast(res.message)
        return false
      }
    } catch (err) {
      // 다이얼로그 취소 시 아무 동작 안 함
      return false
    }
  }

  /**
   * 내 친구 코드 클립보드 복사
   */
  const copyUserCode = async () => {
    const code = currentUserCode.value
    if (!code) {
      showFailToast('발급된 친구 코드가 없습니다.')
      return false
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code)
        showSuccessToast(`친구 코드 복사 완료: ${code}`)
        return true
      } else {
        showToast(code)
        return true
      }
    } catch (err) {
      showToast(code)
      return true
    }
  }

  /**
   * 친구 맺은 날짜 포맷팅 (YYYY.MM.DD)
   */
  const formatFriendSince = (isoStr) => {
    if (!isoStr) return ''
    try {
      const d = new Date(isoStr)
      if (isNaN(d.getTime())) return ''
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}.${mm}.${dd}`
    } catch {
      return ''
    }
  }

  return {
    // 스토어 인스턴스 직접 접근
    friendStore,

    // 반응형 상태
    currentUserCode,
    friends,
    incomingRequests,
    outgoingRequests,
    friendCount,
    pendingRequestCount,
    selectedFriend,
    isLoading,
    isFriendLimitReached,
    maxFriendsLimit,
    isAuthenticated,

    // 유틸/판별 메서드
    isFriend: friendStore.isFriend,
    hasPendingRequestFrom: friendStore.hasPendingRequestFrom,
    hasSentRequestTo: friendStore.hasSentRequestTo,
    formatFriendSince,

    // 사용자 액션
    initUserCode,
    startListening,
    stopListening,
    searchUser,
    sendRequest,
    acceptRequest,
    rejectRequest,
    unfriend,
    copyUserCode
  }
}
