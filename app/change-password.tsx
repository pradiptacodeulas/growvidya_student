import React, { useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { router } from "expo-router";

export default function ChangePasswordScreen() {
  const { colors, isDark } = useTheme();
  const { token } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChangePassword = async () => {
    setErrorMsg("");

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
    if (newPassword.length < 4) {
      const msg = "New password must be at least 4 characters.";
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
      await authService.changePassword(currentPassword.trim(), newPassword.trim());

      Toast.show({
        type: "success",
        text1: "Password Updated 🔒",
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
      const msg = err.message || "Failed to change password. Please check your current password.";
      setErrorMsg(msg);
      Toast.show({ type: "error", text1: "Update Failed", text2: msg });
    } finally {
      setLoading(false);
    }
  };

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
          {/* Top Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
            <Text style={[styles.infoBannerText, { color: colors.primary }]}>
              Enter your current password (or Date of Birth, e.g. DD-MM-YYYY) followed by a secure new password of at least 4 characters.
            </Text>
          </View>

          {/* Error Banner */}
          {!!errorMsg && (
            <View style={[styles.errorBox, { backgroundColor: isDark ? "#7F1D1D" : "#FEE2E2" }]}>
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={[styles.errorText, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>
                {errorMsg}
              </Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Current Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="Enter current password or DOB (DD-MM-YYYY)"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showCurrentPass}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  autoCapitalize="none"
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
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>New Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Ionicons name="key-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="Enter new password (min. 4 chars)"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showNewPass}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
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
              onPress={handleChangePassword}
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
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    gap: 12,
    marginBottom: 20,
  },
  infoBannerText: {
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
});
