/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvasLight: '#F8FAFC'
      },
      boxShadow: {
        glass: '0 10px 40px -10px rgba(15, 23, 42, 0.14)'
      }
    }
  },
  plugins: []
};
