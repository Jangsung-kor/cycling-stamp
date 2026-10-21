import { ref } from 'vue'
import { showToast } from 'vant'

/**
 * 카카오맵 실시간 숙소(숙박) 검색 및 마커 레이어 매니저
 * - 카카오 Places AD5(숙박) 카테고리 기반 실시간 탐색 (반경 5km)
 * - 모텔, 호텔, 펜션, 게스트하우스, 민박 렌더링
 * - 전화 문의, 카카오맵 길찾기 및 야놀자 사진/요금 조회 딥링크 연동
 */
export function useKakaoAccomLayer(getMapInstance) {
  const isAccomFilterActive = ref(false)
  const isSearchingAccom = ref(false)
  const accomList = ref([])
  const showRefreshBtn = ref(false)

  let accomMarkerList = []
  let activeAccomInfoWindow = null
  let placesService = null

  // 숙소 마커 벡터 SVG (인디고 테마 #4F46E5, 시인성 및 터치 용이성 확보)
  const accomMarkerSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
  </filter>
  <circle cx="17" cy="17" r="14" fill="%234F46E5" stroke="%23FFFFFF" stroke-width="2.2" filter="url(%23shadow)"/>
  <text x="17" y="22" font-size="14" text-anchor="middle" fill="%23FFFFFF">🏨</text>
</svg>`

  const clearAccomMarkers = () => {
    if (activeAccomInfoWindow) {
      activeAccomInfoWindow.close()
      activeAccomInfoWindow = null
    }
    accomMarkerList.forEach(m => m.setMap(null))
    accomMarkerList = []
  }

  const formatDistance = (rawDist) => {
    if (!rawDist) return '인근'
    const num = parseInt(rawDist, 10)
    if (isNaN(num)) return '인근'
    if (num < 1000) return `${num}m`
    return `${(num / 1000).toFixed(1)}km`
  }

  const renderAccomMarkers = (places) => {
    const map = getMapInstance()
    if (!map || !window.kakao || !window.kakao.maps.Marker) return

    const imageSize = new window.kakao.maps.Size(34, 34)
    const imageOption = { offset: new window.kakao.maps.Point(17, 17) }
    const markerImage = new window.kakao.maps.MarkerImage(accomMarkerSvg, imageSize, imageOption)

    places.forEach(place => {
      const position = new window.kakao.maps.LatLng(place.y, place.x)
      const marker = new window.kakao.maps.Marker({
        position,
        map,
        title: place.place_name,
        image: markerImage,
        zIndex: 26 // 인증센터 및 편의점보다 상단 배치하여 즉각 터치 지원
      })

      // 상세 카테고리 추출 (예: '숙박 > 모텔' -> '모텔')
      const categoryDetail = place.category_name ? place.category_name.split('>').pop().trim() : '숙박'
      const yanoljaUrl = `https://nol.yanolja.com/search?keyword=${encodeURIComponent(place.place_name)}`
      const kakaoNavUrl = `https://map.kakao.com/link/to/${encodeURIComponent(place.place_name)},${place.y},${place.x}`
      const distStr = formatDistance(place.distance)

      const infoContent = `
        <div style="padding:12px 14px; font-family:-apple-system,BlinkMacSystemFont,sans-serif; min-width:210px; max-width:260px; color:#1e293b; line-height:1.4;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; gap:6px;">
            <strong style="font-size:13.5px; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${place.place_name}</strong>
            <span style="font-size:10px; color:#4f46e5; background:#eef2ff; padding:2px 6px; border-radius:4px; font-weight:600; flex-shrink:0;">${categoryDetail}</span>
          </div>
          <div style="font-size:11px; color:#64748b; margin-bottom:3px;">
            거리: <strong style="color:#4f46e5;">${distStr}</strong>
          </div>
          <div style="font-size:10.5px; color:#475569; word-break:break-all; margin-bottom:8px; line-height:1.35;">
            ${place.road_address_name || place.address_name || ''}
          </div>
          <div style="display:flex; flex-direction:column; gap:5px; border-top:1px solid #f1f5f9; padding-top:8px;">
            <div style="display:flex; gap:5px;">
              ${place.phone ? `
                <a href="tel:${place.phone}" 
                   style="flex:1; text-align:center; background:#f8fafc; color:#334155; border:1px solid #cbd5e1; font-size:11px; font-weight:600; padding:5px 0; border-radius:5px; text-decoration:none;">
                  전화 문의
                </a>
              ` : ''}
              <a href="${kakaoNavUrl}" 
                 target="_blank" 
                 style="flex:1; text-align:center; background:#4f46e5; color:#ffffff; font-size:11px; font-weight:600; padding:5px 0; border-radius:5px; text-decoration:none;">
                길찾기 ↗
              </a>
            </div>
            <a href="${yanoljaUrl}" 
               target="_blank" 
               style="text-align:center; background:#fdf2f8; color:#db2777; border:1px solid #fbcfe8; font-size:11px; font-weight:600; padding:5px 0; border-radius:5px; text-decoration:none;">
              야놀자 요금/사진 확인 ↗
            </a>
          </div>
        </div>
      `

      const infowindow = new window.kakao.maps.InfoWindow({
        content: infoContent,
        removable: true
      })

      window.kakao.maps.event.addListener(marker, 'click', () => {
        if (activeAccomInfoWindow) {
          activeAccomInfoWindow.close()
        }
        infowindow.open(map, marker)
        activeAccomInfoWindow = infowindow
      })

      accomMarkerList.push(marker)
    })
  }

  const searchAccommodations = (isRefresh = false) => {
    const map = getMapInstance()
    if (!map || !window.kakao?.maps?.services) return

    if (!placesService) {
      placesService = new window.kakao.maps.services.Places(map)
    }

    isSearchingAccom.value = true
    if (isRefresh) {
      showToast({ message: '주변 숙소를 탐색 중입니다...', duration: 1000 })
    }

    const center = map.getCenter()
    const options = {
      location: center,
      radius: 5000, // 자전거 라이더 특성 고려 반경 5km
      sort: window.kakao.maps.services.SortBy.DISTANCE
    }

    placesService.categorySearch('AD5', (data, status) => {
      isSearchingAccom.value = false
      showRefreshBtn.value = false

      if (status === window.kakao.maps.services.Status.OK) {
        accomList.value = data
        clearAccomMarkers()
        renderAccomMarkers(data)

        if (isRefresh) {
          showToast({ message: `주변 숙소 ${data.length}곳을 찾았습니다.`, duration: 1500 })
        }
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        accomList.value = []
        clearAccomMarkers()
        if (isRefresh) {
          showToast({ message: '반경 5km 내에 검색된 숙소가 없습니다.', duration: 1500 })
        }
      } else {
        console.warn('숙소 검색 실패 또는 오류 상태코드:', status)
      }
    }, options)
  }

  const toggleAccomFilter = () => {
    isAccomFilterActive.value = !isAccomFilterActive.value
    if (isAccomFilterActive.value) {
      showToast({ message: '인근 숙소를 탐색합니다...', duration: 1200 })
      searchAccommodations(false)
    } else {
      clearAccomMarkers()
      accomList.value = []
      showRefreshBtn.value = false
      showToast({ message: '숙소 마커를 숨겼습니다.', duration: 1200 })
    }
  }

  const handleMapMovement = () => {
    if (isAccomFilterActive.value) {
      showRefreshBtn.value = true
    }
  }

  return {
    isAccomFilterActive,
    isSearchingAccom,
    accomList,
    showRefreshBtn,
    toggleAccomFilter,
    searchAccommodations,
    clearAccomMarkers,
    handleMapMovement
  }
}
