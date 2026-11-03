import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { messageService, Contact } from "../services/messageService";
import { connectSocket, getSocket } from "../services/socket.service";
import * as Notifications from "expo-notifications";
import {
  handleNotificationResponse,
  handleNotificationData,
} from "../services/notification.service";

/**
 * GlobalMessageListener
 * Mounts at the root app level to maintain active real-time socket connection,
 * listen for incoming messages globally, update unread count badges,
 * and display system push notifications when messages arrive (without in-app toast banners).
 */
export default function GlobalMessageListener() {
  const { token } = useAuth();
  const { activeChatKey, fetchUnreadCount, setUnreadMessagesCount } = useApp();

  const activeChatKeyRef = useRef<string | null>(null);
  activeChatKeyRef.current = activeChatKey;

  const contactsRef = useRef<Contact[]>([]);
  const receiveMessageRef = useRef<((msg: any) => void) | null>(null);
  const messagesReadRef = useRef<(() => void) | null>(null);

  // Set of recently notified message IDs to prevent duplicate alerts between Socket and FCM
  const recentNotifiedIdsRef = useRef<Set<string>>(new Set());

  const markMessageNotified = (key: string): boolean => {
    if (!key) return false;
    if (recentNotifiedIdsRef.current.has(key)) return false;
    recentNotifiedIdsRef.current.add(key);
    setTimeout(() => {
      recentNotifiedIdsRef.current.delete(key);
    }, 15000);
    return true;
  };

  // Setup push notification tap response listener (deep link on notification click)
  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );
    return () => {
      responseSub.remove();
    };
  }, []);

  // Setup Firebase Cloud Messaging notification listeners (foreground and tap routing)
  useEffect(() => {
    let unsubscribeForeground = () => {};
    let unsubscribeNotificationOpened = () => {};

    try {
      const fbMessaging = require("@react-native-firebase/messaging");
      if (fbMessaging && typeof fbMessaging.getMessaging === "function") {
        const messagingInstance = fbMessaging.getMessaging();

        // 1. App in foreground: schedule native system push notification (no in-app toast)
        if (typeof fbMessaging.onMessage === "function") {
          unsubscribeForeground = fbMessaging.onMessage(
            messagingInstance,
            async (remoteMessage: any) => {
              const isChat =
                remoteMessage.data?.type === "chat" || Boolean(remoteMessage.data?.senderId);
              const socketConnected = getSocket()?.connected;

              // If socket is connected and this is a chat message, let the socket handler schedule it
              if (isChat && socketConnected) {
                return;
              }

              const msgKey =
                remoteMessage.messageId ||
                (remoteMessage.data?.messageId ? String(remoteMessage.data.messageId) : null);

              if (msgKey && !markMessageNotified(msgKey)) {
                return;
              }

              if (remoteMessage.notification) {
                const title = remoteMessage.notification.title || "Growvidya Alert";
                const body = remoteMessage.notification.body || "";

                await Notifications.scheduleNotificationAsync({
                  content: {
                    title,
                    body,
                    data: remoteMessage.data || {},
                    sound: "default",
                  },
                  trigger: null,
                }).catch(() => {});
              }
            }
          );
        }

        // 2. Notification opened when app was in BACKGROUND
        if (typeof fbMessaging.onNotificationOpenedApp === "function") {
          unsubscribeNotificationOpened = fbMessaging.onNotificationOpenedApp(
            messagingInstance,
            (remoteMessage: any) => {
              if (remoteMessage?.data) {
                handleNotificationData(remoteMessage.data);
              }
            }
          );
        }

        // 3. Notification opened from cold start / KILLED state
        if (typeof fbMessaging.getInitialNotification === "function") {
          fbMessaging
            .getInitialNotification(messagingInstance)
            .then((remoteMessage: any) => {
              if (remoteMessage?.data) {
                handleNotificationData(remoteMessage.data);
              }
            })
            .catch(() => {});
        }
      }
    } catch {
      // Graceful fallback for Expo Go or environments without custom native binary
    }

    return () => {
      unsubscribeForeground();
      unsubscribeNotificationOpened();
    };
  }, []);

  // Load & cache teacher contacts for sender name lookup
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    messageService
      .getContacts()
      .then((res) => {
        if (res.success && Array.isArray(res.data) && isMounted) {
          contactsRef.current = res.data;
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Setup real-time socket and global incoming message handler
  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const setupListener = async () => {
      try {
        const socket = await connectSocket(token);
        if (!socket || !isMounted) return;

        // Fetch initial unread count
        fetchUnreadCount();

        const handleReceiveMessage = (msg: any) => {
          if (!msg) return;

          const senderIdNum = Number(msg.sender);
          const senderRoleNormalized = String(msg.sender_role || "teacher").toLowerCase();
          const msgSenderKey = `${senderRoleNormalized}_${senderIdNum}`;

          const currentOpenChat = activeChatKeyRef.current;

          // If the student is currently inside this chat conversation, do not alert or increment
          if (currentOpenChat && currentOpenChat.toLowerCase() === msgSenderKey) {
            return;
          }

          // Increment unread badge counter
          setUnreadMessagesCount((prev) => prev + 1);

          // Deduplicate notification
          const msgKey = msg.id
            ? `msg_${msg.id}`
            : `${msgSenderKey}_${msg.message || ""}_${Date.now()}`;
          if (!markMessageNotified(msgKey)) {
            return;
          }

          const cachedContact = contactsRef.current.find(
            (c) =>
              Number(c.id) === senderIdNum &&
              (c.role || "teacher").toLowerCase() === senderRoleNormalized
          );

          const senderName =
            cachedContact?.name ||
            msg.sender_name ||
            (msg.sender_role
              ? msg.sender_role.charAt(0).toUpperCase() + msg.sender_role.slice(1)
              : "Teacher");

          const messagePreview =
            msg.message || (msg.file ? "📎 Sent an attachment" : "Sent you a message");

          // Schedule native system push notification in notification bar with sound/vibration
          Notifications.scheduleNotificationAsync({
            content: {
              title: senderName,
              body: messagePreview,
              data: {
                senderId: msg.sender,
                senderRole: senderRoleNormalized,
                senderName,
                message: messagePreview,
              },
              sound: "default",
            },
            trigger: null,
          }).catch(() => {});
        };

        const handleMessagesRead = () => {
          fetchUnreadCount();
        };

        const handleUnreadUpdated = () => {
          fetchUnreadCount();
        };

        // Remove old handlers before re-attaching
        if (receiveMessageRef.current) {
          socket.off("receive_message", receiveMessageRef.current);
        }
        if (messagesReadRef.current) {
          socket.off("messages_read", messagesReadRef.current);
          socket.off("unread_count_updated", messagesReadRef.current);
        }

        receiveMessageRef.current = handleReceiveMessage;
        messagesReadRef.current = handleMessagesRead;

        socket.on("receive_message", handleReceiveMessage);
        socket.on("messages_read", handleMessagesRead);
        socket.on("unread_count_updated", handleUnreadUpdated);
      } catch (err) {
        console.warn("[GlobalMessageListener Error]:", err);
      }
    };

    setupListener();

    // App state listener to ensure active socket connection when foregrounded
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && token) {
        const activeSocket = getSocket();
        if (!activeSocket || !activeSocket.connected) {
          connectSocket(token);
        }
        fetchUnreadCount();
      }
    };

    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      isMounted = false;
      appStateSubscription.remove();
      const socket = getSocket();
      if (socket) {
        if (receiveMessageRef.current) {
          socket.off("receive_message", receiveMessageRef.current);
          receiveMessageRef.current = null;
        }
        if (messagesReadRef.current) {
          socket.off("messages_read", messagesReadRef.current);
          socket.off("unread_count_updated", messagesReadRef.current);
          messagesReadRef.current = null;
        }
      }
    };
  }, [token, fetchUnreadCount, setUnreadMessagesCount]);

  return null;
}
