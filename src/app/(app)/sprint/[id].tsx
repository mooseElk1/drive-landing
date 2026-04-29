import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { HeaderBackButton } from '@/components/ui/header-back-button';
import { SprintDetailScreen } from '@/features/power-profile/screens/sprint-detail.screen';
import { translate } from '@/lib/i18n/utils';

export default function Route() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    sessionId?: string;
    from?: string;
    historyMode?: string;
  }>();
  const sessionId = params.sessionId;
  const fromHistory = params.from === 'history';

  const onBack = () => {
    if (sessionId) {
      router.replace({ pathname: '/session/[id]', params: { id: sessionId } });
      return;
    }
    if (fromHistory) {
      router.replace({
        pathname: '/workout-list',
        params: {
          historyMode:
            params.historyMode === 'sessions' ? 'sessions' : 'sprints',
        },
      });
      return;
    }
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: ({ tintColor }) => (
            <HeaderBackButton
              onPress={onBack}
              color={tintColor}
              accessibilityLabel={translate('powerProfile.sessionDetail.back')}
            />
          ),
        }}
      />
      <SprintDetailScreen />
    </>
  );
}
