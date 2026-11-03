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

export default function TransportScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();

  const [transport, setTransport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadTransport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getTransport();
      setTransport(data);
    } catch {
      setTransport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadTransport();
    }
  }, [token, loadTransport]);

  const rows = transport
    ? [
        { label: "Route Name", value: transport.route_name || transport.transport_route || transport.route },
        { label: "Bus Name", value: transport.bus_name || transport.vehicle_name },
        {
          label: "Vehicle Number",
          value: transport.number_plate || transport.vehicle_number || transport.vehicle_no,
        },
        { label: "Pickup Point", value: transport.pickup_point },
        { label: "Drop Point", value: transport.drop_point },
        {
          label: "Fare",
          value:
            transport.fare || transport.monthly_fee
              ? `₹${Number(transport.fare || transport.monthly_fee).toLocaleString("en-IN")}`
              : null,
        },
        { label: "Driver Name", value: transport.driver_name },
        { label: "Driver Contact", value: transport.driver_phone || transport.driver_contact },
      ].filter((r) => r.value)
    : [];

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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Transport</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Assigned bus route, vehicle and pickup point
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
            onRefresh={loadTransport}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading && !transport ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !transport || rows.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Ionicons name="bus-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Transport Assigned
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              No school transport facility is currently assigned to your profile.
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            {rows.map((row, idx) => (
              <View
                key={row.label}
                style={[
                  styles.infoRow,
                  idx < rows.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{row.label}</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{row.value}</Text>
              </View>
            ))}
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  infoLabel: { fontSize: 13.5, fontWeight: "600" },
  infoValue: { fontSize: 14, fontWeight: "700" },
});
