/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#06C755',
        'primary-dark': '#006E2B',
        deal: '#0084FF',
        activity: '#31A24C',
        action: '#FF6B00',
      },
    },
  },
  plugins: [],
}
