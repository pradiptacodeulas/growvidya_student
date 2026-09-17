import React, { useState, useEffect } from "react";
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
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { AssignmentItem } from "../../services/assignmentService";

type FilterType = "all" | "pending" | "attempted" | "expired";

export default function AssignmentScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { apiAssignments, loadingAssignments, fetchAssignments } = useApp();
  const { token } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  useEffect(() => {
    if (token) {
      fetchAssignments();
    }
  }, [token, fetchAssignments]);

  const filteredAssignments = apiAssignments.filter((item) => {
    const isAttempted = item.status === "Attempted" || item.attempt_id != null;
    const isExpired = item.status === "Expired" || item.is_expired;

    if (activeFilter === "all") return true;
    if (activeFilter === "attempted") return isAttempted;
    if (activeFilter === "pending") return !isAttempted && !isExpired;
    if (activeFilter === "expired") return isExpired;
    return true;
  });

  const handleOpenDetail = (item: AssignmentItem) => {
    router.push({
      pathname: "/assignment-detail",
      params: {
        id: String(item.id),
        title: item.title,
        subject: item.subject_name,
        status: item.status,
        score: item.score_percentage != null ? String(item.score_percentage) : "",
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Assignments & Homework</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Track your active tasks, quiz attempts and scores
            </Text>
          </View>
          {loadingAssignments && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(["all", "pending", "attempted", "expired"] as FilterType[]).map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.surfaceSubtle,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isActive ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Assignment List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingAssignments}
            onRefresh={() => fetchAssignments()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {filteredAssignments.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Assignments Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {`There are no assignments matching the "${activeFilter}" filter.`}
            </Text>
          </View>
        ) : (
          filteredAssignments.map((item) => {
            const hasAttempted = item.status === "Attempted" || item.attempt_id != null;
            const isExpired = item.status === "Expired" || item.is_expired;
            const scorePercent = item.score_percentage;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                onPress={() => handleOpenDetail(item)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.typeBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.typeText, { color: colors.primary }]}>
                      {item.type_name || item.assignment_type || "Homework"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: hasAttempted
                          ? isDark ? "#064E3B" : "#ECFDF5"
                          : isExpired
                          ? isDark ? "#7F1D1D" : "#FEE2E2"
                          : isDark ? "#78350F" : "#FEF3C7",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        hasAttempted
                          ? "checkmark-circle"
                          : isExpired
                          ? "alert-circle"
                          : "time-outline"
                      }
                      size={14}
                      color={
                        hasAttempted
                          ? "#10B981"
                          : isExpired
                          ? "#EF4444"
                          : "#F59E0B"
                      }
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: hasAttempted
                            ? "#10B981"
                            : isExpired
                            ? "#EF4444"
                            : "#F59E0B",
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* Title and Subject */}
                <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.subject, { color: colors.primary }]}>
                  {item.subject_name || "General"}
                </Text>

                {/* Details Footer */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <View style={styles.footerItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                    <Text style={[styles.footerText, { color: colors.textMuted }]}>
                      Due: {item.due_date || "No deadline"}
                    </Text>
                  </View>

                  {hasAttempted && scorePercent != null ? (
                    <View style={[styles.scoreBadge, { backgroundColor: "#10B98120" }]}>
                      <Ionicons name="trophy-outline" size={13} color="#10B981" />
                      <Text style={styles.scoreText}>Score: {Math.round(Number(scorePercent))}%</Text>
                    </View>
                  ) : (
                    <View style={styles.actionPrompt}>
                      <Text style={[styles.actionText, { color: colors.primary }]}>
                        {hasAttempted ? "View Result" : "Start Task"}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  subject: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  scoreText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
  },
  actionPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 40,
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
