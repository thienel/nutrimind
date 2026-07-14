import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { CheckCircle2, Clock, XCircle, ArrowLeft } from "lucide-react-native";
import { router } from "expo-router";

export function SyncStatus() {
  const {
    counts,
    failedItems,
    isLoading,
    handleRetryAll,
    handleDismissAll,
    handleManualSync,
  } = useSyncStatus();

  const onSyncPress = async () => {
    const result = await handleManualSync();
    if (result) {
      if (result.failed > 0) {
        Alert.alert("Đồng bộ", `Đã đồng bộ ${result.synced} mục, ${result.failed} mục thất bại.`);
      } else if (result.synced > 0) {
        Alert.alert("Đồng bộ", `Đồng bộ thành công ${result.synced} mục.`);
      } else {
        Alert.alert("Đồng bộ", "Không có dữ liệu mới để đồng bộ.");
      }
    } else {
      Alert.alert("Lỗi", "Không thể thực hiện đồng bộ.");
    }
  };

  // Helper parse JSON để lấy thông tin hiển thị
  const renderItemTitle = (entityType: string, payloadStr: string) => {
    try {
      const p = JSON.parse(payloadStr);
      const date = p.logged_date ? p.logged_date.slice(5) : "—";
      
      switch (entityType) {
        case "meal":
          return `• ${p.food_name || "Bữa ăn"} — ${date}`;
        case "water":
          return `• Nước — ${date} (${p.volume_ml}ml)`;
        case "weight":
          return `• Cân nặng — ${date} (${p.weight_kg}kg)`;
        default:
          return `• ${entityType} — ${date}`;
      }
    } catch {
      return `• Không rõ — lỗi đọc dữ liệu`;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  const hasFailed = counts.failed > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Đồng bộ dữ liệu</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.statRow}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={styles.statText}>Đã đồng bộ: {counts.done} mục</Text>
          </View>

          <View style={styles.statRow}>
            <Clock size={20} color="#F59E0B" />
            <Text style={styles.statText}>
              Đang chờ: {counts.pending + counts.processing} mục
            </Text>
          </View>

          <View style={styles.statRow}>
            <XCircle size={20} color="#EF4444" />
            <Text style={styles.statText}>Thất bại: {counts.failed} mục</Text>
          </View>

          <View style={styles.syncNowContainer}>
            <Pressable style={styles.syncNowBtn} onPress={onSyncPress}>
              <Text style={styles.syncNowBtnText}>Đồng bộ ngay</Text>
            </Pressable>
          </View>

          {hasFailed && (
            <View style={styles.failedSection}>
              <View style={styles.divider} />
              <Text style={styles.failedTitle}>
                {counts.failed} mục không thể đồng bộ:
              </Text>
              
              <View style={styles.failedList}>
                {failedItems.map((item) => (
                  <Text key={item.id} style={styles.failedItem}>
                    {renderItemTitle(item.entity_type, item.payload)}
                  </Text>
                ))}
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={handleRetryAll}
                >
                  <Text style={styles.btnPrimaryText}>Thử lại</Text>
                </Pressable>

                <Pressable
                  style={[styles.btn, styles.btnSecondary]}
                  onPress={handleDismissAll}
                >
                  <Text style={styles.btnSecondaryText}>Bỏ qua tất cả</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F9F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginTop: 12,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },
  failedSection: {
    marginTop: 4,
  },
  failedTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#EF4444",
    marginBottom: 12,
  },
  failedList: {
    marginBottom: 20,
  },
  failedItem: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 8,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: "#10B981",
    marginRight: 8,
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  btnSecondary: {
    backgroundColor: "#FEF2F2",
    marginLeft: 8,
  },
  btnSecondaryText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 15,
  },
  syncNowContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 16,
  },
  syncNowBtn: {
    backgroundColor: "#3B82F6",
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  syncNowBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
