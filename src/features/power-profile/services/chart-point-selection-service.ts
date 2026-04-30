import type { PowerProfileSession } from '@/features/power-profile/types/power-session';
import type { WorkoutEntry } from '@/types/workout-database';

export type ChartPointSelection =
  | 'ppl_test'
  | 'last_7d'
  | 'last_30d'
  | 'all_time';

export type PeakStat = { peakPowerW: number; loadKg: number } | null;

export function getMostRecentPplTestSprintIds(params: {
  athleteId: string;
  sessions: PowerProfileSession[];
}): string[] | null {
  const relevant = params.sessions
    .filter((s) => s.athleteId === params.athleteId)
    .filter((s) => !s.deletedAt)
    .filter((s) => s.testStatus !== 'not_a_test' || s.testMode !== null)
    .sort((a, b) => b.startedAt - a.startedAt);

  const latest = relevant[0] ?? null;
  if (!latest) return null;
  if (!Array.isArray(latest.sprintIds) || latest.sprintIds.length === 0)
    return null;
  return latest.sprintIds;
}

function filterByWindow(entries: WorkoutEntry[], nowMs: number, days: number) {
  const windowMs = days * 24 * 60 * 60 * 1000;
  const cutoff = nowMs - windowMs;
  return entries.filter((e) => e.date.getTime() >= cutoff);
}

export function selectAthleteEntries(params: {
  athleteId: string;
  selection: ChartPointSelection;
  sessions: PowerProfileSession[];
  entries: WorkoutEntry[];
  nowMs: number;
}): WorkoutEntry[] {
  const allEntries = params.entries
    .filter((e) => Boolean(e) && !e.deletedAt)
    .filter((e) => e.metrics?.athleteId === params.athleteId);

  if (params.selection === 'all_time') return allEntries;

  if (params.selection === 'last_7d') {
    return filterByWindow(allEntries, params.nowMs, 7);
  }
  if (params.selection === 'last_30d') {
    return filterByWindow(allEntries, params.nowMs, 30);
  }

  const sprintIds =
    getMostRecentPplTestSprintIds({
      athleteId: params.athleteId,
      sessions: params.sessions,
    }) ?? [];

  const byId = new Map(allEntries.map((e) => [e.id, e]));
  const chosen = sprintIds
    .map((id) => byId.get(id))
    .filter(Boolean) as WorkoutEntry[];
  return chosen.length > 0 ? chosen : allEntries;
}

export function computePeakPowerAndLoad(entries: WorkoutEntry[]): PeakStat {
  let bestPower = -Infinity;
  let bestLoad = 0;
  for (const e of entries) {
    const p = e.metrics?.peakPower;
    const load = e.metrics?.loadKg;
    if (typeof p !== 'number' || !Number.isFinite(p) || p <= 0) continue;
    if (typeof load !== 'number' || !Number.isFinite(load) || load <= 0)
      continue;
    if (p > bestPower) {
      bestPower = p;
      bestLoad = load;
    }
  }
  if (!Number.isFinite(bestPower) || bestPower <= 0) return null;
  return { peakPowerW: bestPower, loadKg: bestLoad };
}
