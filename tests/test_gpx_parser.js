import assert from 'node:assert'
import { parseGpx, simplifyRdp } from '../src/utils/gpxParser.js'

console.log('=== GPX Parser & RDP 알고리즘 엄격 단위 테스트 시작 ===\n')

let passedCount = 0
let failedCount = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
    passedCount++
  } catch (err) {
    console.error(`[FAIL] ${name}`)
    console.error(`       Error: ${err.message}`)
    failedCount++
  }
}

// 1. 에러 및 예외 케이스 테스트
runTest('1-1. 빈 문자열 또는 null 입력 시 에러 객체 반환', () => {
  const res1 = parseGpx('')
  assert.strictEqual(res1.success, false)
  assert.match(res1.error, /비어있거나/)

  const res2 = parseGpx(null)
  assert.strictEqual(res2.success, false)

  const res3 = parseGpx(undefined)
  assert.strictEqual(res3.success, false)
})

runTest('1-2. 트랙 포인트가 없는 GPX 처리', () => {
  const emptyGpx = `<?xml version="1.0" encoding="UTF-8"?>
  <gpx version="1.1" creator="Test">
    <trk><name>텅 빈 라이딩</name><trkseg></trkseg></trk>
  </gpx>`
  const res = parseGpx(emptyGpx)
  assert.strictEqual(res.success, false)
  assert.match(res.error, /유효한 위치 좌표/)
})

// 2. RDP 단순화 알고리즘 정밀도 및 압축률 테스트
runTest('2-1. RDP: 일직선 상의 100개 점에 대한 극대화 압축률 (>95%)', () => {
  // 서울(37.5, 127.0)에서 부산 방면(37.0, 127.5)으로 완전 일직선 상의 101개 점
  const straightPoints = []
  for (let i = 0; i <= 100; i++) {
    const ratio = i / 100
    straightPoints.push({
      lat: 37.5 - ratio * 0.5,
      lng: 127.0 + ratio * 0.5,
      ele: 10 + ratio * 5,
      time: new Date(1700000000000 + i * 1000).toISOString()
    })
  }
  
  const simplified = simplifyRdp(straightPoints, 5)
  // 일직선이므로 양 끝점 2개만 남아야 함
  assert.strictEqual(simplified.length, 2, `점 개수가 2개여야 하는데 ${simplified.length}개입니다.`)
  assert.strictEqual(simplified[0].lat, 37.5)
  assert.strictEqual(simplified[1].lat, 37.0)
})

runTest('2-2. RDP: 굴곡(헤어핀)이 있는 궤적 보존', () => {
  // 삼각형 모양 궤적: (0,0) -> (0.01, 0.01) [수직 거리 약 1km 돌출] -> (0.02, 0)
  const trianglePoints = [
    { lat: 37.5000, lng: 127.0000 },
    { lat: 37.5050, lng: 127.0050 },
    { lat: 37.5100, lng: 127.0100 }, // 꼭지점
    { lat: 37.5050, lng: 127.0150 },
    { lat: 37.5000, lng: 127.0200 }
  ]
  const simplified = simplifyRdp(trianglePoints, 5)
  // 꼭지점은 5m 허용오차를 훨씬 넘으므로 반드시 보존되어야 함
  assert.ok(simplified.length >= 3, `중요 굴곡점이 보존되어야 함 (남은 점: ${simplified.length})`)
  const hasPeak = simplified.some(p => Math.abs(p.lat - 37.5100) < 0.0001 && Math.abs(p.lng - 127.0100) < 0.0001)
  assert.ok(hasPeak, '꼭지점(Peak) 좌표가 보존되지 않았습니다.')
})

// 3. 실제 라이딩 GPX 데이터 종합 파싱 검증
runTest('3-1. 거리, 획득고도, 주행시간, 바운딩 박스 계산 정합성', () => {
  const realisticGpx = `<?xml version="1.0" encoding="UTF-8"?>
  <gpx version="1.1" creator="Garmin Edge" xmlns="http://www.topografix.com/GPX/1/1">
    <trk>
      <name>한강 자전거길 라이딩</name>
      <trkseg>
        <trkpt lat="37.520000" lon="127.020000"><ele>15.0</ele><time>2026-10-20T09:00:00Z</time></trkpt>
        <trkpt lat="37.525000" lon="127.030000"><ele>25.0</ele><time>2026-10-20T09:10:00Z</time></trkpt>
        <trkpt lat="37.530000" lon="127.040000"><ele>20.0</ele><time>2026-10-20T09:20:00Z</time></trkpt>
        <trkpt lat="37.535000" lon="127.050000"><ele>40.0</ele><time>2026-10-20T09:30:00Z</time></trkpt>
      </trkseg>
    </trk>
  </gpx>`

  const res = parseGpx(realisticGpx, '기본제목', 2)
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.title, '한강 자전거길 라이딩')
  // 37.52, 127.02 에서 37.535, 127.05 까지 대각선 거리는 약 3.1km
  assert.ok(res.distanceKm > 2.5 && res.distanceKm < 4.0, `거리 계산 오차: ${res.distanceKm}km`)
  // 획득고도: 15->25 (+10), 25->20 (0), 20->40 (+20) => 총 30m
  assert.strictEqual(res.elevationGainM, 30, `획득고도는 30m여야 하는데 ${res.elevationGainM}m 입니다.`)
  // 주행시간: 09:00 ~ 09:30 => 30분
  assert.strictEqual(res.durationMinutes, 30, `주행시간은 30분이어야 하는데 ${res.durationMinutes}분 입니다.`)
  // 바운딩 박스
  assert.strictEqual(res.bounds.southWest.lat, 37.520000)
  assert.strictEqual(res.bounds.southWest.lng, 127.020000)
  assert.strictEqual(res.bounds.northEast.lat, 37.535000)
  assert.strictEqual(res.bounds.northEast.lng, 127.050000)
  // 좌표 배열 형식 [lat, lng]
  assert.strictEqual(res.coordinates.length > 0, true)
  assert.strictEqual(res.coordinates[0].length, 2)
})

runTest('3-2. 고도/시간 정보가 누락된 GPX 파일도 정상 처리 (안전성)', () => {
  const minimalGpx = `<?xml version="1.0" encoding="UTF-8"?>
  <gpx version="1.1" creator="Simple App">
    <trk>
      <trkseg>
        <trkpt lat="37.500000" lon="127.000000"></trkpt>
        <trkpt lat="37.510000" lon="127.010000"></trkpt>
      </trkseg>
    </trk>
  </gpx>`

  const res = parseGpx(minimalGpx, '내 라이딩')
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.title, '내 라이딩') // fallbackTitle 적용
  assert.strictEqual(res.elevationGainM, 0) // 고도 없으면 0
  assert.strictEqual(res.durationMinutes, 0) // 시간 없으면 0
  assert.ok(res.distanceKm > 1.0, '거리 계산 정상 작동')
})

runTest('3-3. lon 속성이 먼저 오거나 셀프 클로징 태그인 GPX 호환성 검증', () => {
  const altFormatGpx = `<?xml version="1.0" encoding="UTF-8"?>
  <gpx version="1.1">
    <trk>
      <name>호환성 테스트 트랙</name>
      <trkseg>
        <trkpt lon="126.9780" lat="37.5665" />
        <trkpt lon="126.9880" lat="37.5765" />
      </trkseg>
    </trk>
  </gpx>`

  const res = parseGpx(altFormatGpx)
  assert.strictEqual(res.success, true)
  assert.strictEqual(res.title, '호환성 테스트 트랙')
  assert.strictEqual(res.pointCount.original, 2)
  assert.strictEqual(res.coordinates[0][0], 37.5665)
  assert.strictEqual(res.coordinates[0][1], 126.978)
})

runTest('3-3. 대용량(2,000 포인트) 현실적 라이딩 궤적 압축률 및 소요 성능 검증', () => {
  // 실제 40km 라이딩 시뮬레이션 (곡선 + 노이즈 2000개 포인트)
  const startTime = new Date('2026-10-20T06:00:00Z').getTime()
  let gpxXml = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1"><trk><name>40km 장거리 투어</name><trkseg>`
  
  for (let i = 0; i < 2000; i++) {
    const lat = 37.5000 + (i * 0.00015) + (Math.sin(i / 10) * 0.00005)
    const lon = 127.0000 + (i * 0.00020) + (Math.cos(i / 10) * 0.00005)
    const ele = 20 + Math.sin(i / 20) * 10
    const time = new Date(startTime + i * 3000).toISOString()
    gpxXml += `<trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><ele>${ele.toFixed(1)}</ele><time>${time}</time></trkpt>`
  }
  gpxXml += `</trkseg></trk></gpx>`

  const tStart = performance.now()
  const res = parseGpx(gpxXml, '장거리', 5) // 5m 허용오차
  const tDuration = performance.now() - tStart

  assert.strictEqual(res.success, true)
  assert.ok(res.pointCount.original === 2000)
  assert.ok(res.pointCount.simplified < 500, `2000개 좌표가 500개 미만으로 압축되어야 함 (압축 결과: ${res.pointCount.simplified}개)`)
  const compRate = parseFloat(res.pointCount.compressionRate)
  assert.ok(compRate >= 75.0, `압축률이 최소 75% 이상이어야 함: ${compRate}%`)
  assert.ok(tDuration < 500, `2,000개 포인트 처리 속도가 500ms 미만이어야 함: ${tDuration.toFixed(1)}ms`)
  console.log(`       [성능 지표] 2,000포인트 파싱 및 RDP 압축: ${tDuration.toFixed(1)}ms, 압축률: ${res.pointCount.compressionRate} (${res.pointCount.original} -> ${res.pointCount.simplified})`)
})

console.log(`\n========================================`)
console.log(`테스트 결과: ${passedCount} 통과, ${failedCount} 실패`)
console.log(`========================================`)

if (failedCount > 0) {
  process.exit(1)
}
