# Project Guide (Claude)

This app started from the [Obytes React Native Template](https://github.com/obytes/react-native-template-obytes), and has evolved into a **workout and sensor analytics** app.

This document describes the **current stack**, **folder structure**, and **rules for adding/changing code**, with an emphasis on making it safe and easy for a second developer (especially someone new to software) to do **UI-focused work**.

---

## 1. If You’re New & Mostly Doing UI (Read This First)

If you’re the “vibe coder” mostly touching screens and components, these are your main areas:

- **Screens & layouts**
  - `src/features/[feature-name]/screens/`
  - `src/app/` (routes, but keep them thin)
- **UI components**
  - `src/features/[feature-name]/components/`
  - `src/components/ui/` (generic, reusable UI building blocks)

### Safe Places for UI Work

**Good folders to edit:**

- `src/features/workout/components/` – workout-related UI bits (cards, charts, etc.)
- `src/features/workout/screens/` – workout-related screens
- `src/features/sensor-processing/components/` – sensor-related UI (gauges, graphs, etc.)
- `src/features/settings/screens/` – settings screens
- `src/components/ui/` – shared primitives (`Button`, `Input`, `Card`, `Modal`, etc.)
- `src/app/` – simple route files that just “wire up” feature screens

**Folders to avoid unless you know what you’re doing:**

- `src/api/` – data fetching, HTTP clients
- `src/services/` – sensors, workouts, calculations
- `src/lib/` – shared low-level utilities (i18n, env, storage, etc.)
- `src/store/` – **global** state (Zustand)
- `src/native/`, `android/`, `ios/` – native code and bridges

### Typical UI Workflows

**Edit an existing screen:**

1. Find the feature folder, e.g. `src/features/workout/screens/`.
2. Open the screen file (e.g. `workout-detail.screen.tsx`).
3. Adjust JSX and Tailwind classes (`className="..."`) for layout, colors, spacing.
4. If you need reusable pieces, move UI chunks into `src/features/workout/components/`.

**Create a new UI component:**

1. Decide if it’s:
   - **Generic UI** (usable anywhere) → put in `src/components/ui/`.
   - **Feature-specific** (only for workouts, sensors, settings, etc.) → put in `src/features/[feature-name]/components/`.
2. Export it and import it using **absolute imports** (see below).

**Add a new screen + route:**

1. Create a screen in `src/features/[feature-name]/screens/`, e.g. `new-workout.screen.tsx`.
2. In `src/app/`, create a route file that just renders that screen:

   ```tsx
   // src/app/workout/new.tsx
   import { NewWorkoutScreen } from '@/features/workout/screens/new-workout.screen';

   export default function Route() {
     return <NewWorkoutScreen />;
   }
   ```

3. Keep **logic inside the feature** (screen/components/hooks), not in the route file.

---

## 2. Tech Stack (What We Use Today)

- **Expo SDK 54** with **React Native 0.81.5**
- **TypeScript**
- **Expo Router 6** (file-based routing in `src/app/`)
- **NativeWind + TailwindCSS** for styling
- **Zustand** for app state (`src/store/` + feature stores)
- **React Query** + `react-query-kit` for server state (`src/api/`)
- **TanStack Form + Zod** for forms & validation
- **MMKV** for local storage (`src/lib/storage.tsx`)
- **Jest + React Testing Library** for tests
- **PNPM** for package management

---

## 3. Current Structure (As-Is)

```text
src/
|-- app/             # Expo Router screens and layouts
|-- api/             # HTTP client and API hooks (posts + common)
|-- components/      # Mixed: design-system + domain widgets + settings
|   |-- ui/
|   `-- settings/
|-- constants/
|-- design-system/   # Tokens/fonts (small today)
|-- features/        # Mostly empty (target location for domain code)
|-- lib/             # Shared utilities, hooks, auth, i18n, storage
|-- native/          # Native bridge-related tests/helpers
|-- providers/       # React context providers
|-- services/        # Sensor, workout, and calculation services
|-- store/           # Zustand stores
|-- translations/    # i18n JSON dictionaries
`-- types/           # Shared TS domain types
```

**Problem summary:**

- `src/features/` is **not** yet the main home of feature code.
- Domain components and generic UI are mixed in `src/components/`.
- Responsibilities overlap across `src/api/`, `src/services/`, `src/lib/`, and `src/providers/`.
- Route files in `src/app/` contain too much feature/business logic.

---

## 4. Target Structure (Where We’re Going)

We are migrating toward a **feature-based** structure:

```text
src/
|-- app/                  # Expo Router route entrypoints only
|-- features/
|   |-- workout/
|   |   |-- components/
|   |   |-- screens/
|   |   |-- hooks/
|   |   |-- services/
|   |   |-- store/
|   |   `-- types/
|   |-- sensor-processing/
|   `-- settings/
|-- components/
|   `-- ui/               # Shared, reusable design primitives only
|-- api/                  # Shared API client + server hooks
|-- lib/                  # Cross-feature utilities only
|-- providers/            # App-level providers only
|-- store/                # Global app store only
|-- translations/
|-- types/                # Truly global types only
`-- constants/
```

**Mental model:**

- **Features own their own stuff** (UI, logic, local state, services).
- Shared stuff lives in **`components/ui`, `lib`, `api`, `store`** only if it’s truly reused across multiple features.

---

## 5. Migration Rules (Important Architecture Decisions)

These rules guide how to move and add code.

### Routing (`src/app/`)

- Keep **routes thin**:
  - ✅ Route files should **only** import and render feature screens.
  - ❌ Do **not** put business logic, data fetching, or big components directly in route files.

### Features (`src/features/[feature-name]/`)

- All new **domain code** (screens, domain-specific components, hooks, services) lives here.
- Each feature can have:
  - `screens/` – full-page screens for routing
  - `components/` – UI pieces only used by that feature
  - `hooks/` – feature-specific React hooks
  - `services/` – feature-specific logic (e.g. workout computations)
  - `store/` – feature-local Zustand stores
  - `types/` – types specific to that feature

### Components (`src/components/`)

- `src/components/ui/` is **only** for **generic, reusable** primitives:
  - Buttons, Inputs, Modals, Cards, Lists, etc.
- Domain-specific widgets go into features:
  - Workout cards, sensor charts, gauges → `src/features/workout/components/` or `src/features/sensor-processing/components/`.

### Services / Lib / Store

- `src/services/` – only **cross-feature** services.
  - If a service is only for one feature, move it under that feature’s `services/`.
- `src/lib/` – small shared framework utilities only:
  - i18n, environment helpers, storage adapters, generic hooks, etc.
- `src/store/` – **global app state only**:
  - Auth, session, global app settings.
  - Feature-local state should live in `src/features/*/store/`.

### Imports

- ✅ Always use **absolute imports** with `@/`:
  - `@/components/ui/button`
  - `@/features/workout/screens/workout-detail.screen`
- ❌ Do **not** use deep relative imports like `../../../components/ui/button`.

---

## 6. Development Commands

Run these from the project root:

```bash
pnpm start          # Start Expo
pnpm ios            # Run iOS app
pnpm android        # Run Android app

pnpm lint           # ESLint
pnpm type-check     # TypeScript
pnpm test           # Jest + React Testing Library
pnpm check-all      # Full local checks
```

Environment-specific examples:

```bash
pnpm start:staging
pnpm start:production

pnpm ios:staging
pnpm ios:production

pnpm build:production:ios   # EAS build for iOS production
```

### Linting & Type-Checking Expectations

- Run `pnpm lint` and `pnpm type-check` **frequently** during development, not just before releases.
- Use the linter’s autofix capabilities (e.g. `pnpm lint --fix`) wherever possible instead of manually adjusting style/formatting.
- Fix lint and type errors locally before pushing or opening a PR so CI stays green and diffs stay small.

---

## 7. Key Patterns & How-To

### Forms (TanStack Form + Zod)

- Use **TanStack Form** for all new forms, with **Zod** schemas.
- Example in template: `src/features/auth/components/login-form.tsx`.
- Pattern:
  - Define a **Zod schema** for validation.
  - Use TanStack Form to:
    - control fields,
    - handle submit,
    - show validation errors.

### Data Fetching (React Query)

- Use **React Query** (and `react-query-kit` where appropriate) for all server data.
- Example pattern (from template): `src/features/feed/api.ts`.
- Rules:
  - Put **query hooks** in the feature (`src/features/[feature]/hooks` or `api.ts` in that feature).
  - Compose those hooks inside screens/components.
  - Avoid calling `fetch` or `axios` directly in components.

### State Management (Zustand)

- Use **Zustand** for:
  - **Global state** in `src/store/`.
  - **Feature-local state** in `src/features/[feature]/store/`.
- Example pattern: `src/features/auth/use-auth-store.tsx`.

### Styling (NativeWind/Tailwind)

- Use **Tailwind-style class names** via NativeWind:
  ```tsx
  <View className="flex-1 bg-background p-4">
    <Text className="text-xl font-semibold">Title</Text>
  </View>
  ```
- If a UI pattern repeats **across features**, extract into `src/components/ui/`.

### Storage (MMKV)

- Use **MMKV** via `src/lib/storage.tsx` for persistent/sensitive data.
- ❌ Do not use AsyncStorage directly.

### Testing

- Keep tests close to the code they cover in a local `__tests__` folder, e.g. `src/features/workout/services/__tests__/velocity-service.test.ts`.
- Name tests `*.test.ts` or `*.test.tsx`.
- Prefer behavior-focused tests that exercise features and services, not just implementation details.

### Software Principles

- **DRY (Don’t Repeat Yourself)**
  - Extract shared UI into `src/components/ui/` instead of copy‑pasting across screens/features.
  - Extract shared logic into `src/lib/` or shared services instead of duplicating helpers in multiple files.

- **SOLID (focus on S, I, D)**
  - **Single Responsibility**:
    - Screens compose UI and hooks.
    - Services do calculations or I/O.
    - Stores manage state.
  - **Interface Segregation**: prefer small, focused hooks/services over “kitchen sink” utilities.
  - **Dependency Inversion**: depend on abstractions (e.g., sensor/acceleration services) rather than raw platform APIs inside UI components.

- **KISS / YAGNI**
  - Keep implementations simple and explicit; avoid “clever” patterns unless they are clearly needed.
  - Don’t add extra layers, configuration, or generic abstractions until there is a real use case.

- **Separation of Concerns**
  - UI components focus on rendering.
  - Hooks/services encapsulate logic and data access.
  - Routes in `src/app/` only wire screens together; they should not own business logic.

- **Single Source of Truth**
  - Each piece of state has one owner (global store, feature store, or sensor stream).
  - Avoid partially mirroring the same state in multiple places.

---

## 8. Do / Do Not (Quick Reference)

### Do

- ✅ **DO** add new feature work under `src/features/[feature]/`.
- ✅ **DO** move code gradually into feature folders as you touch it.
- ✅ **DO** keep tests close to the behavior (`*.test.ts[x]`).
- ✅ **DO** use MMKV for persisted client data.
- ✅ **DO** use Expo config/plugins for native configuration where possible.
- ✅ **DO** use absolute imports with `@/`.
- ✅ **DO** use TanStack Form (not React Hook Form) for new forms.
- ✅ **DO** use EAS Build for production (`pnpm build:production:ios`).
- ✅ **DO** prefix env vars with `EXPO_PUBLIC_*` for values read in the app.
- ✅ **DO** follow DRY and SOLID principles.

### Do Not

- ❌ **DO NOT** add new domain logic directly in `src/components/` root.
- ❌ **DO NOT** turn route files into large business-logic files.
- ❌ **DO NOT** move everything at once without tests or basic coverage.
- ❌ **DO NOT** modify `android/` or `ios/` directly (use Expo config plugins).
- ❌ **DO NOT** introduce new global singletons without putting them in the right layer (`lib`, `store`, `providers`).

---

## 9. Quick Checklist for a New UI Task

Before opening a PR, you should be able to answer:

1. **Where did I put my new code?**
   - Feature screen/component in `src/features/[feature]/...`?
   - Shared primitive in `src/components/ui/`?

2. **Did I keep routes thin?**
   - Route file just renders a feature screen?

3. **Are my imports clean?**
   - Using `@/` absolute imports?

4. **Am I following patterns?**
   - Forms → TanStack Form + Zod.
   - Data fetching → React Query hooks.
   - State → Zustand (global or feature-local).
   - Styling → NativeWind/Tailwind classes.

If the answers are “yes,” you’re in good shape.

---

## Sensor Data & Time Channels

To avoid confusion when working with workout sensor data, we use **two related time concepts**:

1. **Raw timestamp**
   - This is the original **JavaScript datetime** for each sensor sample.
   - It represents an absolute point in time (e.g., milliseconds since epoch).
   - Use this when you care about **when** something happened on the clock (e.g., syncing with a server, cross-session comparisons).

2. **Workout time channel (`time`)**
   - This is a **relative time** value that:
     - Starts at **`0.000`** at the beginning of the workout.
     - Increases as the workout progresses.
   - Think of it as **“seconds since workout start”**, not a clock time.
   - All charts and in-workout analytics should treat `time` as the **primary X-axis**.

### Rules for Using Time in Code & UI

- ✅ **Use `time` (relative) for:**
  - Plotting workout curves (heart rate, power, cadence, etc.).
  - Aligning multiple sensor streams within the **same workout**.
  - Any UI that shows “time since start” or a progress scrubber.

- ✅ **Use raw JavaScript datetimes for:**
  - Sorting or grouping **entire workouts** by calendar time.
  - Syncing with back-end services or logs.
  - Displaying things like “Workout started at 6:12 PM”.

- ❌ **Do NOT:**
  - Mix `time` (relative) and datetimes on the same axis without being explicit.
  - Treat `time` as a Date or apply timezone logic to it.
  - Re-zero `time` per sensor stream; `0.000` is always **workout start**, shared by all samples in that workout.

**Mental model:**

- **`timestamp`** = _“When did this happen on the real-world clock?”_
- **`time`** = _“How many seconds into this workout was this?”_

---

## Acceleration Service Architecture

The **acceleration service** turns raw IMU samples into:

- A **velocity channel** (for smooth speed / distance analytics)
- A **step-like event channel** (for motion cycles / “steps” of the sled)

Remember: the device is mounted on a **sled**, not on the user’s body. All motion is **sled motion**, not literal human steps.

### Input From Motion Platform

The motion platform provides:

```ts
type ImuSample = {
  timestamp: number; // JS timestamp (ms since epoch)

  // Orientation (world frame)
  orientation: {
    // any one of these representations is fine, actual type may differ
    qw: number;
    qx: number;
    qy: number;
    qz: number; // quaternion (body -> world)
    // or equivalent rotation matrix / Euler angles if exposed
  };

  // Accelerations
  accel_with_g: {
    ax: number; // m/s^2, device/body frame, includes gravity
    ay: number;
    az: number;
  };
  accel_no_g: {
    ax: number; // m/s^2, device/body frame, gravity already removed
    ay: number;
    az: number;
  };
};
```

> **Important:** The platform already gives us **gravity-compensated acceleration** (`accel_no_g`), so our code does **not** need to separate gravity from linear acceleration.
>
> **Units:** Accelerations from the motion platform are in **m/s²** and should remain in m/s² throughout the app. Any derived velocity must be in **m/s**, and any derived distance in **meters**. Do not silently convert to other units in feature code; if conversions are needed for display, keep a clear separation between internal (SI) units and UI formatting.

---

### Common Preprocessing (Shared by Both Pipelines)

These steps are shared, then the data splits into **velocity** and **step-detection** pipelines.

1. **Determine world-frame orientation**
   - Use `orientation` from the IMU as the **authoritative body → world transform**.
   - We do **not** estimate orientation ourselves; we only consume it.
   - If needed, cache smoothed orientation to avoid jitter in projections.

2. **Resample / normalize rate**
   - Ensure a roughly fixed sampling rate (e.g. 50–100 Hz).
   - Interpolate small gaps; drop obviously corrupt samples.

3. **Choose acceleration source**
   - For both pipelines, start from **gravity-free acceleration**:
     - Prefer `accel_no_g` from the IMU.
   - Only use `accel_with_g` if we need to reconstruct something that explicitly depends on gravity (most workout analytics do **not**).

4. **Project into useful axes**

   Using the **orientation**:
   - Rotate `accel_no_g` from device/body frame into a **world or sled frame**.
   - Define a **sled motion axis** (e.g. forward along track).
   - Compute a scalar **sled-axis acceleration**:
     ```text
     a_sled(t) = projection of world-frame acceleration onto sled direction
     ```
   - Optionally keep other components (e.g. vertical acceleration) if needed later.

5. **Bias / outlier handling**
   - Estimate a slow-changing bias (long time constant) and subtract it if needed.
   - Clamp extreme outliers to a configurable max (e.g. 4–6 g).

This produces a clean scalar `a_sled(t)` (and optionally other components) that feeds both pipelines.

---

### Pipeline 1: Velocity Estimation

Goal: a **smooth, physically reasonable velocity trace** along the sled’s motion axis for charts and analytics.

**Stages**

1. **Band-limit acceleration for integration**
   - Apply a **high-pass** (or detrend) to remove very low-frequency drift in `a_sled`.
   - Apply a **low-pass** to remove high-frequency noise.
   - Net effect ≈ **band-pass around motion frequencies of interest**.

   Example conceptual cutoffs (tunable per hardware/workout):
   - High-pass cutoff: ~0.1–0.3 Hz
   - Low-pass cutoff: ~5–10 Hz

2. **Integrate to velocity**
   - Numerically integrate filtered acceleration with trapezoidal integration:
     ```text
     v[t] = v[t-1] + 0.5 * (a_filt[t] + a_filt[t-1]) * dt
     ```
   - Initialize `v[0]` from boundary condition:
     - Typically **0 m/s at workout start** for the sled.

3. **Drift management**
   - Detect **zero-velocity periods** (sled at rest) and nudge `v` back toward 0.
   - Optionally blend with external velocity (e.g. GPS) when available to bound long-term drift.

4. **Output smoothing**
   - Apply a light **smoothing filter** (small-window low-pass / moving average) to `v(t)` for plotting.
   - Keep this filter gentle to avoid hiding quick changes.

**Output**

```ts
type VelocitySample = {
  time: number; // workout-relative time (seconds from 0.000)
  v: number; // m/s along sled axis
};
```

UI and analytics should use `VelocitySample[]` for **speed/velocity charts**, not raw acceleration.

---

### Pipeline 2: Leg-Drive / Motion-Cycle Detection

Goal: detect individual **leg drives** – the user’s drive strokes that produce sled motion – and capture the sled’s acceleration characteristics during each drive.

Even though we measure **sled acceleration**, each detected event is intended to correspond to a **single leg drive** in the workout motion pattern.

**Stages**

1. **Select event signal**
   - Input: `a_sled(t)` from preprocessing.
   - Optionally use the magnitude of horizontal components if that improves leg-drive visibility.

2. **Band-pass around leg-drive cadence**
   - Apply a **band-pass filter** tuned to expected leg-drive frequency:
     - Example: 0.5–5 Hz (configurable per workout type).
   - This removes very slow drift and high-frequency noise, leaving the main oscillatory component of each drive.

3. **Envelope / energy estimation (optional but useful)**
   - Compute a short-window **RMS** or `|signal|` + smoothing to get an envelope.
   - Helps keep thresholds stable across different intensities and users.

4. **Peak detection & gating (leg-drive detection)**
   - Run a peak detector on the band-passed signal or its envelope:
     - **Min peak distance**: based on **max expected leg-drive cadence** (e.g. ≥ 0.2–0.3 s).
     - **Min peak height**: adaptive threshold using recent mean/variance.
   - Each accepted peak = one **leg-drive event**.

5. **Per-leg-drive acceleration windows (optional but recommended)**

   For downstream analytics, define a small time window around each detected leg drive, for example:
   - Start: `t_event - preWindow`
   - End: `t_event + postWindow`

   Within this window you can compute:
   - Peak sled acceleration during the drive
   - Impulse-like measures (approximate area under `a_sled`)
   - Any other per-drive metrics you want to chart or summarize.

6. **Post-processing**
   - Merge peaks that are too close to be separate leg drives.
   - Drop isolated peaks that don’t match expected cadence patterns.
   - Optionally compute **cadence** from time between leg-drive events.

**Output**

```ts
type MotionEvent = {
  time: number; // workout-relative time (seconds from 0.000)
  kind: 'leg-drive'; // semantic meaning: one user leg drive
  // optional: indices or timestamps for the analysis window around the drive
};
```

### Leg-Drive History & Analytics

The app should maintain a **history of individual leg drives** so we can analyze and visualize them later. For each detected leg drive, we store at least:

- The **event time** and analysis window (`t_start`, `t_end`).
- Derived kinematics (e.g., **peak sled acceleration**, approximate **impulse** from integrating `a_sled` over the window).
- Any side/segment metadata (e.g., left vs. right leg, if the workout configuration provides that context).

This enables higher-level analytics such as:

- Plotting **per-drive strength / power** over the workout.
- Detecting **asymmetry** between legs or between early vs. late drives.
- Identifying **fatigue patterns** or changes in drive quality over time.

### Sled Push Sessions & Storage

- The app tracks **one sled push (rep) at a time**, started when the user presses a **Start** button in the UI.
- The sled push ends when the user presses a **Stop** button in the UI.
- When a push ends, the full rep (including sensor streams, derived velocity, and leg-drive events) must be **persisted to disk**.
- Reps are stored under `<app root>/workout/sessions/` as files that can be exported as **CSV**, **JSON**, or **tidy-formatted Parquet**.
- A SQLite database under `<app root>/workout/` tracks **metadata for all persisted workouts/reps** (IDs, labels, timestamps, etc.) so the app can list and load them.
- Tidy data guidelines (for Parquet/CSV): one row per observation with explicit columns such as `rep_id`, `time`, `channel`, `metric`, `value`, and any grouping keys (e.g. `leg_drive_id`).
- The user can select a **previously recorded rep/workout** from disk; when loaded, the app should feed that data through the **same plotting and analytics flows** as live data (charts and leg-drive views behave as if the data had just been recorded), while the UI clearly indicates that the session is a **replay**, not a live recording.

This makes individual reps easy to:

- Share across tools and environments.
- Re-run through analysis pipelines offline.
- Compare historical reps to new ones using the same UI.
- Aggregate into longer-term views across multiple pushes and workouts.

---

### Interpretation & UI Rules (Reminder)

- All signals come from a **sled-mounted** motion platform.
- Detected **leg drives** are inferred from **sled acceleration patterns**; we are not measuring the user’s limbs directly.
- Velocity, "steps", and leg drives are properties of the **device + sled system responding to the user’s effort**.

**Labeling guidelines:**

- Velocity-related:
  - Use **“Velocity”**, **“Speed”**, or **“Sled speed”**.
  - Make it clear this is from **IMU linear acceleration**, not GPS.

- Leg-drive / cycle related:
  - Use **“Leg drives”**, **“Drive cycles”**, or **“Detected leg drives (sled)”**, or workout-specific names.
  - Avoid generic pedometer-style labels like “Steps walked today”; if you ever map leg drives to human steps, that mapping should be explicitly documented in a higher-level metric, not in the raw event stream.
