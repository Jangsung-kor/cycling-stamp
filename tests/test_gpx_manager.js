import assert from 'node:assert'
import { createPinia, setActivePinia } from 'pinia'
import { useGpxManager } from '../src/composables/useGpxManager.js'
import { clearAllTracksFromDb } from '../src/utils/indexedDb.js'

console.log('=== useGpxManager Facade Composable 단위 테스트 시작 ===\n')

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
  await clearAllTracksFromDb()

  const manager = useGpxManager()
  await manager.gpxStore.clearAllTracks()

  await runTest('1. 초기 반응형 상태 및 포맷터 함수 검증', () => {
    assert.strictEqual(manager.tracks.value.length, 0)
    assert.strictEqual(manager.totalDistanceKm.value, 0)
    assert.strictEqual(manager.totalTracksCount.value, 0)
    assert.strictEqual(manager.selectedTrackId.value, null)

    // formatDuration
    assert.strictEqual(manager.formatDuration(0), '0분')
    assert.strictEqual(manager.formatDuration(45), '45분')
    assert.strictEqual(manager.formatDuration(75), '1시간 15분')
    assert.strictEqual(manager.formatDuration(120), '2시간 0분')

    // formatDate
    assert.strictEqual(manager.formatDate('2026-10-20T09:00:00Z'), '2026.10.20')
    assert.strictEqual(manager.formatDate(null), '')
  })

  await runTest('2. 빈 파일 목록 또는 비-GPX 파일 업로드 방어 로직', async () => {
    const res1 = await manager.uploadGpxFiles([])
    assert.strictEqual(res1.success, false)

    const txtFile = { name: 'test.txt' }
    const res2 = await manager.uploadGpxFiles([txtFile])
    assert.strictEqual(res2.success, false)
  })

  await runTest('3. 트랙 선택 및 호버링 인터랙션 메서드 검증', async () => {
    // 임의 트랙 추가
    const sample = await manager.gpxStore.addTrack({
      success: true,
      title: '남산 라이딩',
      distanceKm: 8.5,
      coordinates: [[37.55, 126.98], [37.56, 126.99]]
    })

    assert.strictEqual(manager.totalTracksCount.value, 1)

    // selectTrack
    manager.selectTrack(sample)
    assert.strictEqual(manager.selectedTrackId.value, sample.id)
    assert.strictEqual(manager.selectedTrack.value?.title, '남산 라이딩')

    // setHoveredTrack
    manager.setHoveredTrack(sample.id)
    assert.strictEqual(manager.hoveredTrackId.value, sample.id)
    assert.strictEqual(manager.hoveredTrack.value?.id, sample.id)

    manager.setHoveredTrack(null)
    assert.strictEqual(manager.hoveredTrackId.value, null)
  })

  await runTest('4. 제목 변경 및 지도 표시 토글 위임 검증', async () => {
    const track = manager.tracks.value[0]

    // updateTitle
    await manager.updateTitle(track.id, '남산 타워 야간 라이딩')
    assert.strictEqual(manager.tracks.value[0].title, '남산 타워 야간 라이딩')

    // toggleVisibility
    assert.strictEqual(manager.visibleTracks.value.length, 1)
    await manager.toggleVisibility(track.id)
    assert.strictEqual(manager.tracks.value[0].visible, false)
    assert.strictEqual(manager.visibleTracks.value.length, 0)

    await manager.toggleVisibility(track.id)
    assert.strictEqual(manager.visibleTracks.value.length, 1)
  })

  console.log(`\n========================================`)
  console.log(`useGpxManager 테스트 결과: ${passedCount} 통과, ${failedCount} 실패`)
  console.log(`========================================`)

  if (failedCount > 0) process.exit(1)
}

runAll()
