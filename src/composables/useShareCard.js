import { ref, reactive, computed } from 'vue'
import {
  CARD_DIMENSIONS,
  CARD_THEMES,
  SIMPLE_SUB_COLORS,
  renderCertificationCard,
  canvasToBlob,
  loadImage
} from '../utils/cardRenderer.js'
import { showToast, showSuccessToast } from 'vant'

// 전역 공유 상태 (앱 전체에서 단일 인스턴스로 일관된 모달 제어)
const isModalOpen = ref(false)
const isRendering = ref(false)
const isSharing = ref(false)

const cardType = ref('track') // 'track' | 'course'
const selectedRatio = ref('story') // 'story' | 'square'
const selectedTheme = ref('dark') // 'dark' | 'ink' | 'photo'
const selectedSimpleColor = ref('black') // 'black' | 'navy'

const userPhotoUrl = ref(null)
const userPhotoFile = ref(null)

const cardData = reactive({
  trackTitle: '',
  courseName: '',
  distanceKm: 0,
  elevationGainM: 0,
  durationMinutes: 0,
  date: null,
  coordinates: [],
  stampUrls: [],
  accentColor: null
})

const riderInfo = reactive({
  riderName: '라이더',
  userCode: ''
})

export function useShareCard() {
  /**
   * GPX 주행 트랙 기반 인증 카드 열기
   */
  const openForTrack = (track, info = {}) => {
    if (!track) return

    cardType.value = 'track'
    cardData.trackTitle = track.title || '국토종주 라이딩'
    cardData.courseName = ''
    cardData.distanceKm = track.distanceKm || 0
    cardData.elevationGainM = track.elevationGainM || 0
    cardData.durationMinutes = track.durationMinutes || 0
    cardData.date = track.startTime || track.date || track.createdAt || new Date().toISOString()
    cardData.coordinates = Array.isArray(track.coordinates) ? track.coordinates : []
    cardData.stampUrls = []
    cardData.accentColor = track.accentColor || null

    if (info.riderName) riderInfo.riderName = info.riderName
    if (info.userCode) riderInfo.userCode = info.userCode

    isModalOpen.value = true
  }

  /**
   * 공식 코스 종주 완주 기반 인증 카드 열기
   */
  const openForCourse = (course, stamps = [], info = {}) => {
    if (!course) return

    cardType.value = 'course'
    cardData.trackTitle = ''
    cardData.courseName = `${course.tab || course.name} 완주`
    cardData.distanceKm = course.distanceKm || course.totalDistanceKm || 0
    cardData.elevationGainM = course.elevationGainM || 0
    cardData.durationMinutes = course.durationMinutes || 0
    cardData.date = new Date().toISOString()
    cardData.coordinates = course.coordinates || []
    cardData.stampUrls = Array.isArray(stamps) ? stamps : []
    cardData.accentColor = null

    if (info.riderName) riderInfo.riderName = info.riderName
    if (info.userCode) riderInfo.userCode = info.userCode

    isModalOpen.value = true
  }

  /**
   * 모달 닫기
   */
  const closeModal = () => {
    isModalOpen.value = false
    clearUserPhoto()
  }

  /**
   * 사용자 커스텀 사진 등록 (100% 브라우저 로컬 Object URL)
   */
  const setUserPhoto = (file) => {
    if (!file) return
    clearUserPhoto()

    userPhotoFile.value = file
    userPhotoUrl.value = URL.createObjectURL(file)
    selectedTheme.value = 'photo'
  }

  /**
   * 사용자 사진 제거 및 기본 테마 복원
   */
  const clearUserPhoto = () => {
    if (userPhotoUrl.value) {
      URL.revokeObjectURL(userPhotoUrl.value)
      userPhotoUrl.value = null
    }
    userPhotoFile.value = null
    if (selectedTheme.value === 'photo') {
      selectedTheme.value = 'dark'
    }
  }

  /**
   * 캔버스 렌더링 실행
   */
  const renderCardToCanvas = async (canvasEl) => {
    if (!canvasEl) return null
    isRendering.value = true

    try {
      // 1. 도장 이미지 로드 (필요 시)
      const loadedStamps = []
      for (const url of cardData.stampUrls) {
        if (url) {
          try {
            const img = await loadImage(url)
            if (img) loadedStamps.push(img)
          } catch (e) {
            console.warn('[useShareCard] Stamp image load failed:', e)
          }
        }
      }

      // 2. 유저 커스텀 배경 사진 로드
      let loadedPhoto = null
      if (selectedTheme.value === 'photo' && userPhotoUrl.value) {
        try {
          loadedPhoto = await loadImage(userPhotoUrl.value)
        } catch (e) {
          console.warn('[useShareCard] User photo load failed:', e)
        }
      }

      // 3. 렌더러 호출
      await renderCertificationCard(canvasEl, {
        aspectRatio: selectedRatio.value,
        theme: selectedTheme.value,
        simpleColor: selectedSimpleColor.value,
        trackTitle: cardData.trackTitle,
        courseName: cardData.courseName,
        distanceKm: cardData.distanceKm,
        elevationGainM: cardData.elevationGainM,
        durationMinutes: cardData.durationMinutes,
        date: cardData.date,
        coordinates: cardData.coordinates,
        stampImages: loadedStamps,
        userPhotoImg: loadedPhoto,
        riderName: riderInfo.riderName,
        userCode: riderInfo.userCode,
        accentColor: cardData.accentColor
      })

      return canvasEl
    } finally {
      isRendering.value = false
    }
  }

  /**
   * 고해상도 PNG 파일 다운로드
   */
  const downloadCardImage = async (canvasEl) => {
    if (!canvasEl) return

    try {
      const blob = await canvasToBlob(canvasEl)
      if (!blob) throw new Error('Blob generation failed')

      const filename = `cycling-stamp-${cardData.courseName || cardData.trackTitle || 'certificate'}-${Date.now()}.png`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showSuccessToast('인증 카드가 저장되었습니다.')
    } catch (err) {
      console.error('[useShareCard] Download failed:', err)
      showToast('이미지 저장에 실패했습니다.')
    }
  }

  /**
   * 모바일 Web Share API 연동 (SNS / 인스타그램 / 카카오톡 1-Tap 공유)
   */
  const shareCardImage = async (canvasEl) => {
    if (!canvasEl) return
    isSharing.value = true

    try {
      const blob = await canvasToBlob(canvasEl)
      if (!blob) throw new Error('Blob generation failed')

      const filename = `cycling-stamp-${Date.now()}.png`
      const file = new File([blob], filename, { type: 'image/png' })
      const shareTitle = cardData.courseName || cardData.trackTitle || '국토종주 완주 인증'
      const shareText = `자전거 국토종주 인증 카드 (${riderInfo.riderName} | 친구코드: ${riderInfo.userCode})`

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: shareText
        })
      } else {
        // Web Share API 파일 공유 미지원 환경일 때 자동 다운로드 폴백
        await downloadCardImage(canvasEl)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[useShareCard] Share aborted or failed:', err)
        // 사용자가 취소한 경우가 아니면 다운로드 안내
        await downloadCardImage(canvasEl)
      }
    } finally {
      isSharing.value = false
    }
  }

  return {
    // 상태
    isModalOpen,
    isRendering,
    isSharing,
    cardType,
    selectedRatio,
    selectedTheme,
    selectedSimpleColor,
    userPhotoUrl,
    cardData,
    riderInfo,
    dimensions: CARD_DIMENSIONS,
    themes: CARD_THEMES,
    simpleSubColors: SIMPLE_SUB_COLORS,

    // 메서드
    openForTrack,
    openForCourse,
    closeModal,
    setUserPhoto,
    clearUserPhoto,
    renderCardToCanvas,
    downloadCardImage,
    shareCardImage
  }
}
