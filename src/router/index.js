// src/router/index.js
import { createWebHistory, createRouter } from 'vue-router';
import { auth } from '../firebase/config'; // Importamos auth para revisar la sesión

// Importamos nuestras vistas y el nuevo layout
import LoginView from '../views/login.vue';
import DashboardView from '../views/Dashboard.vue';
import AppLayout from '../layouts/AppLayout.vue';
import DetalleEquipoView from '../views/DetalleEquipo.vue'; // <-- Añade esta importación

const routes = [
    {
        path: '/login',
        name: 'login',
        component: LoginView,
    },
    {
        path: '/', // La raíz ahora será el layout principal
        component: AppLayout,
        meta: { requiresAuth: true }, // Marcamos estas rutas como protegidas
        children: [
            {
                path: 'dashboard',
                name: 'dashboard',
                component: DashboardView,
            },
            {
                path: 'equipo/:id', // ':id' es el parámetro dinámico
                name: 'detalle-equipo',
                component: DetalleEquipoView,
            }
        ],
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// --- EL GUARDIA DE NAVEGACIÓN ---
router.beforeEach((to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const isAuthenticated = auth.currentUser;

    if (requiresAuth && !isAuthenticated) {
        // Si la ruta requiere autenticación y no hay usuario, va para el login
        next('/login');
    } else if (!requiresAuth && isAuthenticated && to.path === '/login') {
        // Si el usuario ya está autenticado e intenta ir a login, lo mandamos al dashboard
        next('/dashboard');
    } else {
        // En cualquier otro caso, dejamos que la navegación continúe
        next();
    }
});


export default router;