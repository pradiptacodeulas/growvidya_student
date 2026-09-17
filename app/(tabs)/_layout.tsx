import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar } from '../../components/AppBar';

export default function TabLayout() {
  const { colors } = useTheme();
  const { unreadMessagesCount } = useApp();
  const insets = useSafeAreaInsets();

  const baseHeight = Platform.OS === 'ios' ? 68 : 68;
  const bottomInsetPadding = Math.max(insets.bottom, 12);
  const totalTabBarHeight = baseHeight + insets.bottom;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.headerBg }} edges={['top', 'left', 'right']}>
      <AppBar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 1,
            elevation: 10,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            height: totalTabBarHeight,
            paddingBottom: bottomInsetPadding,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="assignment"
          options={{
            title: 'Assignment',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="message"
          options={{
            title: 'Message',
            tabBarBadge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '700',
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              lineHeight: 16,
            },
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={26} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
