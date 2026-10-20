/**
 * 브라우저 IndexedDB 헬퍼 (무의존성 Promise 기반)
 * GPX 트랙과 대용량 궤적 좌표를 로컬에 안정적으로 영구 보관합니다.
 */

const DB_NAME = 'CyclingAppDB'
const DB_VERSION = 1
const STORE_NAME = 'gpx_tracks'

// Node.js 테스트 및 SSR 환경용 인메모리 폴백 저장소
const inMemoryFallbackStore = new Map()

function isIndexedDbAvailable() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

/**
 * 데이터베이스 초기화 및 연결
 */
export function openDb() {
  if (!isIndexedDbAvailable()) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = (event) => {
      resolve(event.target.result)
    }

    request.onerror = (event) => {
      console.error('IndexedDB 열기 실패:', event.target.error)
      reject(event.target.error)
    }
  })
}

/**
 * 단일 트랙 저장 또는 업데이트
 */
export async function saveTrackToDb(track) {
  if (!track || !track.id) {
    throw new Error('유효한 id가 포함된 트랙 데이터가 필요합니다.')
  }

  // Vue 3 Reactive Proxy 객체를 순수 Plain JS Object로 직렬화하여 DataCloneError 원천 차단
  const plainTrack = JSON.parse(JSON.stringify(track))

  if (!isIndexedDbAvailable()) {
    inMemoryFallbackStore.set(plainTrack.id, plainTrack)
    return plainTrack
  }

  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(plainTrack)

    request.onsuccess = () => resolve(plainTrack)
    request.onerror = (e) => reject(e.target.error)
  })
}

/**
 * 단일 트랙 ID로 조회
 */
export async function getTrackFromDb(id) {
  if (!id) return null

  if (!isIndexedDbAvailable()) {
    return inMemoryFallbackStore.get(id) || null
  }

  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = (e) => resolve(e.target.result || null)
    request.onerror = (e) => reject(e.target.error)
  })
}

/**
 * 모든 트랙 조회 (생성일시 내림차순 정렬)
 */
export async function getAllTracksFromDb() {
  if (!isIndexedDbAvailable()) {
    const items = Array.from(inMemoryFallbackStore.values())
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return items
  }

  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = (e) => {
      const items = e.target.result || []
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      resolve(items)
    }
    request.onerror = (e) => reject(e.target.error)
  })
}

/**
 * 트랙 삭제
 */
export async function deleteTrackFromDb(id) {
  if (!isIndexedDbAvailable()) {
    inMemoryFallbackStore.delete(id)
    return true
  }

  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve(true)
    request.onerror = (e) => reject(e.target.error)
  })
}

/**
 * 전체 트랙 초기화 (캐시 리셋용)
 */
export async function clearAllTracksFromDb() {
  if (!isIndexedDbAvailable()) {
    inMemoryFallbackStore.clear()
    return true
  }

  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => resolve(true)
    request.onerror = (e) => reject(e.target.error)
  })
}
