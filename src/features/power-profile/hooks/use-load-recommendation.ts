import { useCallback } from 'react';

import { useCalculationConfigStore } from '@/store/calculation-config';

import {
  getLoadRecommendation,
  type LoadRecommendation,
} from '../services/load-suggestion-service';
import { useAthleteProfileStore } from '../store/athlete-profile-store';
import { usePowerSessionStore } from '../store/power-session-store';

function extractSuggestedKg(rec: LoadRecommendation): number | null {
  if (rec.kind === 'zone_target') return rec.suggestedKg;
  if (rec.kind === 'training_peak_nudge') return rec.suggestedKg;
  if (rec.kind === 'next_sprint') return rec.suggestedKg;
  if (rec.kind === 'first_sprint_start') return rec.suggestedKg;
  if (rec.kind === 'discovery_start') return rec.loadKg;
  return null;
}

export function useLoadRecommendation(): {
  recommendation: LoadRecommendation | null;
  applyRecommendation: () => void;
} {
  const sessionId = usePowerSessionStore((s) => s.sessionId);
  const sessionMode = usePowerSessionStore((s) => s.sessionMode);
  const targetZone = usePowerSessionStore((s) => s.targetZone);
  const loadSuggestionsEnabled = usePowerSessionStore(
    (s) => s.loadSuggestionsEnabled
  );
  const newHistoricalPeakThisSession = usePowerSessionStore(
    (s) => s.newHistoricalPeakThisSession
  );
  const newHistoricalPeakLoadKg = usePowerSessionStore(
    (s) => s.newHistoricalPeakLoadKg
  );
  const lastSprintPowerW = usePowerSessionStore((s) => s.lastSprintPowerW);
  const secondLastSprintPowerW = usePowerSessionStore(
    (s) => s.secondLastSprintPowerW
  );

  const activeAthleteId = useAthleteProfileStore((s) => s.activeAthleteId);
  const getAthleteById = useAthleteProfileStore((s) => s.getAthleteById);

  const currentLoadKg = useCalculationConfigStore((s) => s.config.mass);
  const updateConfig = useCalculationConfigStore((s) => s.updateConfig);

  const athlete = activeAthleteId ? getAthleteById(activeAthleteId) : null;
  const pplLoadKg = athlete?.currentPPL?.pplLoadKg ?? null;
  const bodyWeightKg = athlete?.bodyWeightKg ?? null;

  const isTestSession =
    sessionMode === 'test' ||
    sessionMode === 'discovery' ||
    sessionMode === 'targeted_retest';

  const recommendation: LoadRecommendation | null =
    sessionId && (isTestSession || loadSuggestionsEnabled)
      ? getLoadRecommendation({
          sessionMode,
          currentLoadKg,
          pplLoadKg,
          bodyWeightKg,
          targetZone,
          lastSprintPowerW,
          secondLastSprintPowerW,
          newHistoricalPeakThisSession,
          newHistoricalPeakLoadKg,
        })
      : null;

  const applyRecommendation = useCallback(() => {
    if (!recommendation) return;
    const kg = extractSuggestedKg(recommendation);
    if (kg !== null && kg > 0) {
      updateConfig({ mass: kg });
    }
  }, [recommendation, updateConfig]);

  return { recommendation, applyRecommendation };
}
