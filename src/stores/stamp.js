import { defineStore } from 'pinia'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, auth } from '../services/firebase'

const COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24시간 쿨다운 (밀리초)

// 하위 호환성을 위한 스탬프 데이터 정규화
const normalizeStamp = (s) => ({
  ...s,
  visitCount: s.visitCount || (s.history ? s.history.length : 1),
  history: s.history && s.history.length > 0 ? s.history : [{ round: 1, acquiredAt: s.acquiredAt }]
})

export const useStampStore = defineStore('stamp', {
  state: () => ({
    acquiredStamps: [],
    isLoaded: false
  }),
  actions: {
    // 앱 로드 시 또는 로그인 시 Firestore에서 데이터 가져오기
    async fetchUserStamps() {
      const user = auth.currentUser
      if (!user) {
        this.acquiredStamps = []
        return
      }
      
      try {
        const userDocRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(userDocRef)
        
        if (docSnap.exists()) {
          const rawStamps = docSnap.data().stamps || []
          this.acquiredStamps = rawStamps.map(normalizeStamp)
        } else {
          await setDoc(userDocRef, { stamps: [] })
          this.acquiredStamps = []
        }
        this.isLoaded = true
      } catch (error) {
        console.error('스탬프 불러오기 실패:', error)
      }
    },

    // Firestore에 현재 스탬프 배열 저장
    async saveStampsToFirestore() {
      const user = auth.currentUser
      if (!user) {
        console.warn('비로그인 상태라 클라우드에 저장되지 않습니다.')
        return
      }
      try {
        const userDocRef = doc(db, 'users', user.uid)
        await setDoc(userDocRef, { stamps: this.acquiredStamps }, { merge: true })
      } catch (error) {
        console.error('Firestore 저장 실패:', error)
      }
    },
    
    // 스탬프 획득 및 24시간 쿨다운 기반 다회차(xN) 처리
    async addStamp(center) {
      const existing = this.acquiredStamps.find(s => s.id === center.id)
      const nowIso = new Date().toISOString()
      const nowMs = Date.now()

      if (existing) {
        // 기존 획득 이력 확인
        const lastAcquiredAt = existing.history && existing.history.length > 0
          ? existing.history[existing.history.length - 1].acquiredAt
          : existing.acquiredAt

        const diffMs = nowMs - new Date(lastAcquiredAt).getTime()

        // 24시간 이내 재인증 차단 (쿨다운 규칙)
        if (diffMs < COOLDOWN_MS) {
          const remainingHours = Math.max(1, Math.ceil((COOLDOWN_MS - diffMs) / (1000 * 60 * 60)))
          return {
            success: false,
            code: 'COOLDOWN',
            remainingHours,
            visitCount: existing.visitCount || 1,
            message: `'${center.name}'는 24시간 이내에 이미 인증되었습니다. (남은 시간: 약 ${remainingHours}시간)`
          }
        }

        // 24시간 경과: N회차 스탬프 획득 성공 (x2, x3...)
        const nextRound = (existing.visitCount || 1) + 1
        const newHistoryItem = { round: nextRound, acquiredAt: nowIso }
        
        existing.visitCount = nextRound
        existing.history = [...(existing.history || [{ round: 1, acquiredAt: existing.acquiredAt }]), newHistoryItem]
        existing.acquiredAt = nowIso

        await this.saveStampsToFirestore()

        return {
          success: true,
          code: 'RE_ACQUIRED',
          visitCount: nextRound,
          message: `'${center.name}' x${nextRound} 스탬프를 획득했습니다! 🎉`
        }
      }

      // 최초 1회차 신규 획득
      const newStamp = {
        ...center,
        acquiredAt: nowIso,
        visitCount: 1,
        history: [{ round: 1, acquiredAt: nowIso }]
      }
      
      this.acquiredStamps.push(newStamp)
      await this.saveStampsToFirestore()

      return {
        success: true,
        code: 'FIRST_ACQUIRED',
        visitCount: 1,
        message: `'${center.name}' 스탬프를 획득했습니다! 🎉`
      }
    },
    
    hasStamp(centerId) {
      return this.acquiredStamps.some(s => s.id === centerId)
    },

    getStamp(centerId) {
      return this.acquiredStamps.find(s => s.id === centerId) || null
    }
  }
})
