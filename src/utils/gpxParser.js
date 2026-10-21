import { calculateDistance } from './geo.js'

/**
 * GPX XML 데이터를 파싱하고 RDP 알고리즘으로 좌표를 경량화하는 유틸리티
 */

/**
 * 평면 투영(Equirectangular) 기반 점과 선분 간의 수직 거리(미터) 계산
 */
function perpendicularDistanceMeters(p, p1, p2) {
  const latMidRad = ((p1.lat + p2.lat) / 2) * (Math.PI / 180)
  const cosLat = Math.cos(latMidRad)

  // 미터 단위 좌표계로 변환 (위도 1도 ≈ 111,000m, 경도 1도 ≈ 111,000m * cos(lat))
  const x1 = 0
  const y1 = 0
  const x2 = (p2.lng - p1.lng) * 111320 * cosLat
  const y2 = (p2.lat - p1.lat) * 110540
  const x0 = (p.lng - p1.lng) * 111320 * cosLat
  const y0 = (p.lat - p1.lat) * 110540

  const dx = x2 - x1
  const dy = y2 - y1
  const lineLenSq = dx * dx + dy * dy

  if (lineLenSq === 0) {
    return Math.sqrt(x0 * x0 + y0 * y0)
  }

  // 선분 상의 정사영 비율 t
  const t = Math.max(0, Math.min(1, (x0 * dx + y0 * dy) / lineLenSq))
  const projX = x1 + t * dx
  const projY = y1 + t * dy

  const distSq = (x0 - projX) * (x0 - projX) + (y0 - projY) * (y0 - projY)
  return Math.sqrt(distSq)
}

/**
 * Ramer-Douglas-Peucker (RDP) 궤적 단순화 알고리즘
 * @param {Array<{lat: number, lng: number}>} points 원본 좌표 배열
 * @param {number} toleranceMeters 허용 오차 (미터, 기본 5m)
 * @returns {Array<{lat: number, lng: number}>} 단순화된 좌표 배열
 */
export function simplifyRdp(points, toleranceMeters = 5) {
  if (!points || points.length <= 2) return points || []

  let maxDistance = 0
  let index = 0
  const end = points.length - 1

  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistanceMeters(points[i], points[0], points[end])
    if (dist > maxDistance) {
      maxDistance = dist
      index = i
    }
  }

  if (maxDistance > toleranceMeters) {
    const leftPart = simplifyRdp(points.slice(0, index + 1), toleranceMeters)
    const rightPart = simplifyRdp(points.slice(index), toleranceMeters)
    return leftPart.slice(0, leftPart.length - 1).concat(rightPart)
  } else {
    return [points[0], points[end]]
  }
}

/**
 * XML 파싱 헬퍼 (브라우저 DOMParser 및 비브라우저 정규식 폴백 지원)
 */
function extractTrackPointsFromXml(xmlString) {
  const points = []
  let trackName = ''

  if (typeof window !== 'undefined' && window.DOMParser) {
    const parser = new window.DOMParser()
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

    // 파싱 오류 검사
    const parseError = xmlDoc.getElementsByTagName('parsererror')
    if (parseError.length > 0) {
      throw new Error('올바르지 않은 XML/GPX 파일 형식입니다.')
    }

    // 트랙 이름 추출
    const nameEl = xmlDoc.querySelector('trk > name') || xmlDoc.querySelector('name')
    if (nameEl) {
      trackName = nameEl.textContent?.trim() || ''
    }

    // <trkpt>, <rtept>, <wpt> 탐색
    let ptElements = xmlDoc.getElementsByTagName('trkpt')
    if (!ptElements || ptElements.length === 0) {
      ptElements = xmlDoc.getElementsByTagName('rtept')
    }
    if (!ptElements || ptElements.length === 0) {
      ptElements = xmlDoc.getElementsByTagName('wpt')
    }

    for (let i = 0; i < ptElements.length; i++) {
      const el = ptElements[i]
      const lat = parseFloat(el.getAttribute('lat'))
      const lon = parseFloat(el.getAttribute('lon'))

      if (isNaN(lat) || isNaN(lon)) continue

      const eleEl = el.getElementsByTagName('ele')[0]
      const ele = eleEl ? parseFloat(eleEl.textContent) : null

      const timeEl = el.getElementsByTagName('time')[0]
      const time = timeEl ? timeEl.textContent.trim() : null

      points.push({
        lat,
        lng: lon,
        ele: isNaN(ele) ? null : ele,
        time
      })
    }
  } else {
    // Node.js 또는 순수 환경용 정규식 추출 폴백 (속성 순서 무관 및 셀프 클로징 태그 완벽 지원)
    const nameMatch = xmlString.match(/<name>([^<]+)<\/name>/i)
    if (nameMatch) {
      trackName = nameMatch[1].trim()
    }

    const tagRegex = /<(trkpt|rtept|wpt)([^>]*?)(?:>([\s\S]*?)<\/\1>|\/>)/gi
    let match
    while ((match = tagRegex.exec(xmlString)) !== null) {
      const attrs = match[2]
      const inner = match[3] || ''

      const latMatch = attrs.match(/lat=["']([-0-9.]+)["']/i)
      const lonMatch = attrs.match(/lon=["']([-0-9.]+)["']/i)
      if (!latMatch || !lonMatch) continue

      const lat = parseFloat(latMatch[1])
      const lon = parseFloat(lonMatch[1])
      if (isNaN(lat) || isNaN(lon)) continue

      const eleMatch = inner.match(/<ele>([-0-9.]+)<\/ele>/i)
      const timeMatch = inner.match(/<time>([^<]+)<\/time>/i)

      points.push({
        lat,
        lng: lon,
        ele: eleMatch ? parseFloat(eleMatch[1]) : null,
        time: timeMatch ? timeMatch[1].trim() : null
      })
    }
  }

  return { points, trackName }
}

/**
 * GPX 원본 텍스트를 파싱하여 거리, 고도, 시간 및 압축된 좌표 배열을 계산하는 메인 함수
 * @param {string} gpxXmlString GPX 파일 내용 문자열
 * @param {string} fallbackTitle 기본 제목 (파일명 등)
 * @param {number} toleranceMeters RDP 단순화 허용 오차 (미터, 기본 4m)
 * @returns {Object} 파싱 결과 객체
 */
export function parseGpx(gpxXmlString, fallbackTitle = '라이딩 기록', toleranceMeters = 4) {
  if (!gpxXmlString || typeof gpxXmlString !== 'string') {
    return {
      success: false,
      error: 'GPX 데이터가 비어있거나 올바르지 않습니다.'
    }
  }

  try {
    const { points, trackName } = extractTrackPointsFromXml(gpxXmlString)

    if (!points || points.length === 0) {
      return {
        success: false,
        error: 'GPX 파일에서 유효한 위치 좌표(trkpt)를 찾을 수 없습니다.'
      }
    }

    let totalDistanceMeters = 0
    let elevationGainMeters = 0
    let minLat = points[0].lat
    let maxLat = points[0].lat
    let minLng = points[0].lng
    let maxLng = points[0].lng
    let minEle = null
    let maxEle = null
    const rawElevationPoints = []

    for (let i = 0; i < points.length; i++) {
      const p = points[i]

      // Bounding box 갱신
      if (p.lat < minLat) minLat = p.lat
      if (p.lat > maxLat) maxLat = p.lat
      if (p.lng < minLng) minLng = p.lng
      if (p.lng > maxLng) maxLng = p.lng

      // 고도 최소/최대 갱신
      if (p.ele !== null && !isNaN(p.ele)) {
        if (minEle === null || p.ele < minEle) minEle = p.ele
        if (maxEle === null || p.ele > maxEle) maxEle = p.ele
      }

      // 거리 및 획득고도 누적
      if (i > 0) {
        const prev = points[i - 1]
        const d = calculateDistance(prev.lat, prev.lng, p.lat, p.lng)
        // 비정상적인 GPS 튐(순간 100km 초과) 방지 필터링
        if (d < 10000) {
          totalDistanceMeters += d
        }

        if (p.ele !== null && prev.ele !== null && p.ele > prev.ele) {
          elevationGainMeters += (p.ele - prev.ele)
        }
      }

      // 거리 대비 고도 포인트 수집
      if (p.ele !== null && !isNaN(p.ele)) {
        rawElevationPoints.push({
          distKm: Math.round((totalDistanceMeters / 1000) * 100) / 100,
          ele: Math.round(p.ele),
          lat: Math.round(p.lat * 1000000) / 1000000,
          lng: Math.round(p.lng * 1000000) / 1000000
        })
      }
    }

    // 주행 시간 계산
    const startTimeStr = points[0].time
    const endTimeStr = points[points.length - 1].time
    let durationMinutes = 0

    if (startTimeStr && endTimeStr) {
      const startT = new Date(startTimeStr).getTime()
      const endT = new Date(endTimeStr).getTime()
      if (!isNaN(startT) && !isNaN(endT) && endT >= startT) {
        durationMinutes = Math.round((endT - startT) / (1000 * 60))
      }
    }

    // RDP 좌표 경량화 실행
    const simplifiedPoints = simplifyRdp(points, toleranceMeters)

    // 지도 렌더링 및 DB 저장을 위한 컴팩트 [lat, lng] 배열 생성
    const coordinates = simplifiedPoints.map(p => [
      Math.round(p.lat * 1000000) / 1000000,
      Math.round(p.lng * 1000000) / 1000000
    ])

    const originalCount = points.length
    const simplifiedCount = coordinates.length
    const compressionRate = ((1 - simplifiedCount / originalCount) * 100).toFixed(1)

    // 고도 프로필 경량화 (최대 120개 포인트 균등 샘플링)
    let elevationProfile = []
    if (rawElevationPoints.length <= 120) {
      elevationProfile = rawElevationPoints
    } else {
      const step = (rawElevationPoints.length - 1) / 119
      for (let i = 0; i < 120; i++) {
        const idx = Math.min(rawElevationPoints.length - 1, Math.round(i * step))
        elevationProfile.push(rawElevationPoints[idx])
      }
    }

    return {
      success: true,
      title: trackName || fallbackTitle,
      distanceKm: Math.round((totalDistanceMeters / 1000) * 10) / 10,
      elevationGainM: Math.round(elevationGainMeters),
      minElevationM: minEle !== null ? Math.round(minEle) : null,
      maxElevationM: maxEle !== null ? Math.round(maxEle) : null,
      elevationProfile,
      durationMinutes,
      startTime: startTimeStr || new Date().toISOString(),
      bounds: {
        southWest: { lat: minLat, lng: minLng },
        northEast: { lat: maxLat, lng: maxLng }
      },
      pointCount: {
        original: originalCount,
        simplified: simplifiedCount,
        compressionRate: `${compressionRate}%`
      },
      coordinates
    }
  } catch (err) {
    return {
      success: false,
      error: `GPX 파싱 중 오류가 발생했습니다: ${err.message}`
    }
  }
}
