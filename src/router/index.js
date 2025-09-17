// src/router/index.js
import { createWebHistory, createRouter } from 'vue-router'

import LoginView from '../views/login.vue'
import DashboardView from '../views/Dashboard.vue'
const routes = [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, },
    { path: '/', redirect: '/login' }

]

export const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router