/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        bree: ['Bree Serif', 'serif'],
        arvo: ['Arvo', 'serif'],
      },
      backgroundImage: {
        'leather-1': "url('/src/assets/Leather-bg.jpg')",
        'leather-2': "url('/src/assets/weathered-leather.jpg')",
        'leather-3': "url('/src/assets/leather-3.jpg')",
        'leather-4': "url('/src/assets/leather-4.jpg')",
        'leather-5': "url('/src/assets/leather-6.jpg')",
        'rock-1': "url('/src/assets/rock-1.jpg')",
        'mh-bg': "url('/src/assets/mh-bg.jpg')",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
      },
    },
  },
  plugins: [
      import('tailwind-scrollbar'),
  ],
}