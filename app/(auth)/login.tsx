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
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { router } from "expo-router";

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const { login, requestPasscode, loginWithPasscode } = useAuth();

  // Authentication Mode: 'passcode' (modern OTP) or 'password' (fallback)
  const [authMethod, setAuthMethod] = useState<"passcode" | "password">("passcode");

  // Passcode flow step: 1 (Enter Identifier) or 2 (Enter 6-Digit Passcode)
  const [step, setStep] = useState<1 | 2>(1);

  // Common identifier: Admission Number, Email, or Phone
  const [identifier, setIdentifier] = useState("");

  // Password-based authentication states
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Passcode-based authentication states
  const [passcode, setPasscode] = useState("");
  const [testPasscode, setTestPasscode] = useState<string | null>(null);
  const [maskedIdentifier, setMaskedIdentifier] = useState("");
  const [requestingPasscode, setRequestingPasscode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const passcodeInputRef = useRef<TextInput>(null);

  const logoSource = isDark
    ? require("../../assets/images/logo_dark.png")
    : require("../../assets/images/logo_light.png");

  // Countdown timer for passcode resend cooldown
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Request 6-digit passcode
  const handleRequestPasscode = async () => {
    setErrorMessage("");
    const cleanId = identifier.trim();
    if (!cleanId) {
      const msg = "Please enter your Admission Number, Email, or Phone number.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    setRequestingPasscode(true);
    try {
      const resData = await requestPasscode(cleanId);
      setMaskedIdentifier(resData?.maskedIdentifier || cleanId);
      if (resData?.testPasscode) {
        setTestPasscode(String(resData.testPasscode));
      } else {
        setTestPasscode(null);
      }
      setPasscode("");
      setStep(2);
      setResendCooldown(30);

      Toast.show({
        type: "success",
        text1: "Passcode Generated! 🔑",
        text2: "A 6-digit passcode has been generated successfully.",
      });

      setTimeout(() => {
        passcodeInputRef.current?.focus();
      }, 300);
    } catch (err: any) {
      const msg = err.message || "Failed to request passcode. Please check your details.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Request Failed", text2: msg });
    } finally {
      setRequestingPasscode(false);
    }
  };

  // Verify 6-digit passcode & sign in
  const handleVerifyPasscode = async () => {
    setErrorMessage("");
    const cleanCode = passcode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      const msg = "Please enter the full 6-digit passcode.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    setLoading(true);
    try {
      await loginWithPasscode(identifier.trim(), cleanCode);
      Toast.show({
        type: "success",
        text1: "Welcome Back! 👋",
        text2: "Signed in successfully via passcode.",
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      const msg = err.message || "Invalid or expired 6-digit passcode. Please try again.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Verification Failed", text2: msg });
    } finally {
      setLoading(false);
    }
  };

  // Password-based login fallback
  const handlePasswordLogin = async () => {
    setErrorMessage("");
    const cleanId = identifier.trim();
    if (!cleanId) {
      const msg = "Please enter your Admission Number, Email, or Phone.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }
    if (!password.trim()) {
      const msg = "Please enter your Password.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    setLoading(true);
    try {
      await login(cleanId, password.trim());
      Toast.show({
        type: "success",
        text1: "Welcome Back! 👋",
        text2: "Signed in successfully.",
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      const msg = err.message || "Invalid credentials or account inactive.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Login Failed", text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password",
      "Please contact your school administrator to reset your password or log in using Passcode (OTP).",
      [{ text: "OK" }]
    );
  };

  // 6-digit interactive passcode boxes
  const renderPasscodeBoxes = () => {
    const digits = passcode.split("");
    return (
      <TouchableOpacity
        style={styles.passcodeContainer}
        activeOpacity={1}
        onPress={() => passcodeInputRef.current?.focus()}
      >
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const digit = digits[index] || "";
          const isCurrent =
            passcode.length === index || (passcode.length === 6 && index === 5);
          return (
            <View
              key={index}
              style={[
                styles.digitBox,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: isCurrent
                    ? colors.primary
                    : digit
                    ? colors.primary
                    : colors.border,
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
          ref={passcodeInputRef}
          style={styles.hiddenPasscodeInput}
          value={passcode}
          onChangeText={(text) =>
            setPasscode(text.replace(/[^0-9]/g, "").slice(0, 6))
          }
          keyboardType="number-pad"
          maxLength={6}
          autoFocus={step === 2}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mainContent}>
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
            </View>

            {/* Header Text Section */}
            <View style={styles.headerTextSection}>
              <View style={[styles.studentBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="school" size={14} color={colors.primary} />
                <Text style={[styles.studentBadgeText, { color: colors.primary }]}>
                  STUDENT PORTAL
                </Text>
              </View>
              <Text style={[styles.titleText, { color: colors.textPrimary }]}>
                {authMethod === "passcode" && step === 2
                  ? "Enter Passcode"
                  : "Student Sign In"}
              </Text>
              <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
                {authMethod === "passcode"
                  ? step === 1
                    ? "Sign in securely with a 6-digit passcode (OTP)"
                    : `Enter the 6-digit passcode sent to ${maskedIdentifier || identifier}`
                  : "Enter your admission credentials to sign in"}
              </Text>
            </View>

            {/* Authentication Method Segmented Tabs */}
            <View
              style={[
                styles.authMethodTabs,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.authMethodTab,
                  authMethod === "passcode" && { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  setAuthMethod("passcode");
                  setStep(1);
                  setPasscode("");
                  setErrorMessage("");
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="key-outline"
                  size={16}
                  color={authMethod === "passcode" ? "#FFFFFF" : colors.textMuted}
                />
                <Text
                  style={[
                    styles.authMethodTabText,
                    { color: authMethod === "passcode" ? "#FFFFFF" : colors.textMuted },
                  ]}
                >
                  Passcode (OTP)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.authMethodTab,
                  authMethod === "password" && { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  setAuthMethod("password");
                  setStep(1);
                  setErrorMessage("");
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={authMethod === "password" ? "#FFFFFF" : colors.textMuted}
                />
                <Text
                  style={[
                    styles.authMethodTabText,
                    { color: authMethod === "password" ? "#FFFFFF" : colors.textMuted },
                  ]}
                >
                  Password
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {!!errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: isDark ? "#7F1D1D" : "#FEE2E2" }]}>
                <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                <Text style={[styles.errorText, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* =================================================== */}
            {/* PASSCODE FLOW                                      */}
            {/* =================================================== */}
            {authMethod === "passcode" && (
              <>
                {step === 1 ? (
                  /* Step 1: Identifier Input */
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.textPrimary }]}>
                      Admission Number, Email, or Phone
                    </Text>
                    <View
                      style={[
                        styles.inputIconWrapper,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                        },
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color={colors.textMuted}
                        style={styles.inputAddonIcon}
                      />
                      <TextInput
                        style={[styles.textInput, { color: colors.textPrimary }]}
                        placeholder="e.g. ADM2026001, email or phone"
                        placeholderTextColor={colors.textMuted}
                        value={identifier}
                        onChangeText={setIdentifier}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleRequestPasscode}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.loginButton,
                        { backgroundColor: colors.primary },
                        requestingPasscode && styles.disabledBtn,
                      ]}
                      onPress={handleRequestPasscode}
                      disabled={requestingPasscode}
                      activeOpacity={0.8}
                    >
                      {requestingPasscode ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <View style={styles.btnRow}>
                          <Ionicons name="key" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.loginButtonText}>Generate 6-Digit Passcode</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Step 2: 6-Digit Passcode Input */
                  <View style={styles.formGroup}>
                    {/* Test Mode Autofill Banner */}
                    {testPasscode && (
                      <View
                        style={[
                          styles.testBanner,
                          {
                            backgroundColor: isDark ? "#451A03" : "#FEF3C7",
                            borderColor: isDark ? "#78350F" : "#FDE68A",
                          },
                        ]}
                      >
                        <View style={styles.testBannerHeader}>
                          <View style={styles.testBadge}>
                            <Ionicons name="flask-outline" size={12} color="#D97706" />
                            <Text style={styles.testBadgeText}>Development Passcode</Text>
                          </View>
                          <Text
                            style={[
                              styles.testExpireText,
                              { color: isDark ? "#FCD34D" : "#92400E" },
                            ]}
                          >
                            Valid for 10 mins
                          </Text>
                        </View>

                        <View style={styles.testCodeRow}>
                          <Text
                            style={[
                              styles.testCodeLabel,
                              { color: isDark ? "#FEF3C7" : "#78350F" },
                            ]}
                          >
                            Your Passcode:
                          </Text>
                          <View style={styles.testCodePill}>
                            <Text style={styles.testCodeText}>{testPasscode}</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[styles.autofillBtn, { backgroundColor: colors.primary }]}
                          onPress={() => setPasscode(testPasscode)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="copy-outline"
                            size={14}
                            color="#FFFFFF"
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.autofillBtnText}>Tap to Autofill Passcode</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <Text style={[styles.formLabel, { color: colors.textPrimary, textAlign: "center" }]}>
                      Enter 6-Digit Passcode
                    </Text>

                    {renderPasscodeBoxes()}

                    <View style={styles.passcodeActionsRow}>
                      <TouchableOpacity
                        onPress={() => {
                          setStep(1);
                          setPasscode("");
                        }}
                        activeOpacity={0.7}
                        style={styles.actionLinkBtn}
                      >
                        <Ionicons
                          name="pencil-outline"
                          size={14}
                          color={colors.textMuted}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.actionLinkText, { color: colors.textMuted }]}>
                          Change Identifier
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={resendCooldown > 0 || requestingPasscode}
                        onPress={handleRequestPasscode}
                        activeOpacity={0.7}
                        style={styles.actionLinkBtn}
                      >
                        <Ionicons
                          name="refresh-outline"
                          size={14}
                          color={resendCooldown > 0 ? colors.textMuted : colors.primary}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.actionLinkText,
                            {
                              color: resendCooldown > 0 ? colors.textMuted : colors.primary,
                              fontWeight: "700",
                            },
                          ]}
                        >
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Passcode"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.loginButton,
                        { backgroundColor: colors.primary },
                        (loading || passcode.length !== 6) && styles.disabledBtn,
                      ]}
                      onPress={handleVerifyPasscode}
                      disabled={loading || passcode.length !== 6}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <View style={styles.btnRow}>
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.loginButtonText}>Verify & Sign In</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* =================================================== */}
            {/* PASSWORD FLOW (FALLBACK)                            */}
            {/* =================================================== */}
            {authMethod === "password" && (
              <View style={styles.formGroup}>
                {/* Admission Number / Identifier */}
                <Text style={[styles.formLabel, { color: colors.textPrimary }]}>
                  Admission Number, Email, or Phone
                </Text>
                <View
                  style={[
                    styles.inputIconWrapper,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                >
                  <Ionicons name="id-card-outline" size={20} color={colors.textMuted} style={styles.inputAddonIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="Enter Admission No, Email or Phone"
                    placeholderTextColor={colors.textMuted}
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Password */}
                <Text style={[styles.formLabel, { color: colors.textPrimary, marginTop: 16 }]}>
                  Password
                </Text>
                <View
                  style={[
                    styles.passGroup,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputAddonIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="Enter Password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onSubmitEditing={handlePasswordLogin}
                  />
                  <TouchableOpacity
                    style={styles.eyeIconContainer}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {/* Remember Me & Forgot Password */}
                <View style={styles.optionsRow}>
                  <TouchableOpacity
                    style={styles.rememberMeGroup}
                    onPress={() => setRememberMe(!rememberMe)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: rememberMe ? colors.primary : colors.textMuted,
                          backgroundColor: rememberMe ? colors.primary : "transparent",
                        },
                      ]}
                    >
                      {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.rememberMeText, { color: colors.textSecondary }]}>
                      Remember me
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                    <Text style={[styles.forgotPassText, { color: colors.primary }]}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    { backgroundColor: colors.primary },
                    loading && styles.disabledBtn,
                  ]}
                  onPress={handlePasswordLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In with Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Help / Footer */}
            <View style={styles.footerSection}>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                Need help accessing your portal? Contact your school administration office.
              </Text>
            </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  mainContent: {
    width: "100%",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoImage: {
    width: 180,
    height: 48,
  },
  headerTextSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  studentBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    marginBottom: 10,
  },
  studentBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  authMethodTabs: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 20,
  },
  authMethodTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  authMethodTabText: {
    fontSize: 13,
    fontWeight: "700",
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
  formGroup: {
    width: "100%",
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputIconWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  inputAddonIcon: {
    marginRight: 10,
  },
  passGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
  },
  eyeIconContainer: {
    padding: 4,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 20,
  },
  rememberMeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  rememberMeText: {
    fontSize: 13,
  },
  forgotPassText: {
    fontSize: 13,
    fontWeight: "600",
  },
  loginButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  disabledBtn: {
    opacity: 0.65,
  },
  passcodeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 14,
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
    fontSize: 22,
    fontWeight: "700",
  },
  hiddenPasscodeInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
  },
  passcodeActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  actionLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: "600",
  },
  testBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  testBannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  testBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  testBadgeText: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "700",
  },
  testExpireText: {
    fontSize: 11,
    fontWeight: "600",
  },
  testCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  testCodeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  testCodePill: {
    backgroundColor: "#D9770620",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  testCodeText: {
    color: "#D97706",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 2,
  },
  autofillBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  autofillBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  footerSection: {
    alignItems: "center",
    marginTop: 28,
  },
  footerText: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
