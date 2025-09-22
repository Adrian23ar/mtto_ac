// src/router/index.js
import { createWebHistory, createRouter } from 'vue-router';
import { auth } from '../firebase/config'; // Importamos auth para revisar la sesión
import { useAuth } from '../composables/useAuth';

import AppLayout from '../layouts/AppLayout.vue';
import AdminWrapper from '../views/admin/AdminWrapper.vue';
import LoginView from '../views/Login.vue';

const routes = [
    {
        path: '/login',
        name: 'login',
        component: LoginView,
    },
    {
        path: '/',
        component: AppLayout,
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                redirect: '/dashboard'
            },
            {
                path: 'dashboard',
                name: 'dashboard',
                component: () => import('../views/Dashboard.vue'),
            },
            {
                path: 'equipo/:id',
                name: 'detalle-equipo',
                component: () => import('../views/DetalleEquipo.vue'),
            },
            {
                path: 'reportes',
                name: 'reportes',
                component: () => import('../views/Reportes.vue'),
            }
        ],
    },
    {
        path: '/admin',
        component: AdminWrapper,
        meta: { requiresAuth: true, requiresAdmin: true },
        children: [
            {
                path: 'usuarios',
                name: 'admin-usuarios',
                component: () => import('../views/admin/GestionUsuarios.vue'),
            },
            {
                path: 'equipos',
                name: 'admin-equipos',
                component: () => import('../views/admin/GestionEquipos.vue'),
            },
            {
                path: 'tareas',
                name: 'admin-tareas',
                component: () => import('../views/admin/GestionTareas.vue'),
            },
        ]
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// --- EL GUARDIA DE NAVEGACIÓN ---
router.beforeEach((to, from, next) => {
    const { userProfile } = useAuth(); // <-- Obtén el perfil del usuario
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);
    const isAuthenticated = auth.currentUser;
    const isAdmin = userProfile.value?.rol === 'admin';

    if (requiresAuth && !isAuthenticated) {
        next('/login');
    } else if (requiresAdmin && !isAdmin) { // <-- NUEVA REGLA
        // Si la ruta requiere admin y el usuario no lo es, lo mandamos al dashboard
        next('/dashboard');
    } else if (!requiresAuth && isAuthenticated && to.path === '/login') {
        next('/dashboard');
    } else {
        next();
    }
});


export default router;