/**
 * NetworkContext — theo dõi trạng thái kết nối mạng
 *
 * Sử dụng @react-native-community/netinfo để lắng nghe
 * sự thay đổi kết nối. Khi online trở lại, kích hoạt SyncManager.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from "@react-native-community/netinfo";
import { startSync } from "@/lib/syncManager";

interface NetworkContextValue {
  /** true nếu thiết bị đang có kết nối internet */
  isOnline: boolean;
  /** Loại kết nối: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown' */
  connectionType: string;
  /** Số lượng items đang chờ sync (cập nhật sau mỗi lần sync) */
  pendingSyncCount: number;
  /** Kích hoạt sync thủ công */
  triggerSync(): void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork phải dùng trong <NetworkProvider>");
  return ctx;
}

interface NetworkProviderProps {
  children: React.ReactNode;
  /** userId dùng để pass cho SyncManager */
  userId?: number | null;
}

export function NetworkProvider({ children, userId }: NetworkProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState("unknown");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Tránh trigger sync nhiều lần liên tiếp
  const isSyncing = useRef(false);
  const prevOnline = useRef(true);

  const triggerSync = useCallback(async () => {
    if (isSyncing.current || !userId) return;
    isSyncing.current = true;
    try {
      const remaining = await startSync(userId);
      setPendingSyncCount(remaining);
    } finally {
      isSyncing.current = false;
    }
  }, [userId]);

  useEffect(() => {
    // Lấy trạng thái ban đầu
    NetInfo.fetch().then((state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      setConnectionType(state.type);
      prevOnline.current = online;
    });

    // Subscribe để lắng nghe thay đổi
    const unsub: NetInfoSubscription = NetInfo.addEventListener(
      (state: NetInfoState) => {
        const online = !!(state.isConnected && state.isInternetReachable);
        setIsOnline(online);
        setConnectionType(state.type);

        // Nếu vừa online trở lại → trigger sync
        if (online && !prevOnline.current) {
          triggerSync();
        }
        prevOnline.current = online;
      }
    );

    return () => unsub();
  }, [triggerSync]);

  const value: NetworkContextValue = {
    isOnline,
    connectionType,
    pendingSyncCount,
    triggerSync,
  };

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}
