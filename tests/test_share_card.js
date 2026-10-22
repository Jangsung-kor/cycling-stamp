/**
 * 완주 인증 포토 카드 렌더러 & 유틸리티 엄격 단위 테스트
 */
import assert from 'assert'
import {
  CARD_DIMENSIONS,
  CARD_THEMES,
  computeTrackBounds,
  projectCoordinatesToCanvas,
  formatCardDuration,
  formatCardDate
} from '../src/utils/cardRenderer.js'

console.log('=== 완주 인증 포토 카드 엔진 단위 테스트 시작 ===\n')

let passCount = 0
function test(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
    passCount++
  } catch (err) {
    console.error(`[FAIL] ${name}`)
    console.error(err)
    process.exit(1)
  }
}

// 1. 규격 및 테마 설정 검증
test('1-1. CARD_DIMENSIONS: story(9:16) 및 square(1:1) 규격 정합성', () => {
  assert.strictEqual(CARD_DIMENSIONS.story.width, 1080)
  assert.strictEqual(CARD_DIMENSIONS.story.height, 1920)
  assert.strictEqual(CARD_DIMENSIONS.square.width, 1080)
  assert.strictEqual(CARD_DIMENSIONS.square.height, 1080)
})

test('1-2. CARD_THEMES: dark, ink, photo 프리셋 필수 속성 검증', () => {
  const themes = ['dark', 'ink', 'photo']
  themes.forEach(tId => {
    const t = CARD_THEMES[tId]
    assert.ok(t, `${tId} 테마가 존재해야 함`)
    assert.strictEqual(t.id, tId)
    assert.ok(t.textMain)
    assert.ok(t.textSub)
    assert.ok(t.cardBorder)
    assert.ok(t.trackDefaultColor)
  })
})

// 2. 바운딩 박스 연산 검증
test('2-1. computeTrackBounds: 빈 배열 또는 유효하지 않은 좌표 방어', () => {
  assert.strictEqual(computeTrackBounds([]), null)
  assert.strictEqual(computeTrackBounds(null), null)
  assert.strictEqual(computeTrackBounds([{ lat: 'abc', lng: 'xyz' }]), null)
})

test('2-2. computeTrackBounds: 유효한 궤적의 극값 및 중심 위도 정합성', () => {
  const coords = [
    { lat: 37.5000, lng: 126.9000 },
    { lat: 37.6000, lng: 127.1000 },
    { lat: 37.5500, lng: 127.0000 }
  ]
  const bounds = computeTrackBounds(coords)
  assert.ok(bounds !== null)
  assert.strictEqual(bounds.minLat, 37.5000)
  assert.strictEqual(bounds.maxLat, 37.6000)
  assert.strictEqual(bounds.minLng, 126.9000)
  assert.strictEqual(bounds.maxLng, 127.1000)
  assert.strictEqual(bounds.midLat, 37.5500)
})

// 3. Mercator 캔버스 투영 검증
test('3-1. projectCoordinatesToCanvas: 빈 입력 처리', () => {
  const rect = { x: 80, y: 300, width: 920, height: 800, padding: 30 }
  assert.deepStrictEqual(projectCoordinatesToCanvas([], rect), [])
})

test('3-2. projectCoordinatesToCanvas: 캔버스 사각 영역 내 좌표 투영 및 북쪽(위도) -> 상단(작은 Y)', () => {
  const rect = { x: 80, y: 300, width: 920, height: 800, padding: 30 }
  const coords = [
    { lat: 37.40, lng: 126.80 }, // 남서쪽 (좌하단)
    { lat: 37.60, lng: 127.20 }  // 북동쪽 (우상단)
  ]
  const pts = projectCoordinatesToCanvas(coords, rect)
  assert.strictEqual(pts.length, 2)

  // 1번점(남서쪽): X는 작고, Y는 커야 함 (캔버스 Y축은 아래로 증가)
  // 2번점(북동쪽): X는 크고, Y는 작아야 함
  assert.ok(pts[1].x > pts[0].x, '동쪽 지점의 X좌표가 더 커야 함')
  assert.ok(pts[0].y > pts[1].y, '남쪽 지점의 Y좌표가 더 커야 함 (위도가 낮을수록 화면 아래)')

  // 투영된 모든 점이 지정된 rect 영역 내에 위치해야 함
  pts.forEach(pt => {
    assert.ok(pt.x >= rect.x, `X좌표(${pt.x})가 rect.x(${rect.x}) 이상이어야 함`)
    assert.ok(pt.x <= rect.x + rect.width, `X좌표(${pt.x})가 영역 너비 이내여야 함`)
    assert.ok(pt.y >= rect.y, `Y좌표(${pt.y})가 rect.y(${rect.y}) 이상이어야 함`)
    assert.ok(pt.y <= rect.y + rect.height, `Y좌표(${pt.y})가 영역 높이 이내여야 함`)
  })
})

// 4. 시간 및 날짜 포맷터 검증
test('4-1. formatCardDuration: 분 단위 소요 시간 변환', () => {
  assert.strictEqual(formatCardDuration(0), '0분')
  assert.strictEqual(formatCardDuration(45), '45분')
  assert.strictEqual(formatCardDuration(120), '2시간')
  assert.strictEqual(formatCardDuration(145), '2시간 25분')
})

test('4-2. formatCardDate: YYYY.MM.DD 포맷 정합성', () => {
  const res1 = formatCardDate('2026-10-22T09:30:00Z')
  assert.strictEqual(res1, '2026.10.22')

  const res2 = formatCardDate(new Date(2025, 4, 5).getTime()) // 2025.05.05
  assert.strictEqual(res2, '2025.05.05')

  // null 또는 유효하지 않은 입력 시 오늘 날짜 형식 반환
  const resNull = formatCardDate(null)
  assert.match(resNull, /^\d{4}\.\d{2}\.\d{2}$/)
})

// 5. useShareCard Facade 단위 테스트
import { useShareCard } from '../src/composables/useShareCard.js'

test('5-1. useShareCard: openForTrack 호출 시 트랙 정보 매핑 및 모달 오픈', () => {
  const share = useShareCard()
  share.closeModal()
  assert.strictEqual(share.isModalOpen.value, false)

  const mockTrack = {
    id: 'track-101',
    title: '아라자전거길 야간 라이딩',
    distanceKm: 21.4,
    elevationGainM: 145,
    durationMinutes: 72,
    coordinates: [{ lat: 37.5, lng: 126.8 }, { lat: 37.6, lng: 126.9 }]
  }

  share.openForTrack(mockTrack, { riderName: '철수', userCode: 'CY-99AA' })
  assert.strictEqual(share.isModalOpen.value, true)
  assert.strictEqual(share.cardType.value, 'track')
  assert.strictEqual(share.cardData.trackTitle, '아라자전거길 야간 라이딩')
  assert.strictEqual(share.cardData.distanceKm, 21.4)
  assert.strictEqual(share.cardData.elevationGainM, 145)
  assert.strictEqual(share.riderInfo.riderName, '철수')
  assert.strictEqual(share.riderInfo.userCode, 'CY-99AA')
})

test('5-2. useShareCard: openForCourse 호출 시 코스 완주 정보 매핑', () => {
  const share = useShareCard()
  const mockCourse = {
    tab: '남한강',
    distanceKm: 132,
    elevationGainM: 850,
    durationMinutes: 360
  }
  const mockStamps = ['data:image/svg+xml;utf8,<svg></svg>']

  share.openForCourse(mockCourse, mockStamps, { riderName: '영희', userCode: 'CY-88BB' })
  assert.strictEqual(share.isModalOpen.value, true)
  assert.strictEqual(share.cardType.value, 'course')
  assert.strictEqual(share.cardData.courseName, '남한강 완주')
  assert.strictEqual(share.cardData.distanceKm, 132)
  assert.strictEqual(share.cardData.stampUrls.length, 1)
  assert.strictEqual(share.riderInfo.riderName, '영희')
  assert.strictEqual(share.riderInfo.userCode, 'CY-88BB')
})

test('5-3. useShareCard: closeModal 호출 시 모달 상태 및 사진 정리', () => {
  const share = useShareCard()
  share.closeModal()
  assert.strictEqual(share.isModalOpen.value, false)
  assert.strictEqual(share.userPhotoUrl.value, null)
})

console.log(`\n========================================`)
console.log(`테스트 결과: ${passCount} 통과, 0 실패`)
console.log(`========================================`)
