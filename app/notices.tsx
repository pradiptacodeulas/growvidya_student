import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { SchoolNotice } from "../services/dashboardService";

const stripHtml = (html?: string | null): string => {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export default function NoticesScreen() {
  const { colors } = useTheme();
  const { apiNotices, loadingNotices, fetchNotices } = useApp();
  const { token } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotice, setSelectedNotice] = useState<SchoolNotice | null>(null);

  useEffect(() => {
    if (token) {
      fetchNotices();
    }
  }, [token, fetchNotices]);

  const filteredNotices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return apiNotices;
    return apiNotices.filter((n) => {
      const title = (n.title || "").toLowerCase();
      const body = stripHtml(n.message).toLowerCase();
      return title.includes(q) || body.includes(q);
    });
  }, [apiNotices, searchQuery]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View
        style={[
          styles.headerBar,
          { backgroundColor: colors.headerBg, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notice Board</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Official announcements and circulars
          </Text>
        </View>
        {loadingNotices && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <View style={styles.searchSection}>
        <View
          style={[
            styles.searchInputWrapper,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search notices..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingNotices}
            onRefresh={() => fetchNotices()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loadingNotices && apiNotices.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredNotices.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Ionicons name="megaphone-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Notices Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              No announcements are available right now.
            </Text>
          </View>
        ) : (
          filteredNotices.map((notice, idx) => {
            const cleanBody = stripHtml(notice.message);
            const dateStr = notice.publish_on || notice.notice_date || "";

            return (
              <TouchableOpacity
                key={notice.id || idx}
                style={[
                  styles.card,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
                onPress={() => setSelectedNotice(notice)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="megaphone-outline" size={13} color={colors.primary} />
                    <Text style={[styles.badgeText, { color: colors.primary }]}>NOTICE</Text>
                  </View>
                  {dateStr ? (
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>{dateStr}</Text>
                  ) : null}
                </View>

                <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
                  {notice.title}
                </Text>

                {cleanBody ? (
                  <Text
                    style={[styles.preview, { color: colors.textSecondary }]}
                    numberOfLines={3}
                  >
                    {cleanBody}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {selectedNotice && (
        <Modal
          visible={!!selectedNotice}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedNotice(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    {selectedNotice.title}
                  </Text>
                  {(selectedNotice.publish_on || selectedNotice.notice_date) && (
                    <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                      {selectedNotice.publish_on || selectedNotice.notice_date}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setSelectedNotice(null)}>
                  <Ionicons name="close-circle-outline" size={26} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={[
                  styles.modalBodyBox,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                contentContainerStyle={{ padding: 14 }}
              >
                <Text style={[styles.modalBodyText, { color: colors.textPrimary }]}>
                  {stripHtml(selectedNotice.message)}
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.primary }]}
                onPress={() => setSelectedNotice(null)}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  searchSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13.5, paddingVertical: 0 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  emptyContainer: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 24,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: "center", marginTop: 4 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  dateText: { fontSize: 12 },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  preview: { fontSize: 13.5, lineHeight: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: { borderRadius: 20, borderWidth: 1, padding: 20, maxHeight: "80%" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalSubtitle: { fontSize: 12, marginTop: 3 },
  modalBodyBox: { borderRadius: 12, borderWidth: 1, maxHeight: 360, marginBottom: 16 },
  modalBodyText: { fontSize: 14, lineHeight: 22 },
  closeBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
