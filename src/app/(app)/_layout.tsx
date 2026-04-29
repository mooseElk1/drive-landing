/* eslint-disable max-lines-per-function */
import { SplashScreen, Tabs, useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { Pressable } from 'react-native';

import { HeaderBackButton } from '@/components/ui/header-back-button';
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
export default function TabLayout() {
  const router = useRouter();
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
            <HeaderBackButton
              onPress={() => router.replace('/workout-list')}
              color={tintColor}
              accessibilityLabel={translate('powerProfile.sessionDetail.back')}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="sprint/[id]"
        options={{
          href: null,
          headerShown: true,
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
