/**
 * Primary Typeface Configuration
 * Rajdhani — bold condensed geometric sans-serif for headlines and display text
 *
 * Note: For custom fonts, you'll need to:
 * 1. Install via: pnpm add @expo-google-fonts/rajdhani (or other)
 * 2. Load fonts in app/_layout.tsx using useFonts hook
 * 3. Update tailwind.config.js fontFamily
 */

// React Native font family (use in style={{ fontFamily: ... }})
export const fontFamily = {
  primary: 'Rajdhani-Regular',
  primaryBold: 'Rajdhani-Bold',
  primaryMedium: 'Rajdhani-Medium',
  primarySemiBold: 'Rajdhani-SemiBold',
  primaryFallback: 'System',
};

// For use in React Native Text components
// Will fallback to system font if custom font not loaded
export const getPrimaryFont = (
  weight: 'regular' | 'medium' | 'bold' = 'regular'
) => {
  switch (weight) {
    case 'bold':
      return fontFamily.primaryBold;
    case 'medium':
      return fontFamily.primaryMedium;
    default:
      return fontFamily.primary;
  }
};
