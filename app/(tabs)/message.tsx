import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { messageService, Contact } from "../../services/messageService";
import { getAvatarUrl } from "../../services/apiClient";
import { connectSocket } from "../../services/socket.service";

export default function MessageScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { token } = useAuth();
  const { fetchUnreadCount } = useApp();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "UNREAD">("ALL");

  const loadContacts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await messageService.getContacts();
      if (res.success && Array.isArray(res.data)) {
        setContacts(res.data);
      }
    } catch (err) {
      console.warn("Failed to load contacts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContacts(true);
      fetchUnreadCount();
    }, [loadContacts, fetchUnreadCount])
  );

  useEffect(() => {
    loadContacts();
    fetchUnreadCount();
  }, [loadContacts, fetchUnreadCount]);

  // Real-time socket event handlers for live contact list updates
  useEffect(() => {
    if (!token) return;
    let activeSocket: any = null;
    let cleanup: (() => void) | null = null;

    const setupSocket = async () => {
      activeSocket = await connectSocket(token);
      if (!activeSocket) return;

      const handleReceive = (newMsg: any) => {
        const senderId = Number(newMsg.sender);
        const senderRole = (newMsg.sender_role || "teacher").toLowerCase();

        setContacts((prev) => {
          const idx = prev.findIndex(
            (c) => Number(c.id) === senderId && (c.role || "teacher").toLowerCase() === senderRole
          );
          if (idx >= 0) {
            const copy = [...prev];
            const found = copy[idx];
            const updated: Contact = {
              ...found,
              last_message: newMsg.message || (newMsg.file ? "Sent an attachment" : ""),
              last_message_time: newMsg.time || new Date().toISOString(),
              unread_count: (found.unread_count || found.unread || 0) + 1,
            };
            copy.splice(idx, 1);
            return [updated, ...copy];
          } else {
            loadContacts(true);
            return prev;
          }
        });

        fetchUnreadCount();
      };

      const handleOnlineList = (onlineKeys: string[]) => {
        if (!Array.isArray(onlineKeys)) return;
        setContacts((prev) =>
          prev.map((c) => {
            const role = (c.role || "teacher").toLowerCase();
            const key = `${role}_${c.id}`;
            return { ...c, is_online: onlineKeys.includes(key) };
          })
        );
      };

      const handleUserOnline = (data: any) => {
        if (!data?.userId) return;
        const uid = Number(data.userId);
        const urole = (data.role || "").toLowerCase();
        setContacts((prev) =>
          prev.map((c) =>
            Number(c.id) === uid && (c.role || "").toLowerCase() === urole
              ? { ...c, is_online: true }
              : c
          )
        );
      };

      const handleUserOffline = (data: any) => {
        if (!data?.userId) return;
        const uid = Number(data.userId);
        const urole = (data.role || "").toLowerCase();
        setContacts((prev) =>
          prev.map((c) =>
            Number(c.id) === uid && (c.role || "").toLowerCase() === urole
              ? { ...c, is_online: false }
              : c
          )
        );
      };

      const handleMessagesRead = (data: any) => {
        if (data?.readerId) {
          const readerId = Number(data.readerId);
          const readerRole = (data.readerRole || "").toLowerCase();
          setContacts((prev) =>
            prev.map((c) =>
              Number(c.id) === readerId && (c.role || "").toLowerCase() === readerRole
                ? { ...c, unread_count: 0, last_message_seen: 1 }
                : c
            )
          );
        }
        fetchUnreadCount();
      };

      activeSocket.on("receive_message", handleReceive);
      activeSocket.on("online_users_list", handleOnlineList);
      activeSocket.on("user_online", handleUserOnline);
      activeSocket.on("user_offline", handleUserOffline);
      activeSocket.on("messages_read", handleMessagesRead);

      cleanup = () => {
        activeSocket.off("receive_message", handleReceive);
        activeSocket.off("online_users_list", handleOnlineList);
        activeSocket.off("user_online", handleUserOnline);
        activeSocket.off("user_offline", handleUserOffline);
        activeSocket.off("messages_read", handleMessagesRead);
      };
    };

    setupSocket();

    return () => {
      if (cleanup) cleanup();
    };
  }, [token, loadContacts, fetchUnreadCount]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.class_name && c.class_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.includes(searchQuery));

      if (!matchesSearch) return false;

      if (filterMode === "UNREAD") {
        return (c.unread_count || c.unread || 0) > 0;
      }
      return true;
    });
  }, [contacts, searchQuery, filterMode]);

  const handleOpenChat = (contact: Contact) => {
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: String(contact.id),
        role: contact.role || "teacher",
        name: contact.name,
        picture: contact.picture || "",
        code: contact.code || "",
        className: contact.class_name || "",
        sectionName: contact.section_name || "",
      },
    });
  };

  const formatMessageTime = (timeStr?: string | null) => {
    if (!timeStr) return "";
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;

      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isToday) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

      if (isYesterday) return "Yesterday";

      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return timeStr;
    }
  };

  const renderContactCard = ({ item }: { item: Contact }) => {
    const avatarUrl = getAvatarUrl(item.picture, "male");
    const unread = item.unread_count || item.unread || 0;
    const designation = item.class_name
      ? `Class ${item.class_name}${item.section_name ? ` - ${item.section_name}` : ""} Faculty`
      : item.designation || "Faculty Member";

    return (
      <TouchableOpacity
        style={[
          styles.contactCard,
          {
            backgroundColor: colors.cardBg,
            borderColor: unread > 0 ? colors.primaryLight : colors.border,
            borderWidth: unread > 0 ? 1.5 : 1,
          },
        ]}
        onPress={() => handleOpenChat(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          {item.is_online ? (
            <View style={styles.onlineBadge} />
          ) : (
            <View style={[styles.offlineBadge, { borderColor: colors.cardBg }]} />
          )}
        </View>

        <View style={styles.contactDetails}>
          <View style={styles.topRow}>
            <Text
              style={[
                styles.contactName,
                { color: colors.textPrimary, fontWeight: unread > 0 ? "700" : "600" },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={[styles.timeText, { color: unread > 0 ? colors.primary : colors.textMuted }]}>
              {formatMessageTime(item.last_message_time)}
            </Text>
          </View>

          <View style={styles.middleRow}>
            <Text style={[styles.designationText, { color: colors.primary }]} numberOfLines={1}>
              {designation}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.lastMessageText,
                {
                  color: unread > 0 ? colors.textPrimary : colors.textSecondary,
                  fontWeight: unread > 0 ? "600" : "400",
                },
              ]}
              numberOfLines={1}
            >
              {item.last_message || "Tap to start conversation..."}
            </Text>

            {unread > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadBadgeText}>{unread > 99 ? "99+" : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Teacher Messages</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Direct communication with your subject teachers
            </Text>
          </View>
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search teachers by name or subject..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: filterMode === "ALL" ? colors.primary : colors.surfaceSubtle,
                borderColor: filterMode === "ALL" ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFilterMode("ALL")}
          >
            <Text style={[styles.filterChipText, { color: filterMode === "ALL" ? "#FFFFFF" : colors.textSecondary }]}>
              All Teachers ({contacts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: filterMode === "UNREAD" ? colors.primary : colors.surfaceSubtle,
                borderColor: filterMode === "UNREAD" ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFilterMode("UNREAD")}
          >
            <Text style={[styles.filterChipText, { color: filterMode === "UNREAD" ? "#FFFFFF" : colors.textSecondary }]}>
              Unread
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contacts List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => `${item.role}_${item.id}`}
        renderItem={renderContactCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadContacts(true);
              fetchUnreadCount();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Conversations Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery
                  ? `No faculty matching "${searchQuery}".`
                  : filterMode === "UNREAD"
                  ? "You have no unread messages from your teachers."
                  : "Your teachers will appear here once assigned to your class."}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  contactCard: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E2E8F0",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  offlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#94A3B8",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  contactDetails: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  contactName: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  middleRow: {
    marginBottom: 4,
  },
  designationText: {
    fontSize: 11,
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessageText: {
    fontSize: 13,
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
});
