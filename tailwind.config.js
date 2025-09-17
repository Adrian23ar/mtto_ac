/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'status-rojo': '#ea4a4a',
        'status-amarillo': '#f3c22e',
        'status-verde': '#12b04c',
        'status-gris': '#b8c0ca',
        'fondo': '#f9fafb',
        'interactivo': '#1397b2',
      }
    },
  },
  plugins: [],
}