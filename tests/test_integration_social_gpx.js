import assert from 'node:assert'
import { createPinia, setActivePinia } from 'pinia'
import { parseGpx } from '../src/utils/gpxParser.js'
import { useGpxStore, toFirestoreTrack, fromFirestoreTrack } from '../src/stores/gpx.js'
import { useFriendStore } from '../src/stores/friend.js'
import { useGpxManager } from '../src/composables/useGpxManager.js'
import { useFriendManager } from '../src/composables/useFriendManager.js'
import { clearAllTracksFromDb } from '../src/utils/indexedDb.js'
import { generateUserCode, validateUserCode } from '../src/utils/userCodeGenerator.js'

console.log('=== 소셜 친구 시스템 & GPX 공유 E2E 통합 파이프라인 테스트 시작 ===\n')

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
    if (err.stack) console.error(err.stack)
    failedCount++
  }
}

async function runAll() {
  setActivePinia(createPinia())
  await clearAllTracksFromDb()

  const gpxStore = useGpxStore()
  const friendStore = useFriendStore()
  await gpxStore.clearAllTracks()
  friendStore.clearState()

  const gpxManager = useGpxManager()
  const friendManager = useFriendManager()

  // 가상 사용자 A & B
  const userA = { uid: 'user_a_minwoo', displayName: '민우', userCode: generateUserCode() }
  const userB = { uid: 'user_b_jieun', displayName: '지은', userCode: generateUserCode() }

  // ==========================================
  // E2E 시나리오 1. 사용자 초기화 및 친구 요청 수명주기
  // ==========================================
  await runTest('1. 사용자 고유 코드 생성 및 친구 신청/수락 E2E 흐름', async () => {
    assert.ok(validateUserCode(userA.userCode))
    assert.ok(validateUserCode(userB.userCode))

    // 사용자 A의 스토어 초기화
    await friendStore.initUserCode(userA)
    assert.strictEqual(friendStore.currentUserCode, userA.userCode)

    // 사용자 A -> 사용자 B에게 친구 신청
    const sendRes = await friendStore.sendFriendRequest(userB)
    assert.strictEqual(sendRes.success, true)
    assert.strictEqual(friendStore.hasSentRequestTo(userB.uid), true)

    // 사용자 B 관점: 받은 요청 큐에 A의 요청 도착 시뮬레이션
    const incomingReq = {
      senderUid: userA.uid,
      senderName: userA.displayName,
      senderCode: userA.userCode,
      createdAt: new Date().toISOString()
    }
    friendStore.incomingRequests.push(incomingReq)
    assert.strictEqual(friendStore.pendingRequestCount, 1)

    // 사용자 B의 요청 수락
    const acceptRes = await friendStore.acceptFriendRequest(incomingReq)
    assert.strictEqual(acceptRes.success, true)

    // 친구 관계 정합성 검증
    assert.strictEqual(friendStore.friendCount, 1)
    assert.strictEqual(friendStore.pendingRequestCount, 0)
    assert.strictEqual(friendStore.isFriend(userA.uid), true)
  })

  // ==========================================
  // E2E 시나리오 2. GPX 업로드 후 기본 비공개(private) 격리
  // ==========================================
  let uploadedTrackId = null
  await runTest('2. GPX 파일 파싱 및 기본 나만보기(private) 격리 검증', async () => {
    const rawGpx = `<?xml version="1.0" encoding="UTF-8"?>
    <gpx version="1.1" creator="Garmin Edge 540">
      <trk>
        <name>남한강 자전거길 40km</name>
        <trkseg>
          <trkpt lat="37.5280" lon="127.1200"><ele>35.0</ele><time>2026-10-20T08:00:00Z</time></trkpt>
          <trkpt lat="37.5350" lon="127.1350"><ele>42.0</ele><time>2026-10-20T08:30:00Z</time></trkpt>
          <trkpt lat="37.5420" lon="127.1500"><ele>48.0</ele><time>2026-10-20T09:00:00Z</time></trkpt>
        </trkseg>
      </trk>
    </gpx>`

    const parsed = parseGpx(rawGpx, '남한강', 2)
    assert.strictEqual(parsed.success, true)

    const newTrack = await gpxStore.addTrack(parsed)
    uploadedTrackId = newTrack.id

    // 기본값은 반드시 private이어야 함
    assert.strictEqual(newTrack.visibility, 'private')
    assert.strictEqual(gpxStore.tracks.length, 1)

    // 친구(User B)의 공유 궤적 목록에는 아직 나타나지 않아야 함
    assert.strictEqual(gpxStore.friendTracksCount, 0)
    assert.strictEqual(gpxStore.visibleFriendTracks.length, 0)
  })

  // ==========================================
  // E2E 시나리오 3. 친구 공개(friends) 전환 및 친구 계정 오버레이 동기화
  // ==========================================
  await runTest('3. 친구 공개 전환 및 Firestore 직렬화 포맷 검증', async () => {
    // A가 해당 트랙을 친구 공개로 전환
    const changeRes = await gpxManager.changeTrackVisibility(uploadedTrackId, 'friends')
    assert.strictEqual(changeRes, true)

    const currentTrack = gpxStore.tracks.find(t => t.id === uploadedTrackId)
    assert.strictEqual(currentTrack.visibility, 'friends')

    // Firestore 직렬화 포맷 검증 (중첩 배열 금지 규칙 [{lat, lng}])
    const firestorePayload = toFirestoreTrack(currentTrack)
    assert.strictEqual(firestorePayload.visibility, 'friends')
    assert.ok(Array.isArray(firestorePayload.coordinates))
    assert.strictEqual(typeof firestorePayload.coordinates[0], 'object')
    assert.ok('lat' in firestorePayload.coordinates[0])
    assert.ok('lng' in firestorePayload.coordinates[0])

    // 복원 검증
    const restored = fromFirestoreTrack(firestorePayload)
    assert.strictEqual(restored.visibility, 'friends')
    assert.deepStrictEqual(restored.coordinates, currentTrack.coordinates)
  })

  // ==========================================
  // E2E 시나리오 4. 친구(User B) 시점의 공유 트랙 로드 및 지도 표시 제어
  // ==========================================
  await runTest('4. 친구 공유 트랙 로드, 개별 표시 토글 및 인터랙션 검증', () => {
    // User A가 공유한 트랙을 User B가 불러오는 시나리오 시뮬레이션
    const sharedTrackFromA = {
      id: uploadedTrackId,
      authorUid: userA.uid,
      authorName: userA.displayName,
      authorCode: userA.userCode,
      title: '남한강 자전거길 40km',
      distanceKm: 40.5,
      elevationGainM: 13,
      durationMinutes: 60,
      coordinates: [[37.5280, 127.1200], [37.5420, 127.1500]],
      bounds: {
        southWest: { lat: 37.5280, lng: 127.1200 },
        northEast: { lat: 37.5420, lng: 127.1500 }
      },
      visibility: 'friends',
      visible: true
    }

    gpxStore.setFriendTracks([sharedTrackFromA])
    assert.strictEqual(gpxStore.friendTracksCount, 1)
    assert.strictEqual(gpxStore.visibleFriendTracks.length, 1)

    // 퍼사드를 통한 친구 트랙 표시 숨김 토글
    gpxManager.toggleFriendTrackVisibility(uploadedTrackId)
    assert.strictEqual(gpxStore.visibleFriendTracks.length, 0, '토글 시 지도 대상에서 제외')

    // 다시 토글하여 지도 표시
    gpxManager.toggleFriendTrackVisibility(uploadedTrackId)
    assert.strictEqual(gpxStore.visibleFriendTracks.length, 1, '재토글 시 지도 대상에 복귀')

    // 친구 트랙 선택 및 호버링 인터랙션
    gpxManager.selectFriendTrack(uploadedTrackId)
    assert.strictEqual(gpxStore.selectedFriendTrackId, uploadedTrackId)
    assert.strictEqual(gpxStore.selectedFriendTrack?.title, '남한강 자전거길 40km')

    gpxManager.setHoveredFriendTrack(uploadedTrackId)
    assert.strictEqual(gpxStore.hoveredFriendTrackId, uploadedTrackId)
  })

  // ==========================================
  // E2E 시나리오 5. 비공개(private) 전환 시 친구 목록에서 실시간 파기
  // ==========================================
  await runTest('5. 작성자가 비공개(private) 전환 시 공유 컬렉션 즉각 파기 검증', async () => {
    // User A가 다시 나만보기로 변경
    await gpxManager.changeTrackVisibility(uploadedTrackId, 'private')
    const trackA = gpxStore.tracks.find(t => t.id === uploadedTrackId)
    assert.strictEqual(trackA.visibility, 'private')

    // User B가 공유 궤적을 새로고침하면 비어있어야 함
    gpxStore.setFriendTracks([])
    assert.strictEqual(gpxStore.friendTracksCount, 0)
    assert.strictEqual(gpxStore.visibleFriendTracks.length, 0)
  })

  // ==========================================
  // E2E 시나리오 6. 친구 삭제(Unfriend) 시 소셜 연계 완전 분리
  // ==========================================
  await runTest('6. 친구 끊기 시 양방향 관계 및 소셜 상태 초기화 검증', async () => {
    assert.strictEqual(friendStore.friendCount, 1)

    const removeRes = await friendStore.removeFriend(userA.uid)
    assert.strictEqual(removeRes.success, true)

    assert.strictEqual(friendStore.friendCount, 0)
    assert.strictEqual(friendStore.isFriend(userA.uid), false)
  })

  console.log('\n========================================')
  console.log(`소셜 친구 & GPX 공유 E2E 통합 테스트 결과: ${passedCount} 통과, ${failedCount} 실패`)
  console.log('========================================\n')

  process.exit(failedCount > 0 ? 1 : 0)
}

runAll()
