import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import Toast, { ToastConfig, BaseToast, InfoToast } from 'react-native-toast-message';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AppProvider } from '../context/AppContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import GlobalMessageListener from '../components/GlobalMessageListener';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Top-level background message handler for when app is killed or in background
try {
  const fbMessaging = require('@react-native-firebase/messaging');
  if (fbMessaging && typeof fbMessaging.getMessaging === 'function') {
    const messagingInstance = fbMessaging.getMessaging();
    fbMessaging.setBackgroundMessageHandler(messagingInstance, async (remoteMessage: any) => {
      console.log('[FCM Background Message Received]:', remoteMessage?.messageId);
    });
  }
} catch {
  // Graceful fallback for Expo Go or environments without custom native binary
}

const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      text1NumberOfLines={2}
      text2NumberOfLines={4}
      style={{
        borderLeftColor: '#10B981',
        borderRadius: 14,
        height: 'auto',
        minHeight: 56,
        width: '92%',
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
      }}
      contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 2 }}
      text1Style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}
      text2Style={{ fontSize: 12.5, lineHeight: 18, color: '#4B5563', marginTop: 2 }}
    />
  ),
  error: (props) => (
    <BaseToast
      {...props}
      text1NumberOfLines={2}
      text2NumberOfLines={4}
      style={{
        borderLeftColor: '#EF4444',
        borderRadius: 14,
        height: 'auto',
        minHeight: 56,
        width: '92%',
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
      }}
      contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 2 }}
      text1Style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}
      text2Style={{ fontSize: 12.5, lineHeight: 18, color: '#4B5563', marginTop: 2 }}
    />
  ),
  warning: (props) => (
    <BaseToast
      {...props}
      text1NumberOfLines={2}
      text2NumberOfLines={4}
      style={{
        borderLeftColor: '#F59E0B',
        borderRadius: 14,
        height: 'auto',
        minHeight: 56,
        width: '92%',
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
      }}
      contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 2 }}
      text1Style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}
      text2Style={{ fontSize: 12.5, lineHeight: 18, color: '#4B5563', marginTop: 2 }}
    />
  ),
  info: (props) => (
    <InfoToast
      {...props}
      text1NumberOfLines={2}
      text2NumberOfLines={4}
      style={{
        borderLeftColor: '#3B82F6',
        borderRadius: 14,
        height: 'auto',
        minHeight: 56,
        width: '92%',
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
      }}
      contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 2 }}
      text1Style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}
      text2Style={{ fontSize: 12.5, lineHeight: 18, color: '#4B5563', marginTop: 2 }}
    />
  ),
};

function RootLayoutContent() {
  const { colors } = useTheme();
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if user is not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to main tabs if user is authenticated
      router.replace('/(tabs)');
    }

    SplashScreen.hideAsync().catch(() => {});
  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <StatusBar style={colors.statusBarStyle} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="assignment-detail" options={{ headerShown: false }} />
        <Stack.Screen name="syllabus" options={{ headerShown: false }} />
        <Stack.Screen name="holidays" options={{ headerShown: false }} />
        <Stack.Screen name="change-password" options={{ headerShown: false }} />
        <Stack.Screen name="notices" options={{ headerShown: false }} />
        <Stack.Screen name="timetable" options={{ headerShown: false }} />
        <Stack.Screen name="attendance" options={{ headerShown: false }} />
        <Stack.Screen name="exam-results" options={{ headerShown: false }} />
        <Stack.Screen name="study-materials" options={{ headerShown: false }} />
        <Stack.Screen name="transport" options={{ headerShown: false }} />
        <Stack.Screen name="hostel" options={{ headerShown: false }} />
        <Stack.Screen name="activities" options={{ headerShown: false }} />
        <Stack.Screen name="documents" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <GlobalMessageListener />
          <RootLayoutContent />
          <Toast config={toastConfig} />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
