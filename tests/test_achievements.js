/**
 * 국토종주 13개 공식 코스 완주 뱃지 엔진 엄격 단위 테스트
 */
import assert from 'assert'
import {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_TIERS,
  evaluateAllAchievements
} from '../src/utils/achievementEngine.js'

console.log('=== 국토종주 13개 공식 코스 완주 뱃지 엔진 단위 테스트 시작 ===\n')

let passCount = 0
function test(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
    passCount++
  } catch (err) {
    console.error(`[FAIL] ${name}`)
    console.error(err)
    process.exit(1)
  }
}

// 1. 메타데이터 무결성 검증
test('1-1. ACHIEVEMENT_DEFINITIONS: 17개 종주 공식 코스 뱃지 필수 속성 및 티어 분포 검증', () => {
  assert.strictEqual(ACHIEVEMENT_DEFINITIONS.length, 17, '공식 종주 뱃지는 총 17개(티타늄 1, 골드 1, 실버 2, 브론즈 13)여야 함')
  const validCategories = Object.keys(ACHIEVEMENT_CATEGORIES)
  const validTiers = Object.keys(ACHIEVEMENT_TIERS)

  const bronzeBadges = ACHIEVEMENT_DEFINITIONS.filter(d => d.tier === 'bronze')
  const silverBadges = ACHIEVEMENT_DEFINITIONS.filter(d => d.tier === 'silver')
  const goldBadges = ACHIEVEMENT_DEFINITIONS.filter(d => d.tier === 'gold')
  const titaniumBadges = ACHIEVEMENT_DEFINITIONS.filter(d => d.tier === 'titanium')

  assert.strictEqual(bronzeBadges.length, 13, '13개 개별 코스는 모두 브론즈여야 함')
  assert.strictEqual(silverBadges.length, 2, '실버는 4대강종주와 국토종주 2개여야 함')
  assert.strictEqual(goldBadges.length, 1, '골드는 국토완주 1개여야 함')
  assert.strictEqual(titaniumBadges.length, 1, '티타늄은 국토완주 x2 1개여야 함')

  // 브론즈 뱃지 간소화된 타이틀 검증
  const ara = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'course_ara')
  const hangang = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'course_hangang_seoul')
  const jeju = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'course_jeju')
  assert.strictEqual(ara.title, '아라뱃길')
  assert.strictEqual(hangang.title, '한강')
  assert.strictEqual(jeju.title, '제주')

  ACHIEVEMENT_DEFINITIONS.forEach(def => {
    assert.ok(def.id, 'id가 존재해야 함')
    assert.ok(def.title, 'title이 존재해야 함')
    assert.ok(def.description, 'description이 존재해야 함')
    assert.ok(def.hint, 'hint가 존재해야 함')
    assert.ok(validCategories.includes(def.category), `유효한 카테고리여야 함: ${def.category}`)
    assert.ok(validTiers.includes(def.tier), `유효한 티어여야 함: ${def.tier}`)
    assert.strictEqual(typeof def.evaluate, 'function', 'evaluate 함수가 정의되어야 함')
  })
})

// 2. 코스별 완주 판정 단위 테스트
test('2-1. course_ara: 아라자전거길(2개 센터) 미완주(50%) 및 완주(100%) 판정', () => {
  const araDef = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'course_ara')
  assert.ok(araDef)
  assert.strictEqual(araDef.tier, 'bronze', '아라자전거길은 브론즈여야 함')

  // 1) 빈 스탬프 -> 실패 (0%)
  const resEmpty = araDef.evaluate([], [])
  assert.strictEqual(resEmpty.unlocked, false)
  assert.strictEqual(resEmpty.progress, 0)
  assert.strictEqual(resEmpty.currentValue, 0)

  // 2) 1번 센터(아라서해갑문)만 획득 -> 실패 (50%)
  const resPartial = araDef.evaluate([], [{ id: 1, acquiredAt: '2026-05-01T10:00:00' }])
  assert.strictEqual(resPartial.unlocked, false)
  assert.strictEqual(resPartial.progress, 50)
  assert.strictEqual(resPartial.currentValue, 1)

  // 3) 1번, 2번 센터(아라한강갑문) 모두 획득 -> 완주 성공 (100%)
  const resComplete = araDef.evaluate([], [
    { id: 1, acquiredAt: '2026-05-01T10:00:00' },
    { id: 2, acquiredAt: '2026-05-01T11:30:00' }
  ])
  assert.strictEqual(resComplete.unlocked, true)
  assert.strictEqual(resComplete.progress, 100)
  assert.strictEqual(resComplete.currentValue, 2)
  assert.strictEqual(resComplete.unlockedAt, '2026-05-01T11:30:00')
})

test('2-2. course_cross_country & course_four_rivers: 실버 뱃지 조건 판정', () => {
  const crossDef = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'course_cross_country')
  const fourDef = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'course_four_rivers')
  assert.ok(crossDef)
  assert.ok(fourDef)
  assert.strictEqual(crossDef.tier, 'silver')
  assert.strictEqual(fourDef.tier, 'silver')
  assert.strictEqual(crossDef.targetValue, 27, '국토종주는 아라+한강+남한강+새재+낙동강 27개 센터(안동댐 제외)')
  assert.strictEqual(fourDef.targetValue, 35, '4대강종주는 한강+낙동강+금강+영산강 35개 센터')

  // 국토종주 27개 센터 스탬프 시뮬레이션 (안동댐 26번 제외)
  const crossIds = [
    1, 2, // 아라
    3, 4, 5, // 한강
    6, 7, 8, 9, 10, 11, 12, 13, // 남한강
    18, 19, 20, 21, // 새재
    22, 23, 24, 25, 27, 28, 29, 30, 31, 32 // 낙동강 (26 안동댐 제외 10개)
  ]
  const crossStamps = crossIds.map(id => ({ id }))
  assert.strictEqual(crossDef.evaluate([], crossStamps).unlocked, true, '안동댐 없이도 국토종주 완주 해금되어야 함')
  assert.strictEqual(crossDef.evaluate([], crossStamps.slice(0, 14)).unlocked, false)

  // 4대강 35개 센터 스탬프 시뮬레이션
  const fourIds = [
    3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, // 한강 (서울 + 남한강 11개)
    22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, // 낙동강 11개
    33, 34, 35, 36, 37, 38, // 금강 6개
    39, 40, 41, 42, 43, 44, 45 // 영산강 7개
  ]
  const fourStamps = fourIds.map(id => ({ id }))
  assert.strictEqual(fourDef.evaluate([], fourStamps).unlocked, true)
  assert.strictEqual(fourDef.evaluate([], fourStamps.slice(0, 20)).unlocked, false)
})

test('2-3. course_grand_slam & course_grand_slam_2x: 골드 및 티타늄 뱃지 조건 판정', () => {
  const grandDef = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'course_grand_slam')
  const titanDef = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'course_grand_slam_2x')
  assert.ok(grandDef)
  assert.ok(titanDef)
  assert.strictEqual(grandDef.tier, 'gold')
  assert.strictEqual(titanDef.tier, 'titanium')
  assert.strictEqual(titanDef.title, '국토 완주 x2')
  assert.strictEqual(grandDef.title, '국토 완주')
  assert.strictEqual(grandDef.targetValue, 85)
  assert.strictEqual(titanDef.targetValue, 85)

  // 1) 골드: 84개 (1개 부족) -> 99% 미완주, 85개 완료 시 해금
  const almostAll = Array.from({ length: 84 }, (_, i) => ({ id: i + 1 }))
  assert.strictEqual(grandDef.evaluate([], almostAll).unlocked, false)
  almostAll.push({ id: 85 })
  assert.strictEqual(grandDef.evaluate([], almostAll).unlocked, true)

  // 2) 티타늄: 전국 85개 센터 모두 2회차(x2) 이상 방문 검증
  // 85개 센터를 1회씩만 찍었을 때 -> 티타늄 미완주 (0%)
  const round1Stamps = Array.from({ length: 85 }, (_, i) => ({ id: i + 1, visitCount: 1 }))
  const resRound1 = titanDef.evaluate([], round1Stamps)
  assert.strictEqual(resRound1.unlocked, false)
  assert.strictEqual(resRound1.progress, 0)

  // 84개는 2회차(x2), 1개만 1회차일 때 -> 99% 미완주
  const almost2x = Array.from({ length: 85 }, (_, i) => ({ id: i + 1, visitCount: i === 0 ? 1 : 2 }))
  const resAlmost2x = titanDef.evaluate([], almost2x)
  assert.strictEqual(resAlmost2x.unlocked, false)
  assert.strictEqual(resAlmost2x.progress, 99)

  // 85개 센터 모두 2회 이상(x2) 방문 시 -> 100% 해금!
  const full2x = Array.from({ length: 85 }, (_, i) => ({ id: i + 1, visitCount: 2, acquiredAt: '2026-06-01T15:00:00' }))
  const resFull2x = titanDef.evaluate([], full2x)
  assert.strictEqual(resFull2x.unlocked, true)
  assert.strictEqual(resFull2x.progress, 100)
  assert.strictEqual(resFull2x.unlockedAt, '2026-06-01T15:00:00')
})

test('2-4. course_saejae & course_jeju: 개별 코스 브론즈 티어 완주 판정', () => {
  const saejae = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'course_saejae')
  const jeju = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'course_jeju')
  assert.strictEqual(saejae.tier, 'bronze', '새재자전거길은 브론즈여야 함')
  assert.strictEqual(jeju.tier, 'bronze', '제주환상자전거길은 브론즈여야 함')

  // 새재 4개 센터 (18, 19, 20, 21번) 완주
  const saejaeStamps = [18, 19, 20, 21].map(id => ({ id }))
  assert.strictEqual(saejae.evaluate([], saejaeStamps).unlocked, true)

  // 제주 9개 획득 (1개 미달) -> 90% 미완주
  const jeju9 = [76, 77, 78, 79, 80, 81, 82, 83, 84].map(id => ({ id }))
  const resJeju9 = jeju.evaluate([], jeju9)
  assert.strictEqual(resJeju9.unlocked, false)
  assert.strictEqual(resJeju9.progress, 90)

  // 85번 추가 (10개 완주) -> 100% 해금
  jeju9.push({ id: 85 })
  assert.strictEqual(jeju.evaluate([], jeju9).unlocked, true)
})

// 3. 통합 평가 엔진 evaluateAllAchievements 검증
test('3-1. evaluateAllAchievements: 빈 데이터 입력 시 통계 (0/17, 0%)', () => {
  const emptyRes = evaluateAllAchievements([], [])
  assert.strictEqual(emptyRes.achievements.length, 17)
  assert.strictEqual(emptyRes.summary.totalCount, 17)
  assert.strictEqual(emptyRes.summary.unlockedCount, 0)
  assert.strictEqual(emptyRes.summary.unlockedPercentage, 0)
})

test('3-2. evaluateAllAchievements: 아라(2개) + 한강서울(3개) 완주 시 2개 뱃지 해금 및 통계 산출', () => {
  const completedStamps = [
    { id: 1, acquiredAt: '2026-05-01T10:00:00' },
    { id: 2, acquiredAt: '2026-05-01T12:00:00' },
    { id: 3, acquiredAt: '2026-05-02T10:00:00' },
    { id: 4, acquiredAt: '2026-05-02T12:00:00' },
    { id: 5, acquiredAt: '2026-05-02T14:00:00' }
  ]

  const res = evaluateAllAchievements([], completedStamps)
  assert.strictEqual(res.summary.unlockedCount, 2, '아라와 한강 2개 뱃지가 해금되어야 함')
  assert.strictEqual(res.summary.unlockedPercentage, Math.round((2 / 17) * 100))

  const araAch = res.achievements.find(a => a.id === 'course_ara')
  const hangangAch = res.achievements.find(a => a.id === 'course_hangang_seoul')
  assert.strictEqual(araAch.unlocked, true)
  assert.strictEqual(hangangAch.unlocked, true)
})

test('3-3. evaluateAllAchievements: 이전 저장된 언락 기록(previousRecords) 영속성 보존', () => {
  const prevRecords = {
    course_saejae: { unlocked: true, unlockedAt: '2025-08-15T12:00:00' }
  }
  const res = evaluateAllAchievements([], [], prevRecords)
  assert.strictEqual(res.summary.unlockedCount, 1)
  const saejaeAch = res.achievements.find(a => a.id === 'course_saejae')
  assert.strictEqual(saejaeAch.unlocked, true)
  assert.strictEqual(saejaeAch.unlockedAt, '2025-08-15T12:00:00')
})

// 4. useAchievementManager Facade 테스트
import { useAchievementManager } from '../src/composables/useAchievementManager.js'

test('4-1. useAchievementManager: 초기 반응형 상태 및 17개 코스 필터링 검증', () => {
  if (typeof global.localStorage === 'undefined') {
    const store = {}
    global.localStorage = {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = String(v) },
      removeItem: (k) => { delete store[k] },
      clear: () => {}
    }
  }

  const manager = useAchievementManager()
  assert.ok(manager.achievements)
  assert.ok(manager.summary)
  assert.strictEqual(manager.selectedCategory.value, 'jongju')

  manager.setCategory('jongju')
  assert.strictEqual(manager.selectedCategory.value, 'jongju')
  assert.ok(manager.filteredAchievements.value.every(a => a.category === 'jongju'))
})

test('4-2. useAchievementManager: checkAchievements 실행 시 코스 완주 뱃지 갱신 검증', async () => {
  const manager = useAchievementManager()
  // 아라자전거길 1, 2번 스탬프 주입
  const mockStamps = [
    { id: 1, acquiredAt: '2026-05-01T10:00:00' },
    { id: 2, acquiredAt: '2026-05-01T12:00:00' }
  ]

  const result = await manager.checkAchievements([], mockStamps)
  assert.ok(result)
  assert.ok(manager.isInitialized.value)
  assert.ok(manager.summary.value.unlockedCount >= 1)

  manager.dismissAllRecentUnlocked()
  assert.strictEqual(manager.recentUnlockedQueue.value.length, 0)
})

console.log(`\n========================================`)
console.log(`테스트 결과: ${passCount} 통과, 0 실패`)
console.log(`========================================`)
