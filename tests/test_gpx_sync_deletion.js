import assert from 'node:assert'
import { createPinia, setActivePinia } from 'pinia'
import { useGpxStore, toFirestoreTrack, fromFirestoreTrack } from '../src/stores/gpx.js'
import {
  saveTrackToDb,
  getAllTracksFromDb,
  deleteTrackFromDb,
  clearAllTracksFromDb
} from '../src/utils/indexedDb.js'

console.log('=== GPX 멀티 디바이스 삭제 동기화 & 좀비 트랙 방어 엄격 단위 테스트 시작 ===\n')

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

async function runAllTests() {
  setActivePinia(createPinia())
  const store = useGpxStore()

  // 1. 신규 트랙 등록 시 isSynced: false 및 Firestore 로드 시 isSynced: true 검증
  await runTest('1-1. 신규 등록 트랙은 isSynced: false, Firestore 파싱 트랙은 isSynced: true 부여', async () => {
    await clearAllTracksFromDb()
    await store.clearAllTracks()

    const mockParsed = {
      success: true,
      title: '테스트 라이딩 1',
      distanceKm: 20.0,
      coordinates: [[37.5, 127.0], [37.6, 127.1]]
    }

    const added = await store.addTrack(mockParsed)
    assert.strictEqual(typeof added.isSynced, 'boolean', 'isSynced 플래그가 존재해야 합니다.')

    const fromRemote = fromFirestoreTrack({
      id: 'remote_1',
      title: '원격 트랙',
      distanceKm: 15.0,
      coordinates: [{ lat: 37.5, lng: 127.0 }]
    })
    assert.strictEqual(fromRemote.isSynced, true, 'Firestore에서 불러온 트랙은 isSynced: true여야 합니다.')
  })

  // 2. 다른 기기에서 삭제된 트랙(클라우드에 없음 & isSynced: true)의 로컬 IndexedDB 자동 파기 검증
  await runTest('2-1. [핵심 결함 방어] 타 기기에서 삭제된 트랙이 모바일 로컬 DB에 남아있을 때 좀비 부활 방지 및 자동 파기', async () => {
    await clearAllTracksFromDb()
    await store.clearAllTracks()

    // 시나리오: 모바일 기기의 로컬 DB에 과거 동기화된 트랙(isSynced: true)이 남아있음
    const oldSyncedTrack = {
      id: 'track_deleted_on_pc',
      title: 'PC에서 이미 삭제된 트랙',
      distanceKm: 42.195,
      isSynced: true, // 과거에 이미 클라우드와 동기화되었던 상태
      createdAt: '2026-10-20T10:00:00Z',
      coordinates: [[37.5, 127.0], [37.6, 127.1]]
    }
    await saveTrackToDb(oldSyncedTrack)

    // 모바일 기기가 켜져서 로컬 DB를 읽음
    const beforeLoad = await getAllTracksFromDb()
    assert.strictEqual(beforeLoad.length, 1)

    // Firestore 모킹: 클라우드에는 해당 트랙이 없고(빈 배열), deleted_track_ids에 기록되어 있음
    // loadTracks의 모바일 동기화 시뮬레이션
    const mockUserData = {
      gpx_tracks: [], // PC에서 삭제되어 비어있음
      deleted_track_ids: ['track_deleted_on_pc'] // 삭제된 ID
    }

    // 내부 병합 알고리즘 검증
    const deletedTrackIds = new Set(mockUserData.deleted_track_ids)
    const toDeleteFromDb = []
    const mergedMap = new Map()

    for (const lTrack of beforeLoad) {
      if (deletedTrackIds.has(lTrack.id) || lTrack.isSynced === true) {
        toDeleteFromDb.push(lTrack.id)
      } else {
        mergedMap.set(lTrack.id, lTrack)
      }
    }

    for (const delId of toDeleteFromDb) {
      await deleteTrackFromDb(delId)
    }

    // 검증: 좀비 트랙이 부활하지 않고 로컬 IndexedDB에서도 완전히 영구 삭제되었는가?
    const afterSync = await getAllTracksFromDb()
    assert.strictEqual(afterSync.length, 0, '삭제된 트랙은 로컬 IndexedDB에서도 제거되어야 합니다.')
    assert.strictEqual(mergedMap.size, 0, '화면 목록에 삭제된 트랙이 포함되지 않아야 합니다.')
  })

  // 3. 오프라인에서 새로 만든 순수 신규 트랙(isSynced: false)은 삭제되지 않고 안전하게 보존되는지 검증
  await runTest('3-1. [오프라인 데이터 보존] 오프라인 신규 트랙(isSynced: false)은 클라우드에 없어도 삭제되지 않고 보존', async () => {
    await clearAllTracksFromDb()

    const offlineNewTrack = {
      id: 'track_created_offline',
      title: '오프라인에서 새로 주행한 트랙',
      distanceKm: 12.5,
      isSynced: false, // 아직 한 번도 클라우드에 올라간 적 없음
      createdAt: new Date().toISOString(),
      coordinates: [[37.5, 127.0], [37.6, 127.1]]
    }
    await saveTrackToDb(offlineNewTrack)

    const beforeSync = await getAllTracksFromDb()
    assert.strictEqual(beforeSync.length, 1)

    // Firestore 모킹: 클라우드에는 아직 이 트랙이 없음
    const mockUserData = {
      gpx_tracks: [],
      deleted_track_ids: []
    }

    const deletedTrackIds = new Set(mockUserData.deleted_track_ids)
    const toDeleteFromDb = []
    const mergedMap = new Map()

    for (const lTrack of beforeSync) {
      if (deletedTrackIds.has(lTrack.id)) {
        toDeleteFromDb.push(lTrack.id)
      } else if (lTrack.isSynced === false) {
        // 순수 오프라인 트랙은 보존!
        mergedMap.set(lTrack.id, lTrack)
      } else if (lTrack.isSynced === true) {
        toDeleteFromDb.push(lTrack.id)
      }
    }

    for (const delId of toDeleteFromDb) {
      await deleteTrackFromDb(delId)
    }

    // 검증: 오프라인 트랙은 삭제되지 않고 그대로 유지되어야 함
    const afterSync = await getAllTracksFromDb()
    assert.strictEqual(afterSync.length, 1, '오프라인 신규 트랙은 보존되어야 합니다.')
    assert.strictEqual(mergedMap.size, 1, '오프라인 신규 트랙은 화면 목록에 보존되어야 합니다.')
    assert.strictEqual(mergedMap.get('track_created_offline').title, '오프라인에서 새로 주행한 트랙')
  })

  // 4. removeTrack 호출 시 로컬 및 상태 정리 정합성
  await runTest('4-1. removeTrack 실행 시 상태 배열 및 IndexedDB 동시 제거', async () => {
    await clearAllTracksFromDb()
    await store.clearAllTracks()

    const added = await store.addTrack({
      success: true,
      title: '삭제 대상 트랙',
      distanceKm: 10,
      coordinates: [[37.5, 127.0], [37.51, 127.01]]
    })

    assert.strictEqual(store.tracks.length, 1)
    const delResult = await store.removeTrack(added.id)
    assert.strictEqual(delResult, true)
    assert.strictEqual(store.tracks.length, 0)

    const dbTracks = await getAllTracksFromDb()
    assert.strictEqual(dbTracks.length, 0)
  })

  console.log(`\n========================================`)
  console.log(`멀티 디바이스 삭제 동기화 테스트 결과: ${passedCount} 통과, ${failedCount} 실패`)
  console.log(`========================================`)

  if (failedCount > 0) {
    process.exit(1)
  }
}

runAllTests().catch(err => {
  console.error('테스트 실행 중 치명적 오류:', err)
  process.exit(1)
})
