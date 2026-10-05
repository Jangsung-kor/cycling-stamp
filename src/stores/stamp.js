import { defineStore } from 'pinia'
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db, auth } from '../services/firebase'

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
          this.acquiredStamps = docSnap.data().stamps || []
        } else {
          // 최초 유저인 경우 문서 생성
          await setDoc(userDocRef, { stamps: [] })
          this.acquiredStamps = []
        }
        this.isLoaded = true
      } catch (error) {
        console.error('스탬프 불러오기 실패:', error)
      }
    },
    
    // 스탬프 획득 및 Firestore 저장
    async addStamp(center) {
      const exists = this.acquiredStamps.find(s => s.id === center.id)
      if (exists) return false // 이미 획득함

      const newStamp = {
        ...center,
        acquiredAt: new Date().toISOString()
      }
      
      // 로컬 상태 먼저 업데이트 (빠른 UI 반영)
      this.acquiredStamps.push(newStamp)
      
      const user = auth.currentUser
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid)
          await updateDoc(userDocRef, {
            stamps: arrayUnion(newStamp)
          })
        } catch (error) {
          console.error('Firestore 저장 실패:', error)
        }
      } else {
        // 비로그인 상태일 때는 LocalStorage 폴백 등 구현 가능
        console.warn('로그인되어 있지 않아 클라우드에 저장되지 않습니다.')
      }
      return true // 획득 성공
    },
    
    hasStamp(centerId) {
      return this.acquiredStamps.some(s => s.id === centerId)
    }
  }
})
