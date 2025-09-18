// src/composables/useAuth.js
import { ref } from 'vue';

// Una variable reactiva global para guardar el perfil del usuario
const userProfile = ref(null);

export function useAuth() {
  return {
    userProfile,
    setUserProfile: (profile) => userProfile.value = profile,
  };
}