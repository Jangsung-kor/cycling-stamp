import { defineStore } from 'pinia'
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  limit
} from 'firebase/firestore'
import { MAX_SHARED_TRACKS_QUERY_LIMIT } from '../constants/friend.js'
import { db, auth } from '../services/firebase.js'
import {
  saveTrackToDb,
  getAllTracksFromDb,
  deleteTrackFromDb,
  clearAllTracksFromDb
} from '../utils/indexedDb.js'

/**
 * Firestore는 2차원 배열(Nested Array: [[lat, lng]]) 저장을 금지하므로
 * 클라우드 저장 전 객체 배열 [{ lat, lng }] 구조로 안전하게 변환합니다.
 */
export function toFirestoreTrack(track) {
  const plain = JSON.parse(JSON.stringify(track))
  return {
    ...plain,
    visibility: plain.visibility === 'friends' ? 'friends' : 'private',
    coordinates: (plain.coordinates || []).map(c => Array.isArray(c) ? { lat: c[0], lng: c[1] } : c),
    updatedAt: plain.updatedAt || new Date().toISOString()
  }
}

/**
 * Firestore에서 내려받은 데이터를 앱 내부 표준 포맷([[lat, lng]])으로 복원합니다.
 */
export function fromFirestoreTrack(data) {
  return {
    ...data,
    visibility: data.visibility === 'friends' ? 'friends' : 'private',
    coordinates: (data.coordinates || []).map(c => Array.isArray(c) ? c : [c.lat, c.lng])
  }
}

export const useGpxStore = defineStore('gpx', {
  state: () => ({
    tracks: [],
    selectedTrackId: null,
    hoveredTrackId: null,
    friendTracks: [],
    selectedFriendTrackId: null,
    hoveredFriendTrackId: null,
    showElevationProfile: false,
    activeScrubbingPoint: null,
    isLoaded: false,
    isLoading: false,
    error: null
  }),

  getters: {
    // 화면에 렌더링할 활성화된 내 트랙 목록
    visibleTracks: (state) => state.tracks.filter(t => t.visible !== false),

    // 화면에 렌더링할 활성화된 친구 트랙 목록
    visibleFriendTracks: (state) => state.friendTracks.filter(t => t.visible !== false),

    // 친구 트랙 총 개수
    friendTracksCount: (state) => state.friendTracks.length,

    // 업로드된 전체 트랙의 누적 주행 거리 (km)
    totalDistanceKm: (state) => {
      const sum = state.tracks.reduce((acc, t) => acc + (t.distanceKm || 0), 0)
      return Math.round(sum * 10) / 10
    },

    // 총 트랙 개수
    totalTracksCount: (state) => state.tracks.length,

    // 현재 선택된 내 트랙 상세
    selectedTrack: (state) => state.tracks.find(t => t.id === state.selectedTrackId) || null,

    // 현재 마우스 호버된 내 트랙 상세
    hoveredTrack: (state) => state.tracks.find(t => t.id === state.hoveredTrackId) || null,

    // 현재 선택된 친구 트랙 상세
    selectedFriendTrack: (state) => state.friendTracks.find(t => t.id === state.selectedFriendTrackId) || null,

    // 현재 마우스 호버된 친구 트랙 상세
    hoveredFriendTrack: (state) => state.friendTracks.find(t => t.id === state.hoveredFriendTrackId) || null,

    // 현재 고도 차트를 표시할 활성 트랙 (내 트랙 또는 친구 트랙)
    activeElevationTrack: (state) => {
      if (state.selectedTrackId) {
        return state.tracks.find(t => t.id === state.selectedTrackId) || null
      }
      if (state.selectedFriendTrackId) {
        return state.friendTracks.find(t => t.id === state.selectedFriendTrackId) || null
      }
      return null
    }
  },

  actions: {
    /**
     * Firestore 클라우드 백업 헬퍼 (users/{uid} 단일 문서 내 gpx_tracks 배열 동기화)
     * - stamps와 동일한 문서 경로를 사용하여 Firestore 보안 규칙 100% 호환 보장
     */
    async syncTracksToFirestore() {
      const user = auth?.currentUser
      if (!user || !db) return

      try {
        const userDocRef = doc(db, 'users', user.uid)
        const firestoreTracks = this.tracks.map(toFirestoreTrack)
        await setDoc(userDocRef, { gpx_tracks: firestoreTracks }, { merge: true })
      } catch (cloudErr) {
        console.error('Firestore GPX 저장 실패:', cloudErr)
      }
    },

    /**
     * 로컬 IndexedDB 및 클라우드(Firestore)에서 트랙 데이터를 동기화하여 불러오기
     */
    async loadTracks() {
      this.isLoading = true
      this.error = null

      try {
        // 1. 로컬 IndexedDB에서 1차 로드 (빠른 오프라인 반응성)
        const localTracks = await getAllTracksFromDb()
        this.tracks = localTracks.map(t => ({
          ...t,
          visibility: t.visibility === 'friends' ? 'friends' : 'private'
        }))

        // 2. 로그인 상태인 경우 Firestore와 양방향 동기화
        const user = auth?.currentUser
        if (user && db) {
          try {
            const userDocRef = doc(db, 'users', user.uid)
            const docSnap = await getDoc(userDocRef)

            let remoteTracks = []
            if (docSnap.exists() && docSnap.data().gpx_tracks) {
              const rawRemote = docSnap.data().gpx_tracks || []
              remoteTracks = rawRemote.map(fromFirestoreTrack)
            }

            // 로컬과 리모트 양방향 병합 (id 기준, updatedAt 기준 최신 수정본 우선)
            const trackMap = new Map()
            remoteTracks.forEach(t => trackMap.set(t.id, t))

            this.tracks.forEach(lTrack => {
              if (!trackMap.has(lTrack.id)) {
                trackMap.set(lTrack.id, lTrack)
              } else {
                // 이미 양쪽에 존재하는 경우 최신 수정본(updatedAt) 선택
                const rTrack = trackMap.get(lTrack.id)
                const lTime = new Date(lTrack.updatedAt || lTrack.createdAt || 0).getTime()
                const rTime = new Date(rTrack.updatedAt || rTrack.createdAt || 0).getTime()
                if (lTime > rTime) {
                  trackMap.set(lTrack.id, lTrack)
                }
              }
            })

            const mergedList = Array.from(trackMap.values())
            mergedList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            this.tracks = mergedList

            // Firestore와 IndexedDB 모두 최신 상태로 영구 갱신
            await this.syncTracksToFirestore()
            for (const t of mergedList) {
              await saveTrackToDb(t)
            }
          } catch (syncErr) {
            console.warn('Firestore GPX 동기화 실패 (오프라인 모드로 로컬 유지):', syncErr)
          }
        }

        this.isLoaded = true
      } catch (err) {
        this.error = `트랙을 불러오는 중 오류가 발생했습니다: ${err.message}`
        console.error(this.error)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 파싱된 GPX 데이터를 신규 트랙으로 추가
     * @param {Object} parsedData parseGpx() 반환 객체
     * @returns {Object} 저장된 트랙 객체
     */
    async addTrack(parsedData) {
      if (!parsedData || !parsedData.success || !parsedData.coordinates || parsedData.coordinates.length === 0) {
        throw new Error('유효한 좌표가 포함된 GPX 파싱 데이터가 아닙니다.')
      }

      const id = `gpx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const nowIso = new Date().toISOString()

      const newTrack = {
        id,
        title: parsedData.title || '라이딩 기록',
        distanceKm: parsedData.distanceKm || 0,
        elevationGainM: parsedData.elevationGainM || 0,
        durationMinutes: parsedData.durationMinutes || 0,
        startTime: parsedData.startTime || nowIso,
        bounds: parsedData.bounds || null,
        pointCount: parsedData.pointCount || {
          original: parsedData.coordinates.length,
          simplified: parsedData.coordinates.length,
          compressionRate: '0%'
        },
        minElevationM: parsedData.minElevationM ?? 0,
        maxElevationM: parsedData.maxElevationM ?? 0,
        elevationProfile: parsedData.elevationProfile || [],
        coordinates: parsedData.coordinates,
        visible: true,
        visibility: 'private', // 기본값: 나만보기
        createdAt: nowIso,
        updatedAt: nowIso
      }

      // 1. IndexedDB에 영구 저장
      await saveTrackToDb(newTrack)

      // 2. 상태 목록 맨 앞에 추가
      this.tracks.unshift(newTrack)
      this.selectedTrackId = newTrack.id

      // 3. 로그인 상태면 Firestore에도 비동기 백업
      await this.syncTracksToFirestore()

      return newTrack
    },

    /**
     * 트랙 공개 범위 변경 (private <-> friends)
     * - friends: shared_tracks 컬렉션에 동기화
     * - private: shared_tracks 컬렉션에서 영구 삭제
     */
    async changeTrackVisibility(trackId, visibility) {
      const track = this.tracks.find(t => t.id === trackId)
      if (!track) {
        return { success: false, message: '트랙을 찾을 수 없습니다.' }
      }

      if (visibility !== 'private' && visibility !== 'friends') {
        return { success: false, message: '올바른 공개 범위(private 또는 friends)가 아닙니다.' }
      }

      track.visibility = visibility
      track.updatedAt = new Date().toISOString()

      // 1. 로컬 IndexedDB 및 내 문서 동기화
      await saveTrackToDb(track)
      await this.syncTracksToFirestore()

      // 2. Firestore shared_tracks 컬렉션 동기화/삭제
      const user = auth?.currentUser
      if (user && db) {
        try {
          const sharedDocRef = doc(db, 'shared_tracks', trackId)
          if (visibility === 'friends') {
            const firestorePayload = toFirestoreTrack(track)
            await setDoc(sharedDocRef, {
              ...firestorePayload,
              authorUid: user.uid,
              authorName: user.displayName || '라이더',
              authorPhoto: user.photoURL || null,
              authorCode: user.userCode || '',
              visibility: 'friends',
              sharedAt: new Date().toISOString()
            })
          } else {
            // private 변경 시 shared_tracks 컬렉션에서 완전히 삭제
            await deleteDoc(sharedDocRef)
          }
        } catch (cloudErr) {
          console.error('[GpxStore] shared_tracks sync error:', cloudErr)
        }
      }

      return {
        success: true,
        visibility,
        message: visibility === 'friends' ? '친구 공개로 변경되었습니다.' : '나만보기(비공개)로 변경되었습니다.'
      }
    },

    /**
     * 트랙 삭제 (로컬, 내 문서, shared_tracks 일괄 삭제)
     * @param {string} trackId 삭제할 트랙 ID
     */
    async removeTrack(trackId) {
      const idx = this.tracks.findIndex(t => t.id === trackId)
      if (idx === -1) return false

      // 1. 상태에서 제거
      this.tracks.splice(idx, 1)

      if (this.selectedTrackId === trackId) {
        this.selectedTrackId = null
        this.closeElevationProfile()
      }
      if (this.hoveredTrackId === trackId) {
        this.hoveredTrackId = null
      }

      // 2. IndexedDB에서 삭제
      await deleteTrackFromDb(trackId)

      // 3. Firestore에서도 동기화
      await this.syncTracksToFirestore()

      // 4. 공유된 트랙이었을 경우 shared_tracks에서도 동시 삭제
      const user = auth?.currentUser
      if (user && db) {
        try {
          const sharedDocRef = doc(db, 'shared_tracks', trackId)
          await deleteDoc(sharedDocRef)
        } catch (err) {
          console.warn('[GpxStore] shared_tracks delete error:', err)
        }
      }

      return true
    },

    /**
     * 트랙 표시/숨김 토글
     */
    async toggleTrackVisibility(trackId) {
      const track = this.tracks.find(t => t.id === trackId)
      if (!track) return

      track.visible = !track.visible
      track.updatedAt = new Date().toISOString()

      // DB 갱신
      await saveTrackToDb(track)
      await this.syncTracksToFirestore()
    },

    /**
     * 트랙 제목 수정
     */
    async updateTrackTitle(trackId, newTitle) {
      const track = this.tracks.find(t => t.id === trackId)
      if (!track) return

      track.title = newTitle.trim() || track.title
      track.updatedAt = new Date().toISOString()

      await saveTrackToDb(track)
      await this.syncTracksToFirestore()
    },

    /**
     * 맞팔된 친구들의 공유 트랙 목록 조회 (shared_tracks)
     * @param {Array<string>} friendUids 
     */
    async loadFriendsTracks(friendUids = []) {
      if (!friendUids || friendUids.length === 0 || !db) {
        this.friendTracks = []
        return []
      }

      try {
        const safeFriendUids = friendUids.slice(0, 20)
        const chunks = []
        for (let i = 0; i < safeFriendUids.length; i += 30) {
          chunks.push(safeFriendUids.slice(i, i + 30))
        }

        let allShared = []
        for (const chunk of chunks) {
          const q = query(
            collection(db, 'shared_tracks'),
            where('authorUid', 'in', chunk),
            where('visibility', '==', 'friends'),
            limit(MAX_SHARED_TRACKS_QUERY_LIMIT)
          )
          const querySnap = await getDocs(q)
          querySnap.forEach(docSnap => {
            allShared.push(fromFirestoreTrack(docSnap.data()))
          })
        }

        this.friendTracks = allShared.map(t => ({
          ...t,
          visible: t.visible !== false
        }))

        return this.friendTracks
      } catch (err) {
        console.error('[GpxStore] loadFriendsTracks error:', err)
        return []
      }
    },

    /**
     * 친구 트랙 직접 주입 (오프라인/테스트용)
     */
    setFriendTracks(tracks = []) {
      this.friendTracks = tracks.map(t => ({
        ...t,
        visible: t.visible !== false
      }))
    },

    /**
     * 친구 트랙 표시/숨김 토글
     */
    toggleFriendTrackVisibility(trackId) {
      const track = this.friendTracks.find(t => t.id === trackId)
      if (!track) return
      track.visible = !track.visible
    },

    /**
     * 친구 트랙 마우스 호버 지정
     */
    setHoveredFriendTrack(trackId) {
      this.hoveredFriendTrackId = trackId || null
    },

    /**
     * 친구 트랙 선택 지정
     */
    setSelectedFriendTrack(trackId) {
      this.selectedFriendTrackId = trackId || null
    },

    /**
     * 마우스 호버 트랙 지정 (강조 렌더링용, 즉시 반응)
     */
    setHoveredTrack(trackOrId) {
      const id = (trackOrId && typeof trackOrId === 'object') ? trackOrId.id : trackOrId
      this.hoveredTrackId = id || null
    },

    /**
     * 선택된 트랙 지정 (지도 줌 및 상세 팝업용)
     */
    setSelectedTrack(trackOrId) {
      const id = (trackOrId && typeof trackOrId === 'object') ? trackOrId.id : trackOrId
      this.selectedTrackId = id || null
    },

    /**
     * 전체 트랙 초기화 (캐시 리셋 및 테스트용)
     */
    async clearAllTracks() {
      this.tracks = []
      this.friendTracks = []
      this.selectedTrackId = null
      this.hoveredTrackId = null
      this.selectedFriendTrackId = null
      this.hoveredFriendTrackId = null
      this.closeElevationProfile()
      await clearAllTracksFromDb()
      await this.syncTracksToFirestore()
    },

    /**
     * 고도 프로필 차트 열기
     * @param {string} [trackId] 특정 트랙 ID (생략 시 현재 활성 트랙)
     */
    openElevationProfile(trackId) {
      if (trackId) {
        const myTrack = this.tracks.find(t => t.id === trackId)
        if (myTrack) {
          this.selectedTrackId = trackId
          this.selectedFriendTrackId = null
        } else {
          const fTrack = this.friendTracks.find(t => t.id === trackId)
          if (fTrack) {
            this.selectedFriendTrackId = trackId
            this.selectedTrackId = null
          }
        }
      }
      this.showElevationProfile = true
      this.activeScrubbingPoint = null
    },

    /**
     * 고도 프로필 차트 닫기
     */
    closeElevationProfile() {
      this.showElevationProfile = false
      this.activeScrubbingPoint = null
    },

    /**
     * 고도 차트 호버/스크러빙 시 해당 지점 정보 설정
     * @param {{ distKm: number, ele: number, lat: number, lng: number } | null} point
     */
    setActiveScrubbingPoint(point) {
      this.activeScrubbingPoint = point || null
    }
  }
})
