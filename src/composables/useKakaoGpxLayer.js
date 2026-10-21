import { ref } from 'vue'
import { showToast } from 'vant'

/**
 * 카카오맵 GPX 주행 궤적 폴리라인 렌더링 및 인터랙션 레이어 매니저
 * - 내 주행선 (스탬프 테마 컬러)
 * - 친구 공유 주행선 (시안/일렉트릭 틸 컬러 + 친구 정보 팝업)
 * - 멀티 유저 레이어 토글, 호버 하이라이트, 바운딩 박스 줌
 */
export function useKakaoGpxLayer(getMapInstance, themeStore, gpxStore) {
  const gpxPolylineMap = new Map() // 내 트랙: trackId -> { polyline, track }
  const friendPolylineMap = new Map() // 친구 트랙: trackId -> { polyline, track }

  // 친구 주행 궤적 지도 오버레이 전역 토글 (기본 활성)
  const isFriendTracksLayerActive = ref(true)

  // 친구 주행선 전용 스타일 컬러 (일렉트릭 시안 / 틸)
  const FRIEND_LINE_COLOR = '#06b6d4'

  // 실시간 고도 차트 스크러빙 커스텀 오버레이
  let scrubbingOverlay = null

  /**
   * 내 트랙 폴리라인 정리
   */
  const clearMyPolylines = () => {
    gpxPolylineMap.forEach(item => {
      if (item.polyline) {
        item.polyline.setMap(null)
      }
    })
    gpxPolylineMap.clear()
  }

  /**
   * 친구 트랙 폴리라인 정리
   */
  const clearFriendPolylines = () => {
    friendPolylineMap.forEach(item => {
      if (item.polyline) {
        item.polyline.setMap(null)
      }
    })
    friendPolylineMap.clear()
  }

  /**
   * 고도 차트 스크러빙 시 지도 위 실시간 위치 마커 업데이트
   * @param {{ distKm: number, ele: number, lat: number, lng: number } | null} point
   */
  const updateScrubbingMarker = (point) => {
    const map = getMapInstance()
    if (!map || !window.kakao || !window.kakao.maps.CustomOverlay) return

    if (!point || !point.lat || !point.lng) {
      if (scrubbingOverlay) {
        scrubbingOverlay.setMap(null)
      }
      return
    }

    const pos = new window.kakao.maps.LatLng(point.lat, point.lng)

    if (!scrubbingOverlay) {
      const el = document.createElement('div')
      el.className = 'gpx-scrubbing-marker'
      el.innerHTML = `
        <div class="scrubbing-pin-badge">${point.ele || 0}m</div>
        <div class="scrubbing-pin-dot"></div>
      `
      scrubbingOverlay = new window.kakao.maps.CustomOverlay({
        map,
        position: pos,
        content: el,
        yAnchor: 1.0,
        zIndex: 50
      })
    } else {
      scrubbingOverlay.setPosition(pos)
      const badge = scrubbingOverlay.getContent().querySelector('.scrubbing-pin-badge')
      if (badge) {
        badge.textContent = `${point.ele || 0}m`
      }
      scrubbingOverlay.setMap(map)
    }
  }

  /**
   * 스크러빙 마커 정리
   */
  const clearScrubbingMarker = () => {
    if (scrubbingOverlay) {
      scrubbingOverlay.setMap(null)
      scrubbingOverlay = null
    }
  }

  /**
   * 전체 폴리라인 및 스크러빙 마커 메모리 정리
   */
  const clearGpxPolylines = () => {
    clearMyPolylines()
    clearFriendPolylines()
    clearScrubbingMarker()
  }

  /**
   * 내 주행 궤적 및 친구 주행 궤적 동시 렌더링
   */
  const renderGpxPolylines = () => {
    const map = getMapInstance()
    if (!map || !window.kakao || !window.kakao.maps.Polyline) return

    // 1. 내 트랙 렌더링
    clearMyPolylines()
    const themeColor = themeStore.currentTheme.main
    const myTracks = gpxStore.visibleTracks

    myTracks.forEach(track => {
      if (!track.coordinates || track.coordinates.length < 2) return

      const path = track.coordinates.map(c => new window.kakao.maps.LatLng(c[0], c[1]))
      const isHovered = gpxStore.hoveredTrackId === track.id
      const isSelected = gpxStore.selectedTrackId === track.id

      const polyline = new window.kakao.maps.Polyline({
        map,
        path,
        strokeWeight: isHovered ? 8 : (isSelected ? 6 : 4),
        strokeColor: themeColor,
        strokeOpacity: isHovered ? 1.0 : (isSelected ? 0.95 : 0.8),
        strokeStyle: 'solid',
        zIndex: isHovered ? 35 : (isSelected ? 25 : 8)
      })

      window.kakao.maps.event.addListener(polyline, 'click', () => {
        gpxStore.setSelectedTrack(track.id)
        showToast({
          message: `🚴 ${track.title}\n거리: ${track.distanceKm}km | 획득고도: ${track.elevationGainM || 0}m`,
          duration: 2000
        })
      })

      gpxPolylineMap.set(track.id, { polyline, track })
    })

    // 2. 친구 트랙 렌더링 (활성화된 경우에만)
    clearFriendPolylines()
    if (isFriendTracksLayerActive.value) {
      const friendTracks = gpxStore.visibleFriendTracks

      friendTracks.forEach(fTrack => {
        if (!fTrack.coordinates || fTrack.coordinates.length < 2) return

        const path = fTrack.coordinates.map(c => new window.kakao.maps.LatLng(c[0], c[1]))
        const isHovered = gpxStore.hoveredFriendTrackId === fTrack.id
        const isSelected = gpxStore.selectedFriendTrackId === fTrack.id

        // 친구 트랙은 시안 컬러 및 뚜렷한 대비감 제공
        const polyline = new window.kakao.maps.Polyline({
          map,
          path,
          strokeWeight: isHovered ? 8 : (isSelected ? 6 : 4),
          strokeColor: FRIEND_LINE_COLOR,
          strokeOpacity: isHovered ? 1.0 : (isSelected ? 0.95 : 0.85),
          strokeStyle: 'solid',
          zIndex: isHovered ? 34 : (isSelected ? 24 : 7)
        })

        window.kakao.maps.event.addListener(polyline, 'click', () => {
          gpxStore.setSelectedFriendTrack(fTrack.id)
          const author = fTrack.authorName ? `${fTrack.authorName} 님의 주행` : '친구 주행'
          showToast({
            message: `👥 ${author}\n${fTrack.title} (${fTrack.distanceKm}km)`,
            duration: 2500
          })
        })

        friendPolylineMap.set(fTrack.id, { polyline, track: fTrack })
      })
    }
  }

  /**
   * 내 트랙 호버 상태 반영
   */
  const updateGpxHoverState = (hoveredId) => {
    const themeColor = themeStore.currentTheme.main
    gpxPolylineMap.forEach((item, id) => {
      const isHovered = id === hoveredId
      const isSelected = id === gpxStore.selectedTrackId

      item.polyline.setOptions({
        strokeWeight: isHovered ? 8 : (isSelected ? 6 : 4),
        strokeColor: themeColor,
        strokeOpacity: isHovered ? 1.0 : (isSelected ? 0.95 : 0.8),
        zIndex: isHovered ? 35 : (isSelected ? 25 : 8)
      })
    })
  }

  /**
   * 친구 트랙 호버 상태 반영
   */
  const updateFriendGpxHoverState = (hoveredId) => {
    friendPolylineMap.forEach((item, id) => {
      const isHovered = id === hoveredId
      const isSelected = id === gpxStore.selectedFriendTrackId

      item.polyline.setOptions({
        strokeWeight: isHovered ? 8 : (isSelected ? 6 : 4),
        strokeColor: FRIEND_LINE_COLOR,
        strokeOpacity: isHovered ? 1.0 : (isSelected ? 0.95 : 0.85),
        zIndex: isHovered ? 34 : (isSelected ? 24 : 7)
      })
    })
  }

  /**
   * 친구 주행선 레이어 토글
   */
  const toggleFriendTracksLayer = () => {
    isFriendTracksLayerActive.value = !isFriendTracksLayerActive.value
    renderGpxPolylines()

    if (isFriendTracksLayerActive.value) {
      showToast({ message: '👥 친구 주행 궤적을 켰습니다.', duration: 1500 })
    } else {
      showToast({ message: '친구 주행 궤적을 숨겼습니다.', duration: 1500 })
    }
  }

  /**
   * 특정 트랙 영역으로 지도 자동 줌 & 포커스 (내 트랙 또는 친구 트랙)
   */
  const zoomToTrack = (trackId) => {
    const map = getMapInstance()
    if (!map || !window.kakao || !trackId) return

    // 1. 내 트랙 검색
    let track = gpxStore.tracks.find(t => t.id === trackId)
    // 2. 친구 트랙 검색
    if (!track) {
      track = gpxStore.friendTracks.find(t => t.id === trackId)
    }
    if (!track) return

    let bounds = null
    if (track.bounds && track.bounds.southWest && track.bounds.northEast) {
      const sw = new window.kakao.maps.LatLng(track.bounds.southWest.lat, track.bounds.southWest.lng)
      const ne = new window.kakao.maps.LatLng(track.bounds.northEast.lat, track.bounds.northEast.lng)
      bounds = new window.kakao.maps.LatLngBounds(sw, ne)
    } else if (track.coordinates && track.coordinates.length > 0) {
      bounds = new window.kakao.maps.LatLngBounds()
      track.coordinates.forEach(c => bounds.extend(new window.kakao.maps.LatLng(c[0], c[1])))
    }

    if (bounds) {
      map.setBounds(bounds)
    }
  }

  return {
    isFriendTracksLayerActive,
    renderGpxPolylines,
    updateGpxHoverState,
    updateFriendGpxHoverState,
    toggleFriendTracksLayer,
    zoomToTrack,
    updateScrubbingMarker,
    clearScrubbingMarker,
    clearGpxPolylines
  }
}
