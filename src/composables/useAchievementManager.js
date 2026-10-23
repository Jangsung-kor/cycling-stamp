import { ref, computed } from 'vue'
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_TIERS,
  ACHIEVEMENT_DEFINITIONS,
  evaluateAllAchievements
} from '../utils/achievementEngine.js'
import { db, auth } from '../services/firebase.js'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const STORAGE_KEY = 'cycling_achievements_v1'

// 전역 싱글톤 반응형 상태 (앱 전역 일관성 유지)
const achievementsList = ref([])
const recentUnlockedQueue = ref([])
const isInitialized = ref(false)
const selectedCategory = ref('jongju')

export function useAchievementManager() {
  /**
   * 로컬 스토리지 캐시 로드
   */
  const loadLocalCache = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed
        }
      }
    } catch (e) {
      console.warn('[useAchievementManager] 로컬 캐시 파싱 실패:', e)
    }
    return {}
  }

  /**
   * 로컬 스토리지 캐시 저장
   */
  const saveLocalCache = (recordsMap) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recordsMap))
    } catch (e) {
      console.warn('[useAchievementManager] 로컬 캐시 저장 실패:', e)
    }
  }

  /**
   * Firestore에 업적 기록 비동기 영속화
   */
  const syncToFirestore = async (recordsMap) => {
    const user = auth?.currentUser
    if (!user || !db) return

    try {
      const userRef = doc(db, 'users', user.uid)
      await setDoc(userRef, { achievements: recordsMap }, { merge: true })
    } catch (err) {
      console.error('[useAchievementManager] Firestore 업적 동기화 실패:', err)
    }
  }

  /**
   * Firestore에서 업적 데이터 불러오기
   */
  const fetchFromFirestore = async () => {
    const user = auth?.currentUser
    if (!user || !db) return null

    try {
      const userRef = doc(db, 'users', user.uid)
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        return snap.data().achievements || null
      }
    } catch (err) {
      console.error('[useAchievementManager] Firestore 업적 조회 실패:', err)
    }
    return null
  }

  /**
   * 업적 평가 및 상태 갱신
   * @param {Array} tracks GPX 트랙 목록
   * @param {Array} stamps 스탬프 목록
   */
  const checkAchievements = async (tracks = [], stamps = []) => {
    // 1. 기존 언락 맵 복원 (로컬 또는 현재 상태)
    const currentRecordsMap = {}
    achievementsList.value.forEach(a => {
      if (a.unlocked) {
        currentRecordsMap[a.id] = { unlocked: true, unlockedAt: a.unlockedAt }
      }
    })

    const localRecords = loadLocalCache()
    const mergedRecords = { ...localRecords, ...currentRecordsMap }

    // 2. 엔진을 통해 전체 재평가
    const prevUnlockedSet = new Set(
      achievementsList.value.filter(a => a.unlocked).map(a => a.id)
    )

    const result = evaluateAllAchievements(tracks, stamps, mergedRecords)

    // 3. 신규 해금 감지 (이전엔 미해금이었는데 새로 해금된 업적)
    const newUnlocked = []
    result.achievements.forEach(item => {
      if (item.unlocked && !prevUnlockedSet.has(item.id)) {
        // 이미 큐에 없다면 추가
        if (!recentUnlockedQueue.value.some(q => q.id === item.id)) {
          newUnlocked.push(item)
        }
      }
    })

    if (newUnlocked.length > 0 && prevUnlockedSet.size > 0) {
      // 최초 초기화 시점이 아닐 때만 팝업 큐에 등록 (첫 로드 시 폭풍 팝업 방지)
      recentUnlockedQueue.value.push(...newUnlocked)
    }

    // 4. 상태 갱신 및 캐시 저장
    achievementsList.value = result.achievements

    const newRecordsMap = {}
    result.achievements.forEach(a => {
      if (a.unlocked) {
        newRecordsMap[a.id] = { unlocked: true, unlockedAt: a.unlockedAt }
      }
    })

    saveLocalCache(newRecordsMap)
    syncToFirestore(newRecordsMap)

    isInitialized.value = true
    return result
  }

  /**
   * 신규 획득 축하 팝업 큐 소비
   */
  const popRecentUnlocked = () => {
    return recentUnlockedQueue.value.shift() || null
  }

  const dismissAllRecentUnlocked = () => {
    recentUnlockedQueue.value = []
  }

  /**
   * 카테고리 필터링된 업적 목록
   */
  const filteredAchievements = computed(() => {
    if (selectedCategory.value === 'all' || selectedCategory.value === 'jongju') {
      return achievementsList.value
    }
    return achievementsList.value.filter(a => a.category === selectedCategory.value)
  })

  /**
   * 해금된 업적만 필터링
   */
  const unlockedAchievements = computed(() => {
    return achievementsList.value.filter(a => a.unlocked)
  })

  /**
   * 요약 통계 지표
   */
  const summary = computed(() => {
    const totalCount = ACHIEVEMENT_DEFINITIONS.length
    const unlockedCount = unlockedAchievements.value.length
    const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

    const tierCounts = { bronze: 0, silver: 0, gold: 0, titanium: 0, grand: 0, master: 0, legend: 0 }
    unlockedAchievements.value.forEach(a => {
      if (tierCounts[a.tier] !== undefined) {
        tierCounts[a.tier]++
      }
    })

    return {
      totalCount,
      unlockedCount,
      percentage,
      tierCounts
    }
  })

  return {
    // 반응형 상태
    achievements: achievementsList,
    filteredAchievements,
    unlockedAchievements,
    recentUnlockedQueue,
    isInitialized,
    selectedCategory,
    categories: ACHIEVEMENT_CATEGORIES,
    tiers: ACHIEVEMENT_TIERS,
    summary,

    // 액션 메서드
    checkAchievements,
    popRecentUnlocked,
    dismissAllRecentUnlocked,
    fetchFromFirestore,
    setCategory: (cat) => { selectedCategory.value = cat }
  }
}
