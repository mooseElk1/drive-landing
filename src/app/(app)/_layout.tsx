/* eslint-disable max-lines-per-function */
import { SplashScreen, Tabs, useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { Pressable } from 'react-native';

import {
  Edit as EditIcon,
  Feed as FeedIcon,
  Profile as ProfileIcon,
  Settings as SettingsIcon,
} from '@/components/ui/icons';
import { useAthleteProfileStore } from '@/features/power-profile/store/athlete-profile-store';

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
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color }) => <FeedIcon color={color} />,
          headerRight: ({ tintColor }) => (
            <Pressable
              onPress={() => router.push('/profile-setup')}
              hitSlop={10}
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
            >
              <ProfileIcon color={tintColor} />
            </Pressable>
          ),
        }}
      />

      <Tabs.Screen name="session/[id]" options={{ href: null }} />

      <Tabs.Screen name="sprint/[id]" options={{ href: null }} />
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
