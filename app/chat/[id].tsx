import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { messageService, ChatMessage } from "../../services/messageService";
import { getAvatarUrl } from "../../services/apiClient";
import {
  connectSocket,
  emitSendMessage,
  emitTyping,
  emitStopTyping,
  emitMarkRead,
} from "../../services/socket.service";

export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();
  const { setActiveChatKey, fetchUnreadCount } = useApp();

  const params = useLocalSearchParams<{
    id: string;
    role?: string;
    name?: string;
    picture?: string;
    code?: string;
    className?: string;
    sectionName?: string;
  }>();

  const contactId = Number(params.id);
  const contactRole = (params.role || "teacher").toLowerCase();
  const contactName = params.name || "Teacher";
  const contactPicture = params.picture || "";
  const contactCode = params.code || "";
  const contactClass = params.className
    ? `Class ${params.className}${params.sectionName ? ` - ${params.sectionName}` : ""}`
    : "Faculty";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isContactTyping, setIsContactTyping] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<any>(null);

  const fetchConversation = useCallback(
    async (silent = false) => {
      if (!contactId || !contactRole) return;
      if (!silent) setLoading(true);

      try {
        const res = await messageService.getConversation(contactRole, contactId);
        if (res.success) {
          setMessages(res.messages);
          if (res.contact) {
            setIsOnline(!!res.contact.is_online);
          }

          // Mark messages as read
          messageService.markAsRead(contactId, contactRole);
          emitMarkRead(contactId, contactRole);
          fetchUnreadCount();
        }
      } catch (err) {
        console.warn("Failed to fetch conversation:", err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [contactId, contactRole, fetchUnreadCount]
  );

  // Set active chat key to prevent unread badge from incrementing while in this chat
  useEffect(() => {
    setActiveChatKey(`${contactRole}_${contactId}`);
    return () => {
      setActiveChatKey(null);
    };
  }, [contactId, contactRole, setActiveChatKey]);

  // Initial fetch
  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  // Setup real-time Socket.IO listeners
  useEffect(() => {
    if (!token) return;
    let activeSocket: any = null;
    let cleanup: (() => void) | null = null;

    const setupChatSocket = async () => {
      activeSocket = await connectSocket(token);
      if (!activeSocket) return;

      const handleReceive = (newMsg: any) => {
        const senderId = Number(newMsg.sender);
        const senderRole = (newMsg.sender_role || "").toLowerCase();

        if (senderId === contactId && senderRole === contactRole) {
          setMessages((prev) => {
            if (prev.some((m) => String(m.id) === String(newMsg.id))) return prev;
            return [...prev, newMsg];
          });

          // Mark as read immediately
          emitMarkRead(contactId, contactRole);
          messageService.markAsRead(contactId, contactRole);
          fetchUnreadCount();

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      };

      const handleUserTyping = (data: any) => {
        const sid = Number(data?.senderId);
        const srole = (data?.senderRole || "").toLowerCase();
        if (sid === contactId && srole === contactRole) {
          setIsContactTyping(true);
        }
      };

      const handleUserStopTyping = (data: any) => {
        const sid = Number(data?.senderId);
        const srole = (data?.senderRole || "").toLowerCase();
        if (sid === contactId && srole === contactRole) {
          setIsContactTyping(false);
        }
      };

      const handleMessagesRead = (data: any) => {
        const readerId = Number(data?.readerId);
        const readerRole = (data?.readerRole || "").toLowerCase();
        if (readerId === contactId && readerRole === contactRole) {
          setMessages((prev) => prev.map((m) => ({ ...m, seen: 1 })));
        }
      };

      const handleOnlineList = (onlineKeys: string[]) => {
        if (!Array.isArray(onlineKeys)) return;
        const key = `${contactRole}_${contactId}`;
        setIsOnline(onlineKeys.includes(key));
      };

      const handleUserOnline = (data: any) => {
        if (Number(data?.userId) === contactId && (data?.role || "").toLowerCase() === contactRole) {
          setIsOnline(true);
        }
      };

      const handleUserOffline = (data: any) => {
        if (Number(data?.userId) === contactId && (data?.role || "").toLowerCase() === contactRole) {
          setIsOnline(false);
        }
      };

      const handleMessageDeleted = (data: any) => {
        if (data?.messageId) {
          setMessages((prev) =>
            prev.map((m) =>
              String(m.id) === String(data.messageId)
                ? { ...m, message: "This message was deleted", file: null, file_type: null, status: 0 }
                : m
            )
          );
        }
      };

      activeSocket.on("receive_message", handleReceive);
      activeSocket.on("user_typing", handleUserTyping);
      activeSocket.on("user_stop_typing", handleUserStopTyping);
      activeSocket.on("messages_read", handleMessagesRead);
      activeSocket.on("online_users_list", handleOnlineList);
      activeSocket.on("user_online", handleUserOnline);
      activeSocket.on("user_offline", handleUserOffline);
      activeSocket.on("message_deleted", handleMessageDeleted);

      cleanup = () => {
        activeSocket.off("receive_message", handleReceive);
        activeSocket.off("user_typing", handleUserTyping);
        activeSocket.off("user_stop_typing", handleUserStopTyping);
        activeSocket.off("messages_read", handleMessagesRead);
        activeSocket.off("online_users_list", handleOnlineList);
        activeSocket.off("user_online", handleUserOnline);
        activeSocket.off("user_offline", handleUserOffline);
        activeSocket.off("message_deleted", handleMessageDeleted);
      };
    };

    setupChatSocket();

    return () => {
      if (cleanup) cleanup();
    };
  }, [token, contactId, contactRole, fetchUnreadCount]);

  // Handle typing input
  const handleInputChange = (text: string) => {
    setInputText(text);

    emitTyping(contactId, contactRole);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      emitStopTyping(contactId, contactRole);
    }, 2000);
  };

  // Send message
  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    emitStopTyping(contactId, contactRole);
    setInputText("");
    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const studentId = Number(user?.id || 0);

    const optimisticMessage: ChatMessage = {
      id: tempId,
      sender: studentId,
      sender_role: "student",
      reciver: contactId,
      receiver_role: contactRole,
      message: trimmed,
      time: new Date().toISOString(),
      seen: 0,
      sending: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // Try sending over Socket.IO first
    emitSendMessage(
      {
        receiverId: contactId,
        receiverRole: contactRole,
        message: trimmed,
      },
      (res: any) => {
        if (res?.success && res.data) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...res.data, sending: false } : m))
          );
          setSending(false);
        } else {
          // Fallback to REST API
          messageService
            .sendMessage({
              receiverId: contactId,
              receiverRole: contactRole,
              message: trimmed,
            })
            .then((restRes) => {
              if (restRes.success && restRes.data) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === tempId ? { ...restRes.data!, sending: false } : m))
                );
              } else {
                setMessages((prev) => prev.filter((m) => m.id !== tempId));
              }
            })
            .catch(() => {
              setMessages((prev) => prev.filter((m) => m.id !== tempId));
            })
            .finally(() => {
              setSending(false);
            });
        }
      }
    );
  };

  const formatBubbleTime = (timeStr?: string) => {
    if (!timeStr) return "";
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const avatarUrl = getAvatarUrl(contactPicture, "male");

  const handleLongPressMessage = (item: ChatMessage) => {
    if (!item.id || item.sending || Number(item.status) === 0) return;
    const isOutgoing =
      item.sender_role === "student" || Number(item.sender) === Number(user?.id || 0);
    if (!isOutgoing) return;

    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message for everyone?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const msgId = item.id;
            setMessages((prev) =>
              prev.map((m) =>
                String(m.id) === String(msgId)
                  ? { ...m, message: "This message was deleted", file: null, file_type: null, status: 0 }
                  : m
              )
            );
            try {
              await messageService.deleteMessage(msgId);
            } catch (err: any) {
              console.warn("Failed to delete message:", err?.message);
              Alert.alert("Error", err?.message || "Failed to delete message");
              fetchConversation(true);
            }
          },
        },
      ]
    );
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isOutgoing =
      item.sender_role === "student" || Number(item.sender) === Number(user?.id || 0);
    const isDeleted = Number(item.status) === 0;

    return (
      <View
        style={[
          styles.messageRow,
          isOutgoing ? styles.outgoingRow : styles.incomingRow,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={isDeleted ? undefined : () => handleLongPressMessage(item)}
          delayLongPress={300}
          style={[
            styles.bubble,
            isDeleted
              ? [
                  styles.incomingBubble,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : "#F1F5F9",
                    borderColor: colors.border,
                    borderStyle: "dashed" as const,
                  },
                ]
              : isOutgoing
              ? [styles.outgoingBubble, { backgroundColor: colors.primary }]
              : [
                  styles.incomingBubble,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : "#F1F5F9",
                    borderColor: colors.border,
                  },
                ],
          ]}
        >
          {isDeleted ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="ban-outline" size={13} color={colors.textMuted} />
              <Text
                style={[
                  styles.messageText,
                  {
                    color: colors.textMuted,
                    fontStyle: "italic",
                  },
                ]}
              >
                {item.message || "This message was deleted"}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.messageText,
                { color: isOutgoing ? "#FFFFFF" : colors.textPrimary },
              ]}
            >
              {item.message}
            </Text>
          )}

          <View style={styles.bubbleFooter}>
            <Text
              style={[
                styles.bubbleTime,
                {
                  color: isDeleted
                    ? colors.textMuted
                    : isOutgoing
                    ? "rgba(255, 255, 255, 0.75)"
                    : colors.textMuted,
                },
              ]}
            >
              {formatBubbleTime(item.time || item.created_at)}
            </Text>

            {!isDeleted && isOutgoing && (
              <View style={styles.checkIconWrapper}>
                {item.sending ? (
                  <Ionicons name="time-outline" size={12} color="rgba(255, 255, 255, 0.75)" />
                ) : item.seen === 1 ? (
                  <Ionicons name="checkmark-done" size={14} color="#67E8F9" />
                ) : (
                  <Ionicons name="checkmark" size={13} color="rgba(255, 255, 255, 0.75)" />
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerAvatarContainer}>
          <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
          {isOnline && <View style={styles.headerOnlineBadge} />}
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {contactName}
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: isContactTyping ? colors.primary : colors.textMuted },
            ]}
          >
            {isContactTyping
              ? "Typing..."
              : isOnline
              ? "Online"
              : `${contactClass}${contactCode ? ` (${contactCode})` : ""}`}
          </Text>
        </View>
      </View>

      {/* Main Chat Message List */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading conversation...
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesListContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubble-ellipses-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyChatTitle, { color: colors.textPrimary }]}>
                No messages yet
              </Text>
              <Text style={[styles.emptyChatSubtitle, { color: colors.textMuted }]}>
                Say hello to {contactName}! Ask your doubts or discuss assignments directly.
              </Text>
            </View>
          }
        />
      )}

      {/* Bottom Input Area */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          placeholder={`Message ${contactName}...`}
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={handleInputChange}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim().length > 0 ? colors.primary : colors.surfaceSubtle,
            },
          ]}
          onPress={handleSendMessage}
          disabled={inputText.trim().length === 0 || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim().length > 0 ? "#FFFFFF" : colors.textMuted}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 6,
    padding: 4,
  },
  headerAvatarContainer: {
    position: "relative",
    marginRight: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#CBD5E1",
  },
  headerOnlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  messagesListContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: "row",
    maxWidth: "82%",
  },
  outgoingRow: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  incomingRow: {
    alignSelf: "flex-start",
    justifyContent: "flex-start",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  outgoingBubble: {
    borderBottomRightRadius: 4,
  },
  incomingBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 4,
  },
  bubbleTime: {
    fontSize: 10,
  },
  checkIconWrapper: {
    marginLeft: 2,
  },
  emptyChat: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    marginTop: 80,
  },
  emptyChatTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
  },
  emptyChatSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 1,
  },
});
