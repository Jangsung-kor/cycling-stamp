import assert from 'node:assert'
import { createPinia, setActivePinia } from 'pinia'
import { useGpxStore } from '../src/stores/gpx.js'
import { useGpxManager } from '../src/composables/useGpxManager.js'
import { parseGpx } from '../src/utils/gpxParser.js'
import { clearAllTracksFromDb } from '../src/utils/indexedDb.js'

console.log('=== GPX 고도 프로필 차트 및 스크러빙 인터랙션 엄격 단위 테스트 시작 ===\n')

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
  const gpxStore = useGpxStore()

  // 1. 초기 상태 및 기본값 검증
  await runTest('1-1. 스토어 초기 상태: showElevationProfile=false, activeScrubbingPoint=null, activeElevationTrack=null', () => {
    assert.strictEqual(gpxStore.showElevationProfile, false)
    assert.strictEqual(gpxStore.activeScrubbingPoint, null)
    assert.strictEqual(gpxStore.activeElevationTrack, null)
  })

  // 2. 내 트랙 고도 차트 열기 및 닫기
  let createdTrackId = null
  await runTest('2-1. 내 트랙 ID로 openElevationProfile 호출 시 활성 트랙 및 차트 노출 상태 정상 전환', async () => {
    await clearAllTracksFromDb()
    await gpxStore.clearAllTracks()

    const mockTrack = {
      success: true,
      title: '남산-북악 업힐 챌린지',
      distanceKm: 24.5,
      elevationGainM: 520,
      minElevationM: 35,
      maxElevationM: 342,
      coordinates: [[37.55, 126.98], [37.58, 126.98]],
      elevationProfile: [
        { distKm: 0, ele: 35, lat: 37.55, lng: 126.98 },
        { distKm: 12.0, ele: 260, lat: 37.56, lng: 126.98 },
        { distKm: 24.5, ele: 342, lat: 37.58, lng: 126.98 }
      ]
    }

    const added = await gpxStore.addTrack(mockTrack)
    createdTrackId = added.id
    gpxStore.openElevationProfile(createdTrackId)

    assert.strictEqual(gpxStore.showElevationProfile, true)
    assert.strictEqual(gpxStore.selectedTrackId, createdTrackId)
    assert.strictEqual(gpxStore.selectedFriendTrackId, null)
    assert.notStrictEqual(gpxStore.activeElevationTrack, null)
    assert.strictEqual(gpxStore.activeElevationTrack.title, '남산-북악 업힐 챌린지')
    assert.strictEqual(gpxStore.activeElevationTrack.maxElevationM, 342)
  })

  // 3. 친구 트랙 고도 차트 열기
  await runTest('3-1. 친구 트랙 ID로 openElevationProfile 호출 시 activeElevationTrack 정상 매핑', () => {
    const friendTrack = {
      id: 'friend_track_99',
      authorUid: 'friend_uid_1',
      authorName: '동륜라이더',
      title: '동부 5고개 투어',
      distanceKm: 65.2,
      elevationGainM: 1120,
      minElevationM: 40,
      maxElevationM: 480,
      coordinates: [[37.5, 127.3], [37.6, 127.4]],
      elevationProfile: [
        { distKm: 0, ele: 40, lat: 37.5, lng: 127.3 },
        { distKm: 32.5, ele: 480, lat: 37.55, lng: 127.35 },
        { distKm: 65.2, ele: 60, lat: 37.6, lng: 127.4 }
      ]
    }

    gpxStore.setFriendTracks([friendTrack])
    gpxStore.openElevationProfile('friend_track_99')

    assert.strictEqual(gpxStore.showElevationProfile, true)
    assert.strictEqual(gpxStore.selectedFriendTrackId, 'friend_track_99')
    assert.strictEqual(gpxStore.selectedTrackId, null)
    assert.strictEqual(gpxStore.activeElevationTrack.id, 'friend_track_99')
    assert.strictEqual(gpxStore.activeElevationTrack.authorName, '동륜라이더')
  })

  // 4. 실시간 스크러빙 포인트 설정 및 해제
  await runTest('4-1. setActiveScrubbingPoint 호출 시 거리/고도/좌표 상태 갱신 및 초기화', () => {
    const scrubPoint = {
      distKm: 15.2,
      ele: 245,
      lat: 37.562,
      lng: 126.985
    }

    gpxStore.setActiveScrubbingPoint(scrubPoint)
    assert.deepStrictEqual(gpxStore.activeScrubbingPoint, scrubPoint)

    // 마우스/터치 벗어날 시 null 초기화
    gpxStore.setActiveScrubbingPoint(null)
    assert.strictEqual(gpxStore.activeScrubbingPoint, null)
  })

  // 5. 차트 닫기 및 트랙 삭제 연동
  await runTest('5-1. closeElevationProfile 및 트랙 삭제 시 고도 차트 자동 닫힘 방어', async () => {
    gpxStore.openElevationProfile(createdTrackId)
    assert.strictEqual(gpxStore.showElevationProfile, true)

    gpxStore.closeElevationProfile()
    assert.strictEqual(gpxStore.showElevationProfile, false)
    assert.strictEqual(gpxStore.activeScrubbingPoint, null)

    // 다시 열고 트랙 삭제 시 자동 닫힘 검증
    gpxStore.openElevationProfile(createdTrackId)
    assert.strictEqual(gpxStore.showElevationProfile, true)

    await gpxStore.removeTrack(createdTrackId)
    assert.strictEqual(gpxStore.showElevationProfile, false)
    assert.strictEqual(gpxStore.activeElevationTrack, null)
  })

  // 6. useGpxManager 퍼사드 통합 검증
  await runTest('6-1. useGpxManager Facade에서 고도 차트 반응형 상태 및 제어 메서드 정상 제공', async () => {
    const facade = useGpxManager()

    assert.strictEqual(typeof facade.showElevationProfile.value, 'boolean')
    assert.strictEqual(typeof facade.openElevationProfile, 'function')
    assert.strictEqual(typeof facade.closeElevationProfile, 'function')
    assert.strictEqual(typeof facade.setActiveScrubbingPoint, 'function')

    const newTrack = {
      success: true,
      title: '팔당 한강 라이딩',
      distanceKm: 30.0,
      elevationGainM: 150,
      minElevationM: 15,
      maxElevationM: 45,
      coordinates: [[37.5, 127.0], [37.6, 127.1]],
      elevationProfile: [{ distKm: 0, ele: 15, lat: 37.5, lng: 127.0 }, { distKm: 30, ele: 45, lat: 37.6, lng: 127.1 }]
    }

    const added = await gpxStore.addTrack(newTrack)
    facade.openElevationProfile(added.id)

    assert.strictEqual(facade.showElevationProfile.value, true)
    assert.strictEqual(facade.activeElevationTrack.value.id, added.id)

    facade.setActiveScrubbingPoint({ distKm: 15, ele: 30, lat: 37.55, lng: 127.05 })
    assert.strictEqual(facade.activeScrubbingPoint.value.ele, 30)

    facade.closeElevationProfile()
    assert.strictEqual(facade.showElevationProfile.value, false)
    assert.strictEqual(facade.activeScrubbingPoint.value, null)
  })

  // 7. GPX 파서의 고도 프로필 샘플링 및 극값 산출 검증
  await runTest('7-1. parseGpx: 다중 포인트 GPX 파싱 시 minElevationM, maxElevationM 및 120개 이내 샘플링 생성 검증', () => {
    // 300개의 트랙포인트 생성
    let trkpts = ''
    for (let i = 0; i < 300; i++) {
      const lat = 37.5 + i * 0.001
      const lon = 127.0 + i * 0.001
      const ele = 50 + Math.sin(i / 10) * 40 // 고도 10m ~ 90m 변동
      trkpts += `<trkpt lat="${lat}" lon="${lon}"><ele>${ele.toFixed(1)}</ele><time>2026-10-18T10:00:00Z</time></trkpt>\n`
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <trk>
    <name>300포인트 고도 궤적</name>
    <trkseg>
      ${trkpts}
    </trkseg>
  </trk>
</gpx>`

    const parsed = parseGpx(xml, 'fallback')
    assert.strictEqual(parsed.success, true)
    assert.ok(parsed.minElevationM <= 15, `minElevationM should be <= 15, got ${parsed.minElevationM}`)
    assert.ok(parsed.maxElevationM >= 85, `maxElevationM should be >= 85, got ${parsed.maxElevationM}`)
    assert.ok(Array.isArray(parsed.elevationProfile), 'elevationProfile should be an array')
    assert.ok(parsed.elevationProfile.length <= 120, 'sampled profile should be capped to <= 120 points')
    assert.ok(parsed.elevationProfile.length > 50, 'sampled profile should have sufficient points')
  })

  console.log(`\n========================================`)
  console.log(`고도 프로필 차트 테스트 결과: ${passedCount} 통과, ${failedCount} 실패`)
  console.log(`========================================`)

  if (failedCount > 0) {
    process.exit(1)
  }
}

runAllTests().catch(err => {
  console.error('테스트 실행 중 치명적 오류:', err)
  process.exit(1)
})
