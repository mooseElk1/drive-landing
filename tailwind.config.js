const colors = require('./src/components/ui/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter'],
        primary: ['Rajdhani-Regular', 'Rajdhani', 'system-ui', 'sans-serif'],
        primaryBold: ['Rajdhani-Bold', 'Rajdhani', 'system-ui', 'sans-serif'],
        primaryMedium: [
          'Rajdhani-Medium',
          'Rajdhani',
          'system-ui',
          'sans-serif',
        ],
        primarySemiBold: [
          'Rajdhani-SemiBold',
          'Rajdhani',
          'system-ui',
          'sans-serif',
        ],
      },
      colors,
    },
  },
  plugins: [],
};
