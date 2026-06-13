import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react-native";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastOptions = {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
};

type ToastState = Required<Pick<ToastOptions, "type" | "message" | "duration">> &
  Pick<ToastOptions, "title"> & {
    id: number;
  };

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);

  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }

  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-14)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -14,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    ({
      type = "info",
      title,
      message,
      duration = 2600,
    }: ToastOptions) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToast({
        id: Date.now(),
        type,
        title,
        message,
        duration,
      });

      opacity.setValue(0);
      translateY.setValue(-14);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [hideToast, opacity, translateY]
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}

      {toast ? (
        <SafeAreaView pointerEvents="box-none" style={styles.host}>
          <Animated.View
            style={[
              styles.toast,
              styles[toast.type],
              {
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={styles.iconWrap}>{renderIcon(toast.type)}</View>

            <View style={styles.content}>
              {toast.title ? (
                <Text style={styles.title} numberOfLines={1}>
                  {toast.title}
                </Text>
              ) : null}

              <Text style={styles.message} numberOfLines={2}>
                {toast.message}
              </Text>
            </View>

            <Pressable onPress={hideToast} hitSlop={10} style={styles.closeBtn}>
              <X size={16} color="#64748B" />
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      ) : null}
    </ToastContext.Provider>
  );
}

function renderIcon(type: ToastType) {
  if (type === "success") {
    return <CheckCircle2 size={20} color="#10B981" />;
  }

  if (type === "error") {
    return <XCircle size={20} color="#EF4444" />;
  }

  if (type === "warning") {
    return <AlertCircle size={20} color="#F59E0B" />;
  }

  return <Info size={20} color="#3B82F6" />;
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  toast: {
    marginTop: 10,
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  success: {
    borderColor: "#BBF7D0",
  },
  error: {
    borderColor: "#FECACA",
  },
  warning: {
    borderColor: "#FDE68A",
  },
  info: {
    borderColor: "#BFDBFE",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: "#475569",
    fontWeight: "600",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});