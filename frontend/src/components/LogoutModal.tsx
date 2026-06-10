import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { LogOut, TriangleAlert } from "lucide-react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
};

export default function LogoutModal({ visible, onClose, onLogout }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <TriangleAlert size={34} color="#EF4444" />
          </View>

          <Text style={styles.title}>Log Out</Text>

          <Text style={styles.description}>
            Are you sure you want to log out of your account?
          </Text>

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable style={styles.logoutBtn} onPress={onLogout}>
              <LogOut size={16} color="#FFFFFF" />

              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
  },

  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },

  description: {
    marginTop: 10,
    textAlign: "center",
    color: "#64748B",
    fontSize: 15,
    lineHeight: 24,
  },

  buttonRow: {
    flexDirection: "row",
    marginTop: 28,
    gap: 12,
  },

  cancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },

  cancelText: {
    fontWeight: "600",
    color: "#64748B",
  },

  logoutBtn: {
    flex: 1,
    height: 54,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  logoutText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
