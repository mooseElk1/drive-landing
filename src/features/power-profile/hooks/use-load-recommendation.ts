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
  if (rec.kind === 'next_sprint') return rec.suggestedKg;
  if (rec.kind === 'first_sprint_start') return rec.suggestedKg;
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

  const recommendation: LoadRecommendation | null =
    sessionId && loadSuggestionsEnabled
      ? getLoadRecommendation({
          sessionMode,
          currentLoadKg,
          pplLoadKg,
          targetZone,
          lastSprintPowerW,
          secondLastSprintPowerW,
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
