import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { getAvatarUrl } from "../../services/apiClient";
import { dashboardService } from "../../services/dashboardService";
import { StudentUserData } from "../../services/authService";

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { dashboardData, fetchDashboard, loadingDashboard } = useApp();
  const { user, token, logout } = useAuth();

  const [fullProfile, setFullProfile] = useState<StudentUserData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadFullProfile = async () => {
    setProfileLoading(true);
    try {
      const data = await dashboardService.getProfile();
      if (data) {
        setFullProfile(data);
      }
    } catch (e) {
      // If profile endpoint fails, rely on dashboard student profile
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadFullProfile();
      if (!dashboardData) {
        fetchDashboard();
      }
    }
  }, [token, dashboardData, fetchDashboard]);

  const apiStudent = fullProfile || dashboardData?.student;

  const studentName =
    apiStudent?.full_name ||
    apiStudent?.fullName ||
    (apiStudent?.first_name ? `${apiStudent.first_name} ${apiStudent.last_name || ""}`.trim() : "") ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "") ||
    "Student";

  const admissionNo = apiStudent?.admission_number || user?.admission_number || "-";
  const studentId = apiStudent?.id || user?.id || "-";
  const rawPicture = apiStudent?.picture || user?.picture || "";
  const avatarUri = getAvatarUrl(rawPicture, apiStudent?.gender);

  const className = apiStudent?.class_name || user?.class_name || user?.class_id || "-";
  const sectionName = apiStudent?.section_name || user?.section_name || user?.section_id || "-";
  const rollNumber = apiStudent?.roll_number || user?.roll_number || "-";
  const emailAddress = apiStudent?.email_address || user?.email_address || "-";
  const contactNumber = apiStudent?.primary_contact_number || "-";

  const formatDob = (dobStr?: string) => {
    if (!dobStr) return "-";
    try {
      const dateOnly = dobStr.split(" ")[0];
      const parts = dateOnly.split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const months = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        const monthIdx = parseInt(month, 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${day} ${months[monthIdx]} ${year}`;
        }
      }
      return dateOnly;
    } catch {
      return dobStr;
    }
  };

  const addressObj = apiStudent?.address_info;
  const fullAddress = addressObj
    ? [addressObj.address1, addressObj.city_name, addressObj.state_name, addressObj.postal_code]
        .filter(Boolean)
        .join(", ")
    : "-";

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out from GrowVidya Student?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Student Profile</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              View your academic identity and account details
            </Text>
          </View>
          {(loadingDashboard || profileLoading) && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          token ? (
            <RefreshControl
              refreshing={loadingDashboard || profileLoading}
              onRefresh={() => {
                loadFullProfile();
                fetchDashboard();
              }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          ) : undefined
        }
      >
        {/* Profile Identity Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <Text style={[styles.name, { color: colors.textPrimary }]}>{studentName}</Text>
          <Text style={[styles.idBadge, { color: colors.primary, backgroundColor: colors.primaryLight }]}>
            Student ID: #{studentId}
          </Text>

          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Class & Sec</Text>
              <Text style={[styles.gridValue, { color: colors.textPrimary }]}>
                {className} - {sectionName}
              </Text>
            </View>
            <View style={[styles.columnDivider, { backgroundColor: colors.border }]} />
            <View style={styles.gridItem}>
              <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Adm. No.</Text>
              <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{admissionNo}</Text>
            </View>
            <View style={[styles.columnDivider, { backgroundColor: colors.border }]} />
            <View style={styles.gridItem}>
              <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Roll No.</Text>
              <Text style={[styles.gridValue, { color: colors.primary }]}>{rollNumber}</Text>
            </View>
          </View>
        </View>

        {/* Academic Details Section */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Personal & Contact Info</Text>

        <View style={[styles.infoGroup, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {/* Date of Birth */}
          {apiStudent?.date_of_birth && (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date of Birth (DOB)</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {formatDob(apiStudent.date_of_birth)}
                  </Text>
                </View>
              </View>
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
            </>
          )}

          {/* Email Address */}
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Email Address</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{emailAddress}</Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Primary Contact */}
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Primary Contact</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{contactNumber}</Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Address */}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Address</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{fullAddress}</Text>
            </View>
          </View>

          {/* Gender & Blood Group Row */}
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <View style={styles.splitInfoRow}>
            <View style={styles.halfInfoCol}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Gender</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {apiStudent?.gender_name || (apiStudent?.gender === 1 ? "Male" : "Female")}
                </Text>
              </View>
            </View>

            <View style={[styles.columnDivider, { backgroundColor: colors.border }]} />

            <View style={styles.halfInfoCol}>
              <Ionicons name="water-outline" size={20} color="#EF4444" />
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Blood Group</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {apiStudent?.blood_group_name || "-"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Account Settings</Text>

        <View style={[styles.infoGroup, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {/* Dark Mode Switch */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={colors.primary} />
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Change Password */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push("/change-password")}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="key-outline" size={20} color={colors.primary} />
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: "#EF4444" }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out from GrowVidya</Text>
        </TouchableOpacity>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: "#CBD5E1",
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  idBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },
  gridItem: {
    flex: 1,
    alignItems: "center",
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  columnDivider: {
    width: 1,
    height: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 8,
  },
  infoGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowDivider: {
    height: 1,
    marginLeft: 46,
  },
  splitInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  halfInfoCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
    marginBottom: 20,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },
});
