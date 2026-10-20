import { ref } from 'vue'
import { showToast } from 'vant'

/**
 * 카카오맵 실시간 보급소(편의점) 검색 및 마커 레이어 매니저
 */
export function useKakaoStoreLayer(getMapInstance) {
  const isStoreFilterActive = ref(false)
  const isSearchingStores = ref(false)
  const storeList = ref([])
  const showRefreshBtn = ref(false)

  let storeMarkerList = []
  let activeStoreInfoWindow = null
  let placesService = null

  const storeMarkerSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
  </filter>
  <circle cx="17" cy="17" r="14" fill="%232563EB" stroke="%23FFFFFF" stroke-width="2.2" filter="url(%23shadow)"/>
  <text x="17" y="22" font-size="15" text-anchor="middle">🏪</text>
</svg>`

  const clearStoreMarkers = () => {
    if (activeStoreInfoWindow) {
      activeStoreInfoWindow.close()
      activeStoreInfoWindow = null
    }
    storeMarkerList.forEach(m => m.setMap(null))
    storeMarkerList = []
  }

  const renderStoreMarkers = (places) => {
    const map = getMapInstance()
    if (!map || !window.kakao || !window.kakao.maps.Marker) return

    const imageSize = new window.kakao.maps.Size(34, 34)
    const imageOption = { offset: new window.kakao.maps.Point(17, 17) }
    const markerImage = new window.kakao.maps.MarkerImage(storeMarkerSvg, imageSize, imageOption)

    places.forEach(place => {
      const position = new window.kakao.maps.LatLng(place.y, place.x)
      const marker = new window.kakao.maps.Marker({
        position,
        map,
        title: place.place_name,
        image: markerImage,
        zIndex: 25 // 인증센터 마커보다 위에 노출하여 손쉬운 터치 지원
      })

      const infoContent = `
        <div style="padding:10px 12px; font-family:-apple-system,BlinkMacSystemFont,sans-serif; min-width:190px; max-width:240px; color:#1e293b; line-height:1.4;">
          <div style="display:flex; align-items:center; gap:5px; margin-bottom:4px;">
            <span style="font-size:14px;">🏪</span>
            <strong style="font-size:13px; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${place.place_name}</strong>
          </div>
          <div style="font-size:11px; color:#64748b; margin-bottom:2px;">
            거리: <strong style="color:#2563eb;">${place.distance ? `${place.distance}m` : '인근'}</strong>
          </div>
          <div style="font-size:10.5px; color:#475569; word-break:break-all; margin-bottom:6px;">
            ${place.road_address_name || place.address_name || ''}
          </div>
          ${place.phone ? `<div style="font-size:10.5px; color:#64748b; margin-bottom:6px;">📞 ${place.phone}</div>` : ''}
          <div style="display:flex; gap:6px; margin-top:6px; border-top:1px solid #f1f5f9; padding-top:6px;">
            <a href="https://map.kakao.com/link/to/${place.place_name},${place.y},${place.x}" 
               target="_blank" 
               style="display:inline-block; flex:1; text-align:center; background:#2563eb; color:#ffffff; font-size:10.5px; font-weight:bold; padding:4px 0; border-radius:4px; text-decoration:none;">
               카카오맵 길찾기 ↗
            </a>
          </div>
        </div>
      `

      const infowindow = new window.kakao.maps.InfoWindow({
        content: infoContent,
        removable: true
      })

      window.kakao.maps.event.addListener(marker, 'click', () => {
        if (activeStoreInfoWindow) {
          activeStoreInfoWindow.close()
        }
        infowindow.open(map, marker)
        activeStoreInfoWindow = infowindow
      })

      storeMarkerList.push(marker)
    })
  }

  const searchConvenienceStores = (isRefresh = false) => {
    const map = getMapInstance()
    if (!map || !window.kakao?.maps?.services) return

    if (!placesService) {
      placesService = new window.kakao.maps.services.Places(map)
    }

    isSearchingStores.value = true
    if (isRefresh) {
      showToast({ message: '현재 지도 중심 편의점을 탐색 중입니다...', duration: 1000 })
    }

    const center = map.getCenter()
    const options = {
      location: center,
      radius: 3000,
      sort: window.kakao.maps.services.SortBy.DISTANCE
    }

    placesService.categorySearch('CS2', (data, status) => {
      isSearchingStores.value = false
      showRefreshBtn.value = false

      if (status === window.kakao.maps.services.Status.OK) {
        storeList.value = data
        clearStoreMarkers()
        renderStoreMarkers(data)

        if (isRefresh) {
          showToast({ message: `주변 편의점 ${data.length}곳을 찾았습니다.`, duration: 1500 })
        }
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        storeList.value = []
        clearStoreMarkers()
        if (isRefresh) {
          showToast({ message: '반경 3km 내에 편의점이 없습니다.', duration: 1500 })
        }
      } else {
        console.warn('편의점 검색 실패 또는 오류 상태코드:', status)
      }
    }, options)
  }

  const toggleStoreFilter = () => {
    isStoreFilterActive.value = !isStoreFilterActive.value
    if (isStoreFilterActive.value) {
      showToast({ message: '🏪 인근 편의점을 탐색합니다...', duration: 1200 })
      searchConvenienceStores(false)
    } else {
      clearStoreMarkers()
      storeList.value = []
      showRefreshBtn.value = false
      showToast({ message: '편의점 마커를 숨겼습니다.', duration: 1200 })
    }
  }

  const handleMapMovement = () => {
    if (isStoreFilterActive.value) {
      showRefreshBtn.value = true
    }
  }

  return {
    isStoreFilterActive,
    isSearchingStores,
    storeList,
    showRefreshBtn,
    toggleStoreFilter,
    searchConvenienceStores,
    clearStoreMarkers,
    handleMapMovement
  }
}
