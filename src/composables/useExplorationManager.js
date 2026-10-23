import { ref, computed } from 'vue'
import { computeExplorationStats } from '../utils/explorationEngine.js'

// 전역 싱글톤 반응형 상태 (지도 뷰와 전역에서 단일 모드 일관성 유지)
const explorationStats = ref(computeExplorationStats([]))
const isExplorationMode = ref(false) // 기본값은 '기본 모드(false)', true면 '탐험(안개) 모드'
const showRegionListModal = ref(false)

export function useExplorationManager() {
  /**
   * 트랙 목록을 기반으로 탐험 통계 갱신
   */
  const updateExploration = (tracks = []) => {
    explorationStats.value = computeExplorationStats(tracks)
    return explorationStats.value
  }

  /**
   * 기본 모드 ↔ 탐험 모드 원터치 토글
   */
  const toggleExplorationMode = () => {
    isExplorationMode.value = !isExplorationMode.value
  }

  const setExplorationMode = (val) => {
    isExplorationMode.value = Boolean(val)
  }

  const openRegionList = () => {
    showRegionListModal.value = true
  }

  const closeRegionList = () => {
    showRegionListModal.value = false
  }

  return {
    // 반응형 상태
    stats: explorationStats,
    isExplorationMode,
    showRegionListModal,

    // 유도 속성
    explorationRate: computed(() => explorationStats.value.explorationRate),
    conqueredCount: computed(() => explorationStats.value.conqueredCount),
    conqueredRegions: computed(() => explorationStats.value.conqueredRegions),

    // 액션 메서드
    updateExploration,
    toggleExplorationMode,
    setExplorationMode,
    openRegionList,
    closeRegionList
  }
}
