// src/main.js

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

import { auth } from './firebase/config'
import { onAuthStateChanged } from 'firebase/auth'

// 2. Declaramos la variable de la app pero no la montamos todavía
let app;

// 3. onAuthStateChanged es un observador que se activa
//    cuando Firebase determina el estado de la sesión.
onAuthStateChanged(auth, (user) => {
  // 4. Solo queremos montar la aplicación UNA VEZ.
  //    Si 'app' no ha sido creada, la creamos y la montamos.
  if (!app) {
    app = createApp(App)
    app.use(router)
    app.mount('#app')
  }
});