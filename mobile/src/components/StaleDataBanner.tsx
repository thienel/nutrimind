/**
 * StaleDataBanner — thông báo nhẹ khi đang hiển thị cached data
 *
 * §3.3: Dùng trong màn hình Profile khi offline + có cached data.
 * Màu xám nhẹ, không gây lo lắng, chỉ thông báo.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Clock } from "lucide-react-native";

interface StaleDataBannerProps {
  lastUpdated?: Date | null;
  message?: string;
}

function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return "chưa rõ";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  return `${diffDay} ngày trước`;
}

export function StaleDataBanner({
  lastUpdated,
  message,
}: StaleDataBannerProps) {
  const timeStr = formatRelativeTime(lastUpdated);
  const displayMsg =
    message ??
    `Đang hiển thị dữ liệu đã lưu (cập nhật ${timeStr}). Kết nối mạng để đồng bộ.`;

  return (
    <View style={styles.container}>
      <Clock size={13} color="#64748B" />
      <Text style={styles.text}>{displayMsg}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginHorizontal: 0,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
  },
});
