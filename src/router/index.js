import { createRouter, createWebHistory } from 'vue-router'
import MapView from '../views/MapView.vue'
import StampView from '../views/StampView.vue'
import ProfileView from '../views/ProfileView.vue'

const routes = [
  {
    path: '/',
    name: 'Map',
    component: MapView
  },
  {
    path: '/stamp',
    name: 'Stamp',
    component: StampView
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
