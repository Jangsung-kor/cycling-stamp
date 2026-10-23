/**
 * 대한민국 영토 탐험률 & 시군구 커버리지 엔진 엄격 단위 테스트
 */
import assert from 'assert'
import { computeExplorationStats } from '../src/utils/explorationEngine.js'
import { KOREA_TOTAL_REGIONS_COUNT, KOREA_LAND_GRID_TOTAL } from '../src/constants/geoRegions.js'
import { useExplorationManager } from '../src/composables/useExplorationManager.js'

console.log('=== 영토 탐험률 & 시군구 커버리지 엔진 단위 테스트 시작 ===\n')

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

// 1. 계산 엔진 정합성 검증
test('1-1. computeExplorationStats: 빈 트랙 목록 입력 시 0% 및 빈 목록 반환', () => {
  const resEmpty = computeExplorationStats([])
  assert.strictEqual(resEmpty.exploredTileCount, 0)
  assert.strictEqual(resEmpty.explorationRate, 0)
  assert.strictEqual(resEmpty.conqueredCount, 0)
  assert.strictEqual(resEmpty.conqueredRegions.length, 0)
  assert.strictEqual(resEmpty.totalRegionsCount, KOREA_TOTAL_REGIONS_COUNT)
  assert.strictEqual(resEmpty.totalTileCount, KOREA_LAND_GRID_TOTAL)
})

test('1-2. computeExplorationStats: 서울 마포구 & 영등포구 주행 궤적 입력 시 정복 판정', () => {
  // 마포구(37.55, 126.90)와 영등포구(37.52, 126.92) 좌표
  const mockTrack = {
    coordinates: [
      { lat: 37.550, lng: 126.900 }, // 마포구
      { lat: 37.535, lng: 126.915 }, // 마포구 -> 영등포 경계
      { lat: 37.520, lng: 126.920 }  // 영등포구
    ]
  }

  const res = computeExplorationStats([mockTrack])
  assert.ok(res.exploredTileCount >= 2, '최소 2개 이상의 격자 타일이 수집되어야 함')
  assert.ok(res.explorationRate > 0, '탐험률이 0보다 커야 함')
  assert.ok(res.conqueredCount >= 2, '마포구와 영등포구가 정복되어야 함')

  const mapo = res.conqueredRegions.find(r => r.name === '마포구')
  const ydp = res.conqueredRegions.find(r => r.name === '영등포구')
  assert.ok(mapo, '마포구가 정복 목록에 포함되어야 함')
  assert.ok(ydp, '영등포구가 정복 목록에 포함되어야 함')
})

test('1-3. computeExplorationStats: 국토종주(서울-경기-충북-경북-부산) 시뮬레이션 다중 정복 검증', () => {
  const crossCountryTrack = {
    coordinates: [
      { lat: 37.550, lng: 126.900 }, // 서울 마포구
      { lat: 37.490, lng: 127.490 }, // 경기 양평군
      { lat: 37.330, lng: 127.610 }, // 경기 여주시
      { lat: 36.980, lng: 127.900 }, // 충북 충주시
      { lat: 36.550, lng: 128.140 }, // 경북 문경시
      { lat: 35.110, lng: 128.950 }  // 부산광역시
    ]
  }

  const res = computeExplorationStats([crossCountryTrack])
  assert.ok(res.conqueredCount >= 5, '최소 5개 이상의 시군구가 정복되어야 함')
  assert.ok(res.conqueredRegions.some(r => r.province === '서울'))
  assert.ok(res.conqueredRegions.some(r => r.province === '경기'))
  assert.ok(res.conqueredRegions.some(r => r.province === '충북'))
  assert.ok(res.conqueredRegions.some(r => r.province === '경북'))
  assert.ok(res.conqueredRegions.some(r => r.province === '부산'))
})

// 2. useExplorationManager Facade 단위 테스트
test('2-1. useExplorationManager: 기본 모드(isExplorationMode=false) 초기값 및 모드 토글 검증', () => {
  const manager = useExplorationManager()
  assert.strictEqual(manager.isExplorationMode.value, false, '초기 상태는 기본 모드여야 함')

  manager.toggleExplorationMode()
  assert.strictEqual(manager.isExplorationMode.value, true, '토글 시 탐험 모드로 전환되어야 함')

  manager.setExplorationMode(false)
  assert.strictEqual(manager.isExplorationMode.value, false, '명시적으로 기본 모드 복원 가능해야 함')
})

test('2-2. useExplorationManager: updateExploration 호출 시 통계 및 반응성 검증', () => {
  const manager = useExplorationManager()
  const track = {
    coordinates: [{ lat: 37.550, lng: 126.900 }]
  }

  manager.updateExploration([track])
  assert.ok(manager.explorationRate.value > 0)
  assert.ok(manager.conqueredCount.value >= 1)
  assert.ok(manager.conqueredRegions.value.length >= 1)
})

console.log(`\n========================================`)
console.log(`테스트 결과: ${passCount} 통과, 0 실패`)
console.log(`========================================`)
