import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { ArrowRight } from '@/components/ui/icons';
import { SprintDetailScreen } from '@/features/power-profile/screens/sprint-detail.screen';
import { translate } from '@/lib/i18n/utils';

export default function Route() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; sessionId?: string }>();
  const sessionId = params.sessionId;

  const onBack = () => {
    if (sessionId) {
      router.replace({ pathname: '/session/[id]', params: { id: sessionId } });
      return;
    }
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: ({ tintColor }) => (
            <Pressable onPress={onBack} hitSlop={10}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <ArrowRight
                  color={tintColor}
                  style={{ transform: [{ scaleX: -1 }] }}
                />
                <Text
                  style={{ color: tintColor, fontSize: 16, fontWeight: '600' }}
                >
                  {translate('powerProfile.sessionDetail.back')}
                </Text>
              </View>
            </Pressable>
          ),
        }}
      />
      <SprintDetailScreen />
    </>
  );
}
