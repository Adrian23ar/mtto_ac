/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Colores Semánticos que usan Variables CSS ---
        'fondo': 'rgb(var(--color-fondo) / <alpha-value>)',
        'card': 'rgb(var(--color-card) / <alpha-value>)',
        
        'texto-principal': 'rgb(var(--color-texto-principal) / <alpha-value>)',
        'texto-secundario': 'rgb(var(--color-texto-secundario) / <alpha-value>)',
        'borde': 'rgb(var(--color-borde) / <alpha-value>)',
        'interactivo': 'rgb(var(--color-interactivo) / <alpha-value>)',
        
        // --- Los colores de estado se mantienen fijos, ya que no cambian con el tema ---
        'status-rojo': '#ea4a4a',
        'status-amarillo': '#f3c22e',
        'status-verde': '#12b04c',
        'status-gris': '#b8c0ca',
      }
    },
  },
  plugins: [],
}