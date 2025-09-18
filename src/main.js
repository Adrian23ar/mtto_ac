// src/main.js
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
// --- 1. Importamos la librería y su CSS ---
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { getFirestore, doc, getDoc } from 'firebase/firestore'; // <-- Asegúrate de importar esto
import { auth } from './firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { useAuth } from './composables/useAuth';

let app;

onAuthStateChanged(auth, async (user) => {
  const { setUserProfile } = useAuth();

  if (user) {
    // 1. Intentamos buscar el perfil detallado en Firestore
    const db = getFirestore();
    const userDocRef = doc(db, 'usuarios', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      // Si existe, lo usamos. Esta será la lógica principal en el futuro.
      setUserProfile({ uid: user.uid, ...userDocSnap.data() });
    } else {
      // console.warn(`No se encontró perfil en Firestore para el usuario ${user.uid}. Usando datos de Auth.`);
      setUserProfile({
        uid: user.uid,
        email: user.email,
        // Usamos el nombre de Auth si existe, si no, extraemos el nombre del email
        nombre_completo: user.displayName || user.email.split('@')[0],
        rol: 'tecnico'
      });
    }
  } else {
    // Si el usuario cierra sesión, limpiamos el perfil
    setUserProfile(null);
  }
  if (!app) {
    app = createApp(App)
    app.use(router)

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