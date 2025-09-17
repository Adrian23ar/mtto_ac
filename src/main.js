// src/main.js

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// --- 1. Importamos la librería y su CSS ---
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import { auth } from './firebase/config'
import { onAuthStateChanged } from 'firebase/auth'

let app;

onAuthStateChanged(auth, (user) => {
  if (!app) {
    app = createApp(App)
    app.use(router)

    // --- 2. Registramos el plugin con algunas opciones recomendadas ---
    const options = {
      position: "top-right",
      timeout: 2500,
      closeOnClick: true,
      pauseOnFocusLoss: true,
      pauseOnHover: true,
      draggable: true,
      draggablePercent: 0.6,
      showCloseButtonOnHover: false,
      hideProgressBar: false,
      closeButton: "button",
      icon: true,
      rtl: false
    };
    app.use(Toast, options);

    app.mount('#app')
  }
});