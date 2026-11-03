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

export default function ExamResultsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();

  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const list = await dashboardService.getExamResults();
      setExams(Array.isArray(list) ? list : []);
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadResults();
    }
  }, [token, loadResults]);

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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Exam Results</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Examination marksheets and grades
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
            onRefresh={loadResults}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading && exams.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : exams.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Ionicons name="ribbon-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Exam Results Published
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Exam marksheets will appear here once published.
            </Text>
          </View>
        ) : (
          exams.map((exam, eIdx) => {
            const subjects: any[] = exam.subjects || exam.marks || [];
            return (
              <View
                key={exam.id || eIdx}
                style={[
                  styles.examCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                <View style={[styles.examHeader, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.examTitle, { color: colors.textPrimary }]}>
                      {exam.exam_name || exam.name}
                    </Text>
                    {exam.academic_year ? (
                      <Text style={[styles.examMeta, { color: colors.textMuted }]}>
                        {exam.academic_year}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.badgeGroup}>
                    {exam.percentage != null && (
                      <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>
                          {exam.percentage}%
                        </Text>
                      </View>
                    )}
                    {(exam.overallGrade || exam.grade) ? (
                      <View style={[styles.badge, { backgroundColor: "#10B98120" }]}>
                        <Text style={[styles.badgeText, { color: "#10B981" }]}>
                          {exam.overallGrade || exam.grade}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {subjects.map((sub, sIdx) => {
                  const obtained = sub.obtained ?? sub.marks_obtained ?? sub.obtained_marks ?? 0;
                  const fullMarks = sub.full_marks ?? sub.max_marks ?? 0;
                  const subGrade = sub.grade_name || sub.grade;
                  return (
                    <View
                      key={sub.id || sIdx}
                      style={[
                        styles.subjectRow,
                        sIdx < subjects.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.subjectName, { color: colors.textPrimary }]}>
                        {sub.subject_name || sub.subject}
                      </Text>
                      <Text style={[styles.marksText, { color: colors.textSecondary }]}>
                        {obtained} / {fullMarks}
                      </Text>
                      {subGrade && subGrade !== "-" ? (
                        <Text style={[styles.gradeText, { color: colors.primary }]}>{subGrade}</Text>
                      ) : null}
                    </View>
                  );
                })}
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
  examCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  examHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
  },
  examTitle: { fontSize: 15, fontWeight: "700" },
  examMeta: { fontSize: 12, marginTop: 2 },
  badgeGroup: { flexDirection: "row", gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  subjectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  subjectName: { flex: 1, fontSize: 13.5, fontWeight: "600" },
  marksText: { fontSize: 13, fontWeight: "600", marginHorizontal: 12 },
  gradeText: { fontSize: 13, fontWeight: "700", minWidth: 28, textAlign: "right" },
});
