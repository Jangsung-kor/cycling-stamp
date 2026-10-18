import { certCenters } from './certCenters'

/**
 * 전국 국토종주 주요 코스별 인증센터 연결 순서 정의
 */
export const courseDefinitions = [
  {
    name: '아라자전거길',
    order: [1, 2]
  },
  {
    name: '한강종주자전거길(서울)',
    order: [3, 4, 5]
  },
  {
    name: '남한강자전거길',
    // 능내역 ~ 양평 ~ 이포보 ~ 여주보 ~ 강천보 ~ 비내섬 ~ 충주탄금대
    order: [6, 7, 8, 9, 10, 11, 13]
  },
  {
    name: '남한강자전거길(충주댐 지선)',
    // 충주탄금대 ~ 충주댐
    order: [13, 12]
  },
  {
    name: '북한강자전거길',
    order: [14, 15, 16, 17]
  },
  {
    name: '새재자전거길',
    order: [18, 19, 20, 21]
  },
  {
    name: '낙동강종주자전거길(안동댐-상풍교)',
    order: [26, 21]
  },
  {
    name: '낙동강종주자전거길(본류)',
    // 상주보 ~ 낙단보 ~ 구미보 ~ 칠곡보 ~ 강정고령보 ~ 달성보 ~ 합천창녕보 ~ 창녕함안보 ~ 양산물문화관 ~ 낙동강하굿둑
    order: [22, 23, 24, 25, 27, 28, 29, 30, 31, 32]
  },
  {
    name: '금강종주자전거길',
    // 대청댐 ~ 세종보 ~ 공주보 ~ 백제보 ~ 익산성당포구 ~ 금강하굿둑
    order: [38, 37, 36, 35, 34, 33]
  },
  {
    name: '영산강종주자전거길',
    // 담양댐 ~ 메타세쿼이아 ~ 담양대나무숲 ~ 승촌보 ~ 죽산보 ~ 느러지 ~ 영산강하구둑
    order: [45, 44, 43, 42, 41, 40, 39]
  }
]

/**
 * 코스와 코스를 잇는 국토종주 연결 구간 (환승/진입로)
 */
export const connectorSegments = [
  { from: 2, to: 3, name: '아라한강갑문 ↔ 여의도 (한강 진입)' },
  { from: 5, to: 6, name: '광나루 ↔ 능내역 (남한강 진입)' },
  { from: 6, to: 14, name: '능내역 ↔ 밝은광장 (두물머리 분기점)' },
  { from: 13, to: 18, name: '충주탄금대 ↔ 수안보온천 (새재자전거길 진입)' },
  { from: 21, to: 22, name: '상주상풍교 ↔ 상주보 (낙동강종주 본류 진입)' }
]

/**
 * 모든 세그먼트(인접 두 인증센터 쌍)를 플랫 리스트로 생성
 */
export const getAllCourseSegments = () => {
  const segments = []
  const centerMap = new Map(certCenters.map(c => [c.id, c]))

  // 1. 코스 내부 구간
  courseDefinitions.forEach(course => {
    for (let i = 0; i < course.order.length - 1; i++) {
      const fromId = course.order[i]
      const toId = course.order[i + 1]
      const fromCenter = centerMap.get(fromId)
      const toCenter = centerMap.get(toId)

      if (fromCenter && toCenter) {
        segments.push({
          id: `course-${fromId}-${toId}`,
          courseName: course.name,
          fromId,
          toId,
          fromCenter,
          toCenter,
          isConnector: false
        })
      }
    }
  })

  // 2. 코스 간 연결 간선
  connectorSegments.forEach(conn => {
    const fromCenter = centerMap.get(conn.from)
    const toCenter = centerMap.get(conn.to)

    if (fromCenter && toCenter) {
      segments.push({
        id: `connector-${conn.from}-${conn.to}`,
        courseName: conn.name,
        fromId: conn.from,
        toId: conn.to,
        fromCenter,
        toCenter,
        isConnector: true
      })
    }
  })

  return segments
}
