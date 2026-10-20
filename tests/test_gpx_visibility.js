import assert from 'node:assert'
import { createPinia, setActivePinia } from 'pinia'
import { useGpxStore, toFirestoreTrack, fromFirestoreTrack } from '../src/stores/gpx.js'
import { useGpxManager } from '../src/composables/useGpxManager.js'
import { clearAllTracksFromDb, getTrackFromDb } from '../src/utils/indexedDb.js'

console.log('=== GPX 2단계 공개 범위(private / friends) 및 공유 엔진 엄격 단위 테스트 시작 ===\n')

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

  const store = useGpxStore()
  await store.clearAllTracks()

  // ==========================================
  // 1. Firestore 변환 및 기본 공개 범위 검증
  // ==========================================
  await runTest('1-1. 신규 트랙 기본 공개 범위는 private이어야 함', async () => {
    const sampleTrack = await store.addTrack({
      success: true,
      title: '아라자전거길 라이딩',
      distanceKm: 21.0,
      elevationGainM: 50,
      durationMinutes: 60,
      coordinates: [[37.55, 126.75], [37.56, 126.76]]
    })

    assert.strictEqual(sampleTrack.visibility, 'private', '기본값은 private이어야 합니다.')
    assert.strictEqual(store.tracks[0].visibility, 'private')
  })

  await runTest('1-2. toFirestoreTrack 및 fromFirestoreTrack 공개 범위 & 좌표 포맷 정합성', () => {
    const rawTrack = {
      id: 'trk_test_1',
      title: '한강 30km',
      coordinates: [[37.5, 127.0], [37.51, 127.01]],
      visibility: 'friends'
    }

    const firestoreData = toFirestoreTrack(rawTrack)
    assert.strictEqual(firestoreData.visibility, 'friends')
    // Firestore는 객체 배열 [{lat, lng}]
    assert.deepStrictEqual(firestoreData.coordinates, [{ lat: 37.5, lng: 127.0 }, { lat: 37.51, lng: 127.01 }])

    const restored = fromFirestoreTrack(firestoreData)
    assert.strictEqual(restored.visibility, 'friends')
    // 복원 시 2차원 배열 [[lat, lng]]
    assert.deepStrictEqual(restored.coordinates, [[37.5, 127.0], [37.51, 127.01]])

    // visibility 누락 시 private 자동 폴백
    const fallbackData = toFirestoreTrack({ id: 'trk_no_vis', coordinates: [] })
    assert.strictEqual(fallbackData.visibility, 'private')
  })

  // ==========================================
  // 2. 공개 범위 전환(changeTrackVisibility) 및 영속성 검증
  // ==========================================
  await runTest('2-1. private -> friends 변경 시 스토어 및 IndexedDB 동기화', async () => {
    const track = store.tracks[0]
    const res = await store.changeTrackVisibility(track.id, 'friends')

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.visibility, 'friends')
    assert.strictEqual(track.visibility, 'friends')

    // IndexedDB 영속 저장 확인
    const fromDb = await getTrackFromDb(track.id)
    assert.ok(fromDb)
    assert.strictEqual(fromDb.visibility, 'friends')
  })

  await runTest('2-2. friends -> private 전환 시 정상 반영 검증', async () => {
    const track = store.tracks[0]
    const res = await store.changeTrackVisibility(track.id, 'private')

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.visibility, 'private')
    assert.strictEqual(track.visibility, 'private')

    const fromDb = await getTrackFromDb(track.id)
    assert.strictEqual(fromDb.visibility, 'private')
  })

  await runTest('2-3. 잘못된 공개 범위 입력 시 변경 거절 방어', async () => {
    const track = store.tracks[0]
    const invalidRes1 = await store.changeTrackVisibility(track.id, 'public')
    assert.strictEqual(invalidRes1.success, false)

    const invalidRes2 = await store.changeTrackVisibility(track.id, null)
    assert.strictEqual(invalidRes2.success, false)

    const invalidRes3 = await store.changeTrackVisibility('non-existent-id', 'friends')
    assert.strictEqual(invalidRes3.success, false)

    // 원본 상태(private) 유지 확인
    assert.strictEqual(track.visibility, 'private')
  })

  // ==========================================
  // 3. 친구 공유 트랙(Friend Tracks) 상태 및 Getter 검증
  // ==========================================
  await runTest('3-1. 친구 공유 트랙 주입 및 반응형 Getter 검증', () => {
    assert.strictEqual(store.friendTracksCount, 0)
    assert.strictEqual(store.visibleFriendTracks.length, 0)

    const dummyFriendTracks = [
      {
        id: 'friend_trk_1',
        authorUid: 'uid_friend_a',
        authorName: '지은',
        title: '북한강 종주 70km',
        distanceKm: 70.2,
        coordinates: [[37.6, 127.2], [37.7, 127.3]],
        visibility: 'friends',
        visible: true
      },
      {
        id: 'friend_trk_2',
        authorUid: 'uid_friend_b',
        authorName: '민수',
        title: '남산 야간 라이딩',
        distanceKm: 15.0,
        coordinates: [[37.55, 126.98], [37.54, 126.99]],
        visibility: 'friends',
        visible: true
      }
    ]

    store.setFriendTracks(dummyFriendTracks)
    assert.strictEqual(store.friendTracksCount, 2)
    assert.strictEqual(store.visibleFriendTracks.length, 2)

    // 친구 트랙 표시 토글 (1개 숨김)
    store.toggleFriendTrackVisibility('friend_trk_1')
    assert.strictEqual(store.visibleFriendTracks.length, 1)
    assert.strictEqual(store.visibleFriendTracks[0].id, 'friend_trk_2')

    // 다시 토글 (원복)
    store.toggleFriendTrackVisibility('friend_trk_1')
    assert.strictEqual(store.visibleFriendTracks.length, 2)
  })

  await runTest('3-2. 친구 트랙 호버 및 선택 상태 반응성', () => {
    store.setHoveredFriendTrack('friend_trk_1')
    assert.strictEqual(store.hoveredFriendTrackId, 'friend_trk_1')
    assert.strictEqual(store.hoveredFriendTrack.authorName, '지은')

    store.setSelectedFriendTrack('friend_trk_2')
    assert.strictEqual(store.selectedFriendTrackId, 'friend_trk_2')
    assert.strictEqual(store.selectedFriendTrack.authorName, '민수')

    store.setHoveredFriendTrack(null)
    assert.strictEqual(store.hoveredFriendTrack, null)
  })

  // ==========================================
  // 4. useGpxManager Facade Composable 연동 검증
  // ==========================================
  await runTest('4-1. useGpxManager 공개 범위 라벨 및 아이콘 포맷터 검증', () => {
    const manager = useGpxManager()

    assert.strictEqual(manager.getVisibilityLabel('friends'), '친구 공개')
    assert.strictEqual(manager.getVisibilityLabel('private'), '나만보기')
    assert.strictEqual(manager.getVisibilityLabel('other'), '나만보기')

    assert.strictEqual(manager.getVisibilityIcon('friends'), '👥')
    assert.strictEqual(manager.getVisibilityIcon('private'), '🔒')
  })

  await runTest('4-2. useGpxManager를 통한 공개 범위 변경 및 친구 트랙 제어 검증', async () => {
    const manager = useGpxManager()
    const myTrack = manager.tracks.value[0]

    // 퍼사드를 통해 친구 공개로 변경
    const changeOk = await manager.changeTrackVisibility(myTrack.id, 'friends')
    assert.strictEqual(changeOk, true)
    assert.strictEqual(myTrack.visibility, 'friends')

    // 친구 트랙 표시 제어 위임 검증
    assert.strictEqual(manager.visibleFriendTracks.value.length, 2)
    manager.toggleFriendTrackVisibility('friend_trk_2')
    assert.strictEqual(manager.visibleFriendTracks.value.length, 1)
  })

  console.log('\n========================================')
  console.log(`GPX 공개 범위 & 공유 엔진 테스트 결과: ${passedCount} 통과, ${failedCount} 실패`)
  console.log('========================================\n')

  process.exit(failedCount > 0 ? 1 : 0)
}

runAll()
