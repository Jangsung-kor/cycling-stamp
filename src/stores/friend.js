import { defineStore } from 'pinia'
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  writeBatch
} from 'firebase/firestore'
import { db, auth } from '../services/firebase.js'
import { generateUserCode, normalizeUserCode, validateUserCode } from '../utils/userCodeGenerator.js'

export const useFriendStore = defineStore('friend', {
  state: () => ({
    currentUserCode: null,
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    selectedFriend: null,
    isLoading: false,
    error: null,
    _unsubscribers: []
  }),

  getters: {
    // 맞팔된 친구 총 인원수
    friendCount: (state) => state.friends.length,

    // 대기 중인 받은 친구 요청 수 (알림 뱃지용)
    pendingRequestCount: (state) => state.incomingRequests.length,

    // 특정 UID가 이미 친구인지 여부
    isFriend: (state) => (uid) => state.friends.some(f => f.friendUid === uid),

    // 특정 UID로부터 받은 요청이 대기 중인지 여부
    hasPendingRequestFrom: (state) => (uid) => state.incomingRequests.some(r => r.senderUid === uid),

    // 특정 UID에게 이미 요청을 보냈는지 여부
    hasSentRequestTo: (state) => (uid) => state.outgoingRequests.some(r => r.targetUid === uid),

    // UID로 친구 정보 단일 조회
    getFriendByUid: (state) => (uid) => state.friends.find(f => f.friendUid === uid) || null
  },

  actions: {
    /**
     * 사용자 고유 친구 코드 초기화 및 생성
     * - Firestore users/{uid} 문서에 userCode가 없으면 신규 발급하고 user_codes에 인덱싱
     */
    async initUserCode(user) {
      if (!user || !user.uid) return null

      this.isLoading = true
      try {
        if (!db) {
          // 오프라인 / 테스트 환경 폴백
          this.currentUserCode = user.userCode || this.currentUserCode || generateUserCode()
          return this.currentUserCode
        }

        const userRef = doc(db, 'users', user.uid)
        const userSnap = await getDoc(userRef)

        let code = user.userCode || (userSnap.exists() ? userSnap.data()?.userCode : null)

        if (!code) {
          // 신규 코드 생성
          code = generateUserCode()
          // user_codes에 O(1) 단일 문서 인덱싱
          await setDoc(doc(db, 'user_codes', code), {
            uid: user.uid,
            displayName: user.displayName || '라이더',
            photoURL: user.photoURL || null,
            createdAt: new Date().toISOString()
          }, { merge: true })

          // users 문서에 userCode 저장
          await setDoc(userRef, {
            userCode: code,
            displayName: user.displayName || '라이더',
            photoURL: user.photoURL || null,
            updatedAt: new Date().toISOString()
          }, { merge: true })
        }

        this.currentUserCode = code
        return code
      } catch (err) {
        console.error('[FriendStore] initUserCode failed:', err)
        this.error = err.message
        return null
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 친구 코드로 사용자 검색 (O(1) 인덱스 조회)
     */
    async searchUserByCode(rawCode) {
      const normalized = normalizeUserCode(rawCode)
      if (!validateUserCode(normalized)) {
        return { success: false, reason: 'INVALID_FORMAT', message: '올바른 친구 코드 형식(예: CY-7K8P)이 아닙니다.' }
      }

      this.isLoading = true
      try {
        if (!db) {
          return { success: false, reason: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다.' }
        }

        const codeDocRef = doc(db, 'user_codes', normalized)
        const codeSnap = await getDoc(codeDocRef)

        if (!codeSnap.exists()) {
          return { success: false, reason: 'NOT_FOUND', message: '해당 코드의 라이더를 찾을 수 없습니다.' }
        }

        const data = codeSnap.data()
        return {
          success: true,
          user: {
            uid: data.uid,
            displayName: data.displayName || '라이더',
            photoURL: data.photoURL || null,
            userCode: normalized
          }
        }
      } catch (err) {
        console.error('[FriendStore] searchUserByCode error:', err)
        return { success: false, reason: 'ERROR', message: err.message }
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 친구 요청 전송 (users/{targetUid}/friend_requests/{currentUid})
     */
    async sendFriendRequest(targetUser) {
      if (!targetUser || !targetUser.uid) {
        return { success: false, message: '대상 라이더 정보가 올바르지 않습니다.' }
      }

      const currentUid = auth?.currentUser?.uid || 'test-user-uid'
      const currentUserName = auth?.currentUser?.displayName || '나'
      const currentUserPhoto = auth?.currentUser?.photoURL || null
      const currentCode = this.currentUserCode || 'CY-TEST'

      // 1. 자기 자신에게 요청 방지
      if (targetUser.uid === currentUid) {
        return { success: false, message: '나 자신에게는 친구 신청을 보낼 수 없습니다.' }
      }

      // 2. 이미 친구인 경우 방지
      if (this.isFriend(targetUser.uid)) {
        return { success: false, message: '이미 친구로 등록되어 있는 라이더입니다.' }
      }

      // 3. 이미 보낸 요청인지 방지
      if (this.hasSentRequestTo(targetUser.uid)) {
        return { success: false, message: '이미 친구 신청을 보냈습니다. 수락을 기다려주세요.' }
      }

      try {
        if (db && auth?.currentUser) {
          const reqRef = doc(db, 'users', targetUser.uid, 'friend_requests', currentUid)
          await setDoc(reqRef, {
            senderUid: currentUid,
            senderName: currentUserName,
            senderPhoto: currentUserPhoto,
            senderCode: currentCode,
            createdAt: new Date().toISOString(),
            status: 'pending'
          })
        }

        // 상태 낙관적(Optimistic) 업데이트
        this.outgoingRequests.push({
          targetUid: targetUser.uid,
          targetName: targetUser.displayName,
          targetPhoto: targetUser.photoURL,
          targetCode: targetUser.userCode,
          createdAt: new Date().toISOString()
        })

        return { success: true, message: `${targetUser.displayName} 님에게 친구 신청을 보냈습니다.` }
      } catch (err) {
        console.error('[FriendStore] sendFriendRequest error:', err)
        return { success: false, message: '친구 신청 중 오류가 발생했습니다: ' + err.message }
      }
    },

    /**
     * 받은 친구 요청 수락 (양방향 N:N 친구 문서 생성 및 요청 삭제)
     */
    async acceptFriendRequest(request) {
      if (!request || !request.senderUid) {
        return { success: false, message: '유효하지 않은 요청 데이터입니다.' }
      }

      const currentUid = auth?.currentUser?.uid || 'test-user-uid'
      const currentUserName = auth?.currentUser?.displayName || '나'
      const currentUserPhoto = auth?.currentUser?.photoURL || null
      const currentCode = this.currentUserCode || 'CY-TEST'
      const now = new Date().toISOString()

      try {
        if (db && auth?.currentUser) {
          const batch = writeBatch(db)

          // 1. 내 친구 목록에 상대방 추가
          const myFriendRef = doc(db, 'users', currentUid, 'friends', request.senderUid)
          batch.set(myFriendRef, {
            friendUid: request.senderUid,
            displayName: request.senderName,
            photoURL: request.senderPhoto || null,
            userCode: request.senderCode || '',
            since: now
          })

          // 2. 상대방 친구 목록에 나 추가
          const theirFriendRef = doc(db, 'users', request.senderUid, 'friends', currentUid)
          batch.set(theirFriendRef, {
            friendUid: currentUid,
            displayName: currentUserName,
            photoURL: currentUserPhoto,
            userCode: currentCode,
            since: now
          })

          // 3. 대기 중인 친구 요청 삭제
          const reqRef = doc(db, 'users', currentUid, 'friend_requests', request.senderUid)
          batch.delete(reqRef)

          await batch.commit()
        }

        // 낙관적 상태 업데이트
        this.friends.push({
          friendUid: request.senderUid,
          displayName: request.senderName,
          photoURL: request.senderPhoto || null,
          userCode: request.senderCode || '',
          since: now
        })

        this.incomingRequests = this.incomingRequests.filter(r => r.senderUid !== request.senderUid)

        return { success: true, message: `${request.senderName} 님과 친구가 되었습니다! 🚴` }
      } catch (err) {
        console.error('[FriendStore] acceptFriendRequest error:', err)
        return { success: false, message: '친구 수락 처리 중 오류: ' + err.message }
      }
    },

    /**
     * 받은 친구 요청 거절 (요청 문서 삭제)
     */
    async rejectFriendRequest(senderUid) {
      if (!senderUid) return { success: false, message: '잘못된 요청입니다.' }

      const currentUid = auth?.currentUser?.uid || 'test-user-uid'

      try {
        if (db && auth?.currentUser) {
          const reqRef = doc(db, 'users', currentUid, 'friend_requests', senderUid)
          await deleteDoc(reqRef)
        }

        // 낙관적 상태 업데이트
        this.incomingRequests = this.incomingRequests.filter(r => r.senderUid !== senderUid)

        return { success: true, message: '친구 요청을 거절했습니다.' }
      } catch (err) {
        console.error('[FriendStore] rejectFriendRequest error:', err)
        return { success: false, message: '친구 거절 처리 중 오류: ' + err.message }
      }
    },

    /**
     * 친구 관계 삭제 (양방향 친구 문서 동시 삭제)
     */
    async removeFriend(friendUid) {
      if (!friendUid) return { success: false, message: '유효하지 않은 친구 ID입니다.' }

      const currentUid = auth?.currentUser?.uid || 'test-user-uid'

      try {
        if (db && auth?.currentUser) {
          const batch = writeBatch(db)
          const myFriendRef = doc(db, 'users', currentUid, 'friends', friendUid)
          const theirFriendRef = doc(db, 'users', friendUid, 'friends', currentUid)
          batch.delete(myFriendRef)
          batch.delete(theirFriendRef)
          await batch.commit()
        }

        // 낙관적 상태 업데이트
        this.friends = this.friends.filter(f => f.friendUid !== friendUid)
        if (this.selectedFriend?.friendUid === friendUid) {
          this.selectedFriend = null
        }

        return { success: true, message: '친구 목록에서 삭제되었습니다.' }
      } catch (err) {
        console.error('[FriendStore] removeFriend error:', err)
        return { success: false, message: '친구 삭제 중 오류: ' + err.message }
      }
    },

    /**
     * 실시간 친구 및 친구 요청 구독 (onSnapshot)
     */
    subscribeFriendData(uid) {
      this.unsubscribeAll()

      if (!db || !uid) return

      try {
        // 1. 친구 목록 실시간 구독
        const friendsRef = collection(db, 'users', uid, 'friends')
        const unsubFriends = onSnapshot(friendsRef, (snapshot) => {
          this.friends = snapshot.docs.map(doc => doc.data())
        }, (err) => {
          console.warn('[FriendStore] friends listener warning:', err)
        })
        this._unsubscribers.push(unsubFriends)

        // 2. 수신된 친구 요청 실시간 구독
        const requestsRef = collection(db, 'users', uid, 'friend_requests')
        const unsubRequests = onSnapshot(requestsRef, (snapshot) => {
          this.incomingRequests = snapshot.docs.map(doc => doc.data())
        }, (err) => {
          console.warn('[FriendStore] friend_requests listener warning:', err)
        })
        this._unsubscribers.push(unsubRequests)
      } catch (err) {
        console.error('[FriendStore] subscribeFriendData error:', err)
      }
    },

    /**
     * 구독 해제 헬퍼
     */
    unsubscribeAll() {
      this._unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub()
      })
      this._unsubscribers = []
    },

    /**
     * 테스트 및 로그아웃용 상태 초기화
     */
    clearState() {
      this.unsubscribeAll()
      this.currentUserCode = null
      this.friends = []
      this.incomingRequests = []
      this.outgoingRequests = []
      this.selectedFriend = null
      this.isLoading = false
      this.error = null
    }
  }
})
