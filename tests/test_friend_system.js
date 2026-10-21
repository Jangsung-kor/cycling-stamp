import assert from 'node:assert'
import { createPinia, setActivePinia } from 'pinia'
import {
  generateUserCode,
  normalizeUserCode,
  validateUserCode
} from '../src/utils/userCodeGenerator.js'
import { useFriendStore } from '../src/stores/friend.js'
import { useFriendManager } from '../src/composables/useFriendManager.js'

console.log('=== N:N 소셜 그래프 & 친구 시스템 엄격 단위 테스트 시작 ===\n')

let passedCount = 0
let failedCount = 0

async function runTest(name, fn) {
  try {
    await fn()
    console.log(`[PASS] ${name}`)
    passedCount++
  } catch (err) {
    console.error(`[FAIL] ${name}`)
    console.error(`       Error: ${err.message}`)
    failedCount++
  }
}

async function runAll() {
  setActivePinia(createPinia())

  // ==========================================
  // 1. 유저 코드 생성기 및 검증기 테스트
  // ==========================================
  await runTest('1-1. 친구 코드 생성 포맷 검증 (CY-XXXX)', () => {
    const code1 = generateUserCode()
    const code2 = generateUserCode(6)

    assert.ok(code1.startsWith('CY-'))
    assert.strictEqual(code1.length, 7) // CY- + 4글자
    assert.strictEqual(code2.length, 9) // CY- + 6글자
    assert.ok(validateUserCode(code1))
    assert.ok(validateUserCode(code2))
  })

  await runTest('1-2. 친구 코드 정규화 (대소문자, 공백, 기호 보정)', () => {
    assert.strictEqual(normalizeUserCode('cy-7k8p'), 'CY-7K8P')
    assert.strictEqual(normalizeUserCode('#cy 7k8p'), 'CY-7K8P')
    assert.strictEqual(normalizeUserCode('7k8p'), 'CY-7K8P')
    assert.strictEqual(normalizeUserCode('   CY - 8N2M   '), 'CY-8N2M')
    assert.strictEqual(normalizeUserCode(''), '')
    assert.strictEqual(normalizeUserCode(null), '')
  })

  await runTest('1-3. 유효하지 않은 친구 코드 차단', () => {
    // 0, 1, O, I 등 혼동 문자가 포함되거나 너무 짧은 코드 방어
    assert.strictEqual(validateUserCode('CY-01OI'), false)
    assert.strictEqual(validateUserCode('CY-A'), false)
    assert.strictEqual(validateUserCode('INVALID-FORMAT'), false)
    assert.strictEqual(validateUserCode(''), false)
    assert.strictEqual(validateUserCode(null), false)
  })

  // ==========================================
  // 2. Friend Store 기본 상태 및 Getters 검증
  // ==========================================
  const friendStore = useFriendStore()

  await runTest('2-1. 스토어 초기 상태 및 Getters 정합성', () => {
    friendStore.clearState()
    assert.strictEqual(friendStore.friendCount, 0)
    assert.strictEqual(friendStore.pendingRequestCount, 0)
    assert.strictEqual(friendStore.friends.length, 0)
    assert.strictEqual(friendStore.incomingRequests.length, 0)
    assert.strictEqual(friendStore.outgoingRequests.length, 0)
    assert.strictEqual(friendStore.isFriend('target-123'), false)
  })

  await runTest('2-2. 유저 코드 초기화', async () => {
    const mockUser = { uid: 'user-me-123', displayName: '홍길동' }
    const code = await friendStore.initUserCode(mockUser)

    assert.ok(code.startsWith('CY-'))
    assert.strictEqual(friendStore.currentUserCode, code)
  })

  // ==========================================
  // 3. 친구 요청 전송 및 방어 로직 검증
  // ==========================================
  await runTest('3-1. 자기 자신에게 친구 신청 방어', async () => {
    // test-user-uid가 기본 mock UID
    const res = await friendStore.sendFriendRequest({ uid: 'test-user-uid', displayName: '나' })
    assert.strictEqual(res.success, false)
    assert.ok(res.message.includes('나 자신'))
  })

  await runTest('3-2. 정상 친구 신청 전송 및 중복 신청 방어', async () => {
    const target = { uid: 'rider-girlfriend-456', displayName: '지은', userCode: 'CY-8N2M' }

    // 첫 요청 성공
    const res1 = await friendStore.sendFriendRequest(target)
    assert.strictEqual(res1.success, true)
    assert.strictEqual(friendStore.outgoingRequests.length, 1)
    assert.strictEqual(friendStore.hasSentRequestTo(target.uid), true)

    // 동일 대상 중복 요청 방어
    const res2 = await friendStore.sendFriendRequest(target)
    assert.strictEqual(res2.success, false)
    assert.ok(res2.message.includes('이미 친구 신청'))
    assert.strictEqual(friendStore.outgoingRequests.length, 1)
  })

  // ==========================================
  // 4. 친구 요청 수신 및 수락/거절 라이프사이클
  // ==========================================
  await runTest('4-1. 친구 요청 수락 시 양방향 친구 맺기 및 요청 목록 제거', async () => {
    const incomingReq = {
      senderUid: 'rider-pal-789',
      senderName: '민수',
      senderPhoto: 'https://example.com/avatar.jpg',
      senderCode: 'CY-3K4P',
      createdAt: '2026-10-20T10:00:00.000Z'
    }

    // 수신 대기 상태 주입
    friendStore.incomingRequests.push(incomingReq)
    assert.strictEqual(friendStore.pendingRequestCount, 1)
    assert.strictEqual(friendStore.hasPendingRequestFrom(incomingReq.senderUid), true)

    // 수락 실행
    const acceptRes = await friendStore.acceptFriendRequest(incomingReq)
    assert.strictEqual(acceptRes.success, true)

    // 결과 상태 검증
    assert.strictEqual(friendStore.friendCount, 1)
    assert.strictEqual(friendStore.pendingRequestCount, 0)
    assert.strictEqual(friendStore.isFriend(incomingReq.senderUid), true)

    const friend = friendStore.getFriendByUid(incomingReq.senderUid)
    assert.ok(friend)
    assert.strictEqual(friend.displayName, '민수')
    assert.strictEqual(friend.userCode, 'CY-3K4P')
    assert.ok(friend.since)

    // 이미 친구인 상대에게 요청 보내기 방어 확인
    const dupFriendRes = await friendStore.sendFriendRequest({ uid: incomingReq.senderUid, displayName: '민수' })
    assert.strictEqual(dupFriendRes.success, false)
    assert.ok(dupFriendRes.message.includes('이미 친구'))
  })

  await runTest('4-2. 친구 요청 거절 시 목록 제거 및 친구 미추가', async () => {
    const unwantedReq = {
      senderUid: 'stranger-999',
      senderName: '낯선라이더',
      senderCode: 'CY-9999',
      createdAt: '2026-10-20T11:00:00.000Z'
    }

    friendStore.incomingRequests.push(unwantedReq)
    assert.strictEqual(friendStore.pendingRequestCount, 1)

    // 거절 실행
    const rejectRes = await friendStore.rejectFriendRequest(unwantedReq.senderUid)
    assert.strictEqual(rejectRes.success, true)

    // 상태 검증
    assert.strictEqual(friendStore.pendingRequestCount, 0)
    assert.strictEqual(friendStore.isFriend(unwantedReq.senderUid), false)
    assert.strictEqual(friendStore.friendCount, 1) // 민수만 유지
  })

  // ==========================================
  // 5. 친구 삭제(Unfriend) 검증
  // ==========================================
  await runTest('5-1. 친구 삭제 시 친구 목록 제거 및 선택 상태 정리', async () => {
    friendStore.selectedFriend = friendStore.friends[0]
    assert.ok(friendStore.selectedFriend)

    const removeRes = await friendStore.removeFriend('rider-pal-789')
    assert.strictEqual(removeRes.success, true)

    // 검증
    assert.strictEqual(friendStore.friendCount, 0)
    assert.strictEqual(friendStore.isFriend('rider-pal-789'), false)
    assert.strictEqual(friendStore.selectedFriend, null)
  })

  // ==========================================
  // 6. useFriendManager Facade Composable 검증
  // ==========================================
  await runTest('6-1. useFriendManager Facade 반응형 바인딩 및 날짜 포맷팅 검증', () => {
    const manager = useFriendManager()

    assert.strictEqual(typeof manager.formatFriendSince, 'function')
    assert.strictEqual(manager.formatFriendSince('2026-10-20T12:00:00Z'), '2026.10.20')
    assert.strictEqual(manager.formatFriendSince('invalid-date'), '')
    assert.strictEqual(manager.formatFriendSince(null), '')

    // Computed 참조 정합성
    assert.strictEqual(manager.friendCount.value, 0)
    assert.strictEqual(manager.pendingRequestCount.value, 0)
    assert.strictEqual(manager.currentUserCode.value, friendStore.currentUserCode)
  })

  await runTest('6-2. useFriendManager 빈 검색 방어 검증', async () => {
    const manager = useFriendManager()
    const res1 = await manager.searchUser('')
    assert.strictEqual(res1, null)

    const res2 = await manager.searchUser('   ')
    assert.strictEqual(res2, null)
  })

  // ==========================================
  // 7. 친구 정원(MAX_FRIENDS_LIMIT = 20) 상한 방어 검증
  // ==========================================
  await runTest('7-1. 최대 친구 수 도달 여부 Getter 및 상한선 검증', () => {
    friendStore.clearState()
    assert.strictEqual(friendStore.maxFriendsLimit, 20)
    assert.strictEqual(friendStore.isFriendLimitReached, false)

    for (let i = 1; i <= 20; i++) {
      friendStore.friends.push({
        friendUid: `friend-${i}`,
        displayName: `친구${i}`,
        userCode: `CY-F${i}`
      })
    }

    assert.strictEqual(friendStore.friendCount, 20)
    assert.strictEqual(friendStore.isFriendLimitReached, true)
  })

  await runTest('7-2. 친구 정원(20명) 초과 시 친구 신청 전송 차단', async () => {
    const newTarget = { uid: 'rider-21', displayName: '21번째라이더', userCode: 'CY-9999' }
    const res = await friendStore.sendFriendRequest(newTarget)
    assert.strictEqual(res.success, false)
    assert.ok(res.message.includes('최대 20명'))
  })

  await runTest('7-3. 친구 정원(20명) 초과 시 친구 요청 수락 차단', async () => {
    const req = { senderUid: 'pending-21', senderName: '대기라이더', senderCode: 'CY-8888' }
    const res = await friendStore.acceptFriendRequest(req)
    assert.strictEqual(res.success, false)
    assert.ok(res.message.includes('정원') && res.message.includes('초과'))
  })

  console.log('\n========================================')
  console.log(`소셜 그래프 & 친구 시스템 테스트 결과: ${passedCount} 통과, ${failedCount} 실패`)
  console.log('========================================\n')

  process.exit(failedCount > 0 ? 1 : 0)
}

runAll()
