import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate', // 서비스워커 자동 업데이트
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg'], // 정적 에셋 캐싱
      manifest: {
        name: '자전거 스탬프 앱',
        short_name: '자전거스탬프',
        description: '자전거 종주 코스 안내 및 스탬프 인증 PWA',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // 브라우저 UI 없이 전체 화면(앱처럼) 실행
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'] // 오프라인 캐싱할 파일 패턴
      }
    })
  ],
})
