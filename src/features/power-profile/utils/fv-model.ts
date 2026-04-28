export type FvModel = {
  pplLoadKg: number;
  peakPowerW: number;
  v0: number;
  loadMax: number;
  slope: number;
  vAtLoad: (loadKg: number) => number;
  powerAtLoad: (loadKg: number) => number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function buildFvModel(
  pplLoadKg: number,
  peakPowerW: number
): FvModel | null {
  if (!Number.isFinite(pplLoadKg) || pplLoadKg <= 0) return null;
  if (!Number.isFinite(peakPowerW) || peakPowerW <= 0) return null;

  // Peak power identity: Pmax = (F0 * v0) / 4.
  // With load as a proxy for force: F0 ≈ loadMax, and Pmax occurs at load = loadMax/2 = PPL.
  // => loadMax = 2 * PPL and v0 = 2 * Pmax / PPL.
  const loadMax = 2 * pplLoadKg;
  const v0 = (2 * peakPowerW) / pplLoadKg;
  const slope = -v0 / loadMax;

  const vAtLoad = (loadKg: number) => v0 * (1 - loadKg / loadMax);
  const powerAtLoad = (loadKg: number) => loadKg * vAtLoad(loadKg);

  return {
    pplLoadKg,
    peakPowerW,
    v0,
    loadMax,
    slope,
    vAtLoad,
    powerAtLoad,
  };
}

export function buildSvgVDecPath(params: {
  model: FvModel;
  xScale: (x: number) => number;
  yVelScale: (v: number) => number;
  xMax: number;
}): string {
  const { model, xScale, yVelScale, xMax } = params;
  const x0 = 0;
  const x1 = clamp(xMax, 0, model.loadMax);
  const d0 = `M ${xScale(x0)} ${yVelScale(model.vAtLoad(x0))}`;
  const d1 = `L ${xScale(x1)} ${yVelScale(model.vAtLoad(x1))}`;
  return `${d0} ${d1}`;
}

export function buildSvgPowerPath(params: {
  model: FvModel;
  xScale: (x: number) => number;
  yPowerScale: (p: number) => number;
  xMax: number;
  samples?: number;
}): string {
  const { model, xScale, yPowerScale, xMax, samples = 60 } = params;
  const xEnd = clamp(xMax, 0, model.loadMax);
  const n = Math.max(8, samples);

  let d = '';
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = xEnd * t;
    const p = model.powerAtLoad(x);
    const cmd = i === 0 ? 'M' : 'L';
    d += `${cmd} ${xScale(x)} ${yPowerScale(p)} `;
  }
  return d.trim();
}
