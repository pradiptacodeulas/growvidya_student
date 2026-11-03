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
import { HolidayItem } from "../services/dashboardService";

type ViewMode = "calendar" | "list";
type TimelineStatus = "ongoing" | "upcoming" | "completed";
type StatusFilter = "all" | TimelineStatus;

interface ParsedDateInfo {
  date: Date;
  ymd: string;
  year: number;
  month: number;
  day: number;
}

interface NormalizedHoliday extends HolidayItem {
  fromParsed: ParsedDateInfo | null;
  toParsed: ParsedDateInfo | null;
  fromYmd: string;
  toYmd: string;
  fromDisplay: string;
  toDisplay: string;
  durationDays: number;
  timelineStatus: TimelineStatus;
  cleanDetails: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
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
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All Status" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
];

const formatYmd = (dateObj: Date): string => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseLocalDate = (raw?: string | null): ParsedDateInfo | null => {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    const dt = new Date(y, m - 1, d);
    if (!Number.isNaN(dt.getTime())) {
      return { date: dt, ymd: formatYmd(dt), year: y, month: m - 1, day: d };
    }
  }

  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const d = Number(slashMatch[1]);
    const m = Number(slashMatch[2]);
    const y = Number(slashMatch[3]);
    const dt = new Date(y, m - 1, d);
    if (!Number.isNaN(dt.getTime())) {
      return { date: dt, ymd: formatYmd(dt), year: y, month: m - 1, day: d };
    }
  }

  const parsed = new Date(str.replace(" ", "T"));
  if (!Number.isNaN(parsed.getTime())) {
    const localDt = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    return {
      date: localDt,
      ymd: formatYmd(localDt),
      year: localDt.getFullYear(),
      month: localDt.getMonth(),
      day: localDt.getDate(),
    };
  }
  return null;
};

const formatDisplayDate = (parsed: ParsedDateInfo | null): string => {
  if (!parsed) return "—";
  const dd = String(parsed.day).padStart(2, "0");
  return `${dd} ${SHORT_MONTHS[parsed.month]} ${parsed.year}`;
};

const stripHtmlTags = (htmlStr?: string | null): string => {
  if (!htmlStr) return "";
  return String(htmlStr)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export default function HolidaysScreen() {
  const { colors, isDark } = useTheme();
  const { apiHolidays, loadingHolidays, fetchHolidays } = useApp();
  const { token } = useAuth();

  // Default / First view is Calendar View, Second view is List View
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDateYmd, setSelectedDateYmd] = useState<string | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<NormalizedHoliday | null>(null);

  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    if (token) {
      fetchHolidays();
    }
  }, [token, fetchHolidays]);

  const todayYmd = useMemo(() => formatYmd(new Date()), []);

  const normalizedHolidays = useMemo<NormalizedHoliday[]>(() => {
    const list = apiHolidays.map((h) => {
      const startParsed = parseLocalDate(h.from_date);
      const endParsed = parseLocalDate(h.to_date) || startParsed;

      const effectiveStart = startParsed;
      const effectiveEnd =
        startParsed && endParsed && endParsed.date < startParsed.date ? startParsed : endParsed;

      let durationDays = 0;
      if (effectiveStart && effectiveEnd) {
        const utc1 = Date.UTC(effectiveStart.year, effectiveStart.month, effectiveStart.day);
        const utc2 = Date.UTC(effectiveEnd.year, effectiveEnd.month, effectiveEnd.day);
        durationDays = Math.max(1, Math.round((utc2 - utc1) / 86400000) + 1);
      }

      let timelineStatus: TimelineStatus = "completed";
      if (effectiveStart && effectiveEnd) {
        if (todayYmd >= effectiveStart.ymd && todayYmd <= effectiveEnd.ymd) {
          timelineStatus = "ongoing";
        } else if (effectiveStart.ymd > todayYmd) {
          timelineStatus = "upcoming";
        } else {
          timelineStatus = "completed";
        }
      }

      return {
        ...h,
        fromParsed: effectiveStart,
        toParsed: effectiveEnd,
        fromYmd: effectiveStart ? effectiveStart.ymd : "",
        toYmd: effectiveEnd ? effectiveEnd.ymd : "",
        fromDisplay: formatDisplayDate(effectiveStart),
        toDisplay: formatDisplayDate(effectiveEnd),
        durationDays,
        timelineStatus,
        cleanDetails: stripHtmlTags(h.details),
      };
    });

    return list.sort((a, b) => a.fromYmd.localeCompare(b.fromYmd));
  }, [apiHolidays, todayYmd]);

  const availableYears = useMemo<number[]>(() => {
    const set = new Set<number>();
    normalizedHolidays.forEach((h) => {
      if (h.fromParsed) set.add(h.fromParsed.year);
      if (h.toParsed) set.add(h.toParsed.year);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [normalizedHolidays]);

  const summaryStats = useMemo<{
    totalHolidays: number;
    totalDays: number;
    upcomingCount: number;
    ongoingCount: number;
    nextHoliday: NormalizedHoliday | null;
  }>(() => {
    let totalDays = 0;
    let upcomingCount = 0;
    let ongoingCount = 0;
    let nextHoliday: NormalizedHoliday | null = null;

    normalizedHolidays.forEach((h) => {
      totalDays += h.durationDays;
      if (h.timelineStatus === "ongoing") {
        ongoingCount += 1;
        if (
          !nextHoliday ||
          (nextHoliday.timelineStatus !== "ongoing" && h.fromYmd < nextHoliday.fromYmd)
        ) {
          nextHoliday = h;
        }
      } else if (h.timelineStatus === "upcoming") {
        upcomingCount += 1;
        if (
          !nextHoliday ||
          (nextHoliday.timelineStatus === "upcoming" && h.fromYmd < nextHoliday.fromYmd)
        ) {
          nextHoliday = h;
        }
      }
    });

    return {
      totalHolidays: normalizedHolidays.length,
      totalDays,
      upcomingCount,
      ongoingCount,
      nextHoliday,
    };
  }, [normalizedHolidays]);

  const filteredHolidays = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return normalizedHolidays.filter((h) => {
      if (yearFilter !== "all") {
        const targetYear = Number(yearFilter);
        const startYear = h.fromParsed?.year;
        const endYear = h.toParsed?.year;
        if (!startYear || !endYear || targetYear < startYear || targetYear > endYear) {
          return false;
        }
      }

      if (viewMode === "list") {
        if (statusFilter !== "all" && h.timelineStatus !== statusFilter) {
          return false;
        }
        if (q) {
          const titleMatch = (h.title || "").toLowerCase().includes(q);
          const detailsMatch = h.cleanDetails.toLowerCase().includes(q);
          const branchMatch = (h.branch_name || "").toLowerCase().includes(q);
          if (!titleMatch && !detailsMatch && !branchMatch) {
            return false;
          }
        }
      }

      return true;
    });
  }, [normalizedHolidays, yearFilter, viewMode, statusFilter, searchQuery]);

  // Holidays overlapping currently viewed calendar month
  const currentMonthHolidays = useMemo(() => {
    const monthStartYmd = formatYmd(new Date(calendarCursor.year, calendarCursor.month, 1));
    const monthEndYmd = formatYmd(new Date(calendarCursor.year, calendarCursor.month + 1, 0));

    return filteredHolidays.filter(
      (h) => h.fromYmd && h.toYmd && h.toYmd >= monthStartYmd && h.fromYmd <= monthEndYmd
    );
  }, [filteredHolidays, calendarCursor]);

  // Map each YYYY-MM-DD in current month to overlapping holidays
  const dayHolidaysMap = useMemo(() => {
    const map = new Map<string, NormalizedHoliday[]>();
    const daysInMonth = new Date(calendarCursor.year, calendarCursor.month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = formatYmd(new Date(calendarCursor.year, calendarCursor.month, d));
      const matches = currentMonthHolidays.filter((h) => ymd >= h.fromYmd && ymd <= h.toYmd);
      if (matches.length > 0) {
        map.set(ymd, matches);
      }
    }
    return map;
  }, [currentMonthHolidays, calendarCursor]);

  // Build calendar cells (leading blanks + actual days + trailing blanks to complete rows of 7)
  const calendarWeeks = useMemo(() => {
    const firstDayWeekday = new Date(calendarCursor.year, calendarCursor.month, 1).getDay();
    const daysInMonth = new Date(calendarCursor.year, calendarCursor.month + 1, 0).getDate();

    const cells: { day: number | null; ymd: string }[] = [];
    for (let i = 0; i < firstDayWeekday; i++) {
      cells.push({ day: null, ymd: `pad-start-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = formatYmd(new Date(calendarCursor.year, calendarCursor.month, d));
      cells.push({ day: d, ymd });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, ymd: `pad-end-${cells.length}` });
    }

    const weeks: { day: number | null; ymd: string }[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [calendarCursor]);

  const displayedMonthHolidays = useMemo(() => {
    if (!selectedDateYmd) return currentMonthHolidays;
    return currentMonthHolidays.filter(
      (h) => selectedDateYmd >= h.fromYmd && selectedDateYmd <= h.toYmd
    );
  }, [currentMonthHolidays, selectedDateYmd]);

  const getStatusMeta = (status: TimelineStatus) => {
    if (status === "ongoing") {
      return {
        label: "Ongoing",
        icon: "checkmark-circle" as const,
        color: "#10B981",
        bg: isDark ? "#064E3B" : "#ECFDF5",
      };
    }
    if (status === "upcoming") {
      return {
        label: "Upcoming",
        icon: "time-outline" as const,
        color: "#0284C7",
        bg: isDark ? "#0C4A6E" : "#E0F2FE",
      };
    }
    return {
      label: "Completed",
      icon: "checkmark-done-outline" as const,
      color: isDark ? "#9CA3AF" : "#64748B",
      bg: isDark ? "#1F2937" : "#F1F5F9",
    };
  };

  const getAccentColor = (h: NormalizedHoliday) => {
    if (h.timelineStatus === "ongoing") return "#10B981";
    if (h.durationDays > 1) return "#4F46E5";
    return "#EF4444";
  };

  const handlePrevMonth = () => {
    setSelectedDateYmd(null);
    setCalendarCursor((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setSelectedDateYmd(null);
    setCalendarCursor((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleGoToday = () => {
    const now = new Date();
    setSelectedDateYmd(null);
    setCalendarCursor({ year: now.getFullYear(), month: now.getMonth() });
  };

  const handleYearChange = (yr: string) => {
    setYearFilter(yr);
    setSelectedDateYmd(null);
    if (yr !== "all") {
      setCalendarCursor((prev) => ({ ...prev, year: Number(yr) }));
    }
  };

  const handleDayPress = (ymd: string) => {
    const matches = dayHolidaysMap.get(ymd) || [];
    if (matches.length === 0) {
      setSelectedDateYmd(null);
      return;
    }
    if (matches.length === 1) {
      setSelectedDateYmd(ymd);
      setSelectedHoliday(matches[0]);
      return;
    }
    setSelectedDateYmd((prev) => (prev === ymd ? null : ymd));
  };

  const hasActiveFilters =
    yearFilter !== "all" ||
    (viewMode === "list" && (statusFilter !== "all" || searchQuery.trim().length > 0));

  const clearFilters = () => {
    setStatusFilter("all");
    setYearFilter("all");
    setSearchQuery("");
    setSelectedDateYmd(null);
  };

  const renderHolidayCard = (h: NormalizedHoliday, idx: number) => {
    const statusMeta = getStatusMeta(h.timelineStatus);
    const accent = getAccentColor(h);

    return (
      <TouchableOpacity
        key={h.id || idx}
        style={[
          styles.holidayCard,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
            borderLeftColor: accent,
          },
        ]}
        onPress={() => setSelectedHoliday(h)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTopRow}>
          <Text
            style={[styles.holidayTitle, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {h.title || "Untitled Holiday"}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Ionicons name={statusMeta.icon} size={12} color={statusMeta.color} />
            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <View style={styles.metaBadgeRow}>
          <View
            style={[
              styles.datePill,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
          >
            <Ionicons name="calendar-outline" size={13} color={colors.primary} />
            <Text style={[styles.datePillText, { color: colors.textSecondary }]}>
              {h.fromYmd === h.toYmd ? h.fromDisplay : `${h.fromDisplay} → ${h.toDisplay}`}
            </Text>
          </View>

          {h.durationDays > 0 && (
            <View
              style={[
                styles.durationPill,
                {
                  backgroundColor: h.durationDays > 1 ? colors.primaryLight : colors.surfaceSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.durationPillText,
                  { color: h.durationDays > 1 ? colors.primary : colors.textSecondary },
                ]}
              >
                {h.durationDays} {h.durationDays === 1 ? "Day" : "Days"}
              </Text>
            </View>
          )}

          {h.branch_name ? (
            <View style={[styles.branchPill, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="business-outline" size={11} color={colors.primary} />
              <Text style={[styles.branchPillText, { color: colors.primary }]}>
                {h.branch_name}
              </Text>
            </View>
          ) : null}
        </View>

        {h.cleanDetails ? (
          <Text
            style={[styles.detailsPreview, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {h.cleanDetails}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Top Header Bar */}
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Holidays</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Academic vacation & festival calendar
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.refreshIconBtn,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
          ]}
          onPress={() => fetchHolidays()}
          disabled={loadingHolidays}
        >
          {loadingHolidays ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={colors.textPrimary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Segmented View Switcher: 1st Calendar View, 2nd List View */}
      <View style={styles.viewToggleSection}>
        <View
          style={[
            styles.viewToggleTrack,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.viewToggleBtn,
              viewMode === "calendar" && [
                styles.viewToggleBtnActive,
                { backgroundColor: colors.cardBg },
              ],
            ]}
            onPress={() => setViewMode("calendar")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={viewMode === "calendar" ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.viewToggleText,
                { color: viewMode === "calendar" ? colors.primary : colors.textSecondary },
              ]}
            >
              Calendar View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewToggleBtn,
              viewMode === "list" && [
                styles.viewToggleBtnActive,
                { backgroundColor: colors.cardBg },
              ],
            ]}
            onPress={() => setViewMode("list")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={viewMode === "list" ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.viewToggleText,
                { color: viewMode === "list" ? colors.primary : colors.textSecondary },
              ]}
            >
              Table / List View
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingHolidays}
            onRefresh={() => fetchHolidays()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Summary Metrics Grid */}
        {normalizedHolidays.length > 0 && (
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <View style={[styles.statIconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Holidays</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {summaryStats.totalHolidays}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.statIconBox,
                  { backgroundColor: isDark ? "#7F1D1D" : "#FEE2E2" },
                ]}
              >
                <Ionicons name="sunny-outline" size={18} color="#EF4444" />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Vacation Days</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {summaryStats.totalDays}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.statIconBox,
                  { backgroundColor: isDark ? "#0C4A6E" : "#E0F2FE" },
                ]}
              >
                <Ionicons name="trending-up-outline" size={18} color="#0284C7" />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Upcoming / Active
                </Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {summaryStats.upcomingCount + summaryStats.ongoingCount}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
              disabled={!summaryStats.nextHoliday}
              onPress={() => {
                if (summaryStats.nextHoliday) {
                  setSelectedHoliday(summaryStats.nextHoliday);
                }
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.statIconBox,
                  { backgroundColor: isDark ? "#064E3B" : "#ECFDF5" },
                ]}
              >
                <Ionicons name="sparkles-outline" size={18} color="#10B981" />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {summaryStats.nextHoliday?.timelineStatus === "ongoing"
                    ? "Active Holiday"
                    : "Next Holiday"}
                </Text>
                <Text
                  style={[styles.statNextTitle, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {summaryStats.nextHoliday ? summaryStats.nextHoliday.title : "—"}
                </Text>
                {summaryStats.nextHoliday ? (
                  <Text style={[styles.statNextDate, { color: colors.textMuted }]}>
                    {summaryStats.nextHoliday.fromDisplay}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Dynamic Year Filter Chips */}
        {availableYears.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.yearFilterRow}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: yearFilter === "all" ? colors.primary : colors.surfaceSubtle,
                  borderColor: yearFilter === "all" ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleYearChange("all")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: yearFilter === "all" ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                All Years
              </Text>
            </TouchableOpacity>
            {availableYears.map((yr) => {
              const active = yearFilter === String(yr);
              return (
                <TouchableOpacity
                  key={yr}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceSubtle,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleYearChange(String(yr))}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    {yr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* MODE 1: CALENDAR VIEW */}
        {viewMode === "calendar" && (
          <>
            <View
              style={[
                styles.calendarCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              {/* Color Legend */}
              <View style={[styles.legendRow, { borderBottomColor: colors.border }]}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                    Single-Day
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#4F46E5" }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                    Multi-Day
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Ongoing</Text>
                </View>
              </View>

              {/* Calendar Toolbar */}
              <View style={styles.calendarToolbar}>
                <View style={styles.navArrowsGroup}>
                  <TouchableOpacity
                    style={[
                      styles.calNavBtn,
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                    ]}
                    onPress={handlePrevMonth}
                  >
                    <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.calNavBtn,
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                    ]}
                    onPress={handleNextMonth}
                  >
                    <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.calendarMonthTitle, { color: colors.textPrimary }]}>
                  {MONTH_NAMES[calendarCursor.month]} {calendarCursor.year}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.todayBtn,
                    { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                  ]}
                  onPress={handleGoToday}
                >
                  <Text style={[styles.todayBtnText, { color: colors.primary }]}>Today</Text>
                </TouchableOpacity>
              </View>

              {/* Weekday Headers */}
              <View style={[styles.weekdayHeaderRow, { backgroundColor: colors.surfaceSubtle }]}>
                {WEEKDAYS.map((dayLabel) => (
                  <View key={dayLabel} style={styles.weekdayCell}>
                    <Text style={[styles.weekdayText, { color: colors.textSecondary }]}>
                      {dayLabel}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar Weeks Grid */}
              {loadingHolidays && apiHolidays.length === 0 ? (
                <View style={styles.calendarLoadingBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Loading holiday calendar...
                  </Text>
                </View>
              ) : (
                <View style={styles.calendarGrid}>
                  {calendarWeeks.map((week, wIdx) => (
                    <View
                      key={`week-${wIdx}`}
                      style={[
                        styles.calendarWeekRow,
                        wIdx < calendarWeeks.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      {week.map((cell) => {
                        if (cell.day === null) {
                          return <View key={cell.ymd} style={styles.calendarDayCell} />;
                        }

                        const dayEvents = dayHolidaysMap.get(cell.ymd) || [];
                        const hasEvents = dayEvents.length > 0;
                        const isToday = cell.ymd === todayYmd;
                        const isSelected = cell.ymd === selectedDateYmd;

                        const primaryEvent = dayEvents[0];
                        const eventBg = !primaryEvent
                          ? "transparent"
                          : primaryEvent.timelineStatus === "ongoing"
                          ? isDark
                            ? "#064E3B80"
                            : "#ECFDF5"
                          : primaryEvent.durationDays > 1
                          ? isDark
                            ? "#312E8180"
                            : "#EEF2FF"
                          : isDark
                          ? "#7F1D1D70"
                          : "#FEF2F2";

                        const dotColor = primaryEvent ? getAccentColor(primaryEvent) : "transparent";

                        return (
                          <TouchableOpacity
                            key={cell.ymd}
                            style={[
                              styles.calendarDayCell,
                              hasEvents && { backgroundColor: eventBg },
                              isSelected && {
                                borderWidth: 1.5,
                                borderColor: colors.primary,
                              },
                            ]}
                            activeOpacity={hasEvents ? 0.7 : 1}
                            onPress={() => handleDayPress(cell.ymd)}
                          >
                            <View
                              style={[
                                styles.dayNumberCircle,
                                isToday && { backgroundColor: colors.primary },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dayNumberText,
                                  {
                                    color: isToday
                                      ? "#FFFFFF"
                                      : hasEvents
                                      ? dotColor
                                      : colors.textPrimary,
                                    fontWeight: isToday || hasEvents ? "700" : "500",
                                  },
                                ]}
                              >
                                {cell.day}
                              </Text>
                            </View>

                            {hasEvents && (
                              <View style={styles.cellEventWrap}>
                                <View
                                  style={[styles.cellEventPill, { backgroundColor: dotColor }]}
                                >
                                  <Text style={styles.cellEventText} numberOfLines={1}>
                                    {primaryEvent.title}
                                  </Text>
                                </View>
                                {dayEvents.length > 1 && (
                                  <Text style={[styles.moreEventsText, { color: colors.primary }]}>
                                    +{dayEvents.length - 1} more
                                  </Text>
                                )}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Monthly Holiday Breakdown Section */}
            <View style={styles.monthSectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.monthSectionTitle, { color: colors.textPrimary }]}>
                  {MONTH_NAMES[calendarCursor.month]} {calendarCursor.year}
                </Text>
                <Text style={[styles.monthSectionSub, { color: colors.textSecondary }]}>
                  {selectedDateYmd
                    ? `Filtered to ${formatDisplayDate(parseLocalDate(selectedDateYmd))}`
                    : "Holidays scheduled in this month"}
                </Text>
              </View>

              {selectedDateYmd ? (
                <TouchableOpacity
                  style={[styles.showAllMonthBtn, { borderColor: colors.primary }]}
                  onPress={() => setSelectedDateYmd(null)}
                >
                  <Text style={[styles.showAllMonthText, { color: colors.primary }]}>
                    Show All ({currentMonthHolidays.length})
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                    {currentMonthHolidays.length}
                  </Text>
                </View>
              )}
            </View>

            {displayedMonthHolidays.length === 0 ? (
              <View
                style={[
                  styles.emptyContainer,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                <Ionicons name="calendar-clear-outline" size={44} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No Holidays This Month
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  No holidays are scheduled in {MONTH_NAMES[calendarCursor.month]}{" "}
                  {calendarCursor.year}.
                </Text>
              </View>
            ) : (
              displayedMonthHolidays.map((h, idx) => renderHolidayCard(h, idx))
            )}
          </>
        )}

        {/* MODE 2: TABLE / LIST VIEW */}
        {viewMode === "list" && (
          <>
            {/* Search Input */}
            <View
              style={[
                styles.searchInputWrapper,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search holidays..."
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

            {/* Status Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusFilterContent}
            >
              {STATUS_FILTERS.map((st) => {
                const active = statusFilter === st.key;
                return (
                  <TouchableOpacity
                    key={st.key}
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: active ? colors.primaryLight : "transparent",
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setStatusFilter(st.key)}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        { color: active ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {hasActiveFilters && (
                <TouchableOpacity
                  style={[styles.clearFilterBtn, { borderColor: "#EF4444" }]}
                  onPress={clearFilters}
                >
                  <Ionicons name="close" size={13} color="#EF4444" />
                  <Text style={styles.clearFilterText}>Reset</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {loadingHolidays && apiHolidays.length === 0 ? (
              <View style={styles.calendarLoadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading holidays...
                </Text>
              </View>
            ) : filteredHolidays.length === 0 ? (
              <View
                style={[
                  styles.emptyContainer,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No Holidays Found
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  No holidays match the selected filters in the academic calendar.
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    style={[styles.resetBtn, { backgroundColor: colors.primary }]}
                    onPress={clearFilters}
                  >
                    <Text style={styles.resetBtnText}>Reset Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredHolidays.map((h, idx) => renderHolidayCard(h, idx))
            )}
          </>
        )}
      </ScrollView>

      {/* View Holiday Details Modal */}
      {selectedHoliday && (
        <Modal
          visible={!!selectedHoliday}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedHoliday(null)}
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
                    {selectedHoliday.title}
                  </Text>
                  <View style={[styles.metaBadgeRow, { marginTop: 8 }]}>
                    {(() => {
                      const st = getStatusMeta(selectedHoliday.timelineStatus);
                      return (
                        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                          <Ionicons name={st.icon} size={12} color={st.color} />
                          <Text style={[styles.statusBadgeText, { color: st.color }]}>
                            {st.label}
                          </Text>
                        </View>
                      );
                    })()}
                    {selectedHoliday.durationDays > 0 && (
                      <View
                        style={[
                          styles.durationPill,
                          { backgroundColor: colors.surfaceSubtle },
                        ]}
                      >
                        <Text style={[styles.durationPillText, { color: colors.textPrimary }]}>
                          {selectedHoliday.durationDays}{" "}
                          {selectedHoliday.durationDays === 1 ? "Day" : "Days"}
                        </Text>
                      </View>
                    )}
                    {selectedHoliday.branch_name ? (
                      <View
                        style={[styles.branchPill, { backgroundColor: colors.primaryLight }]}
                      >
                        <Ionicons name="business-outline" size={11} color={colors.primary} />
                        <Text style={[styles.branchPillText, { color: colors.primary }]}>
                          {selectedHoliday.branch_name}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity onPress={() => setSelectedHoliday(null)}>
                  <Ionicons name="close-circle-outline" size={26} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* From Date / To Date Boxes */}
              <View style={styles.modalDateRow}>
                <View
                  style={[
                    styles.modalDateBox,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.modalDateLabel, { color: colors.textMuted }]}>
                    From Date
                  </Text>
                  <View style={styles.modalDateValRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                    <Text style={[styles.modalDateValue, { color: colors.textPrimary }]}>
                      {selectedHoliday.fromDisplay}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.modalDateBox,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.modalDateLabel, { color: colors.textMuted }]}>To Date</Text>
                  <View style={styles.modalDateValRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.modalDateValue, { color: colors.textPrimary }]}>
                      {selectedHoliday.toDisplay}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Details Section */}
              {selectedHoliday.cleanDetails ? (
                <>
                  <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>
                    Details
                  </Text>
                  <ScrollView
                    style={[
                      styles.modalDetailsBox,
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                    ]}
                    contentContainerStyle={{ padding: 14 }}
                  >
                    <Text style={[styles.modalDetailsText, { color: colors.textPrimary }]}>
                      {selectedHoliday.cleanDetails}
                    </Text>
                  </ScrollView>
                </>
              ) : null}

              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: colors.primary }]}
                onPress={() => setSelectedHoliday(null)}
              >
                <Text style={styles.closeModalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  viewToggleTrack: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  viewToggleBtnActive: {
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 14,
  },
  statCard: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 1,
  },
  statNextTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: 1,
  },
  statNextDate: {
    fontSize: 10.5,
    marginTop: 1,
  },
  yearFilterRow: {
    gap: 8,
    paddingBottom: 12,
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
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 18,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  calendarToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  navArrowsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMonthTitle: {
    fontSize: 15.5,
    fontWeight: "800",
  },
  todayBtn: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  weekdayHeaderRow: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  calendarGrid: {
    width: "100%",
  },
  calendarWeekRow: {
    flexDirection: "row",
  },
  calendarDayCell: {
    flex: 1,
    minHeight: 58,
    paddingVertical: 5,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  dayNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumberText: {
    fontSize: 12,
  },
  cellEventWrap: {
    width: "100%",
    marginTop: 3,
    paddingHorizontal: 1,
    alignItems: "center",
  },
  cellEventPill: {
    width: "100%",
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1.5,
  },
  cellEventText: {
    color: "#FFFFFF",
    fontSize: 8.5,
    fontWeight: "700",
    textAlign: "center",
  },
  moreEventsText: {
    fontSize: 8.5,
    fontWeight: "700",
    marginTop: 1,
  },
  calendarLoadingBox: {
    paddingVertical: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  monthSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthSectionTitle: {
    fontSize: 15.5,
    fontWeight: "800",
  },
  monthSectionSub: {
    fontSize: 12,
    marginTop: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  showAllMonthBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  showAllMonthText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  },
  statusFilterContent: {
    gap: 8,
    alignItems: "center",
    paddingBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  clearFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 3,
  },
  clearFilterText: {
    color: "#EF4444",
    fontSize: 11.5,
    fontWeight: "700",
  },
  holidayCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  holidayTitle: {
    flex: 1,
    fontSize: 14.5,
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
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 9,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  datePillText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  durationPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationPillText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  branchPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  branchPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  detailsPreview: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 8,
  },
  emptyContainer: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    maxHeight: "82%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  modalDateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  modalDateBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 11,
  },
  modalDateLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalDateValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  modalDateValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalDetailsBox: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 210,
    marginBottom: 14,
  },
  modalDetailsText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  closeModalBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  closeModalBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
