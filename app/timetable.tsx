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

interface RoutinePeriod {
  id?: number | string;
  day?: number | string;
  day_id?: number | string;
  day_name?: string;
  class_name?: string;
  section_name?: string;
  period?: string;
  period_name?: string;
  start_time?: string;
  end_time?: string;
  subject_name?: string;
  teacher_name?: string;
  room?: string;
}

interface DayItem {
  id: number | string;
  day_name: string;
}

const formatTimeStr = (timeStr?: string) => {
  if (!timeStr) return "";
  const [hoursStr, minutesStr] = String(timeStr).split(":");
  const hours = parseInt(hoursStr, 10);
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const padHours = displayHours < 10 ? `0${displayHours}` : displayHours;
  return `${padHours}:${minutesStr || "00"} ${ampm}`;
};

const formatPeriodTime = (startTime?: string, endTime?: string) => {
  const start = formatTimeStr(startTime);
  const end = formatTimeStr(endTime);
  if (start && end) return `${start} - ${end}`;
  return start || end || "";
};

export default function TimetableScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();

  const [routines, setRoutines] = useState<RoutinePeriod[]>([]);
  const [days, setDays] = useState<DayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimetable = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const payload = await dashboardService.getTimetable();
      const routineList: RoutinePeriod[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.routines)
        ? payload.routines
        : [];
      const dayList: DayItem[] = Array.isArray(payload?.days) ? payload.days : [];
      setRoutines(routineList);

      if (dayList.length > 0) {
        setDays(dayList);
      } else {
        const daysOrder = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
        const derivedDays: DayItem[] = [];
        daysOrder.forEach((dName, idx) => {
          const hasDay = routineList.some(
            (r) => String(r.day_name || "").trim().toLowerCase() === dName.toLowerCase()
          );
          if (hasDay) {
            derivedDays.push({ id: idx + 1, day_name: dName });
          }
        });
        setDays(derivedDays);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load routine");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadTimetable();
    }
  }, [token, loadTimetable]);

  const getDayPeriods = (dayObj: DayItem) => {
    const targetId = Number(dayObj.id);
    const targetName = String(dayObj.day_name || "").trim().toLowerCase();
    return routines.filter((r) => {
      if (r.day !== undefined && r.day !== null && Number(r.day) === targetId) return true;
      if (r.day_id !== undefined && r.day_id !== null && Number(r.day_id) === targetId) return true;
      if (targetName && r.day_name && String(r.day_name).trim().toLowerCase() === targetName) {
        return true;
      }
      return false;
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Class Routine</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading routine...</Text>
        </View>
      ) : error ? (
        <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Failed to Load Routine
          </Text>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.emptyRetryButton, { backgroundColor: colors.primary }]}
            onPress={() => loadTimetable()}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.emptyRetryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            days.length === 0 && routines.length === 0 && styles.emptyScrollContent,
            { backgroundColor: colors.background },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTimetable(true)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {days.length > 0 ? (
            days.map((dayData) => {
              const periods = getDayPeriods(dayData);
              return (
                <View key={dayData.id} style={styles.daySection}>
                  <View style={styles.dayHeader}>
                    <View style={[styles.dayBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.dayHeaderText}>{dayData.day_name}</Text>
                    </View>
                    <Text style={[styles.classCount, { color: colors.textMuted }]}>
                      {periods.length} {periods.length === 1 ? "Class" : "Classes"}
                    </Text>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                  >
                    {periods.length > 0 ? (
                      periods.map((cls, idx) => {
                        const periodLabel = cls.period_name || cls.period || `P${idx + 1}`;
                        const timeLabel = formatPeriodTime(cls.start_time, cls.end_time);
                        const teacherName = (cls.teacher_name || "").trim();
                        const classSection = [cls.class_name, cls.section_name]
                          .filter(Boolean)
                          .join(", ");

                        return (
                          <View
                            key={`${dayData.id}-${cls.id || idx}`}
                            style={[
                              styles.card,
                              { backgroundColor: colors.cardBg, borderColor: colors.border },
                            ]}
                          >
                            <View
                              style={[styles.accentBar, { backgroundColor: colors.primary }]}
                            />
                            <View style={styles.cardContent}>
                              <View
                                style={[styles.cardHeader, { borderBottomColor: colors.border }]}
                              >
                                <View
                                  style={[
                                    styles.periodBadge,
                                    { backgroundColor: colors.primaryLight },
                                  ]}
                                >
                                  <Text
                                    style={[styles.periodText, { color: colors.primary }]}
                                  >
                                    {periodLabel}
                                  </Text>
                                </View>
                                <View style={styles.timeContainer}>
                                  <Ionicons
                                    name="time-outline"
                                    size={14}
                                    color={colors.textMuted}
                                  />
                                  <Text style={[styles.timeText, { color: colors.textMuted }]}>
                                    {timeLabel}
                                  </Text>
                                </View>
                              </View>

                              <View style={styles.cardBody}>
                                <View style={styles.infoRow}>
                                  <View
                                    style={[
                                      styles.iconCircle,
                                      { backgroundColor: colors.primaryLight },
                                    ]}
                                  >
                                    <Ionicons
                                      name={teacherName ? "person" : "school"}
                                      size={16}
                                      color={colors.primary}
                                    />
                                  </View>
                                  <View style={styles.textStack}>
                                    <Text style={[styles.label, { color: colors.textMuted }]}>
                                      {teacherName ? "Teacher" : "Class"}
                                    </Text>
                                    <Text
                                      style={[
                                        styles.infoValue,
                                        { color: colors.textPrimary },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {teacherName || classSection}
                                    </Text>
                                  </View>
                                </View>

                                <View style={styles.infoRow}>
                                  <View
                                    style={[styles.iconCircle, { backgroundColor: "#e8f5e9" }]}
                                  >
                                    <Ionicons name="book" size={16} color="#4caf50" />
                                  </View>
                                  <View style={styles.textStack}>
                                    <Text style={[styles.label, { color: colors.textMuted }]}>
                                      Subject
                                    </Text>
                                    <Text
                                      style={[
                                        styles.infoValue,
                                        { color: colors.textPrimary },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {cls.subject_name}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <View
                        style={[
                          styles.card,
                          styles.emptyCard,
                          { backgroundColor: colors.cardBg },
                        ]}
                      >
                        <View style={styles.emptyContent}>
                          <Ionicons
                            name="calendar-outline"
                            size={32}
                            color="#dc3545"
                            style={styles.emptyIcon}
                          />
                          <Text style={styles.emptyText}>No Class Assigned</Text>
                        </View>
                      </View>
                    )}
                  </ScrollView>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <View
                style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}
              >
                <Ionicons name="calendar-outline" size={48} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Class Routine Available
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                You do not have any class routines or periods assigned in your timetable yet.
              </Text>
              <TouchableOpacity
                style={[styles.emptyRetryButton, { backgroundColor: colors.primary }]}
                onPress={() => loadTimetable(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyRetryButtonText}>Refresh Schedule</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    paddingVertical: 15,
    flexGrow: 1,
  },
  emptyScrollContent: {
    justifyContent: "center",
  },
  daySection: {
    marginBottom: 25,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  dayBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  dayHeaderText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
  classCount: {
    fontSize: 12,
    fontWeight: "700",
  },
  horizontalList: {
    paddingHorizontal: 20,
    paddingBottom: 5,
  },
  card: {
    borderRadius: 16,
    marginRight: 16,
    width: 280,
    flexDirection: "row",
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
  },
  accentBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  emptyCard: {
    borderColor: "rgba(220, 53, 69, 0.2)",
    padding: 15,
    justifyContent: "center",
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 2,
    width: 280,
    height: 120,
  },
  emptyContent: {
    alignItems: "center",
  },
  emptyIcon: {
    marginBottom: 6,
    opacity: 0.7,
  },
  emptyText: {
    color: "#dc3545",
    fontSize: 15,
    fontWeight: "700",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  periodBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  periodText: {
    fontSize: 11,
    fontWeight: "800",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  textStack: {
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyRetryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyRetryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
