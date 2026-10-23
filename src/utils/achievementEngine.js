/**
 * 국토종주 13개 공식 코스 구간별 완주 뱃지 평가 엔진
 * 행정안전부 '자전거 행복나눔' 13개 구간별 종주 공식 인증 체계와 100% 일치
 */
import { certCenters } from './certCenters.js'

export const ACHIEVEMENT_CATEGORIES = {
  jongju: { id: 'jongju', label: '종주' }
}

export const ACHIEVEMENT_TIERS = {
  bronze: { id: 'bronze', label: '브론즈', color: '#cd7f32' },
  silver: { id: 'silver', label: '실버', color: '#94a3b8' },
  gold: { id: 'gold', label: '골드', color: '#eab308' },
  titanium: { id: 'titanium', label: '티타늄', color: '#0ea5e9' },
  grand: { id: 'grand', label: '그랜드', color: '#8b5cf6' },
  master: { id: 'master', label: '마스터', color: '#ec4899' },
  legend: { id: 'legend', label: '레전드', color: '#ef4444' }
}

/**
 * 13개 공식 코스별 대상 인증센터 ID 목록 산출 헬퍼
 */
const getCourseCenterIds = (routeQuery) => {
  return certCenters
    .filter(c => c.route && c.route.includes(routeQuery))
    .map(c => c.id)
}

/**
 * 공통 코스 완주 평가 헬퍼 함수
 * @param {Array} targetIds 대상 인증센터 ID 목록
 * @param {number} minVisitCount 최소 방문 요구 회차 (기본 1회, 티타늄은 2회)
 */
const createCourseEvaluator = (targetIds, minVisitCount = 1) => {
  return (_tracks, stamps) => {
    if (!Array.isArray(stamps) || stamps.length === 0 || targetIds.length === 0) {
      return {
        unlocked: false,
        progress: 0,
        currentValue: 0,
        unlockedAt: null
      }
    }

    const acquiredMap = new Map()
    stamps.forEach(s => {
      const vCount = s.visitCount || (s.history ? s.history.length : 1)
      let timeStr = null
      if (minVisitCount > 1) {
        if (s.history && s.history.length >= minVisitCount) {
          timeStr = s.history[minVisitCount - 1]?.acquiredAt
        } else if (vCount >= minVisitCount) {
          timeStr = s.acquiredAt || null
        }
      } else {
        timeStr = s.acquiredAt || (s.history && s.history[0]?.acquiredAt) || null
      }
      acquiredMap.set(Number(s.id), { vCount, timeStr })
    })

    let qualifyingCount = 0
    let lastAcquiredAt = null

    for (const id of targetIds) {
      if (acquiredMap.has(id)) {
        const item = acquiredMap.get(id)
        if (item.vCount >= minVisitCount) {
          qualifyingCount++
          const time = item.timeStr
          if (time && (!lastAcquiredAt || new Date(time) > new Date(lastAcquiredAt))) {
            lastAcquiredAt = time
          }
        }
      }
    }

    const total = targetIds.length
    const unlocked = qualifyingCount === total && total > 0
    const progress = total > 0 ? Math.round((qualifyingCount / total) * 100) : 0

    return {
      unlocked,
      progress,
      currentValue: qualifyingCount,
      unlockedAt: unlocked ? (lastAcquiredAt || new Date().toISOString()) : null
    }
  }
}

// 13개 공식 코스별 센터 ID 목록 사전 매핑
const ARA_IDS = getCourseCenterIds('아라자전거길') // 1, 2 (2개)
const HANGANG_SEOUL_IDS = getCourseCenterIds('한강종주자전거길(서울)') // 3, 4, 5 (3개)
const NAMHANGANG_IDS = getCourseCenterIds('남한강자전거길') // 6, 7, 8, 9, 10, 11, 12, 13 (8개)
const BUKHANGANG_IDS = getCourseCenterIds('북한강자전거길') // 14, 15, 16, 17 (4개)
const SAEJAE_IDS = getCourseCenterIds('새재자전거길') // 18, 19, 20, 21 (4개)
const NAKDONGGANG_IDS = getCourseCenterIds('낙동강종주자전거길') // 21~32 (11개)
const GEUMGANG_IDS = getCourseCenterIds('금강종주자전거길') // 33~38 (6개)
const YEONGSANGANG_IDS = getCourseCenterIds('영산강종주자전거길') // 39~45 (7개)
const SEOMJINGANG_IDS = getCourseCenterIds('섬진강자전거길') // 46~53 (8개)
const OCHEON_IDS = getCourseCenterIds('오천자전거길') // 54~58 (5개)
const DONGHAE_GANGWON_IDS = getCourseCenterIds('동해안자전거길(강원)') // 59~70 (12개)
const DONGHAE_GYEONGBUK_IDS = getCourseCenterIds('동해안자전거길(경북)') // 71~75 (5개)
const JEJU_IDS = getCourseCenterIds('제주환상자전거길') // 76~85 (10개)

// 복합 종주 인증센터 ID 매핑
// 1) 4대강 종주 (한강(서울/남한강), 낙동강, 금강, 영산강) - 35개
const FOUR_RIVERS_IDS = [...new Set([
  ...HANGANG_SEOUL_IDS,
  ...NAMHANGANG_IDS,
  ...NAKDONGGANG_IDS,
  ...GEUMGANG_IDS,
  ...YEONGSANGANG_IDS
])]

// 2) 국토 종주 (아라뱃길, 한강, 남한강, 새재, 낙동강 본선 / 안동댐(26) 제외) - 27개
const CROSS_COUNTRY_IDS = [...new Set([
  ...ARA_IDS,
  ...HANGANG_SEOUL_IDS,
  ...NAMHANGANG_IDS,
  ...SAEJAE_IDS,
  ...NAKDONGGANG_IDS.filter(id => id !== 26) // 안동댐인증센터 제외
])]

// 3) 국토완주 (전국 85개 전 인증센터)
const ALL_85_CENTER_IDS = certCenters.map(c => c.id)

/**
 * 행정안전부 공인 종주 뱃지 정의 (총 17개)
 * - 티타늄 (1개): 국토완주 x2 (다회전 마일스톤)
 * - 골드 (1개): 국토완주 (85개 전 센터)
 * - 실버 (2개): 국토 종주, 4대강 종주
 * - 브론즈 (13개): 13개 개별 코스 종주 (간소화 명칭)
 */
export const ACHIEVEMENT_DEFINITIONS = [
  // === 0. 티타늄: 다회전 마일스톤 ===
  {
    id: 'course_grand_slam_2x',
    title: '국토 완주 x2',
    description: '대한민국 전국 85개 모든 자전거길 인증센터를 2회 이상 도장 완료하여 더블 그랜드슬램을 달성했습니다.',
    hint: '전국 85개 공식 인증센터 도장 2회 이상(x2) 완료',
    category: 'jongju',
    tier: 'titanium',
    unit: '개소',
    targetValue: ALL_85_CENTER_IDS.length,
    evaluate: createCourseEvaluator(ALL_85_CENTER_IDS, 2)
  },

  // === 1. 골드: 최상위 국토완주 ===
  {
    id: 'course_grand_slam',
    title: '국토 완주',
    description: '대한민국 전국 85개 모든 자전거길 인증센터를 도장 완료하여 그랜드슬램을 달성했습니다.',
    hint: '전국 85개 공식 인증센터 도장 100% 완료',
    category: 'jongju',
    tier: 'gold',
    unit: '개소',
    targetValue: ALL_85_CENTER_IDS.length,
    evaluate: createCourseEvaluator(ALL_85_CENTER_IDS)
  },

  // === 2. 실버: 복합 종주 코스 ===
  {
    id: 'course_cross_country',
    title: '국토 종주',
    description: '아라뱃길부터 한강, 남한강, 새재, 낙동강하굿둑까지 국토종주 코스를 완주했습니다.',
    hint: '아라, 한강, 남한강, 새재, 낙동강 27개 인증센터 획득 (안동댐 제외)',
    category: 'jongju',
    tier: 'silver',
    unit: '개소',
    targetValue: CROSS_COUNTRY_IDS.length,
    evaluate: createCourseEvaluator(CROSS_COUNTRY_IDS)
  },
  {
    id: 'course_four_rivers',
    title: '4대강 종주',
    description: '한강, 낙동강, 금강, 영산강 4대강 자전거길을 모두 완주했습니다.',
    hint: '한강(서울/남한강), 낙동강, 금강, 영산강 35개 인증센터 획득',
    category: 'jongju',
    tier: 'silver',
    unit: '개소',
    targetValue: FOUR_RIVERS_IDS.length,
    evaluate: createCourseEvaluator(FOUR_RIVERS_IDS)
  },

  // === 3. 브론즈: 13개 개별 코스 종주 (간소화 명칭) ===
  {
    id: 'course_ara',
    title: '아라뱃길',
    description: '서해갑문부터 한강갑문까지 21km 경인아라뱃길 코스를 완주했습니다.',
    hint: '아라서해갑문, 아라한강갑문 2개 인증센터 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: ARA_IDS.length,
    evaluate: createCourseEvaluator(ARA_IDS)
  },
  {
    id: 'course_hangang_seoul',
    title: '한강',
    description: '여의도부터 광나루까지 서울 도심 한강변 56km 구간을 완주했습니다.',
    hint: '여의도, 뚝섬, 광나루 3개 인증센터 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: HANGANG_SEOUL_IDS.length,
    evaluate: createCourseEvaluator(HANGANG_SEOUL_IDS)
  },
  {
    id: 'course_namhangang',
    title: '남한강',
    description: '옛 기찻길을 따라 능내역에서 충주탄금대까지 132km를 완주했습니다.',
    hint: '능내역~충주탄금대/충주댐 8개 인증센터 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: NAMHANGANG_IDS.length,
    evaluate: createCourseEvaluator(NAMHANGANG_IDS)
  },
  {
    id: 'course_bukhangang',
    title: '북한강',
    description: '밝은광장에서 춘천 신매대교까지 북한강의 물길 70km를 완주했습니다.',
    hint: '밝은광장, 샛터삼거리, 경강교, 신매대교 4개 인증센터 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: BUKHANGANG_IDS.length,
    evaluate: createCourseEvaluator(BUKHANGANG_IDS)
  },
  {
    id: 'course_saejae',
    title: '새재',
    description: '백두대간 이화령 고개를 넘어 수안보에서 상주상풍교까지 100km를 완주했습니다.',
    hint: '수안보온천, 이화령, 문경불정역, 상주상풍교 4개 인증센터 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: SAEJAE_IDS.length,
    evaluate: createCourseEvaluator(SAEJAE_IDS)
  },
  {
    id: 'course_nakdonggang',
    title: '낙동강',
    description: '안동댐부터 부산 낙동강하굿둑까지 389km 영남의 대동맥을 완주했습니다.',
    hint: '상주보~낙동강하굿둑 및 안동댐 11개 인증센터 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: NAKDONGGANG_IDS.length,
    evaluate: createCourseEvaluator(NAKDONGGANG_IDS)
  },
  {
    id: 'course_geumgang',
    title: '금강',
    description: '대청댐에서 군산 금강하굿둑까지 146km 백제의 비단길을 완주했습니다.',
    hint: '대청댐부터 금강하굿둑까지 6개 인증센터 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: GEUMGANG_IDS.length,
    evaluate: createCourseEvaluator(GEUMGANG_IDS)
  },
  {
    id: 'course_yeongsangang',
    title: '영산강',
    description: '담양댐 메타세쿼이아길부터 목포 영산강하구둑까지 133km를 완주했습니다.',
    hint: '담양댐부터 영산강하구둑까지 7개 인증센터 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: YEONGSANGANG_IDS.length,
    evaluate: createCourseEvaluator(YEONGSANGANG_IDS)
  },
  {
    id: 'course_seomjingang',
    title: '섬진강',
    description: '섬진강댐에서 광양 배알도수변공원까지 149km 천혜의 섬진강을 완주했습니다.',
    hint: '섬진강댐부터 배알도수변공원까지 8개 인증센터 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: SEOMJINGANG_IDS.length,
    evaluate: createCourseEvaluator(SEOMJINGANG_IDS)
  },
  {
    id: 'course_ocheon',
    title: '오천',
    description: '세종 합강공원에서 충북 괴산 연풍까지 5개 하천 105km를 완주했습니다.',
    hint: '합강공원부터 행촌교차로까지 5개 인증센터 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: OCHEON_IDS.length,
    evaluate: createCourseEvaluator(OCHEON_IDS)
  },
  {
    id: 'course_donghae_gangwon',
    title: '동해안(강원)',
    description: '고성 통일전망대부터 삼척 임원까지 242km 푸른 동해 바닷길을 완주했습니다.',
    hint: '통일전망대부터 삼척 임원까지 12개 인증센터 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: DONGHAE_GANGWON_IDS.length,
    evaluate: createCourseEvaluator(DONGHAE_GANGWON_IDS)
  },
  {
    id: 'course_donghae_gyeongbuk',
    title: '동해안(경북)',
    description: '울진 은어다리부터 영덕 해맞이공원까지 76km 해안 비경 코스를 완주했습니다.',
    hint: '울진은어다리부터 영덕해맞이공원까지 5개 인증센터 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: DONGHAE_GYEONGBUK_IDS.length,
    evaluate: createCourseEvaluator(DONGHAE_GYEONGBUK_IDS)
  },
  {
    id: 'course_jeju',
    title: '제주',
    description: '용두암을 출발해 에메랄드빛 해안을 따라 제주도를 한 바퀴 도는 234km를 완주했습니다.',
    hint: '제주 해안 10개 인증센터 모두 획득',
    category: 'jongju',
    tier: 'bronze',
    unit: '개소',
    targetValue: JEJU_IDS.length,
    evaluate: createCourseEvaluator(JEJU_IDS)
  }
]

/**
 * 모든 업적 평가 및 요약 통계 산출
 * @param {Array} tracks GPX 트랙 배열
 * @param {Array} stamps 획득 스탬프 배열
 * @param {Object} previousRecords 이전에 저장된 업적 레코드 { [id]: { unlockedAt, ... } }
 * @returns {Object} { achievements, summary }
 */
export function evaluateAllAchievements(tracks = [], stamps = [], previousRecords = {}) {
  let unlockedCount = 0
  const tierCounts = { bronze: 0, silver: 0, gold: 0, titanium: 0, grand: 0, master: 0, legend: 0 }

  const evaluatedList = ACHIEVEMENT_DEFINITIONS.map(def => {
    const result = def.evaluate(tracks, stamps)
    const prev = previousRecords[def.id]

    // 이전에 이미 언락된 기록이 있으면 언락 상태 및 최초 언락 일시 보존
    const isUnlocked = result.unlocked || (prev && prev.unlocked)
    const unlockedAt = prev?.unlockedAt || result.unlockedAt || (isUnlocked ? new Date().toISOString() : null)
    const progress = isUnlocked ? 100 : result.progress

    if (isUnlocked) {
      unlockedCount++
      if (tierCounts[def.tier] !== undefined) {
        tierCounts[def.tier]++
      }
    }

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      hint: def.hint,
      category: def.category,
      tier: def.tier,
      unit: def.unit,
      targetValue: def.targetValue,
      currentValue: result.currentValue,
      progress,
      unlocked: Boolean(isUnlocked),
      unlockedAt
    }
  })

  const totalCount = ACHIEVEMENT_DEFINITIONS.length
  const unlockedPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  return {
    achievements: evaluatedList,
    summary: {
      totalCount,
      unlockedCount,
      unlockedPercentage,
      tierCounts
    }
  }
}
