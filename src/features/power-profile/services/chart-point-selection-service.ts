import type { PowerProfileSession } from '@/features/power-profile/types/power-session';

export type ChartPointSelection =
  | 'ppl_test'
  | 'last_7d'
  | 'last_30d'
  | 'all_time';

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
