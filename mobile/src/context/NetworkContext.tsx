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
import { AppState, AppStateStatus, Alert } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { SyncService } from "@/services/sync.service";

interface NetworkContextValue {
  /** true nếu thiết bị đang có kết nối internet */
  isOnline: boolean;
  /** Loại kết nối: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown' */
  connectionType: string;
  /** Số lượng items đang chờ sync (cập nhật sau mỗi lần sync) */
  pendingSyncCount: number;
  /** true nếu hệ thống đang gọi API sync */
  isSyncing: boolean;
  /** true nếu vừa sync thành công, biến mất sau vài giây */
  showSyncSuccess: boolean;
  /** Kích hoạt sync thủ công */
  triggerSync(notifyUser?: boolean): Promise<{ synced: number; failed: number; skipped: number } | null>;
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
  const db = useSQLiteContext();
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState("unknown");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  // Tránh trigger sync nhiều lần liên tiếp
  const isSyncingRef = useRef(false);
  const prevOnline = useRef(true);

  const triggerSync = useCallback(async (notifyUser: boolean = false) => {
    if (isSyncingRef.current || !userId) return null;
    // Guard: SQLite db có thể chưa sẵn sàng khi NetworkContext mount
    if (!db) {
      console.warn("[NetworkContext] triggerSync skipped — db not ready");
      return null;
    }
    isSyncingRef.current = true;
    setIsSyncing(true);
    let result = null;
    try {
      const syncService = new SyncService(db);
      
      const pendingCount = await syncService.getPendingCount();
      if (pendingCount > 0 && notifyUser) {
        Alert.alert(
          "Đồng bộ dữ liệu",
          `Có ${pendingCount} mục cần đồng bộ. Hệ thống đang tiến hành đồng bộ...`
        );
      }

      result = await syncService.runSync();
      const remaining = await syncService.getPendingCount();
      setPendingSyncCount(remaining);

      // Nếu có items được sync thành công
      if (result.synced > 0) {
        setShowSyncSuccess(true);
        setTimeout(() => setShowSyncSuccess(false), 2500);
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
    return result;
  }, [userId, db]);

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

        // Nếu vừa online trở lại → trigger sync có thông báo nếu có dữ liệu
        if (online && !prevOnline.current) {
          triggerSync(true);
        }
        prevOnline.current = online;
      },
    );

    // Kích hoạt sync khi app quay lại từ background (Foreground Trigger)
    const appStateSub = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          triggerSync();
        }
      },
    );

    // Quét hàng đợi tự động mỗi 15 phút (Background Interval)
    const intervalId = setInterval(
      () => {
        triggerSync();
      },
      15 * 60 * 1000,
    );

    return () => {
      unsub();
      appStateSub.remove();
      clearInterval(intervalId);
    };
  }, [triggerSync]);

  const value: NetworkContextValue = {
    isOnline,
    connectionType,
    pendingSyncCount,
    isSyncing,
    showSyncSuccess,
    triggerSync,
  };

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}
