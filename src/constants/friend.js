/**
 * 친구 시스템 및 소셜 공유 관련 상수
 * - Firebase Firestore 무료 할당량(Spark Plan: 읽기 5만건/일) 보호를 위한 방어 제한값
 */

// 1. 사용자 1인당 최대 친구 등록 수 제한
export const MAX_FRIENDS_LIMIT = 20

// 2. 친구 GPX 공유 궤적 쿼리 시 1회 최대 조회 문서 수 제한 (reads 폭증 2차 방어)
export const MAX_SHARED_TRACKS_QUERY_LIMIT = 40
