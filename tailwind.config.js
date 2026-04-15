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
        primary: [
          'SpaceGrotesk-Regular',
          'Space Grotesk',
          'system-ui',
          'sans-serif',
        ],
        primaryBold: [
          'SpaceGrotesk-Bold',
          'Space Grotesk',
          'system-ui',
          'sans-serif',
        ],
        primaryMedium: [
          'SpaceGrotesk-Medium',
          'Space Grotesk',
          'system-ui',
          'sans-serif',
        ],
        primarySemiBold: [
          'SpaceGrotesk-SemiBold',
          'Space Grotesk',
          'system-ui',
          'sans-serif',
        ],
      },
      colors,
    },
  },
  plugins: [],
};
