import { computed } from 'vue'
import { useStampStore } from '../stores/stamp'
import { useThemeStore } from '../stores/theme'
import { certCenters, getStampImageUrl } from '../utils/certCenters'
import { calculateDistance } from '../utils/geo'
import { STAMP_AUTH_RADIUS_METERS } from '../constants/stamp'
import { getAllCourseSegments } from '../utils/courseRoutes'

/**
 * 스탬프 시스템 단일 관리 창구 (Facade Composable)
 * - GPS 위치 인증 및 거리 판정
 * - 스탬프 데이터 가공 및 통계 계산
 * - 코스 및 도장 그래픽 연동
 */
export function useStampManager() {
  const stampStore = useStampStore()
  const themeStore = useThemeStore()

  // 1. 전체 인증센터 목록에 사용자의 스탬프 획득 상태 및 다회차(xN) 정보 병합
  const acquiredStamps = computed(() => stampStore.acquiredStamps || [])
  const enrichedCenters = computed(() => {
    return certCenters.map(center => {
      const stamp = stampStore.acquiredStamps.find(s => s.id === center.id)
      return {
        ...center,
        isAcquired: !!stamp,
        visitCount: stamp ? (stamp.visitCount || 1) : 0,
        history: stamp ? (stamp.history || [{ round: 1, acquiredAt: stamp.acquiredAt }]) : [],
        acquiredAt: stamp ? stamp.acquiredAt : null
      }
    })
  })

  // 2. 종주 통계 계산 (고유 코스 달성률 + 누적 총 방문 횟수)
  const totalCount = computed(() => certCenters.length)
  const acquiredCount = computed(() => enrichedCenters.value.filter(c => c.isAcquired).length)
  const totalVisitCount = computed(() => enrichedCenters.value.reduce((sum, c) => sum + (c.visitCount || 0), 0))
  
  const progressRate = computed(() => {
    if (totalCount.value === 0) return 0
    return Math.round((acquiredCount.value / totalCount.value) * 100)
  })

  const cheerMessage = computed(() => {
    const rate = progressRate.value
    if (rate === 100) return '국토종주 완주를 축하합니다! 🏆'
    if (rate >= 70) return '완주가 눈앞에 있어요! 힘내세요! 🚴'
    if (rate >= 30) return '멋진 여정을 계속 이어가세요! 🔥'
    if (rate > 0) return '첫 발을 힘차게 내디뎠어요! ✨'
    return '새로운 자전거 여행을 시작해보세요! 🗺️'
  })

  // 3. 코스별 정의 및 달성 현황 통계
  const COURSE_DEFINITIONS = [
    { tab: '아라자전거길', fullName: '아라자전거길', routeQuery: '아라자전거길' },
    { tab: '한강(서울)', fullName: '한강종주자전거길(서울)', routeQuery: '한강종주자전거길(서울)' },
    { tab: '남한강자전거길', fullName: '남한강자전거길', routeQuery: '남한강자전거길' },
    { tab: '북한강자전거길', fullName: '북한강자전거길', routeQuery: '북한강자전거길' },
    { tab: '새재자전거길', fullName: '새재자전거길', routeQuery: '새재자전거길' },
    { tab: '낙동강종주자전거길', fullName: '낙동강종주자전거길', routeQuery: '낙동강종주자전거길' },
    { tab: '금강종주자전거길', fullName: '금강종주자전거길', routeQuery: '금강종주자전거길' },
    { tab: '영산강종주자전거길', fullName: '영산강종주자전거길', routeQuery: '영산강종주자전거길' },
    { tab: '섬진강자전거길', fullName: '섬진강자전거길', routeQuery: '섬진강자전거길' },
    { tab: '오천자전거길', fullName: '오천자전거길', routeQuery: '오천자전거길' },
    { tab: '동해안자전거길(강원)', fullName: '동해안자전거길(강원)', routeQuery: '동해안자전거길(강원)' },
    { tab: '동해안자전거길(경북)', fullName: '동해안자전거길(경북)', routeQuery: '동해안자전거길(경북)' },
    { tab: '제주환상자전거길', fullName: '제주환상자전거길', routeQuery: '제주환상자전거길' }
  ]

  const courseProgressList = computed(() => {
    return COURSE_DEFINITIONS.map(c => {
      const centers = enrichedCenters.value.filter(item => item.route.includes(c.routeQuery))
      const total = centers.length
      const acquired = centers.filter(item => item.isAcquired).length
      const rate = total > 0 ? Math.round((acquired / total) * 100) : 0
      const isCompleted = total > 0 && acquired === total
      const remainingCenters = centers.filter(item => !item.isAcquired)

      return {
        tab: c.tab,
        fullName: c.fullName,
        total,
        acquired,
        rate,
        isCompleted,
        remainingCenters
      }
    })
  })

  // 완주한 총 코스 수 (13개 중 N개)
  const completedCourseCount = computed(() => {
    return courseProgressList.value.filter(c => c.isCompleted).length
  })

  // 특정 탭 이름에 대한 코스 진행 정보 조회
  const getCourseProgress = (tabName) => {
    return courseProgressList.value.find(c => c.tab === tabName) || null
  }

  // 4. 코스별 필터링
  const filterCentersByRoute = (routeTab) => {
    if (!routeTab || routeTab === '전체') {
      return enrichedCenters.value
    }
    if (routeTab === '한강(서울)') {
      return enrichedCenters.value.filter(c => c.route.includes('한강종주자전거길(서울)'))
    }
    return enrichedCenters.value.filter(c => c.route.includes(routeTab))
  }

  // 4. 날짜 포맷팅 유틸리티
  const formatStampDate = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${y}.${m}.${d} ${h}:${min}`
  }

  // 5. GPS 위치 확인 및 스탬프 인증 통합 실행
  const authenticateCurrentLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          success: false,
          code: 'GPS_UNSUPPORTED',
          message: 'GPS를 지원하지 않는 브라우저입니다.'
        })
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLat = position.coords.latitude
          const userLng = position.coords.longitude

          // 가장 가까운 인증센터 탐색
          let nearestCenter = null
          let minDistance = Infinity

          certCenters.forEach(center => {
            const dist = calculateDistance(userLat, userLng, center.lat, center.lng)
            if (dist < minDistance) {
              minDistance = dist
              nearestCenter = center
            }
          })

          const distMeters = Math.round(minDistance)

          // 반경 내에 있는 경우 스탬프 획득/재인증 시도
          if (nearestCenter && distMeters <= STAMP_AUTH_RADIUS_METERS) {
            const authResult = await stampStore.addStamp(nearestCenter)
            resolve({
              ...authResult,
              center: nearestCenter,
              distance: distMeters
            })
          } else {
            resolve({
              success: false,
              code: 'OUT_OF_RANGE',
              center: nearestCenter,
              distance: distMeters,
              message: `가장 가까운 인증센터(${nearestCenter?.name})와 ${distMeters}m 떨어져 있습니다. (${STAMP_AUTH_RADIUS_METERS}m 이내 접근 필요)`
            })
          }
        },
        (error) => {
          console.error('GPS 에러:', error)
          resolve({
            success: false,
            code: 'GPS_ERROR',
            message: '위치 정보를 가져오는데 실패했습니다.'
          })
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      )
    })
  }

  // 6. 도장 이미지 SVG 및 코스 세그먼트 생성 연동
  const getStampSvg = (center, isAcquired, inkColor) => {
    return getStampImageUrl(center, isAcquired, inkColor || themeStore.currentTheme.main)
  }

  const getCourseSegments = () => {
    return getAllCourseSegments()
  }

  return {
    // 상태 및 통계
    acquiredStamps,
    enrichedCenters,
    totalCount,
    acquiredCount,
    totalVisitCount,
    progressRate,
    cheerMessage,
    courseProgressList,
    completedCourseCount,
    getCourseProgress,

    // 메서드 및 원본 데이터
    certCenters,
    authenticateCurrentLocation,
    filterCentersByRoute,
    formatStampDate,
    getStampSvg,
    getCourseSegments,
    
    // 원본 스토어 참조 (필요시 직접 접근 지원)
    stampStore,
    themeStore
  }
}
