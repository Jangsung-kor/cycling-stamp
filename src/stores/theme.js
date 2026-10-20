import { defineStore } from 'pinia'

// 지도 및 앱 배경 테마 (Surface / Background Theme)
export const BG_THEMES = {
  default: {
    key: 'default',
    name: '기본',
    appBg: '#f7f8fa',
    cardBg: '#ffffff',
    textMain: '#1f2937',
    textSub: '#6b7280',
    border: '#e5e7eb',
    barBg: '#ffffff',
    barBorder: '#f0f2f5',
    isDark: false
  },
  mono: {
    key: 'mono',
    name: '모노톤',
    appBg: '#f1f5f9',
    cardBg: '#ffffff',
    textMain: '#0f172a',
    textSub: '#64748b',
    border: '#cbd5e1',
    barBg: '#f8fafc',
    barBorder: '#e2e8f0',
    isDark: false
  },
  soft: {
    key: 'soft',
    name: '소프트',
    appBg: '#f8f8f6',
    cardBg: '#ffffff',
    textMain: '#27272a',
    textSub: '#71717a',
    border: '#e4e4e7',
    barBg: '#fcfcfb',
    barBorder: '#e4e4e7',
    isDark: false
  },
  dark: {
    key: 'dark',
    name: '다크',
    appBg: '#121212',
    cardBg: '#1e1e1e',
    textMain: '#f4f4f5',
    textSub: '#a1a1aa',
    border: '#27272a',
    barBg: '#18181b',
    barBorder: '#27272a',
    isDark: true
  }
}

// 스탬프 및 앱 브랜드 포인트 컬러 테마 (Brand Accent Theme)
export const COLOR_THEMES = {
  mint: {
    key: 'mint',
    name: '쿨 민트',
    badge: '🌿',
    main: '#059669', // 숲길/자연 쿨톤 민트
    gradient: 'linear-gradient(to right, #34D399, #059669)',
    cardBgLight: '#ECFDF5',
    cardBgDark: '#064E3B22',
    cardBorderLight: '#6EE7B7',
    cardBorderDark: '#059669',
    cardShadow: 'rgba(5, 150, 105, 0.15)',
    sealShadow: 'rgba(5, 150, 105, 0.28)',
    desc: '회색 지도 위에서 시선을 사로잡는 화사한 톤업 민트'
  },
  sky: {
    key: 'sky',
    name: '스카이 블루',
    badge: '🔵',
    main: '#0284C7', // 강바람과 푸른 하늘 쿨톤 블루
    gradient: 'linear-gradient(to right, #38BDF8, #0284C7)',
    cardBgLight: '#F0F9FF',
    cardBgDark: '#0C4A6E22',
    cardBorderLight: '#7DD3FC',
    cardBorderDark: '#0284C7',
    cardShadow: 'rgba(2, 132, 199, 0.15)',
    sealShadow: 'rgba(2, 132, 199, 0.28)',
    desc: '강바람과 푸른 하늘을 닮은 청량한 쿨톤 블루'
  },
  orange: {
    key: 'orange',
    name: '선셋 오렌지',
    badge: '🍊',
    main: '#EA580C', // 석양빛 완주 성취감 고대비 웜톤
    gradient: 'linear-gradient(to right, #FB923C, #EA580C)',
    cardBgLight: '#FFF7ED',
    cardBgDark: '#7C2D1222',
    cardBorderLight: '#FDBA74',
    cardBorderDark: '#EA580C',
    cardShadow: 'rgba(234, 88, 12, 0.15)',
    sealShadow: 'rgba(234, 88, 12, 0.28)',
    desc: '무채색 배경과 극적인 보색 대비를 이루는 석양 오렌지'
  },
  ashRed: {
    key: 'ashRed',
    name: '애쉬 레드',
    badge: '🔴',
    main: '#B84A48', // 회색 톤이 은은하게 감도는 차분한 도장 인주 레드
    gradient: 'linear-gradient(to right, #D97775, #B84A48)',
    cardBgLight: '#FDF2F2',
    cardBgDark: '#7F1D1D22',
    cardBorderLight: '#F8B4B4',
    cardBorderDark: '#B84A48',
    cardShadow: 'rgba(184, 74, 72, 0.15)',
    sealShadow: 'rgba(184, 74, 72, 0.28)',
    desc: '회색 톤이 은은하게 감도는 고풍스럽고 차분한 인주 레드'
  }
}

export const useThemeStore = defineStore('theme', {
  state: () => {
    const isBrowser = typeof localStorage !== 'undefined'

    // 배경 테마 로컬스토리지 복원
    const savedBg = isBrowser ? localStorage.getItem('cycling_map_theme') : null
    const initialBg = (savedBg && BG_THEMES[savedBg]) ? savedBg : 'mono'

    // 도장 테마 로컬스토리지 복원
    const savedStamp = isBrowser ? localStorage.getItem('cycling_stamp_theme') : null
    const initialStamp = (savedStamp && COLOR_THEMES[savedStamp]) ? savedStamp : 'mint'

    return {
      bgThemeKey: initialBg,
      stampThemeKey: initialStamp
    }
  },
  getters: {
    // 배경 테마 객체
    currentBg: (state) => BG_THEMES[state.bgThemeKey] || BG_THEMES.mono,
    bgThemeList: () => Object.values(BG_THEMES),
    isDark: (state) => (BG_THEMES[state.bgThemeKey] || BG_THEMES.mono).isDark,

    // 도장 테마 객체
    currentTheme: (state) => COLOR_THEMES[state.stampThemeKey] || COLOR_THEMES.mint,
    themeList: () => Object.values(COLOR_THEMES)
  },
  actions: {
    setBgTheme(key) {
      if (BG_THEMES[key]) {
        this.bgThemeKey = key
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('cycling_map_theme', key)
        }
      }
    },
    setStampTheme(key) {
      if (COLOR_THEMES[key]) {
        this.stampThemeKey = key
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('cycling_stamp_theme', key)
        }
      }
    },
    // 기존 호환용 alias
    setTheme(key) {
      this.setStampTheme(key)
    }
  }
})
