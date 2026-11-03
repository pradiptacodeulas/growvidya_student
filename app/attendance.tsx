import React, { useState, useEffect, useCallback, useMemo } from "react";
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

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type StatusMeta = {
  key: "present" | "absent" | "late" | "halfday" | "none";
  label: string;
  short: string;
  color: string;
  bg: string;
};

export default function AttendanceScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getAttendance(selectedMonth, selectedYear);
      setAttendanceData(data);
    } catch {
      setAttendanceData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (token) {
      loadAttendance();
    }
  }, [token, loadAttendance]);

  const handlePrevMonth = () => {
    setSelectedDay(null);
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const getStatusMeta = useCallback(
    (status: any): StatusMeta => {
      if (status === undefined || status === null || status === "") {
        return {
          key: "none",
          label: "Not Marked",
          short: "",
          color: colors.textSecondary,
          bg: "transparent",
        };
      }
      const val = String(status).toLowerCase().trim();
      if (val === "1" || val === "present" || val === "p") {
        return {
          key: "present",
          label: "Present",
          short: "P",
          color: "#10B981",
          bg: "#10B98120",
        };
      }
      if (val === "0" || val === "absent" || val === "a") {
        return {
          key: "absent",
          label: "Absent",
          short: "A",
          color: "#EF4444",
          bg: "#EF444420",
        };
      }
      if (val === "2" || val === "late" || val === "l") {
        return {
          key: "late",
          label: "Late",
          short: "L",
          color: "#F59E0B",
          bg: "#F59E0B20",
        };
      }
      if (val === "3" || val === "halfday" || val === "half_day" || val === "hd") {
        return {
          key: "halfday",
          label: "Half Day",
          short: "HD",
          color: "#0284C7",
          bg: "#0284C720",
        };
      }
      return {
        key: "none",
        label: "Not Marked",
        short: "",
        color: colors.textSecondary,
        bg: "transparent",
      };
    },
    [colors.textSecondary]
  );

  const records: any[] = useMemo(() => {
    if (Array.isArray(attendanceData?.records)) return attendanceData.records;
    if (Array.isArray(attendanceData)) return attendanceData;
    return [];
  }, [attendanceData]);

  // Map day number (1..31) -> attendance record for selectedMonth & selectedYear
  const recordsByDay = useMemo(() => {
    const map: Record<number, any> = {};
    for (const rec of records) {
      const rawDate = rec.date || rec.attendance_date;
      if (!rawDate) continue;
      const dateStr = String(rawDate).slice(0, 10);
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (y === selectedYear && m === selectedMonth && d >= 1 && d <= 31) {
          map[d] = rec;
          continue;
        }
      }
      const parsed = new Date(rawDate);
      if (
        !isNaN(parsed.getTime()) &&
        parsed.getFullYear() === selectedYear &&
        parsed.getMonth() + 1 === selectedMonth
      ) {
        map[parsed.getDate()] = rec;
      }
    }
    return map;
  }, [records, selectedMonth, selectedYear]);

  const summary = attendanceData?.summary || attendanceData?.metrics || {};
  const totalRecorded = summary.total ?? records.length;
  const presentCount = summary.present ?? summary.presentDays ?? 0;
  const absentCount = summary.absent ?? summary.absentDays ?? 0;
  const lateHalfCount =
    (summary.late ?? summary.lateDays ?? 0) + (summary.halfday ?? summary.halfDays ?? 0);
  const percentage =
    totalRecorded > 0 ? (summary.percentage ?? summary.attendancePercentage ?? 0) : 0;

  // Build calendar cells (leading blanks + days of month)
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [selectedMonth, selectedYear]);

  const selectedRecord = selectedDay ? recordsByDay[selectedDay] : null;
  const selectedStatus = selectedRecord
    ? getStatusMeta(selectedRecord.attendance ?? selectedRecord.status)
    : null;

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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Attendance</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Monthly attendance calendar
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
            onRefresh={loadAttendance}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Summary Metrics */}
        <View style={styles.metricsGrid}>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricValue, { color: "#10B981" }]}>{presentCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Present</Text>
          </View>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricValue, { color: "#EF4444" }]}>{absentCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Absent</Text>
          </View>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricValue, { color: "#F59E0B" }]}>{lateHalfCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Late / HD</Text>
          </View>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.primary }]}>{percentage}%</Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Rate</Text>
          </View>
        </View>

        {/* Calendar Card */}
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          {/* Month / Year Switcher */}
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={[styles.navArrow, { backgroundColor: colors.surfaceSubtle }]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={[styles.navArrow, { backgroundColor: colors.surfaceSubtle }]}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((day, idx) => (
              <View key={day} style={styles.weekCell}>
                <Text
                  style={[
                    styles.weekText,
                    { color: idx === 0 ? "#EF4444" : colors.textMuted },
                  ]}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {calendarCells.map((day, index) => {
              if (!day) {
                return <View key={`empty-${index}`} style={styles.dayCellWrapper} />;
              }

              const rec = recordsByDay[day];
              const st = getStatusMeta(rec?.attendance ?? rec?.status);
              const isSelected = selectedDay === day;
              const isToday =
                day === now.getDate() &&
                selectedMonth === now.getMonth() + 1 &&
                selectedYear === now.getFullYear();

              return (
                <View key={`day-${day}`} style={styles.dayCellWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.dayCell,
                      {
                        backgroundColor: st.key !== "none" ? st.bg : "transparent",
                        borderColor: isSelected
                          ? colors.primary
                          : isToday
                          ? colors.textMuted
                          : "transparent",
                        borderWidth: isSelected ? 2 : isToday ? 1 : 0,
                      },
                    ]}
                    onPress={() => setSelectedDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        {
                          color:
                            st.key !== "none"
                              ? st.color
                              : index % 7 === 0
                              ? "#EF4444"
                              : colors.textPrimary,
                          fontWeight: st.key !== "none" || isToday ? "700" : "500",
                        },
                      ]}
                    >
                      {day}
                    </Text>
                    {st.key !== "none" && (
                      <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={[styles.legendRow, { borderTopColor: colors.border }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Absent</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Late</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#0284C7" }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Half Day</Text>
            </View>
          </View>
        </View>

        {/* Selected Day Details */}
        {selectedDay && (
          <View
            style={[
              styles.detailCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={styles.detailRow}>
              <View>
                <Text style={[styles.detailDate, { color: colors.textPrimary }]}>
                  {selectedDay} {MONTHS[selectedMonth - 1]} {selectedYear}
                </Text>
                <Text style={[styles.detailNotes, { color: colors.textSecondary }]}>
                  {selectedRecord?.notes || selectedRecord?.remarks || "No remarks for this date"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      selectedStatus && selectedStatus.key !== "none"
                        ? selectedStatus.bg
                        : colors.surfaceSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        selectedStatus && selectedStatus.key !== "none"
                          ? selectedStatus.color
                          : colors.textMuted,
                    },
                  ]}
                >
                  {selectedStatus ? selectedStatus.label : "Not Marked"}
                </Text>
              </View>
            </View>
          </View>
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
  metricsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  metricValue: { fontSize: 18, fontWeight: "800" },
  metricLabel: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekCell: {
    width: "14.2857%",
    alignItems: "center",
    paddingVertical: 4,
  },
  weekText: {
    fontSize: 12,
    fontWeight: "700",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCellWrapper: {
    width: "14.2857%",
    aspectRatio: 1,
    padding: 3,
  },
  dayCell: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: 13,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  detailDate: {
    fontSize: 15,
    fontWeight: "700",
  },
  detailNotes: {
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
