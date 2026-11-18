/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#182038',
        navyDeep: '#10182C',
        gold: '#F8C018',
        goldDeep: '#D9A600',
      },
      fontFamily: {
        oswald: ['var(--font-oswald)'],
      },
    },
  },
  plugins: [],
};
