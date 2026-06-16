import React from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

type LoadingOverlayProps = {
  visible: boolean;
  text?: string;
  transparent?: boolean;
  style?: ViewStyle;
};

export function LoadingOverlay({
  visible,
  text = "Loading...",
  transparent = true,
  style,
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={transparent} animationType="fade">
      <View style={[styles.backdrop, style]}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.text}>{text}</Text>
        </View>
      </View>
    </Modal>
  );
}

export function InlineLoading({
  text = "Loading...",
}: {
  text?: string;
}) {
  return (
    <View style={styles.inline}>
      <ActivityIndicator size="small" color="#10B981" />
      <Text style={styles.inlineText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    minWidth: 160,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700",
    textAlign: "center",
  },
  inline: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  inlineText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
});