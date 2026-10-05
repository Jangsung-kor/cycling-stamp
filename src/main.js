import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

// Vant 컴포넌트 전체 임포트 (초기 세팅 편의를 위해 전체 임포트)
import Vant from 'vant'
import 'vant/lib/index.css'

// 글로벌 스타일 (style.css가 있다면 유지, 없다면 제외)
// import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Vant)

app.mount('#app')
