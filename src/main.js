// src/main.js
import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import router from './router';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useAuth } from './composables/useAuth';

let app;

onAuthStateChanged(auth, async (user) => {
  const { setUserProfile } = useAuth();

  if (user) {
    const db = getFirestore();
    const userDocRef = doc(db, 'usuarios', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userProfileData = { uid: user.uid, ...userDocSnap.data() };

      if (userProfileData.estado === 'inactivo') {
        setUserProfile(null);
        signOut(auth);
      } else {
        setUserProfile(userProfileData);
      }
    } else {
      setUserProfile({
        uid: user.uid,
        email: user.email,
        nombre_completo: user.displayName || user.email.split('@')[0],
        rol: 'tecnico',
        estado: 'activo'
      });
    }
  } else {
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