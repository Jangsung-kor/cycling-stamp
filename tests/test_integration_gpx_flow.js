import assert from 'node:assert'
import { createPinia, setActivePinia } from 'pinia'
import { parseGpx } from '../src/utils/gpxParser.js'
import { useGpxStore } from '../src/stores/gpx.js'
import { clearAllTracksFromDb } from '../src/utils/indexedDb.js'

console.log('=== GPX 업로드 & 렌더링 파이프라인 E2E 통합 테스트 시작 ===\n')

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
  const gpxStore = useGpxStore()
  await clearAllTracksFromDb()
  await gpxStore.clearAllTracks()

  await runTest('1. GPX 파일 파싱부터 스토어 등록, 지표 계산까지 파이프라인 검증', async () => {
    const rawGpx = `<?xml version="1.0" encoding="UTF-8"?>
    <gpx version="1.1" creator="Wahoo ELEMNT">
      <trk>
        <name>북악 스카이웨이 힐클라임</name>
        <trkseg>
          <trkpt lat="37.5850" lon="126.9750"><ele>120.0</ele><time>2026-10-20T07:00:00Z</time></trkpt>
          <trkpt lat="37.5900" lon="126.9800"><ele>180.0</ele><time>2026-10-20T07:10:00Z</time></trkpt>
          <trkpt lat="37.5950" lon="126.9850"><ele>260.0</ele><time>2026-10-20T07:20:00Z</time></trkpt>
          <trkpt lat="37.6000" lon="126.9900"><ele>340.0</ele><time>2026-10-20T07:30:00Z</time></trkpt>
        </trkseg>
      </trk>
    </gpx>`

    // 파싱
    const parsed = parseGpx(rawGpx, '북악', 2)
    assert.strictEqual(parsed.success, true)
    assert.strictEqual(parsed.title, '북악 스카이웨이 힐클라임')
    assert.strictEqual(parsed.elevationGainM, 220) // 120 -> 180 (+60), 180 -> 260 (+80), 260 -> 340 (+80) = 220
    assert.strictEqual(parsed.durationMinutes, 30)
    // 4개 점이 완전 일직선 상에 위치하므로 RDP 알고리즘에 의해 2개 끝점으로 완벽 압축
    assert.strictEqual(parsed.coordinates.length, 2, '일직선 구간이므로 2개의 대표 좌표로 최적 압축되어야 함')
    assert.strictEqual(parsed.pointCount.original, 4)
    assert.strictEqual(parsed.pointCount.simplified, 2)

    // 스토어 추가
    const track = await gpxStore.addTrack(parsed)
    assert.strictEqual(track.title, '북악 스카이웨이 힐클라임')
    assert.strictEqual(gpxStore.tracks.length, 1)
    assert.strictEqual(gpxStore.totalTracksCount, 1)
    assert.strictEqual(gpxStore.selectedTrackId, track.id)
  })

  await runTest('2. 여러 GPX 트랙 연속 업로드 시 누적 거리 및 순서 정합성', async () => {
    const rawGpx2 = `<?xml version="1.0" encoding="UTF-8"?>
    <gpx version="1.1">
      <trk>
        <name>한강 야간 라이딩</name>
        <trkseg>
          <trkpt lat="37.52" lon="126.92"></trkpt>
          <trkpt lat="37.53" lon="126.95"></trkpt>
        </trkseg>
      </trk>
    </gpx>`

    const parsed2 = parseGpx(rawGpx2, '한강')
    assert.strictEqual(parsed2.success, true)
    const t2 = await gpxStore.addTrack(parsed2)

    assert.strictEqual(gpxStore.totalTracksCount, 2)
    // 최신 항목이 맨 앞
    assert.strictEqual(gpxStore.tracks[0].id, t2.id)
    assert.ok(gpxStore.totalDistanceKm > 4.0, `누적 거리가 4km 이상이어야 함 (${gpxStore.totalDistanceKm}km)`)
  })

  await runTest('3. 목록 호버 및 선택 시 인터랙션 상태 정합성', async () => {
    const t1 = gpxStore.tracks[1]
    const t2 = gpxStore.tracks[0]

    // 마우스 호버 진입
    gpxStore.setHoveredTrack(t1.id)
    assert.strictEqual(gpxStore.hoveredTrackId, t1.id)
    assert.strictEqual(gpxStore.hoveredTrack?.id, t1.id)

    // 마우스 호버 해제
    gpxStore.setHoveredTrack(null)
    assert.strictEqual(gpxStore.hoveredTrackId, null)

    // 특정 트랙 선택
    gpxStore.setSelectedTrack(t2.id)
    assert.strictEqual(gpxStore.selectedTrackId, t2.id)
    assert.strictEqual(gpxStore.selectedTrack?.id, t2.id)
  })

  await runTest('4. 표시 숨김(토글) 시 지도 렌더링 대상(visibleTracks) 필터링 검증', async () => {
    const t1 = gpxStore.tracks[1]
    const t2 = gpxStore.tracks[0]

    assert.strictEqual(gpxStore.visibleTracks.length, 2)

    await gpxStore.toggleTrackVisibility(t1.id)
    assert.strictEqual(gpxStore.visibleTracks.length, 1)
    assert.strictEqual(gpxStore.visibleTracks[0].id, t2.id)

    await gpxStore.toggleTrackVisibility(t1.id)
    assert.strictEqual(gpxStore.visibleTracks.length, 2)
  })

  await runTest('5. 트랙 삭제 후 상태 동기화 및 바운딩 박스 검증', async () => {
    const t1 = gpxStore.tracks[1]
    assert.ok(t1.bounds !== null)
    assert.strictEqual(t1.bounds.southWest.lat, 37.585)
    assert.strictEqual(t1.bounds.northEast.lat, 37.6)

    await gpxStore.removeTrack(t1.id)
    assert.strictEqual(gpxStore.totalTracksCount, 1)
  })

  console.log(`\n========================================`)
  console.log(`통합 파이프라인 테스트 결과: ${passedCount} 통과, ${failedCount} 실패`)
  console.log(`========================================`)

  if (failedCount > 0) process.exit(1)
}

runAll()
