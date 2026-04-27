import { SplashScreen, Tabs } from 'expo-router';
import React, { useCallback, useEffect } from 'react';

import {
  Feed as FeedIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  Style as StyleIcon,
} from '@/components/ui/icons';

export default function TabLayout() {
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
        }}
      />

      <Tabs.Screen
        name="workout-list"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <FeedIcon color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile-setup"
        options={{
          title: 'Profile Setup',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />

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
