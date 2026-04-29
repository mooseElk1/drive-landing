# DRIVE App — Design Context Export

Use this document to give Claude.ai (or any design tool) full design context for the DRIVE app. Attach any relevant screenshots alongside this file.

---

## App Summary

DRIVE is a **React Native (Expo) workout and sensor analytics app** for sled push training. It records IMU sensor data from a sled-mounted motion platform, detects leg drives, estimates velocity, and tracks athlete power profiles over time.

**Stack:** Expo SDK 54 · React Native 0.81.5 · NativeWind (Tailwind) · TypeScript

---

## Color Tokens (`src/components/ui/colors.js`)

The full color palette. All UI uses these tokens via NativeWind/Tailwind class names (e.g. `bg-primary-400`, `text-charcoal-100`).

```js
module.exports = {
  white: '#ffffff',
  black: '#000000',

  // Primary neutral — used for surfaces, backgrounds, borders
  charcoal: {
    50: '#F2F2F2',
    100: '#E5E5E5',
    200: '#C9C9C9',
    300: '#B0B0B0',
    400: '#969696',
    500: '#7D7D7D',
    600: '#616161',
    700: '#474747',
    800: '#383838',
    850: '#2E2E2E',
    900: '#1E1E1E',
    950: '#121212',
  },

  // Secondary neutral
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#F0EFEE',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Brand orange — primary accent
  primary: {
    50: '#FFE2CC',
    100: '#FFC499',
    200: '#FFA766',
    300: '#FF984C',
    400: '#FF8C00', // ← main brand orange
    500: '#E57E00',
    600: '#CC7000',
    700: '#B36200',
    800: '#995400',
    900: '#804600',
  },

  // Brand blue — secondary accent
  secondary: {
    50: '#E8F7FF',
    100: '#C5ECFF',
    200: '#9DDFFF',
    300: '#71D3FF',
    400: '#4BC3FF',
    500: '#1EB3FF', // ← main brand blue
    600: '#009EEB',
    700: '#0082C2',
    800: '#006699',
    900: '#004D73',
  },

  // Amber / gold — tertiary accent (e.g. badges, highlights)
  tertiary: {
    50: '#FFF8E6',
    100: '#FFEFC0',
    200: '#FFE599',
    300: '#FFD96E',
    400: '#FFC947',
    500: '#FFB520',
    600: '#F5A000',
    700: '#CC8500',
    800: '#A36A00',
    900: '#7A4F00',
  },

  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
};
```

---

## Core Card Primitive (`src/components/ui/tile.tsx`)

`Tile` is the universal card container. Use it for stat cards, input panels, and any rounded content block. It has two variants:

| Variant            | Behavior                                                             |
| ------------------ | -------------------------------------------------------------------- |
| `'full'` (default) | `px-4 py-3` — standard content tile                                  |
| `'stat'`           | `flex-1 items-center px-2 py-3` — compact stat card that fills a row |

Corner radius is always `rounded-3xl` (24px). Tiles can be pressable or static.

### Recording screen stat tiles (Workout)

On the **Workout recording screen**, the Velocity/Power (and any other live stat) tiles use a consistent “recording stat” layout:

- **Label**: left-aligned, above the value
- **Value**: left-aligned under the label
- **Unit**: on the **same line** as the value, to the **right** of the value (baseline aligned)

Implementation notes:

- `Tile` `variant="stat"` defaults to `items-center`, so to left-align content for recording stats, use an **inner full-width container** (`width: '100%'`) with `alignItems: 'flex-start'`, and render value+unit in a `row` with `alignItems: 'baseline'`.
- Current implementation lives in `src/components/live-stat-tiles.tsx`.

```tsx
import { Tile } from '@/components/ui/tile';

// Static tile (default)
<Tile className="bg-charcoal-900">
  <Text className="text-white">Content here</Text>
</Tile>

// Pressable tile
<Tile pressable onPress={handlePress} className="bg-charcoal-850">
  <Text className="text-white">Tap me</Text>
</Tile>

// Stat tile (compact, fills row)
<View className="flex-row gap-2">
  <Tile variant="stat" className="bg-charcoal-850">
    <Text className="text-primary-400 text-2xl font-bold">87</Text>
    <Text className="text-charcoal-400 text-xs">PPL</Text>
  </Tile>
  <Tile variant="stat" className="bg-charcoal-850">
    <Text className="text-white text-2xl font-bold">3</Text>
    <Text className="text-charcoal-400 text-xs">Sessions</Text>
  </Tile>
</View>
```

Full source:

```tsx
import React from 'react';
import type { PressableProps, ViewProps } from 'react-native';
import { Pressable, View } from 'react-native';

export const TILE_RADIUS = 24;
const TILE_RADIUS_CLASS = 'rounded-3xl';

type TileVariant = 'stat' | 'full';

type BaseProps = {
  variant?: TileVariant;
  className?: string;
};

type TileViewProps = BaseProps & ViewProps & { pressable?: false };
type TilePressableProps = BaseProps & PressableProps & { pressable: true };

export function Tile(props: TileViewProps): React.ReactElement;
export function Tile(props: TilePressableProps): React.ReactElement;
export function Tile(props: TileViewProps | TilePressableProps) {
  if ('pressable' in props && props.pressable) {
    const {
      pressable: _pressable,
      variant = 'full',
      className = '',
      style,
      ...rest
    } = props;
    const baseClassName =
      variant === 'stat' ? 'flex-1 items-center px-2 py-3' : 'px-4 py-3';
    return (
      <Pressable
        className={`${TILE_RADIUS_CLASS} ${baseClassName} ${className}`}
        style={style}
        {...rest}
      />
    );
  }
  const {
    variant = 'full',
    className = '',
    style,
    ...rest
  } = props as TileViewProps;
  const baseClassName =
    variant === 'stat' ? 'flex-1 items-center px-2 py-3' : 'px-4 py-3';
  return (
    <View
      className={`${TILE_RADIUS_CLASS} ${baseClassName} ${className}`}
      style={style}
      {...rest}
    />
  );
}
```

---

## Core Button Primitive (`src/components/ui/button.tsx`)

`Button` is the universal pressable action component. Use it for primary/secondary CTAs, destructive actions, and inline actions (ghost/link).

Corner radius is always `rounded-xl` (12px).

### Variants

| Variant       | Notes                           |
| ------------- | ------------------------------- |
| `default`     | Primary CTA (orange)            |
| `warning`     | Warning CTA (yellow)            |
| `secondary`   | Secondary CTA (neutral surface) |
| `inverted`    | Light surface button            |
| `outline`     | Border + dark surface           |
| `destructive` | Destructive CTA (danger)        |
| `ghost`       | Text-only with underline        |
| `link`        | Text-only link (primary color)  |

### Sizes

| Size      | Container   |
| --------- | ----------- |
| `default` | `h-10 px-4` |
| `lg`      | `h-12 px-8` |
| `sm`      | `h-8 px-3`  |
| `icon`    | `size-9`    |

### Common props

- `label`: Text label (ignored when rendering explicit children)
- `variant`: One of the variants above
- `size`: One of the sizes above
- `fullWidth`: Defaults to `true`; when `false` the button sizes to content and centers itself
- `disabled`: Disables interaction and applies disabled styling
- `loading`: Disables interaction and shows an activity indicator

---

## UI Conventions

- **Styling:** NativeWind Tailwind class names only (`className="..."`). No inline style objects unless absolutely necessary.
- **Dark-first:** The app uses a dark theme. Backgrounds typically use `charcoal-900` / `charcoal-950`, surfaces use `charcoal-850` / `charcoal-800`.
- **Accent:** Brand orange (`primary-400` = `#FF8C00`) is the primary highlight. Blue (`secondary-500`) is used for data/analytics callouts.
- **Typography:** Use React Native `Text` with Tailwind size/weight classes (`text-sm`, `text-lg`, `font-semibold`, etc.).
- **Spacing:** 16px base grid — `p-4`, `gap-4`, `mb-4` are the common units.
- **No shadow, no gradients** — flat surfaces only.
- **Header back buttons:** Use the shared icon-only `HeaderBackButton` (`src/components/ui/header-back-button.tsx`) for custom `headerLeft` back behavior.

---

## Feature: Power Profile Framework

See `docs/power-profile-framework-plan.md` for the full spec. Key UI screens to design:

| Screen              | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| **Profile Setup**   | Collect athlete name (required), body weight (optional)      |
| **Discovery Test**  | Step through load levels, record sprint peaks per load       |
| **Profile Summary** | Show current PPL, FV classification, CI score, history chart |
| **Session History** | List past power sessions with key metrics                    |

Key display values:

| Metric                 | Label                     | Unit  | Color                                 |
| ---------------------- | ------------------------- | ----- | ------------------------------------- |
| PPL (Peak Power Limit) | "PPL"                     | W     | `primary-400` orange                  |
| Confidence Index       | "CI"                      | 0–100 | success/warning/danger based on value |
| Load                   | "Load"                    | kg    | neutral                               |
| Velocity estimate      | "Velocity" / "Sled Speed" | m/s   | `secondary-500` blue                  |
| Leg drives             | "Drives" or "Leg Drives"  | count | neutral                               |

---

## Folder Structure (UI-relevant paths)

```
src/
├── components/ui/          # Shared primitives (Tile, Button, Input, etc.)
├── features/
│   ├── power-profile/      # [NEW] Power Profile feature
│   │   ├── components/
│   │   ├── screens/
│   │   ├── hooks/
│   │   └── store/
│   ├── workout/            # Workout recording & history
│   └── sensor-processing/  # Sensor data & live charts
└── app/                    # Expo Router route files (thin wrappers only)
```

---

_Generated from DRIVEapp.UI · April 2026_
