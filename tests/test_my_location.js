import assert from 'node:assert'
import { useKakaoMyLocation } from '../src/composables/useKakaoMyLocation.js'

console.log('=== 내 위치(GPS) 탐색 및 펄스 마커 엄격 단위 테스트 시작 ===\n')

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

function mockNavigator(geolocation) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { geolocation },
    configurable: true,
    writable: true
  })
}

async function runAll() {
  // 1. Mock Kakao Map 및 SDK 환경 구축
  let mockOverlay = null

  global.window = {
    kakao: {
      maps: {
        LatLng: function (lat, lng) {
          this.lat = lat
          this.lng = lng
        },
        CustomOverlay: function (opts) {
          this.opts = opts
          this.position = opts.position
          this.setMap = (m) => { this.map = m }
          this.setPosition = (pos) => { this.position = pos }
          mockOverlay = this
        }
      }
    }
  }

  global.document = {
    createElement: (tag) => ({
      tagName: tag,
      className: '',
      innerHTML: ''
    })
  }

  let panToCalled = false
  let setLevelCalled = false
  let currentLevel = 8

  const mockMap = {
    panTo: (latlng) => {
      panToCalled = true
      assert.strictEqual(latlng.lat, 37.5348)
      assert.strictEqual(latlng.lng, 126.9329)
    },
    getLevel: () => currentLevel,
    setLevel: (lvl) => {
      setLevelCalled = true
      currentLevel = lvl
    }
  }

  // ==========================================
  // 1. 초기 반응형 상태 검증
  // ==========================================
  await runTest('1-1. 초기 반응형 상태 검증', () => {
    const loc = useKakaoMyLocation(() => mockMap)
    assert.strictEqual(loc.isLocating.value, false)
    assert.strictEqual(loc.myLocation.value, null)
    assert.strictEqual(typeof loc.moveToMyLocation, 'function')
    assert.strictEqual(typeof loc.clearLocationMarker, 'function')
  })

  // ==========================================
  // 2. Geolocation 미지원 환경 방어
  // ==========================================
  await runTest('2-1. navigator.geolocation 부재 시 안전하게 종료', () => {
    const loc = useKakaoMyLocation(() => mockMap)
    mockNavigator(undefined)

    loc.moveToMyLocation()
    assert.strictEqual(loc.isLocating.value, false)
  })

  // ==========================================
  // 3. 정상 GPS 위치 수신 및 지도/오버레이 연동
  // ==========================================
  const loc = useKakaoMyLocation(() => mockMap)

  await runTest('3-1. 고정밀 GPS 수신 성공 시 panTo, level 4 줌인 및 펄스 오버레이 생성 검증', () => {
    panToCalled = false
    setLevelCalled = false
    currentLevel = 8

    let geoOptions = null
    mockNavigator({
      getCurrentPosition: (success, error, opts) => {
        geoOptions = opts
        success({
          coords: {
            latitude: 37.5348,
            longitude: 126.9329,
            accuracy: 15
          }
        })
      }
    })

    loc.moveToMyLocation()

    // Geolocation 옵션 검증
    assert.ok(geoOptions)
    assert.strictEqual(geoOptions.enableHighAccuracy, true)
    assert.strictEqual(geoOptions.timeout, 10000)

    // 상태 검증
    assert.strictEqual(loc.isLocating.value, false)
    assert.deepStrictEqual(loc.myLocation.value, {
      lat: 37.5348,
      lng: 126.9329,
      accuracy: 15
    })

    // 지도 카메라 이동 및 줌 레벨 검증
    assert.strictEqual(panToCalled, true)
    assert.strictEqual(setLevelCalled, true)
    assert.strictEqual(currentLevel, 4)

    // CustomOverlay 생성 검증
    assert.ok(mockOverlay)
    assert.strictEqual(mockOverlay.opts.zIndex, 32)
    assert.strictEqual(mockOverlay.map, mockMap)
  })

  // ==========================================
  // 4. GPS 에러(권한 거부, 타임아웃 등) 방어 검증
  // ==========================================
  await runTest('4-1. 권한 거부/타임아웃 시 isLocating 상태 정상 복원 검증', () => {
    mockNavigator({
      getCurrentPosition: (success, error) => {
        error({ code: 1, message: 'User denied geolocation' })
      }
    })

    loc.moveToMyLocation()
    assert.strictEqual(loc.isLocating.value, false)
  })

  // ==========================================
  // 5. 오버레이 정리(cleanup) 검증
  // ==========================================
  await runTest('5-1. clearLocationMarker 호출 시 setMap(null) 수행', () => {
    assert.ok(mockOverlay)
    loc.clearLocationMarker()
    assert.strictEqual(mockOverlay.map, null)
  })

  console.log('\n========================================')
  console.log(`내 위치 매니저 테스트 결과: ${passedCount} 통과, ${failedCount} 실패`)
  console.log('========================================\n')

  process.exit(failedCount > 0 ? 1 : 0)
}

runAll()
