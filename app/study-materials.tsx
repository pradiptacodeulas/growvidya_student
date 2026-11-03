import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../services/dashboardService";
import { getFileUrl } from "../services/apiClient";

export default function StudyMaterialsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();

  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const list = await dashboardService.getStudyMaterials();
      setMaterials(Array.isArray(list) ? list : []);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadMaterials();
    }
  }, [token, loadMaterials]);

  const handleOpenFile = (rawPath?: string) => {
    const url = getFileUrl(rawPath);
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Study Materials</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Class notes, handouts and resources
          </Text>
        </View>
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadMaterials}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading && materials.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : materials.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Study Materials Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              No study materials have been uploaded for your class yet.
            </Text>
          </View>
        ) : (
          materials.map((item, idx) => {
            const filePath = item.file_url || item.attachment || item.file_path || item.document;
            return (
              <View
                key={item.id || idx}
                style={[
                  styles.card,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardTop}>
                  {item.subject_name ? (
                    <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        {item.subject_name}
                      </Text>
                    </View>
                  ) : null}
                  {item.created_at ? (
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>
                      {String(item.created_at).slice(0, 10)}
                    </Text>
                  ) : null}
                </View>

                <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>

                {item.description ? (
                  <Text style={[styles.desc, { color: colors.textSecondary }]}>
                    {item.description}
                  </Text>
                ) : null}

                {filePath ? (
                  <TouchableOpacity
                    style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleOpenFile(filePath)}
                  >
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.downloadBtnText}>Open Attachment</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
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
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11.5, fontWeight: "700" },
  dateText: { fontSize: 12 },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  desc: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 8,
  },
  downloadBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
