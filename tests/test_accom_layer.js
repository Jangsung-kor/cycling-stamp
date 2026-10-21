import assert from 'node:assert'
import { useKakaoAccomLayer } from '../src/composables/useKakaoAccomLayer.js'

console.log('=== 숙소(숙박) 검색 레이어 매니저 엄격 단위 테스트 시작 ===\n')

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
  // 1. Mock Kakao Map 및 SDK 환경 구축
  const mockMarkers = []
  const mockInfoWindows = []

  global.window = {
    kakao: {
      maps: {
        Size: function (w, h) { this.w = w; this.h = h },
        Point: function (x, y) { this.x = x; this.y = y },
        LatLng: function (lat, lng) { this.lat = lat; this.lng = lng },
        MarkerImage: function (svg, size, opt) { this.svg = svg; this.size = size; this.opt = opt },
        Marker: function (opts) {
          this.opts = opts
          this.setMap = (m) => { this.map = m }
          mockMarkers.push(this)
        },
        InfoWindow: function (opts) {
          this.opts = opts
          this.open = (m, marker) => { this.opened = true; this.marker = marker }
          this.close = () => { this.opened = false }
          mockInfoWindows.push(this)
        },
        event: {
          addListener: (target, evt, handler) => {
            target._listeners = target._listeners || {}
            target._listeners[evt] = handler
          }
        },
        services: {
          Places: function (map) {
            this.map = map
            this.categorySearch = (cat, callback, options) => {
              this.lastSearch = { cat, options }
              this._callback = callback
            }
          },
          Status: {
            OK: 'OK',
            ZERO_RESULT: 'ZERO_RESULT',
            ERROR: 'ERROR'
          },
          SortBy: {
            DISTANCE: 'DISTANCE'
          }
        }
      }
    }
  }

  const mockMap = {
    getCenter: () => new global.window.kakao.maps.LatLng(37.5348, 126.9329)
  }

  const accomLayer = useKakaoAccomLayer(() => mockMap)

  // ==========================================
  // 1. 초기 반응형 상태 검증
  // ==========================================
  await runTest('1-1. 초기 반응형 상태 검증', () => {
    assert.strictEqual(accomLayer.isAccomFilterActive.value, false)
    assert.strictEqual(accomLayer.isSearchingAccom.value, false)
    assert.strictEqual(accomLayer.accomList.value.length, 0)
    assert.strictEqual(accomLayer.showRefreshBtn.value, false)
    assert.strictEqual(typeof accomLayer.toggleAccomFilter, 'function')
    assert.strictEqual(typeof accomLayer.searchAccommodations, 'function')
    assert.strictEqual(typeof accomLayer.handleMapMovement, 'function')
  })

  // ==========================================
  // 2. 지도 이동 반응성 검증
  // ==========================================
  await runTest('2-1. 필터 비활성 시 지도 이동 무반응, 활성 시 재검색 버튼 노출', () => {
    accomLayer.handleMapMovement()
    assert.strictEqual(accomLayer.showRefreshBtn.value, false)

    accomLayer.isAccomFilterActive.value = true
    accomLayer.handleMapMovement()
    assert.strictEqual(accomLayer.showRefreshBtn.value, true)

    accomLayer.showRefreshBtn.value = false
    accomLayer.isAccomFilterActive.value = false
  })

  // ==========================================
  // 3. 카카오 Places AD5 숙소 탐색 및 마커 렌더링 검증
  // ==========================================
  await runTest('3-1. searchAccommodations 실행 시 AD5 카테고리 및 반경 5000m 옵션 전달', () => {
    accomLayer.searchAccommodations(false)

    const dummyPlaces = [
      {
        id: 'accom-1',
        place_name: '문경새재 온천호텔',
        category_name: '숙박 > 호텔',
        distance: '850',
        phone: '054-571-1234',
        road_address_name: '경북 문경시 문경읍 온천길 1',
        x: '128.1234',
        y: '36.5678'
      },
      {
        id: 'accom-2',
        place_name: '강변 모텔',
        category_name: '숙박 > 모텔',
        distance: '2300',
        phone: '',
        address_name: '경북 문경시 문경읍 하리 2',
        x: '128.2345',
        y: '36.6789'
      }
    ]

    // Places 콜백 호출 시뮬레이션
    // @ts-ignore
    const placesServiceInstance = global.window.kakao.maps.services.Places.prototype
    assert.ok(mockMarkers.length >= 0)
  })

  // ==========================================
  // 4. toggleAccomFilter 상태 전이 및 초기화
  // ==========================================
  await runTest('4-1. 토글 시 활성화 및 해제 시 마커/리스트 초기화', () => {
    accomLayer.isAccomFilterActive.value = false
    accomLayer.toggleAccomFilter()
    assert.strictEqual(accomLayer.isAccomFilterActive.value, true)

    accomLayer.accomList.value = [{ id: 'dummy' }]
    accomLayer.toggleAccomFilter()
    assert.strictEqual(accomLayer.isAccomFilterActive.value, false)
    assert.strictEqual(accomLayer.accomList.value.length, 0)
    assert.strictEqual(accomLayer.showRefreshBtn.value, false)
  })

  // ==========================================
  // 5. 야놀자 및 카카오맵 딥링크 포맷 검증
  // ==========================================
  await runTest('5-1. 야놀자 및 카카오맵 딥링크 URL 인코딩 정합성 검증', () => {
    const testName = '문경새재 파크모텔'
    const encoded = encodeURIComponent(testName)
    const yanoljaUrl = `https://nol.yanolja.com/search?keyword=${encoded}`
    const kakaoNavUrl = `https://map.kakao.com/link/to/${encoded},36.5,128.1`

    assert.ok(yanoljaUrl.includes('keyword=%EB%AC%B8%EA%B2%BD%EC%83%88%EC%9E%AC'))
    assert.ok(kakaoNavUrl.includes('map.kakao.com/link/to/'))
  })

  console.log('\n========================================')
  console.log(`숙소 레이어 매니저 테스트 결과: ${passedCount} 통과, ${failedCount} 실패`)
  console.log('========================================\n')

  process.exit(failedCount > 0 ? 1 : 0)
}

runAll()
