import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// 사용자님이 제공해주신 Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAMpJjRZIrJHeRfyMJ6hRge4I1SdXZ9kso",
  authDomain: "cycling-stamp.firebaseapp.com",
  projectId: "cycling-stamp",
  storageBucket: "cycling-stamp.firebasestorage.app",
  messagingSenderId: "838155099700",
  appId: "1:838155099700:web:4fa035c88230637113b461",
  measurementId: "G-8S84EXQT9W"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig)

// 인증(Auth) 및 DB(Firestore) 객체 추출
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
