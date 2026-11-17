import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useTheme } from "../context/ThemeContext";
import { authService } from "../services/authService";
import { router } from "expo-router";

export default function ChangePasswordScreen() {
  const { colors, isDark } = useTheme();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef<TextInput>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [emailMissingWarning, setEmailMissingWarning] = useState("");

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async () => {
    setErrorMsg("");
    setEmailMissingWarning("");

    if (!currentPassword.trim()) {
      const msg = "Please enter your current password.";
      setErrorMsg(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }
    if (!newPassword.trim()) {
      const msg = "Please enter a new password.";
      setErrorMsg(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }
    if (newPassword.length < 6) {
      const msg = "New password must be at least 6 characters.";
      setErrorMsg(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }
    if (newPassword !== confirmPassword) {
      const msg = "New password and confirmation do not match.";
      setErrorMsg(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    setLoading(true);
    try {
      const resData = await authService.requestChangePasswordOtp(
        currentPassword.trim(),
        newPassword.trim()
      );
      const masked = resData?.maskedEmail || "your registered email";
      setMaskedEmail(masked);
      setOtpCode("");
      setOtpStep(true);
      setResendCooldown(30);

      Toast.show({
        type: "success",
        text1: "OTP Sent",
        text2: `A 6-digit verification code has been sent to ${masked}.`,
      });

      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 250);
    } catch (err: any) {
      const msg = err.message || "Failed to send verification OTP.";
      if (err.emailMissing) {
        setEmailMissingWarning(msg);
      } else {
        setErrorMsg(msg);
      }
      Toast.show({ type: "error", text1: "Request Failed", text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmChangePassword = async () => {
    setErrorMsg("");
    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      const msg = "Please enter the complete 6-digit verification code.";
      setErrorMsg(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(
        currentPassword.trim(),
        newPassword.trim(),
        cleanOtp
      );

      Toast.show({
        type: "success",
        text1: "Password Updated",
        text2: "Your password has been changed successfully.",
      });

      Alert.alert(
        "Password Updated",
        "Your password has been changed successfully.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      const msg = err.message || "Failed to change password.";
      setErrorMsg(msg);
      Toast.show({ type: "error", text1: "Update Failed", text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const digits = otpCode.split("");

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Change Password</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Missing Email Warning Banner */}
          {!!emailMissingWarning && (
            <View
              style={[
                styles.warningBox,
                {
                  backgroundColor: isDark ? "#451A03" : "#FEF3C7",
                  borderColor: isDark ? "#78350F" : "#FDE68A",
                },
              ]}
            >
              <Ionicons name="warning-outline" size={20} color="#D97706" />
              <Text style={[styles.warningText, { color: isDark ? "#FCD34D" : "#991B1B" }]}>
                {emailMissingWarning}
              </Text>
            </View>
          )}

          {/* Error Banner */}
          {!!errorMsg && (
            <View style={[styles.errorBox, { backgroundColor: isDark ? "#7F1D1D" : "#FEE2E2" }]}>
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={[styles.errorText, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>
                {errorMsg}
              </Text>
            </View>
          )}

          {!otpStep ? (
            <View style={styles.formContainer}>
              {/* Current Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Current Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showCurrentPass}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPass(!showCurrentPass)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showCurrentPass ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.helperText, { color: colors.textMuted }]}>
                  Default password is your Date of Birth (DD-MM-YYYY)
                </Text>
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  New Password{" "}
                  <Text style={{ fontWeight: "400", fontSize: 12, color: colors.textMuted }}>
                    (min. 6 characters)
                  </Text>
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Ionicons name="key-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showNewPass}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPass(!showNewPass)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showNewPass ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm New Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Confirm New Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Ionicons name="checkmark-done-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showConfirmPass}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPass(!showConfirmPass)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirmPass ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={handleRequestOtp}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={[styles.otpTitle, { color: colors.textPrimary }]}>
                Verify 6-Digit Email OTP
              </Text>
              <Text style={[styles.otpSubtitle, { color: colors.textSecondary }]}>
                Enter the 6-digit verification code sent to{" "}
                <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{maskedEmail}</Text>.
              </Text>

              <TouchableOpacity
                style={styles.otpContainer}
                activeOpacity={1}
                onPress={() => otpInputRef.current?.focus()}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = digits[index] || "";
                  const isCurrent =
                    otpCode.length === index || (otpCode.length === 6 && index === 5);
                  return (
                    <View
                      key={index}
                      style={[
                        styles.digitBox,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: isCurrent || digit ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.digitText,
                          { color: digit ? colors.textPrimary : colors.textMuted },
                        ]}
                      >
                        {digit || "•"}
                      </Text>
                    </View>
                  );
                })}
                <TextInput
                  ref={otpInputRef}
                  style={styles.hiddenOtpInput}
                  value={otpCode}
                  onChangeText={(text) =>
                    setOtpCode(text.replace(/[^0-9]/g, "").slice(0, 6))
                  }
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </TouchableOpacity>

              <View style={styles.otpActionsRow}>
                <TouchableOpacity
                  onPress={() => {
                    setOtpStep(false);
                    setOtpCode("");
                    setErrorMsg("");
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                    Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleRequestOtp}
                  disabled={resendCooldown > 0 || loading}
                >
                  <Text
                    style={[
                      styles.linkText,
                      {
                        color: resendCooldown > 0 ? colors.textMuted : colors.primary,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: loading || otpCode.length !== 6 ? 0.65 : 1,
                  },
                ]}
                onPress={handleConfirmChangePassword}
                disabled={loading || otpCode.length !== 6}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Confirm & Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: 20,
    paddingBottom: 40,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  formContainer: {
    gap: 18,
  },
  requirementNote: {
    fontSize: 13,
    lineHeight: 19,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  helperText: {
    fontSize: 12,
    marginTop: 2,
    marginLeft: 2,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
    elevation: 2,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  otpSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
    position: "relative",
  },
  digitBox: {
    flex: 1,
    height: 52,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  digitText: {
    fontSize: 20,
    fontWeight: "700",
  },
  hiddenOtpInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
  },
  otpActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
