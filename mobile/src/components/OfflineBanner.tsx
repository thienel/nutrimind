/**
 * OfflineBanner — thin strip hiển thị trạng thái offline
 *
 * Animate vào khi mất mạng, animate ra khi có mạng trở lại.
 * Đặt ở đầu mỗi màn hình hoặc trong root layout.
 */

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { WifiOff } from "lucide-react-native";
import { useNetwork } from "@/context/NetworkContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface OfflineBannerProps {
  /** Nếu true, banner sẽ push content xuống thay vì overlay */
  pushContent?: boolean;
}

export function OfflineBanner({ pushContent = false }: OfflineBannerProps) {
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isOnline ? 0 : 1,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [isOnline, anim]);

  const height = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 44],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.8, 1],
  });

  if (pushContent) {
    return (
      <Animated.View style={[styles.banner, { height, opacity }]}>
        <View style={styles.inner}>
          <WifiOff size={14} color="#fff" />
          <Text style={styles.text}>Bạn đang offline — Data được lưu local</Text>
        </View>
      </Animated.View>
    );
  }

  // Absolute overlay mode
  return (
    <Animated.View
      style={[
        styles.banner,
        styles.overlay,
        { height, opacity, top: insets.top },
      ]}
    >
      <View style={styles.inner}>
        <WifiOff size={14} color="#fff" />
        <Text style={styles.text}>Bạn đang offline — Data được lưu local</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#F59E0B",
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
  },
});
