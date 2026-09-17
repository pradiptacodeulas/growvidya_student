import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getAvatarUrl } from "../../services/apiClient";
import { SchoolNotice } from "../../services/dashboardService";

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const { dashboardData, loadingDashboard, dashboardError, fetchDashboard } = useApp();
  const { user, token } = useAuth();

  const [selectedNotice, setSelectedNotice] = useState<SchoolNotice | null>(null);

  useEffect(() => {
    if (token) {
      fetchDashboard();
    }
  }, [token, fetchDashboard]);

  const apiStudent = dashboardData?.student;

  const studentName =
    apiStudent?.full_name ||
    apiStudent?.fullName ||
    (apiStudent?.first_name ? `${apiStudent.first_name} ${apiStudent.last_name || ""}`.trim() : "") ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "") ||
    "Student";

  const admissionNo = apiStudent?.admission_number || user?.admission_number || "N/A";
  const studentEmail = apiStudent?.email_address || user?.email_address || "";
  const rawPicture = apiStudent?.picture || user?.picture || "";
  const avatarUri = getAvatarUrl(rawPicture, apiStudent?.gender);

  const metrics = dashboardData?.metrics;
  const totalAssignmentsCount =
    metrics?.totalAssignments ?? (dashboardData as any)?.total_assignments ?? 0;
  const attemptedCount =
    metrics?.attemptedAssignments ?? (dashboardData as any)?.total_attempted ?? 0;
  const pendingCount =
    metrics?.pendingAssignments ?? Math.max(0, totalAssignmentsCount - attemptedCount);
  const completionRate =
    totalAssignmentsCount > 0
      ? Math.round((attemptedCount / totalAssignmentsCount) * 100)
      : 0;
  const attendancePercent = metrics?.attendancePercentage ?? 100;

  const todayClasses = dashboardData?.todayClasses || [];
  const notices = dashboardData?.notices || [];

  if (loadingDashboard && !dashboardData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["left", "right"]}>
        <View style={styles.loadingCenterContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>Loading Dashboard...</Text>
          <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
            Connecting to your school portal
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dashboardData && dashboardError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["left", "right"]}>
        <View style={styles.loadingCenterContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>Failed to Load Dashboard</Text>
          <Text style={[styles.loadingSubtitle, { color: colors.textSecondary, marginBottom: 16 }]}>
            {dashboardError}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => fetchDashboard()}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingDashboard}
            onRefresh={() => fetchDashboard()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Welcome Hero Banner */}
        <LinearGradient
          colors={["#0f172a", "#1e293b", "#334155"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroTopRow}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: avatarUri }} style={styles.heroAvatar} />
              <View style={styles.onlineDot} />
            </View>

            <View style={styles.heroMainInfo}>
              {/* Admission Badge */}
              <View style={styles.admBadge}>
                <Ionicons name="id-card-outline" size={12} color="#FFFFFF" />
                <Text style={styles.admBadgeText}>Adm: {admissionNo}</Text>
              </View>

              <Text style={styles.welcomeTitle} numberOfLines={1} ellipsizeMode="tail">
                {studentName}
              </Text>

              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaItem}>
                  <Ionicons name="school-outline" size={13} color="#F59E0B" />
                  <Text style={styles.heroMetaText}>
                    Class {apiStudent?.class_name || user?.class_id || "I"}
                    {apiStudent?.section_name ? ` - ${apiStudent.section_name}` : ""}
                  </Text>
                </View>
                {studentEmail ? (
                  <View style={styles.heroMetaItem}>
                    <Ionicons name="mail-outline" size={13} color="#38BDF8" />
                    <Text style={styles.heroMetaText} numberOfLines={1}>
                      {studentEmail}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Quick Action in Hero */}
          <TouchableOpacity
            style={styles.viewAssignmentsBtn}
            onPress={() => router.push("/(tabs)/assignment")}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color="#0F172A" />
            <Text style={styles.viewAssignmentsBtnText}>View Assignments</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Quick Navigation Cards */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Navigation</Text>

        <View style={styles.quickNavGrid}>
          {/* Assignments */}
          <TouchableOpacity
            style={[styles.quickNavCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/assignment")}
            activeOpacity={0.7}
          >
            <View style={[styles.quickNavCircle, { backgroundColor: "#EEF2FF" }]}>
              <Ionicons name="book-outline" size={22} color="#3D5EE1" />
            </View>
            <Text style={[styles.quickNavLabel, { color: colors.textPrimary }]}>Assignments</Text>
          </TouchableOpacity>

          {/* Messages */}
          <TouchableOpacity
            style={[styles.quickNavCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/message")}
            activeOpacity={0.7}
          >
            <View style={[styles.quickNavCircle, { backgroundColor: "#E0F2FE" }]}>
              <Ionicons name="chatbubbles-outline" size={22} color="#0284C7" />
            </View>
            <Text style={[styles.quickNavLabel, { color: colors.textPrimary }]}>Messages</Text>
          </TouchableOpacity>

          {/* Profile */}
          <TouchableOpacity
            style={[styles.quickNavCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.7}
          >
            <View style={[styles.quickNavCircle, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="person-outline" size={22} color="#10B981" />
            </View>
            <Text style={[styles.quickNavLabel, { color: colors.textPrimary }]}>My Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Bento Grid Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 2 }]}>
              Academic Overview
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              Real-time progress & attendance
            </Text>
          </View>
          {loadingDashboard && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {/* Bento Grid Layout */}
        <View style={styles.bentoGrid}>
          {/* Main Hero Bento Box: Total Assignments & Progress */}
          <TouchableOpacity
            style={[styles.bentoHeroCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/assignment")}
            activeOpacity={0.9}
          >
            <View style={styles.bentoHeroTop}>
              <View style={{ flex: 1 }}>
                <View style={[styles.bentoPill, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="layers-outline" size={12} color={colors.primary} />
                  <Text style={[styles.bentoPillText, { color: colors.primary }]}>ASSIGNMENTS</Text>
                </View>
                <Text style={[styles.bentoHeroNumber, { color: colors.textPrimary }]}>
                  {totalAssignmentsCount}
                </Text>
                <Text style={[styles.bentoHeroSubtext, { color: colors.textSecondary }]}>
                  Total assignments assigned for your class
                </Text>
              </View>

              <View style={[styles.bentoHeroIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="book-outline" size={28} color={colors.primary} />
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.bentoProgressContainer}>
              <View style={styles.bentoProgressHeader}>
                <Text style={[styles.bentoProgressLabel, { color: colors.textMuted }]}>Completion Rate</Text>
                <Text style={[styles.bentoProgressPercent, { color: colors.primary }]}>
                  {completionRate}% Completed
                </Text>
              </View>
              <View style={[styles.bentoProgressTrack, { backgroundColor: colors.surfaceSubtle }]}>
                <View
                  style={[
                    styles.bentoProgressBar,
                    {
                      width: `${Math.min(100, completionRate)}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          </TouchableOpacity>

          {/* Three Metric Cards Row */}
          <View style={styles.bentoRow}>
            {/* Attempted Card */}
            <TouchableOpacity
              style={[
                styles.bentoCardThird,
                {
                  backgroundColor: isDark ? "#064E3B20" : "#ECFDF5",
                  borderColor: isDark ? "#064E3B" : "#A7F3D0",
                },
              ]}
              onPress={() => router.push("/(tabs)/assignment")}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoSmallIconBox, { backgroundColor: "#10B98120" }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
              </View>
              <Text style={[styles.bentoHalfNumber, { color: "#10B981" }]}>{attemptedCount}</Text>
              <Text style={[styles.bentoHalfLabel, { color: isDark ? "#A7F3D0" : "#047857" }]}>
                Attempted
              </Text>
            </TouchableOpacity>

            {/* Pending Card */}
            <TouchableOpacity
              style={[
                styles.bentoCardThird,
                {
                  backgroundColor: isDark ? "#78350F20" : "#FEF3C7",
                  borderColor: isDark ? "#78350F" : "#FDE68A",
                },
              ]}
              onPress={() => router.push("/(tabs)/assignment")}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoSmallIconBox, { backgroundColor: "#F59E0B20" }]}>
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.bentoHalfNumber, { color: "#F59E0B" }]}>{pendingCount}</Text>
              <Text style={[styles.bentoHalfLabel, { color: isDark ? "#FDE68A" : "#B45309" }]}>Pending</Text>
            </TouchableOpacity>

            {/* Attendance Card */}
            <View
              style={[
                styles.bentoCardThird,
                {
                  backgroundColor: isDark ? "#1E1B4B20" : "#EEF2FF",
                  borderColor: isDark ? "#312E81" : "#C7D2FE",
                },
              ]}
            >
              <View style={[styles.bentoSmallIconBox, { backgroundColor: "#6366F120" }]}>
                <Ionicons name="calendar-outline" size={20} color="#6366F1" />
              </View>
              <Text style={[styles.bentoHalfNumber, { color: "#6366F1" }]}>{attendancePercent}%</Text>
              <Text style={[styles.bentoHalfLabel, { color: isDark ? "#C7D2FE" : "#4338CA" }]}>
                Attendance
              </Text>
            </View>
          </View>
        </View>

        {/* Today's Schedule Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Today's Schedule</Text>
        </View>

        {todayClasses.length === 0 ? (
          <View style={[styles.emptyScheduleCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Ionicons name="calendar-clear-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyScheduleText, { color: colors.textSecondary }]}>
              No classes scheduled for today
            </Text>
          </View>
        ) : (
          todayClasses.map((cls, idx) => (
            <View
              key={idx}
              style={[styles.classCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            >
              <View style={[styles.periodBox, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.periodText, { color: colors.primary }]}>{cls.period || `P${idx + 1}`}</Text>
              </View>
              <View style={styles.classDetails}>
                <Text style={[styles.className, { color: colors.textPrimary }]}>
                  {cls.subject_name || "General"}
                </Text>
                <Text style={[styles.classTeacher, { color: colors.textMuted }]}>
                  {cls.teacher_name || "Faculty"} {cls.room ? `• Room ${cls.room}` : ""}
                </Text>
              </View>
              {cls.start_time && (
                <Text style={[styles.classTime, { color: colors.textSecondary }]}>
                  {cls.start_time} - {cls.end_time || ""}
                </Text>
              )}
            </View>
          ))
        )}

        {/* School Notices Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>School Notices</Text>
        </View>

        {notices.length === 0 ? (
          <View style={[styles.emptyScheduleCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyScheduleText, { color: colors.textSecondary }]}>
              No active announcements from school
            </Text>
          </View>
        ) : (
          notices.map((notice) => (
            <TouchableOpacity
              key={notice.id}
              style={[styles.noticeCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              onPress={() => setSelectedNotice(notice)}
              activeOpacity={0.8}
            >
              <View style={styles.noticeHeader}>
                <View style={[styles.noticePill, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="megaphone-outline" size={12} color={colors.primary} />
                  <Text style={[styles.noticePillText, { color: colors.primary }]}>NOTICE</Text>
                </View>
                <Text style={[styles.noticeDate, { color: colors.textMuted }]}>
                  {notice.notice_date || ""}
                </Text>
              </View>

              <Text style={[styles.noticeTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {notice.title}
              </Text>
              <Text style={[styles.noticeMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                {notice.message}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <Modal
          visible={!!selectedNotice}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedNotice(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <View style={[styles.noticePill, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="megaphone-outline" size={14} color={colors.primary} />
                  <Text style={[styles.noticePillText, { color: colors.primary }]}>
                    {selectedNotice.notice_date}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedNotice(null)}>
                  <Ionicons name="close-circle-outline" size={26} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedNotice.title}</Text>

              <ScrollView style={styles.modalBody}>
                <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                  {selectedNotice.message}
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: colors.primary }]}
                onPress={() => setSelectedNotice(null)}
              >
                <Text style={styles.closeModalBtnText}>Close Notice</Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingCenterContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  heroBanner: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 14,
  },
  heroAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "#334155",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#0F172A",
  },
  heroMainInfo: {
    flex: 1,
  },
  admBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(61, 94, 225, 0.3)",
    borderColor: "rgba(61, 94, 225, 0.4)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    marginBottom: 6,
  },
  admBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  welcomeTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroMetaText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
  },
  viewAssignmentsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F59E0B",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: "flex-start",
    gap: 6,
    elevation: 2,
  },
  viewAssignmentsBtnText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  quickNavGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  quickNavCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickNavCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickNavLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  bentoGrid: {
    gap: 12,
    marginBottom: 20,
  },
  bentoHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  bentoHeroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  bentoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  bentoPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bentoHeroNumber: {
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 36,
  },
  bentoHeroSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  bentoHeroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  bentoProgressContainer: {
    marginTop: 6,
  },
  bentoProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  bentoProgressLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  bentoProgressPercent: {
    fontSize: 11,
    fontWeight: "700",
  },
  bentoProgressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  bentoProgressBar: {
    height: "100%",
    borderRadius: 4,
  },
  bentoRow: {
    flexDirection: "row",
    gap: 10,
  },
  bentoCardThird: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
  },
  bentoSmallIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  bentoHalfNumber: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  bentoHalfLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyScheduleCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyScheduleText: {
    fontSize: 13,
    marginTop: 8,
  },
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  periodBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  periodText: {
    fontSize: 12,
    fontWeight: "800",
  },
  classDetails: {
    flex: 1,
  },
  className: {
    fontSize: 14,
    fontWeight: "700",
  },
  classTeacher: {
    fontSize: 12,
    marginTop: 2,
  },
  classTime: {
    fontSize: 12,
    fontWeight: "600",
  },
  noticeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  noticeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  noticePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  noticePillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  noticeDate: {
    fontSize: 11,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  noticeMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxHeight: "80%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalBody: {
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 22,
  },
  closeModalBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  closeModalBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
