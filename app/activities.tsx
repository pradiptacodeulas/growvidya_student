import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../services/dashboardService";

export default function ActivitiesScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();

  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const list = await dashboardService.getActivities();
      setActivities(Array.isArray(list) ? list : []);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadActivities();
    }
  }, [token, loadActivities]);

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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Activities</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Co-curricular, sports and club participation
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
            onRefresh={loadActivities}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading && activities.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : activities.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Activities Recorded
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              No co-curricular or extracurricular activities have been logged yet.
            </Text>
          </View>
        ) : (
          activities.map((act, idx) => {
            const rawDate = act.date || act.activity_date || act.created_at;
            const dateStr = rawDate ? String(rawDate).slice(0, 10) : "";
            const category = act.activity_name || act.name || "";
            const title = act.title || "";
            const details =
              act.activity_description ||
              act.description ||
              act.remarks ||
              act.details ||
              "";

            return (
              <View
                key={act.id || idx}
                style={[
                  styles.card,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="trophy-outline" size={13} color={colors.primary} />
                    <Text style={[styles.badgeText, { color: colors.primary }]}>
                      {category || `Activity #${idx + 1}`}
                    </Text>
                  </View>
                  {dateStr ? (
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>{dateStr}</Text>
                  ) : null}
                </View>

                {title ? (
                  <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                ) : null}

                {details ? (
                  <Text style={[styles.desc, { color: colors.textPrimary }]}>{details}</Text>
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11.5, fontWeight: "700" },
  dateText: { fontSize: 12 },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  desc: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
});
