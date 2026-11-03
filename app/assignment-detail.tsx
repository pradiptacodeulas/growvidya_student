import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { useTheme } from "../context/ThemeContext";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import {
  assignmentService,
  AssignmentAttemptDetails,
  SubmitAttemptResult,
} from "../services/assignmentService";

export default function AssignmentDetailScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { token } = useAuth();
  const { fetchAssignments, fetchDashboard } = useApp();

  const params = useLocalSearchParams<{
    id: string;
    title?: string;
    subject?: string;
    status?: string;
    score?: string;
  }>();

  const assignmentId = params.id;
  const isInitiallyAttempted = params.status === "Attempted" || !!params.score;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [detailData, setDetailData] = useState<AssignmentAttemptDetails | null>(null);
  const [isResultView, setIsResultView] = useState(isInitiallyAttempted);

  // Student answer choices: questionId -> optionId
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string | number, string | number>>({});
  const [submitResult, setSubmitResult] = useState<SubmitAttemptResult | null>(null);

  const loadData = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);
    setErrorMsg("");

    try {
      if (isResultView) {
        const res = await assignmentService.getAssignmentResult(assignmentId);
        if (res.success && res.data) {
          setDetailData(res.data);
        } else {
          // If result not found, fallback to attempt endpoint
          const attemptRes = await assignmentService.getAssignmentForAttempt(assignmentId);
          if (attemptRes.success && attemptRes.data) {
            setDetailData(attemptRes.data);
            if (!attemptRes.data.alreadyAttempted) {
              setIsResultView(false);
            }
          } else {
            setErrorMsg(res.error || "Failed to load assignment.");
          }
        }
      } else {
        const res = await assignmentService.getAssignmentForAttempt(assignmentId);
        if (res.success && res.data) {
          setDetailData(res.data);
          if (res.data.alreadyAttempted) {
            // Already attempted, fetch full result with correct answers
            setIsResultView(true);
            const resultRes = await assignmentService.getAssignmentResult(assignmentId);
            if (resultRes.success && resultRes.data) {
              setDetailData(resultRes.data);
            }
          }
        } else {
          setErrorMsg(res.error || "Failed to load assignment.");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while loading assignment.");
    } finally {
      setLoading(false);
    }
  }, [assignmentId, isResultView]);

  useEffect(() => {
    if (token && assignmentId) {
      loadData();
    }
  }, [token, assignmentId, loadData]);

  const handleSelectAnswer = (questionId: string | number, optionId: string | number) => {
    if (isResultView || submitting) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = () => {
    if (!detailData || !detailData.questions || submitting) return;

    const totalQuestions = detailData.questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;

    if (answeredCount < totalQuestions) {
      Alert.alert(
        "Incomplete Submission",
        `You have answered ${answeredCount} of ${totalQuestions} questions. Do you want to submit anyway?`,
        [
          { text: "Continue Quiz", style: "cancel" },
          { text: "Submit Now", onPress: executeSubmission },
        ]
      );
    } else {
      Alert.alert(
        "Confirm Submission",
        "Are you ready to submit your answers? You cannot change them once submitted.",
        [
          { text: "Review", style: "cancel" },
          { text: "Submit", onPress: executeSubmission },
        ]
      );
    }
  };

  const executeSubmission = async () => {
    if (!assignmentId || submitting) return;
    setSubmitting(true);

    try {
      const res = await assignmentService.submitAssignment(assignmentId, selectedAnswers);
      if (res.success && res.data) {
        setSubmitResult(res.data);
        Toast.show({
          type: "success",
          text1: "Assignment Submitted! 🎉",
          text2: `You scored ${res.data.correctAnswersCount}/${res.data.totalQuestions} (${res.data.scorePercentage}%)`,
        });

        // Refresh global state
        fetchAssignments();
        fetchDashboard();

        // Switch to result view
        setIsResultView(true);
        const resultRes = await assignmentService.getAssignmentResult(assignmentId);
        if (resultRes.success && resultRes.data) {
          setDetailData(resultRes.data);
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Submission Failed",
          text2: res.error || "Failed to submit assignment.",
        });
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Submission Error",
        text2: err.message || "Network error submitting assignment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const assignment = detailData?.assignment;
  const questions = detailData?.questions || [];
  const attempt = detailData?.attempt;
  const scorePercent =
    submitResult?.scorePercentage ?? attempt?.score_percentage ?? params.score;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.headerBar, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {assignment?.title || params.title || "Assignment Detail"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.primary }]}>
            {assignment?.subject_name || params.subject || "Subject"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading questions & assessment...
          </Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Unable to Load</Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>{errorMsg}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={loadData}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Result Score Banner if Attempted */}
          {isResultView && (
            <View
              style={[
                styles.resultBanner,
                {
                  backgroundColor: isDark ? "#064E3B25" : "#ECFDF5",
                  borderColor: isDark ? "#064E3B" : "#A7F3D0",
                },
              ]}
            >
              <View style={styles.resultLeft}>
                <Ionicons name="trophy" size={32} color="#10B981" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.resultTitle, { color: isDark ? "#A7F3D0" : "#047857" }]}>
                    Attempt Completed
                  </Text>
                  <Text style={[styles.resultSubtitle, { color: isDark ? "#6EE7B7" : "#065F46" }]}>
                    {attempt?.correct_answers != null
                      ? `Correct: ${attempt.correct_answers} / ${attempt.total_questions}`
                      : "Your submission has been recorded."}
                  </Text>
                </View>
              </View>

              {scorePercent != null && (
                <View style={[styles.scoreBadge, { backgroundColor: "#10B981" }]}>
                  <Text style={styles.scoreBadgeText}>{Math.round(Number(scorePercent))}%</Text>
                </View>
              )}
            </View>
          )}

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Type</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {assignment?.assignment_type || assignment?.type_name || "Homework"}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Questions</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {questions.length} Questions
                </Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Due Date</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  {assignment?.due_date || "No deadline"}
                </Text>
              </View>
            </View>
          </View>

          {/* Questions Section */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {isResultView ? "Assessment Review" : "Questions"}
          </Text>

          {questions.length === 0 ? (
            <View style={[styles.emptyQuestionsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyQuestionsText, { color: colors.textSecondary }]}>
                No questions found for this assignment.
              </Text>
            </View>
          ) : (
            questions.map((q, qIndex) => {
              const studentChoice =
                selectedAnswers[q.id] ?? q.studentSubmission?.selected_answer_id;

              return (
                <View
                  key={q.id}
                  style={[styles.questionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                >
                  <View style={styles.questionHeader}>
                    <View style={[styles.questionNumberBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.questionNumberText, { color: colors.primary }]}>
                        Q{qIndex + 1}
                      </Text>
                    </View>
                    {isResultView && q.studentSubmission && (
                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor: q.studentSubmission.is_correct === 1 ? "#ECFDF5" : "#FEE2E2",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            q.studentSubmission.is_correct === 1
                              ? "checkmark-circle"
                              : "close-circle"
                          }
                          size={14}
                          color={q.studentSubmission.is_correct === 1 ? "#10B981" : "#EF4444"}
                        />
                        <Text
                          style={[
                            styles.statusPillText,
                            {
                              color:
                                q.studentSubmission.is_correct === 1 ? "#10B981" : "#EF4444",
                            },
                          ]}
                        >
                          {q.studentSubmission.is_correct === 1 ? "Correct" : "Incorrect"}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.questionText, { color: colors.textPrimary }]}>
                    {q.question}
                  </Text>

                  {/* Options */}
                  <View style={styles.optionsList}>
                    {(q.options || []).map((opt) => {
                      const isSelected = String(studentChoice) === String(opt.id);
                      const isCorrect = isResultView && opt.is_correct === 1;
                      const isWrongSelection = isResultView && isSelected && opt.is_correct === 0;

                      let borderColor = colors.border;
                      let bgColor = colors.surfaceSubtle;

                      if (isResultView) {
                        if (isCorrect) {
                          borderColor = "#10B981";
                          bgColor = isDark ? "#064E3B30" : "#ECFDF5";
                        } else if (isWrongSelection) {
                          borderColor = "#EF4444";
                          bgColor = isDark ? "#7F1D1D30" : "#FEE2E2";
                        }
                      } else if (isSelected) {
                        borderColor = colors.primary;
                        bgColor = colors.primaryLight;
                      }

                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.optionItem,
                            {
                              backgroundColor: bgColor,
                              borderColor: borderColor,
                              borderWidth: isSelected || isCorrect ? 1.5 : 1,
                            },
                          ]}
                          onPress={() => handleSelectAnswer(q.id, opt.id)}
                          disabled={isResultView || submitting}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.radioCircle,
                              {
                                borderColor: isSelected
                                  ? colors.primary
                                  : isCorrect
                                  ? "#10B981"
                                  : colors.border,
                                backgroundColor: isSelected ? colors.primary : "transparent",
                              },
                            ]}
                          >
                            {isSelected && <View style={styles.radioInner} />}
                          </View>

                          <Text
                            style={[
                              styles.optionText,
                              {
                                color: isCorrect
                                  ? "#10B981"
                                  : isWrongSelection
                                  ? "#EF4444"
                                  : isSelected
                                  ? colors.primary
                                  : colors.textPrimary,
                                fontWeight: isSelected || isCorrect ? "600" : "400",
                              },
                            ]}
                          >
                            {opt.answer}
                          </Text>

                          {isResultView && (
                            <View style={styles.optionRightIcon}>
                              {isCorrect && (
                                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                              )}
                              {isWrongSelection && (
                                <Ionicons name="close-circle" size={18} color="#EF4444" />
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}

          {/* Submit Button for pending attempts */}
          {!isResultView && questions.length > 0 && (
            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: submitting ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Submit Assignment</Text>
                </>
              )}
            </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 6,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  resultBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  resultLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  resultSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreBadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  infoCol: {
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  emptyQuestionsCard: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyQuestionsText: {
    fontSize: 13,
    marginTop: 8,
  },
  questionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  questionNumberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  questionNumberText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  questionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    marginBottom: 14,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  optionText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 18,
  },
  optionRightIcon: {
    marginLeft: 8,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
    elevation: 3,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
