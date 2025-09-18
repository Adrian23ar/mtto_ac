// src/composables/useTheme.js
import { ref, watchEffect } from 'vue';

// Inicializamos la variable 'theme' leyendo la preferencia guardada en localStorage
// o usando la preferencia del sistema operativo del usuario.
const theme = ref(localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

// Esta función se ejecutará cada vez que la variable 'theme' cambie
watchEffect(() => {
    if (theme.value === 'dark') {
        // Si el tema es oscuro, añade la clase 'dark' al <html>
        document.documentElement.classList.add('dark');
    } else {
        // Si no, quítala
        document.documentElement.classList.remove('dark');
    }
    // Guarda la preferencia en el almacenamiento local del navegador
    localStorage.setItem('theme', theme.value);
});

// Exportamos la función para que cualquier componente pueda usarla
export function useTheme() {
    const toggleTheme = () => {
        theme.value = theme.value === 'light' ? 'dark' : 'light';
    };

    return {
        theme,
        toggleTheme,
    };
}