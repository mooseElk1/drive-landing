/* eslint-disable max-lines-per-function */
import {
  SplashScreen,
  Tabs,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { Pressable, Text } from 'react-native';

import {
  Edit as EditIcon,
  Feed as FeedIcon,
  Home as HomeIcon,
  Profile as ProfileIcon,
  Settings as SettingsIcon,
} from '@/components/ui/icons';
import { useAthleteProfileStore } from '@/features/power-profile/store/athlete-profile-store';
import { translate } from '@/lib/i18n/utils';

const headerIconButtonStyle = { marginRight: 12 } as const;
const headerLeftButtonStyle = { marginLeft: 12 } as const;

export default function TabLayout() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const hasAthlete = useAthleteProfileStore((s) => s.athletes.length > 0);
  const hideSplash = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);
  useEffect(() => {
    setTimeout(() => {
      hideSplash();
    }, 1000);
  }, [hideSplash]);

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
          headerRight: ({ tintColor }) => (
            <Pressable
              onPress={() => router.push('/profile-setup')}
              hitSlop={10}
              style={headerIconButtonStyle}
            >
              <ProfileIcon color={tintColor} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color }) => <FeedIcon color={color} />,
          headerRight: ({ tintColor }) => (
            <Pressable
              onPress={() => router.push('/profile-setup')}
              hitSlop={10}
              style={headerIconButtonStyle}
            >
              <ProfileIcon color={tintColor} />
            </Pressable>
          ),
        }}
      />

      <Tabs.Screen
        name="workout-list"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <FeedIcon color={color} />,
          headerRight: ({ tintColor }) => (
            <Pressable
              onPress={() => router.push('/profile-setup')}
              hitSlop={10}
              style={headerIconButtonStyle}
            >
              <ProfileIcon color={tintColor} />
            </Pressable>
          ),
        }}
      />

      <Tabs.Screen
        name="session/[id]"
        options={{
          href: null,
          headerShown: true,
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={() => router.replace('/workout-list')}
              hitSlop={10}
              style={headerLeftButtonStyle}
            >
              <Text
                style={{ color: tintColor, fontSize: 16, fontWeight: '600' }}
              >
                {translate('powerProfile.sessionDetail.back')}
              </Text>
            </Pressable>
          ),
        }}
      />

      <Tabs.Screen
        name="sprint/[id]"
        options={{
          href: null,
          headerShown: true,
          headerLeft: ({ tintColor }) => {
            const sessionId = Array.isArray(params.sessionId)
              ? params.sessionId[0]
              : params.sessionId;
            const onBack = () => {
              if (sessionId) {
                router.replace({
                  pathname: '/session/[id]',
                  params: { id: sessionId },
                });
                return;
              }
              router.replace('/workout-list');
            };
            return (
              <Pressable
                onPress={onBack}
                hitSlop={10}
                style={headerLeftButtonStyle}
              >
                <Text
                  style={{ color: tintColor, fontSize: 16, fontWeight: '600' }}
                >
                  {translate('powerProfile.sessionDetail.back')}
                </Text>
              </Pressable>
            );
          },
        }}
      />
      <Tabs.Screen
        name="profile-setup"
        options={{
          href: null,
          title: 'Athlete profile',
          headerRight: ({ tintColor }) =>
            hasAthlete ? (
              <Pressable
                onPress={() => router.push('/profile-edit')}
                hitSlop={10}
                style={headerIconButtonStyle}
              >
                <EditIcon color={tintColor} />
              </Pressable>
            ) : null,
        }}
      />
      <Tabs.Screen
        name="profile-edit"
        options={{ href: null, title: 'Edit' }}
      />
      <Tabs.Screen name="style" options={{ href: null }} />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: false,
          tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
