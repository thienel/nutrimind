import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, Pressable } from "react-native";
import { WifiOff, RefreshCcw, CheckCircle, AlertTriangle, ChevronRight } from "lucide-react-native";
import { useNetwork } from "@/context/NetworkContext";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

interface OfflineBannerProps {
  /** Nếu true, banner sẽ push content xuống thay vì overlay */
  pushContent?: boolean;
}

export function OfflineBanner({ pushContent = false }: OfflineBannerProps) {
  const { isOnline, isSyncing, showSyncSuccess, pendingSyncCount } = useNetwork();
  const { counts, refresh } = useSyncStatus();
  const insets = useSafeAreaInsets();
  
  // Lấy tổng pending từ cả NetworkContext (update nhanh) và SQLite hook
  const totalPending = pendingSyncCount > 0 ? pendingSyncCount : (counts.pending + counts.processing);
  const hasFailed = counts.failed > 0;

  // Refresh status liên tục khi có mạng để cập nhật failed/pending chính xác
  useEffect(() => {
    refresh();
  }, [isOnline, isSyncing, showSyncSuccess, refresh]);

  // Animation values
  const anim = useRef(new Animated.Value(0)).current;

  // Determine which banner to show
  let show = false;
  let bgColor = "#64748B"; // Mặc định xám
  let Icon = WifiOff;
  let text = "Đang offline";
  let showDetailBtn = false;

  if (!isOnline) {
    show = true;
    if (totalPending > 0) {
      bgColor = "#F59E0B"; // Vàng
      text = "Đang offline — dữ liệu sẽ được lưu khi có mạng";
    }
  } else {
    if (hasFailed) {
      show = true;
      bgColor = "#EF4444"; // Đỏ
      Icon = AlertTriangle;
      text = "Một số dữ liệu chưa đồng bộ được";
      showDetailBtn = true;
    } else if (isSyncing) {
      show = true;
      bgColor = "#3B82F6"; // Xanh dương
      Icon = RefreshCcw;
      text = "Đang đồng bộ...";
    } else if (showSyncSuccess) {
      show = true;
      bgColor = "#10B981"; // Xanh lá
      Icon = CheckCircle;
      text = "Đã đồng bộ";
    }
  }

  useEffect(() => {
    Animated.spring(anim, {
      toValue: show ? 1 : 0,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [show, anim]);

  const height = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 44],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.8, 1],
  });

  const content = (
    <View style={styles.inner}>
      <Icon size={14} color="#fff" />
      <Text style={styles.text}>{text}</Text>
      {showDetailBtn && (
        <Pressable 
          style={styles.detailBtn}
          onPress={() => router.push("/sync-status")}
        >
          <Text style={styles.detailText}>Xem chi tiết</Text>
          <ChevronRight size={14} color="#fff" />
        </Pressable>
      )}
    </View>
  );

  if (pushContent) {
    return (
      <Animated.View style={[styles.banner, { height, opacity, backgroundColor: bgColor }]}>
        {content}
      </Animated.View>
    );
  }

  // Absolute overlay mode
  return (
    <Animated.View
      style={[
        styles.banner,
        styles.overlay,
        { height, opacity, top: insets.top, backgroundColor: bgColor },
      ]}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    overflow: "hidden",
    zIndex: 999,
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginRight: 2,
  }
});
