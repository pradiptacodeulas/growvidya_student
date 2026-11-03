import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../services/dashboardService";
import { getFileUrl } from "../services/apiClient";

export default function DocumentsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const list = await dashboardService.getDocuments();
      setDocuments(Array.isArray(list) ? list : []);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadDocuments();
    }
  }, [token, loadDocuments]);

  const handleOpenDocument = (rawPath?: string) => {
    const url = getFileUrl(rawPath);
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Documents</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Uploaded certificates and verification files
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
            onRefresh={loadDocuments}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading && documents.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : documents.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Ionicons name="documents-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Documents Uploaded
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              No certificates or identification documents are linked to your profile.
            </Text>
          </View>
        ) : (
          documents.map((doc, idx) => {
            const rawPath =
              doc.file_url ||
              doc.attachments ||
              doc.document_file ||
              doc.file_path ||
              doc.attachment;
            const docTitle =
              doc.document_type_name ||
              doc.title ||
              doc.file_name ||
              (typeof doc.document_type === "string" && isNaN(Number(doc.document_type))
                ? doc.document_type
                : "") ||
              `Document #${idx + 1}`;
            const subLabel =
              doc.file_name && doc.file_name !== docTitle
                ? doc.file_name
                : doc.created_at
                ? String(doc.created_at).slice(0, 10)
                : "";

            return (
              <View
                key={doc.id || idx}
                style={[
                  styles.card,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardInfo}>
                  <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.docTitle, { color: colors.textPrimary }]}>
                      {docTitle}
                    </Text>
                    {subLabel ? (
                      <Text style={[styles.docType, { color: colors.textMuted }]} numberOfLines={1}>
                        {subLabel}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {rawPath ? (
                  <TouchableOpacity
                    style={[styles.openBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleOpenDocument(rawPath)}
                  >
                    <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.openBtnText}>View</Text>
                  </TouchableOpacity>
                ) : null}
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
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardInfo: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 10 },
  docTitle: { fontSize: 14.5, fontWeight: "700" },
  docType: { fontSize: 12, marginTop: 2 },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  openBtnText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "700" },
});
