/**
 * 대한민국 전국 영토 탐험률 및 시·군·구 정복 계산 엔진
 * 100% 클라이언트 오프라인 연산 (배터리 및 메모리 최적화)
 */
import { KOREA_REGIONS, KOREA_TOTAL_REGIONS_COUNT, KOREA_LAND_GRID_TOTAL } from '../constants/geoRegions.js'

const GRID_STEP_LAT = 0.02 // 약 2.2km
const GRID_STEP_LNG = 0.02 // 약 1.8km

/**
 * 모든 주행 트랙 좌표를 기반으로 전국 탐험률 및 정복 시군구 계산
 * @param {Array} tracks GPX 트랙 목록
 * @returns {Object} 탐험 통계 결과
 */
export function computeExplorationStats(tracks = []) {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    return {
      exploredTileCount: 0,
      totalTileCount: KOREA_LAND_GRID_TOTAL,
      explorationRate: 0,
      conqueredRegions: [],
      conqueredCount: 0,
      totalRegionsCount: KOREA_TOTAL_REGIONS_COUNT,
      regionRate: 0
    }
  }

  const exploredTileSet = new Set()
  const conqueredRegionIdSet = new Set()

  for (const track of tracks) {
    const coords = track.coordinates
    if (!Array.isArray(coords) || coords.length === 0) continue

    for (const pt of coords) {
      const lat = typeof pt.lat === 'number' ? pt.lat : parseFloat(pt.lat)
      const lng = typeof pt.lng === 'number' ? pt.lng : parseFloat(pt.lng)
      if (isNaN(lat) || isNaN(lng)) continue

      // 대한민국 유효 범위 (위도 33 ~ 39, 경도 125 ~ 131)
      if (lat < 33.0 || lat > 39.0 || lng < 125.0 || lng > 131.0) continue

      // 1. 공간 격자 타일 수집
      const gridY = Math.floor(lat / GRID_STEP_LAT)
      const gridX = Math.floor(lng / GRID_STEP_LNG)
      exploredTileSet.add(`${gridY}_${gridX}`)

      // 2. 시·군·구 바운딩 박스 매핑 (아직 정복되지 않은 시군구만 검사)
      for (const region of KOREA_REGIONS) {
        if (conqueredRegionIdSet.has(region.id)) continue

        if (
          lat >= region.minLat &&
          lat <= region.maxLat &&
          lng >= region.minLng &&
          lng <= region.maxLng
        ) {
          conqueredRegionIdSet.add(region.id)
        }
      }
    }
  }

  // 정복된 시군구 상세 객체 목록 구성
  const conqueredRegions = KOREA_REGIONS.filter(r => conqueredRegionIdSet.has(r.id))
  const exploredTileCount = exploredTileSet.size
  const conqueredCount = conqueredRegions.length

  // 탐험률 (%) 소수 둘째자리 (타일 1개 이상 시 최소 0.01% 이상)
  const rawRate = (exploredTileCount / KOREA_LAND_GRID_TOTAL) * 100
  const explorationRate = exploredTileCount > 0
    ? Math.min(100, Math.max(0.01, Math.round(rawRate * 100) / 100))
    : 0

  // 시군구 정복률 (%)
  const regionRate = Math.min(
    100,
    Math.round((conqueredCount / KOREA_TOTAL_REGIONS_COUNT) * 100)
  )

  return {
    exploredTileCount,
    totalTileCount: KOREA_LAND_GRID_TOTAL,
    explorationRate,
    conqueredRegions,
    conqueredCount,
    totalRegionsCount: KOREA_TOTAL_REGIONS_COUNT,
    regionRate
  }
}
