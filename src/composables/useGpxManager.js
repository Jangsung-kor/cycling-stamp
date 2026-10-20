import { ref, computed } from 'vue'
import { showToast, showSuccessToast, showFailToast, showConfirmDialog } from 'vant'
import { useGpxStore } from '../stores/gpx.js'
import { useThemeStore } from '../stores/theme.js'
import { parseGpx } from '../utils/gpxParser.js'
import { auth } from '../services/firebase.js'

/**
 * GPX 주행 궤적 시스템 단일 관리 창구 (Facade Composable)
 * - 내 트랙 데이터 및 반응형 지표(거리, 개수, 호버, 선택)
 * - 친구 공유 트랙 데이터 및 반응형 지표
 * - 2단계 공개 범위 관리(private <-> friends) 및 Toast 피드백
 * - 파일 I/O 및 모바일/웹 공용 파싱/업로드 파이프라인
 * - 트랙 CRUD 및 사용자 확인 다이얼로그
 * - 날짜, 소요 시간, 공개 범위 포맷팅 유틸리티
 */
export function useGpxManager() {
  const gpxStore = useGpxStore()
  const themeStore = useThemeStore()

  const isUploading = ref(false)

  // 반응형 지표 (내 트랙)
  const tracks = computed(() => gpxStore.tracks)
  const visibleTracks = computed(() => gpxStore.visibleTracks)
  const totalDistanceKm = computed(() => gpxStore.totalDistanceKm)
  const totalTracksCount = computed(() => gpxStore.totalTracksCount)
  const selectedTrackId = computed(() => gpxStore.selectedTrackId)
  const hoveredTrackId = computed(() => gpxStore.hoveredTrackId)
  const selectedTrack = computed(() => gpxStore.selectedTrack)
  const hoveredTrack = computed(() => gpxStore.hoveredTrack)

  // 반응형 지표 (친구 공유 트랙)
  const friendTracks = computed(() => gpxStore.friendTracks)
  const visibleFriendTracks = computed(() => gpxStore.visibleFriendTracks)
  const friendTracksCount = computed(() => gpxStore.friendTracksCount)
  const selectedFriendTrackId = computed(() => gpxStore.selectedFriendTrackId)
  const hoveredFriendTrackId = computed(() => gpxStore.hoveredFriendTrackId)
  const selectedFriendTrack = computed(() => gpxStore.selectedFriendTrack)
  const hoveredFriendTrack = computed(() => gpxStore.hoveredFriendTrack)

  // 로그인 및 클라우드 동기화 상태
  const isAuthenticated = computed(() => !!auth?.currentUser)

  // 파일 텍스트 읽기 헬퍼
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(e)
      reader.readAsText(file, 'utf-8')
    })
  }

  // 모바일 및 웹 공용 파일 일괄 업로드 및 파싱 파이프라인
  const uploadGpxFiles = async (files) => {
    if (!files || files.length === 0) return { success: false, count: 0 }

    const fileList = Array.from(files)
    // 모바일 파일명 및 MIME 타입 호환 필터링 (.gpx, .xml, application/gpx+xml 등)
    const gpxFiles = fileList.filter(f => {
      const name = (f.name || '').toLowerCase()
      const type = (f.type || '').toLowerCase()
      return name.endsWith('.gpx') || name.endsWith('.xml') || type.includes('gpx') || type.includes('xml')
    })

    if (gpxFiles.length === 0) {
      showFailToast('GPX 주행 기록 파일(.gpx)만 업로드할 수 있습니다.')
      return { success: false, count: 0 }
    }

    isUploading.value = true
    showToast({
      message: `${gpxFiles.length}개의 주행 파일을 분석하고 있습니다...`,
      duration: 1500
    })

    let successCount = 0
    let failedCount = 0
    let totalDistanceAdded = 0

    for (const file of gpxFiles) {
      try {
        const xmlString = await readFileAsText(file)
        const fallbackTitle = file.name.replace(/\.(gpx|xml)$/i, '')
        const parseResult = parseGpx(xmlString, fallbackTitle)

        if (!parseResult.success) {
          failedCount++
          continue
        }

        const added = await gpxStore.addTrack(parseResult)
        totalDistanceAdded += added.distanceKm || 0
        successCount++
      } catch (err) {
        console.error('파일 업로드 처리 오류:', file.name, err)
        failedCount++
      }
    }

    isUploading.value = false

    if (successCount > 0) {
      const distStr = totalDistanceAdded.toFixed(1)
      showSuccessToast(`${successCount}개 경로 (+${distStr}km) 등록 완료! 🚴`)
      return { success: true, count: successCount }
    } else {
      showFailToast('유효한 주행 좌표를 찾지 못했습니다.')
      return { success: false, count: 0 }
    }
  }

  // 트랙 선택 (클릭, 객체 또는 ID 지원)
  const selectTrack = (trackOrId) => {
    const id = (trackOrId && typeof trackOrId === 'object') ? trackOrId.id : trackOrId
    gpxStore.setSelectedTrack(id)
  }

  // 마우스 호버 상태 변경 (객체 또는 ID 지원)
  const setHoveredTrack = (trackOrId) => {
    const id = (trackOrId && typeof trackOrId === 'object') ? trackOrId.id : trackOrId
    gpxStore.setHoveredTrack(id)
  }

  // 트랙 지도 표시 토글
  const toggleVisibility = async (trackId) => {
    await gpxStore.toggleTrackVisibility(trackId)
  }

  // 공개 범위 변경 (private <-> friends)
  const changeTrackVisibility = async (trackId, visibility) => {
    const res = await gpxStore.changeTrackVisibility(trackId, visibility)
    if (res.success) {
      showSuccessToast(res.message)
      return true
    } else {
      showFailToast(res.message)
      return false
    }
  }

  // 친구 공유 트랙 관련 제어
  const loadFriendsTracks = async (friendUids) => {
    return await gpxStore.loadFriendsTracks(friendUids)
  }

  const toggleFriendTrackVisibility = (trackId) => {
    gpxStore.toggleFriendTrackVisibility(trackId)
  }

  const selectFriendTrack = (trackId) => {
    gpxStore.setSelectedFriendTrack(trackId)
  }

  const setHoveredFriendTrack = (trackId) => {
    gpxStore.setHoveredFriendTrack(trackId)
  }

  // 트랙 제목 변경
  const updateTitle = async (trackId, newTitle) => {
    if (!newTitle || !newTitle.trim()) {
      showFailToast('제목을 입력해주세요.')
      return false
    }
    await gpxStore.updateTrackTitle(trackId, newTitle)
    showSuccessToast('제목이 변경되었습니다.')
    return true
  }

  // 트랙 삭제 (확인 다이얼로그 후 진행)
  const deleteTrackWithConfirm = async (track) => {
    if (!track) return false

    try {
      await showConfirmDialog({
        title: '주행 기록 삭제',
        message: `'${track.title}' 기록을 삭제하시겠습니까?\n삭제된 기록은 복구할 수 없습니다.`,
        confirmButtonText: '삭제',
        cancelButtonText: '취소',
        confirmButtonColor: '#ef4444'
      })
      await gpxStore.removeTrack(track.id)
      showToast('주행 기록이 삭제되었습니다.')
      return true
    } catch {
      return false
    }
  }

  // 포맷팅 헬퍼
  const formatDuration = (minutes) => {
    if (!minutes) return '0분'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0) return `${h}시간 ${m}분`
    return `${m}분`
  }

  const formatDate = (isoStr) => {
    if (!isoStr) return ''
    try {
      const d = new Date(isoStr)
      if (isNaN(d.getTime())) return ''
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    } catch {
      return ''
    }
  }

  const getVisibilityLabel = (visibility) => {
    return visibility === 'friends' ? '친구 공개' : '나만보기'
  }

  const getVisibilityIcon = (visibility) => {
    return visibility === 'friends' ? '👥' : '🔒'
  }

  return {
    // 스토어 원본 및 테마
    gpxStore,
    themeStore,

    // 내 트랙 상태 및 반응형 게터
    tracks,
    visibleTracks,
    totalDistanceKm,
    totalTracksCount,
    selectedTrackId,
    hoveredTrackId,
    selectedTrack,
    hoveredTrack,
    isUploading,
    isAuthenticated,

    // 친구 트랙 상태 및 반응형 게터
    friendTracks,
    visibleFriendTracks,
    friendTracksCount,
    selectedFriendTrackId,
    hoveredFriendTrackId,
    selectedFriendTrack,
    hoveredFriendTrack,

    // 내 트랙 액션 메서드
    uploadGpxFiles,
    selectTrack,
    setHoveredTrack,
    toggleVisibility,
    changeTrackVisibility,
    updateTitle,
    deleteTrackWithConfirm,

    // 친구 트랙 액션 메서드
    loadFriendsTracks,
    toggleFriendTrackVisibility,
    selectFriendTrack,
    setHoveredFriendTrack,

    // 포맷팅 유틸
    formatDuration,
    formatDate,
    getVisibilityLabel,
    getVisibilityIcon
  }
}
