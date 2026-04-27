/* eslint-disable max-lines-per-function */
import { SplashScreen, Tabs, useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { Pressable } from 'react-native';

import {
  Feed as FeedIcon,
  Profile as ProfileIcon,
  Settings as SettingsIcon,
  Style as StyleIcon,
} from '@/components/ui/icons';

export default function TabLayout() {
  const router = useRouter();
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
      <Tabs.Screen name="profile-setup" options={{ href: null }} />

      <Tabs.Screen
        name="style"
        options={{
          title: 'Style',
          headerShown: false,
          tabBarIcon: ({ color }) => <StyleIcon color={color} />,
        }}
      />
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
