import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './apiClient';
import { router } from 'expo-router';

// Configure foreground notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Configure Android notification channels
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
      sound: 'default',
    });
  }
}

/**
 * Request notification permission, retrieve native Firebase FCM token, and register it with the backend
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    await setupNotificationChannels();

    // 1. Request OS permission for notifications across iOS and Android 13+
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push Notification]: Permission not granted by user');
      return null;
    }

    let token: string | null = null;
    let fbMessaging: any = null;
    let messagingInstance: any = null;

    try {
      fbMessaging = require('@react-native-firebase/messaging');
      if (fbMessaging && typeof fbMessaging.getMessaging === 'function') {
        messagingInstance = fbMessaging.getMessaging();
        if (Platform.OS === 'ios' && typeof fbMessaging.registerDeviceForRemoteMessages === 'function') {
          await fbMessaging.registerDeviceForRemoteMessages(messagingInstance).catch(() => {});
        }
        token = await fbMessaging.getToken(messagingInstance);
        console.log('[FCM Notification] Successfully retrieved Firebase token:', token);
      }
    } catch {
      // In Expo Go or development environment without custom native binary, fall back to Expo push token
      console.log('[Notification]: Native Firebase not linked in this runtime (e.g. Expo Go). Falling back to Expo push token.');
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
        token = tokenData?.data || null;
      } catch {}
    }

    if (!token) return null;

    // Send token to Growvidya server
    const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';
    const deviceName = `${Device.manufacturer || ''} ${Device.modelName || (Platform.OS.toUpperCase() + ' Mobile')}`.trim();

    const regResult = await apiFetch('/notifications/device-token', {
      method: 'POST',
      body: JSON.stringify({
        token,
        device_type: deviceType,
        device_name: deviceName,
      }),
    });

    console.log('[Push Notification] Backend registration response:', regResult);

    if (regResult?.success) {
      await AsyncStorage.setItem('@fcm_push_token', token);

      // Listen for token refresh events if Firebase messaging is active
      if (fbMessaging && messagingInstance && typeof fbMessaging.onTokenRefresh === 'function') {
        fbMessaging.onTokenRefresh(messagingInstance, async (refreshedToken: string) => {
          console.log('[FCM Notification] Token refreshed:', refreshedToken);
          await apiFetch('/notifications/device-token', {
            method: 'POST',
            body: JSON.stringify({
              token: refreshedToken,
              device_type: deviceType,
              device_name: deviceName,
            }),
          }).catch(() => {});
          await AsyncStorage.setItem('@fcm_push_token', refreshedToken);
        });
      }

      return token;
    } else {
      console.warn('[Push Notification] Failed to register token with server:', regResult?.message || regResult?.error);
      return null;
    }
  } catch (err: any) {
    console.error('[registerForPushNotifications Error]:', err?.message || err);
    return null;
  }
}

/**
 * Unregister device push token upon user logout
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem('@fcm_push_token');
    if (token) {
      await apiFetch('/notifications/device-token', {
        method: 'DELETE',
        body: JSON.stringify({ token }),
      }).catch(() => {});
      await AsyncStorage.removeItem('@fcm_push_token');
    }
    try {
      const fbMessaging = require('@react-native-firebase/messaging');
      if (fbMessaging && typeof fbMessaging.getMessaging === 'function') {
        const messagingInstance = fbMessaging.getMessaging();
        await fbMessaging.deleteToken(messagingInstance).catch(() => {});
      }
    } catch {}
  } catch (err: any) {
    console.warn('[unregisterPushToken Error]:', err?.message);
  }
}

/**
 * Handle notification data payload and deep link to the target screen
 */
export function handleNotificationData(data: any): void {
  if (!data) return;

  try {
    // If it's a chat message notification
    if (data.senderId || data.sender_id || data.contactId) {
      const contactId = String(data.senderId || data.sender_id || data.contactId);
      const contactRole = String(data.senderRole || data.sender_role || 'teacher').toLowerCase();
      const contactName = String(data.senderName || data.sender_name || 'Chat');
      router.push({
        pathname: '/chat/[id]',
        params: { id: contactId, role: contactRole, name: contactName },
      });
      return;
    }

    // If it's an assignment notification
    if (data.assignmentId || data.assignment_id) {
      const id = String(data.assignmentId || data.assignment_id);
      router.push({
        pathname: '/assignment-detail',
        params: { id },
      });
      return;
    }

    // Notice or Announcement
    if (data.category === 'notice' || data.noticeId) {
      router.push('/notices' as any);
      return;
    }

    // Default deep link path
    if (data.url && typeof data.url === 'string') {
      router.push(data.url as any);
    }
  } catch (err: any) {
    console.warn('[handleNotificationData Error]:', err?.message);
  }
}

/**
 * Handle notification tap / interaction and deep link to the target screen
 */
export function handleNotificationResponse(response: Notifications.NotificationResponse): void {
  const data: any = response?.notification?.request?.content?.data;
  if (!data) return;
  handleNotificationData(data);
}
