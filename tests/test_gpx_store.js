import assert from 'node:assert'
import { createPinia, setActivePinia } from 'pinia'
import { useGpxStore } from '../src/stores/gpx.js'
import {
  saveTrackToDb,
  getAllTracksFromDb,
  deleteTrackFromDb,
  clearAllTracksFromDb
} from '../src/utils/indexedDb.js'

console.log('=== GPX State Store & IndexedDB 영속성 엄격 단위 테스트 시작 ===\n')

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
  // 1. IndexedDB 헬퍼 테스트
  await runTest('1-1. IndexedDB 헬퍼: 저장, 정렬 조회, 삭제, 전체 초기화 검증', async () => {
    await clearAllTracksFromDb()

    const sample1 = {
      id: 'track_1',
      title: '트랙 1',
      distanceKm: 15.2,
      createdAt: '2026-10-18T10:00:00Z',
      coordinates: [[37.5, 127.0], [37.51, 127.01]]
    }
    const sample2 = {
      id: 'track_2',
      title: '트랙 2 (최신)',
      distanceKm: 25.5,
      createdAt: '2026-10-20T10:00:00Z',
      coordinates: [[37.52, 127.02], [37.53, 127.03]]
    }

    await saveTrackToDb(sample1)
    await saveTrackToDb(sample2)

    const list = await getAllTracksFromDb()
    assert.strictEqual(list.length, 2, '저장된 트랙 개수는 2개여야 합니다.')
    // 최신순 정렬 확인 (sample2가 먼저 나와야 함)
    assert.strictEqual(list[0].id, 'track_2', '최신 등록된 트랙이 첫 번째여야 합니다.')
    assert.strictEqual(list[1].id, 'track_1')

    // 단일 삭제
    await deleteTrackFromDb('track_1')
    const listAfterDel = await getAllTracksFromDb()
    assert.strictEqual(listAfterDel.length, 1)
    assert.strictEqual(listAfterDel[0].id, 'track_2')

    // 전체 삭제
    await clearAllTracksFromDb()
    const listAfterClear = await getAllTracksFromDb()
    assert.strictEqual(listAfterClear.length, 0)
  })

  // 2. Pinia useGpxStore 테스트
  setActivePinia(createPinia())
  const store = useGpxStore()

  await runTest('2-1. 스토어 초기 상태 및 잘못된 데이터 등록 차단', async () => {
    await store.clearAllTracks()
    assert.strictEqual(store.tracks.length, 0)
    assert.strictEqual(store.totalDistanceKm, 0)
    assert.strictEqual(store.totalTracksCount, 0)
    assert.strictEqual(store.selectedTrackId, null)

    // 잘못된 데이터 예외 검증
    let threw = false
    try {
      await store.addTrack({ success: false })
    } catch {
      threw = true
    }
    assert.strictEqual(threw, true, '유효하지 않은 파싱 데이터는 예외를 발생시켜야 합니다.')
  })

  await runTest('2-2. 트랙 추가 및 누적 거리/개수 Getter 정합성 검증', async () => {
    const mockParsed1 = {
      success: true,
      title: '한강 자전거길',
      distanceKm: 30.5,
      elevationGainM: 120,
      durationMinutes: 70,
      bounds: { southWest: { lat: 37.5, lng: 127.0 }, northEast: { lat: 37.6, lng: 127.1 } },
      coordinates: [[37.5, 127.0], [37.55, 127.05], [37.6, 127.1]]
    }

    const t1 = await store.addTrack(mockParsed1)
    assert.ok(t1.id.startsWith('gpx_'))
    assert.strictEqual(t1.title, '한강 자전거길')
    assert.strictEqual(t1.visible, true)
    assert.strictEqual(store.totalTracksCount, 1)
    assert.strictEqual(store.totalDistanceKm, 30.5)
    assert.strictEqual(store.selectedTrackId, t1.id)
    assert.strictEqual(store.selectedTrack?.title, '한강 자전거길')

    // 두 번째 트랙 추가
    const mockParsed2 = {
      success: true,
      title: '아라자전거길',
      distanceKm: 21.3,
      elevationGainM: 50,
      durationMinutes: 45,
      coordinates: [[37.55, 126.7], [37.6, 126.8]]
    }
    const t2 = await store.addTrack(mockParsed2)
    assert.strictEqual(store.totalTracksCount, 2)
    // 30.5 + 21.3 = 51.8km
    assert.strictEqual(store.totalDistanceKm, 51.8)
    // 신규 추가된 항목이 목록 맨 앞
    assert.strictEqual(store.tracks[0].id, t2.id)
  })

  await runTest('2-3. 트랙 제목 수정 및 표시 토글 (visibleTracks Getter)', async () => {
    const t1 = store.tracks[1] // 한강 자전거길
    const t2 = store.tracks[0] // 아라자전거길

    // 제목 수정
    await store.updateTrackTitle(t1.id, '한강 남단 야간 라이딩')
    assert.strictEqual(store.tracks[1].title, '한강 남단 야간 라이딩')

    // 표시 숨김 토글
    assert.strictEqual(store.visibleTracks.length, 2)
    await store.toggleTrackVisibility(t2.id) // t2 숨김
    assert.strictEqual(store.tracks[0].visible, false)
    assert.strictEqual(store.visibleTracks.length, 1, '숨긴 트랙은 visibleTracks에서 제외되어야 합니다.')
    assert.strictEqual(store.visibleTracks[0].id, t1.id)

    // 다시 표시 토글
    await store.toggleTrackVisibility(t2.id)
    assert.strictEqual(store.visibleTracks.length, 2)
  })

  await runTest('2-4. 마우스 호버(Hover) 상태 반응성 검증', async () => {
    const targetTrack = store.tracks[0]

    assert.strictEqual(store.hoveredTrackId, null)
    assert.strictEqual(store.hoveredTrack, null)

    // 호버 진입
    store.setHoveredTrack(targetTrack.id)
    assert.strictEqual(store.hoveredTrackId, targetTrack.id)
    assert.strictEqual(store.hoveredTrack?.id, targetTrack.id)

    // 호버 해제
    store.setHoveredTrack(null)
    assert.strictEqual(store.hoveredTrackId, null)
    assert.strictEqual(store.hoveredTrack, null)
  })

  await runTest('2-5. 트랙 삭제 및 선택/호버 상태 정리 검증', async () => {
    const target = store.tracks[0]
    store.setSelectedTrack(target.id)
    store.setHoveredTrack(target.id)

    const success = await store.removeTrack(target.id)
    assert.strictEqual(success, true)
    assert.strictEqual(store.totalTracksCount, 1)
    // 삭제된 트랙의 선택 및 호버 상태가 null로 자동 초기화되었는지 검증
    assert.strictEqual(store.selectedTrackId, null)
    assert.strictEqual(store.hoveredTrackId, null)

    // DB 영속성 확인
    const persisted = await getAllTracksFromDb()
    assert.strictEqual(persisted.length, 1)
    assert.strictEqual(persisted[0].id, store.tracks[0].id)
  })

  await runTest('2-6. 제목 수정 시 IndexedDB 영속 및 Proxy 객체 직렬화 검증', async () => {
    const remaining = store.tracks[0]
    await store.updateTrackTitle(remaining.id, '영구 보존된 수정 제목')

    // IndexedDB에서 직접 다시 조회하여 검증
    const fromDb = await getAllTracksFromDb()
    assert.strictEqual(fromDb[0].title, '영구 보존된 수정 제목', 'IndexedDB에 수정된 제목이 보존되어야 함')
    assert.ok(fromDb[0].updatedAt, 'updatedAt 타임스탬프가 기록되어야 함')
  })

  console.log(`\n========================================`)
  console.log(`스토어 테스트 결과: ${passedCount} 통과, ${failedCount} 실패`)
  console.log(`========================================`)

  if (failedCount > 0) {
    process.exit(1)
  }
}

runAllTests()
