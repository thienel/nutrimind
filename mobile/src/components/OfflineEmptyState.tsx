import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { WifiOff, RefreshCw } from "lucide-react-native";
import { useNetwork } from "@/context/NetworkContext";

interface OfflineEmptyStateProps {
  onRetry?: () => void;
}

export function OfflineEmptyState({ onRetry }: OfflineEmptyStateProps) {
  const { triggerSync } = useNetwork();

  const handleRetry = () => {
    triggerSync();
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <WifiOff size={48} color="#94A3B8" />
        <View style={styles.slash} />
      </View>
      
      <Text style={styles.title}>Đang ngoại tuyến</Text>
      
      <Text style={styles.desc}>
        Tính năng này cần kết nối internet để hoạt động.
      </Text>
      
      <Pressable style={styles.retryBtn} onPress={handleRetry}>
        <RefreshCw size={16} color="#FFFFFF" />
        <Text style={styles.retryText}>Thử lại</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#F7F9F8",
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
  },
  slash: {
    position: "absolute",
    width: 4,
    height: 60,
    backgroundColor: "#94A3B8",
    transform: [{ rotate: "45deg" }],
    borderRadius: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  desc: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
