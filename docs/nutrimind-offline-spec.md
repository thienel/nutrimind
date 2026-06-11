# NutriMind — Mobile Offline & Authentication Specification

**Version:** 1.1  
**Stack:** React Native · SQLite (expo-sqlite) · expo-secure-store  
**Phạm vi:** Xác thực người dùng, các chức năng hoạt động offline và cơ chế sync lên server  
**Date:** June 2026

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Authentication Flow](#2-authentication-flow)
3. [Phạm vi Offline](#3-phạm-vi-offline)
4. [Local SQLite Schema](#4-local-sqlite-schema)
5. [Sync Queue — Cơ chế cốt lõi](#5-sync-queue--cơ-chế-cốt-lõi)
6. [Chiến lược Sync](#6-chiến-lược-sync)
7. [Xử lý Conflict](#7-xử-lý-conflict)
8. [Network State Management](#8-network-state-management)
9. [Từng chức năng Offline chi tiết](#9-từng-chức-năng-offline-chi-tiết)
10. [Error Handling & Retry](#10-error-handling--retry)
11. [Edge Cases](#11-edge-cases)

---

## 1. Tổng quan

NutriMind áp dụng mô hình **offline-first có chọn lọc**: các thao tác ghi dữ liệu cá nhân hằng ngày (log meal, log water, log weight) hoạt động hoàn toàn offline và sync lên server khi có mạng. Các tính năng phụ thuộc server (AI Coach, Social, Notifications) hiển thị trạng thái lỗi thân thiện khi mất kết nối.

```
┌─────────────────────────────────────────────────────────┐
│                      Mobile App                         │
│                                                         │
│  User Action                                            │
│      │                                                  │
│      ▼                                                  │
│  ┌─────────────┐    Write     ┌──────────────────────┐  │
│  │  UI Layer   │ ──────────▶ │   Local SQLite DB    │  │
│  │             │             │  (source of truth    │  │
│  │  Read từ   │ ◀────────── │   khi offline)       │  │
│  │  SQLite     │             └──────────┬───────────┘  │
│  └─────────────┘                        │               │
│                                         │ Sync Queue    │
│                                         ▼               │
│                              ┌──────────────────────┐  │
│                              │   Sync Engine        │  │
│                              │  (chạy background)   │  │
│                              └──────────┬───────────┘  │
└─────────────────────────────────────────┼───────────────┘
                                          │ HTTPS (khi online)
                                          ▼
                               ┌──────────────────────┐
                               │   Backend API        │
                               │   (PostgreSQL)       │
                               └──────────────────────┘
```

**Nguyên tắc thiết kế:**
- UI luôn đọc từ SQLite local → không bao giờ block user chờ network
- Mọi thao tác ghi đều vào SQLite trước, server sau
- Server là nơi lưu trữ cuối cùng, SQLite là cache/queue phía client
- Conflict resolution đơn giản: **server thắng** cho profile, **client thắng** cho log entries

---

## 2. Authentication Flow

### 2.1 Tổng quan Auth

NutriMind chỉ hỗ trợ đăng nhập bằng **Google Sign-In**. Không có username/password.

**Thư viện:** `@react-native-google-signin/google-signin`  
**Token storage:** `expo-secure-store` (Keychain trên iOS, Keystore trên Android — encrypted)  
**Token scheme:** JWT `app_token` (30 ngày) + `refresh_token` (90 ngày), không dùng cookie

| Key trong SecureStore | Nội dung |
|-----------------------|----------|
| `nutrimind_app_token` | JWT dùng để gọi API (`Authorization: Bearer ...`) |
| `nutrimind_refresh_token` | Dùng để lấy token pair mới khi app_token hết hạn |
| `nutrimind_refresh_expires_at` | ISO8601 — thời điểm refresh_token hết hạn (để biết khi nào phải force re-login) |

---

### 2.2 Cấu hình Google Sign-In

Backend dùng hai Google OAuth Client ID riêng biệt (Android và iOS). Mobile cấu hình như sau:

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_ID,      // Web/Android Client ID (env: GOOGLE_CLIENT_ID)
  iosClientId: GOOGLE_CLIENT_ID_IOS,  // iOS Client ID (env: GOOGLE_CLIENT_ID_IOS)
  offlineAccess: false,               // Không cần server auth code — chỉ cần id_token
});
```

> `webClientId` là Web Application Client ID từ Google Cloud Console — backend dùng cái này để validate token audience. `iosClientId` là iOS OAuth Client ID — cần thiết để Google Sign-In SDK hoạt động đúng trên iOS.

---

### 2.3 Luồng đăng nhập lần đầu / đăng nhập lại

```
User nhấn "Đăng nhập bằng Google"
    │
    ▼
GoogleSignin.hasPlayServices()  ← kiểm tra Google Play Services (Android only)
    │ fail → hiển thị "Thiết bị không hỗ trợ Google Sign-In"
    │ pass ↓
    ▼
GoogleSignin.signIn()           ← mở Google account picker
    │ user cancel → không làm gì
    │ success ↓
    ▼
Lấy id_token từ kết quả:
const { idToken } = await GoogleSignin.getTokens();
    │
    ▼
POST /api/v1/auth/google
Body: { id_token: idToken }
    │
    ├── 401 → Google token không hợp lệ/hết hạn
    │         Hiển thị "Đăng nhập thất bại. Vui lòng thử lại."
    │
    └── 200 ↓
        {
          app_token, expires_in,
          refresh_token, refresh_expires_in,
          is_first_login,
          user: { id, display_name, email, photo_url, ... }
        }
    │
    ▼
Lưu vào SecureStore:
  nutrimind_app_token         = app_token
  nutrimind_refresh_token     = refresh_token
  nutrimind_refresh_expires_at = now() + refresh_expires_in (seconds)
    │
    ▼
is_first_login?
    │
    ├── true  → Navigate to Onboarding screen
    │           (không pull data, profile chưa tồn tại)
    │
    └── false → Pull initial data (xem 2.5)
               → Navigate to Home
```

---

### 2.4 Kiểm tra auth khi app khởi động (App Startup Check)

Chạy một lần duy nhất trong `App.tsx` (hoặc root navigator) khi app mount.

```
App khởi động
    │
    ▼
Đọc nutrimind_app_token từ SecureStore
    │
    ├── null / không tồn tại → Navigate to Sign-In screen
    │
    └── có token ↓
        │
        ▼
    Decode JWT locally (không gọi API):
    const { exp } = parseJwt(app_token);
    const nowSec = Date.now() / 1000;
        │
        ├── exp > nowSec + 300 (còn hơn 5 phút)
        │       → Token còn hạn, proceed normally
        │       → Pull latest profile từ server (background, không block UI)
        │       → Navigate to Home
        │
        └── exp <= nowSec + 300 (hết hạn hoặc gần hết)
                → Thử silent refresh (xem 2.5)
```

---

### 2.5 Silent Token Refresh

Được gọi khi: app_token hết hạn/gần hết hạn, hoặc bất kỳ API call nào trả về `401`.

```
Lấy nutrimind_refresh_token từ SecureStore
    │
    ├── null → Force sign-out (xem 2.7)
    │
    └── có refresh token ↓
        │
        ▼
    Kiểm tra nutrimind_refresh_expires_at:
        │
        ├── refresh token đã hết hạn → Force sign-out
        │
        └── còn hạn ↓
            │
            ▼
        POST /api/v1/auth/refresh
        Body: { refresh_token }
            │
            ├── 401 → Refresh token đã bị revoke
            │         → Force sign-out
            │
            └── 200 ↓
                { app_token, expires_in, refresh_token, refresh_expires_in }
            │
            ▼
        Cập nhật SecureStore:
          nutrimind_app_token         = new app_token
          nutrimind_refresh_token     = new refresh_token  (token rotation — old token bị revoke)
          nutrimind_refresh_expires_at = now() + refresh_expires_in
            │
            ▼
        Retry API call gốc (nếu silent refresh được trigger bởi 401)
```

> **Token rotation:** Mỗi lần refresh thành công, server cấp cặp token MỚI và revoke token cũ ngay lập tức. Phải lưu `new refresh_token` — không được dùng lại token cũ.

---

### 2.6 Pull initial data sau đăng nhập / app startup

Sau khi xác thực thành công (đăng nhập lại hoặc app startup, `is_first_login = false`):

```typescript
// Chạy song song để giảm thời gian chờ
await Promise.all([
  pullProfile(),          // GET /api/v1/profile → upsert local_profile
  pullMealsLast7Days(),   // GET /api/v1/meals?date=X (7 lần, 1 ngày/request)
  pullWaterLast7Days(),   // GET /api/v1/water?date=X (7 lần, 1 ngày/request)
  pullWeightHistory(),    // GET /api/v1/health/weight?limit=90&offset=0
]);
```

Tất cả data pull về được insert vào SQLite với `sync_status = 'synced'` (đã có trên server, không cần sync lại).

> Dữ liệu lịch sử xa hơn 7 ngày (meals/water) được pull **on-demand** khi user navigate tới màn hình History với ngày cụ thể.

---

### 2.7 Force Sign-Out (do auth failure)

```
Clear SecureStore:
  DELETE nutrimind_app_token
  DELETE nutrimind_refresh_token
  DELETE nutrimind_refresh_expires_at

Dừng Sync Engine

Navigate to Sign-In screen
Hiển thị thông báo: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
```

> SQLite data **không bị xóa** khi force sign-out do auth failure — chỉ xóa tokens. Lần đăng nhập lại sẽ pull data mới từ server và ghi đè.

---

### 2.8 Sign-Out thủ công (user chọn)

```
User chọn Sign Out
    │
    ▼
Kiểm tra sync_queue WHERE status IN ('pending', 'failed')
    │
    ├── Queue rỗng → tiếp tục sign out ngay
    │
    └── Có pending items:
        Hiển thị dialog:
        "Bạn còn X mục chưa được đồng bộ.
         Nếu đăng xuất ngay, dữ liệu này sẽ bị mất."
        
        [Đồng bộ rồi đăng xuất]    [Đăng xuất ngay]
    │
    ▼
POST /api/v1/auth/signout
Body: { refresh_token }    ← revoke refresh token trên server
(fire-and-forget — không chờ response, proceed dù thành công hay thất bại)
    │
    ▼
Xóa toàn bộ SQLite data (tất cả các bảng)
Clear SecureStore (xóa cả 3 keys)
Dừng Sync Engine
Navigate to Sign-In screen
```

---

### 2.9 Interceptor API cho 401

Cấu hình một axios interceptor (hoặc tương đương) để tự động xử lý 401:

```typescript
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // tránh vòng lặp vô tận

      const refreshed = await silentRefresh();
      if (refreshed) {
        // Cập nhật header với token mới
        originalRequest.headers['Authorization'] = `Bearer ${newAppToken}`;
        return axiosInstance(originalRequest); // retry request gốc
      } else {
        await forceSignOut();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
```

> Nếu có nhiều request đồng thời cùng nhận 401, chỉ gọi `silentRefresh()` một lần — các request khác phải chờ (dùng một `Promise` singleton cho refresh đang chạy).

---

## 3. Phạm vi Offline

### 3.1 Hoạt động offline hoàn toàn ✅

| Chức năng | Đọc offline | Ghi offline | Sync lên server |
|-----------|------------|-------------|-----------------|
| Log Meal Entry | ✅ | ✅ | ✅ |
| Xem Meal History | ✅ | — | — |
| Xóa Meal Entry | ✅ | ✅ | ✅ |
| Log Water Intake | ✅ | ✅ | ✅ |
| Xem Water History | ✅ | — | — |
| Log Weight Entry | ✅ | ✅ | ✅ |
| Xem Weight History | ✅ | — | — |
| Home Dashboard | ✅ | — | — |
| Calorie Deficit Tracker | ✅ | — | — |
| Progress Summary | ✅ | — | — |
| Xem Health Summary | ✅ | — | — |

### 3.2 Yêu cầu online ❌

| Chức năng | Lý do |
|-----------|-------|
| Google Sign-In | OAuth flow với Google |
| Onboarding / Update Profile | Cần server tính toán và lưu targets |
| AI Photo Analysis | Gọi OpenAI Vision API |
| AI Daily Advice | Gọi OpenAI API |
| AI Meal Suggestion | Gọi OpenAI API |
| Tất cả Social features | Cần real-time data từ bạn bè |
| Push Notifications | Qua FCM |

### 3.3 Offline với fallback ⚠️

| Chức năng | Hành vi khi offline |
|-----------|-------------------|
| Reminder Settings | Đọc config local được, ghi phải online |
| View Profile | Hiển thị data đã cache, banner "Có thể chưa cập nhật" |

---

## 4. Local SQLite Schema

> Đây là schema **phía mobile**, tồn tại song song với PostgreSQL trên server. Không phải mirror 1:1 — chỉ lưu những gì cần thiết cho offline.

### 4.1 Bảng `local_profile`

```sql
CREATE TABLE IF NOT EXISTS local_profile (
    id                INTEGER PRIMARY KEY CHECK (id = 1), -- singleton row
    user_id           INTEGER NOT NULL,   -- uint từ server
    display_name      TEXT NOT NULL,
    avatar_url        TEXT,
    age               INTEGER,
    gender            TEXT,
    height_cm         REAL,
    weight_kg         REAL,
    goal              TEXT,
    activity_level    TEXT,
    bmi               REAL,
    bmr               REAL,
    tdee              REAL,
    calorie_target    REAL,
    protein_target_g  REAL,
    carb_target_g     REAL,
    fat_target_g      REAL,
    water_target_ml   INTEGER,
    social_enabled    INTEGER NOT NULL DEFAULT 1, -- boolean: 0/1
    onboarding_done   INTEGER NOT NULL DEFAULT 0,
    server_updated_at TEXT,   -- ISO8601, timestamp của lần sync gần nhất từ server
    cached_at         TEXT    -- ISO8601, lúc lưu vào local
);
```

> Chỉ có đúng **1 row** (`id = 1`). Dùng `INSERT OR REPLACE` khi cập nhật.

---

### 4.2 Bảng `local_meal_entries`

```sql
CREATE TABLE IF NOT EXISTS local_meal_entries (
    local_id          TEXT PRIMARY KEY,  -- UUID v4 tạo bởi client
    server_id         INTEGER,           -- uint từ server, null cho đến khi sync xong
    user_id           INTEGER NOT NULL,  -- uint từ server
    food_name         TEXT NOT NULL,
    meal_type         TEXT NOT NULL,     -- breakfast | lunch | dinner | snack
    calories          REAL NOT NULL,
    protein_g         REAL NOT NULL DEFAULT 0,
    carb_g            REAL NOT NULL DEFAULT 0,
    fat_g             REAL NOT NULL DEFAULT 0,
    source            TEXT NOT NULL,     -- manual | ai_photo
    ai_confidence     REAL,              -- null khi source = 'manual'
    logged_date       TEXT NOT NULL,     -- YYYY-MM-DD
    client_created_at TEXT NOT NULL,     -- ISO8601, lúc user tạo
    sync_status       TEXT NOT NULL DEFAULT 'pending',
                                         -- pending | synced | failed | deleted_pending
    sync_attempts     INTEGER NOT NULL DEFAULT 0,
    last_sync_error   TEXT,
    created_at        TEXT NOT NULL      -- ISO8601
);

CREATE INDEX IF NOT EXISTS idx_local_meal_date
    ON local_meal_entries(user_id, logged_date);
CREATE INDEX IF NOT EXISTS idx_local_meal_sync
    ON local_meal_entries(sync_status);
```

---

### 4.3 Bảng `local_water_entries`

```sql
CREATE TABLE IF NOT EXISTS local_water_entries (
    local_id          TEXT PRIMARY KEY,
    server_id         INTEGER,           -- uint từ server, null cho đến khi sync xong
    user_id           INTEGER NOT NULL,
    volume_ml         INTEGER NOT NULL,
    logged_date       TEXT NOT NULL,
    client_created_at TEXT NOT NULL,
    sync_status       TEXT NOT NULL DEFAULT 'pending',
    sync_attempts     INTEGER NOT NULL DEFAULT 0,
    last_sync_error   TEXT,
    created_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_local_water_date
    ON local_water_entries(user_id, logged_date);
CREATE INDEX IF NOT EXISTS idx_local_water_sync
    ON local_water_entries(sync_status);
```

---

### 4.4 Bảng `local_weight_entries`

```sql
CREATE TABLE IF NOT EXISTS local_weight_entries (
    local_id          TEXT PRIMARY KEY,
    server_id         INTEGER,           -- uint từ server, null cho đến khi sync xong
    user_id           INTEGER NOT NULL,
    weight_kg         REAL NOT NULL,
    logged_date       TEXT NOT NULL,     -- YYYY-MM-DD (1 entry / ngày)
    note              TEXT,
    client_created_at TEXT NOT NULL,
    sync_status       TEXT NOT NULL DEFAULT 'pending',
    sync_attempts     INTEGER NOT NULL DEFAULT 0,
    last_sync_error   TEXT,
    created_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_local_weight_date
    ON local_weight_entries(user_id, logged_date);
CREATE INDEX IF NOT EXISTS idx_local_weight_sync
    ON local_weight_entries(sync_status);
```

---

### 4.5 Bảng `sync_queue`

Hàng đợi trung tâm — mọi thao tác cần sync đều được ghi vào đây.

```sql
CREATE TABLE IF NOT EXISTS sync_queue (
    id            TEXT PRIMARY KEY,     -- UUID v4
    operation     TEXT NOT NULL,        -- CREATE | DELETE
    entity_type   TEXT NOT NULL,        -- meal | water | weight
    local_id      TEXT NOT NULL,        -- local_id của record tương ứng
    payload       TEXT NOT NULL,        -- JSON string của request body
    status        TEXT NOT NULL DEFAULT 'pending',
                                        -- pending | processing | done | failed | dismissed
    attempts      INTEGER NOT NULL DEFAULT 0,
    max_attempts  INTEGER NOT NULL DEFAULT 3,
    last_error    TEXT,
    created_at    TEXT NOT NULL,
    next_retry_at TEXT                  -- ISO8601, null = retry ngay
);

CREATE INDEX IF NOT EXISTS idx_queue_status
    ON sync_queue(status, next_retry_at);
```

---

## 5. Sync Queue — Cơ chế cốt lõi

Mọi thao tác ghi offline đều đi qua **hai bước nguyên tử** trong một SQLite transaction:

```
Transaction {
  1. INSERT/UPDATE record vào bảng data (local_meal_entries, v.v.)
  2. INSERT vào sync_queue
}
```

Nếu transaction fail → không có gì được ghi, UI báo lỗi local. Không bao giờ ghi vào data mà không ghi vào queue, và ngược lại.

### 5.1 Luồng ghi offline (ví dụ Log Meal)

```
User nhấn "Save"
    │
    ▼
Validate input (client-side)
    │ fail → hiển thị lỗi, dừng
    │ pass ↓
    ▼
Generate local_id = UUID v4
Generate client_created_at = now()
    │
    ▼
SQLite Transaction {
    INSERT INTO local_meal_entries (local_id, ..., sync_status='pending')
    INSERT INTO sync_queue (operation='CREATE', entity_type='meal', local_id, payload=JSON)
}
    │
    ▼
UI cập nhật ngay từ SQLite (optimistic update)
    │
    ▼
Trigger Sync Engine (nếu đang online)
```

### 5.2 Trạng thái sync_status

```
pending ──────────────────────────────▶ synced
   │                                      ▲
   │  (sync engine pick up)               │
   ▼                                      │
processing ──── server 2xx ──────────────┘
   │
   └──── server 4xx/5xx ──▶ failed (attempts >= max_attempts)
   │
   └──── retry (server 5xx/timeout, attempts < max_attempts)


pending ──▶ deleted_pending  (user xóa record trước khi sync xong)
               │
               ▼
           Sync Engine gửi DELETE lên server (nếu server_id đã có)
           hoặc chỉ xóa local (nếu chưa sync lần nào)
```

---

## 6. Chiến lược Sync

### 6.1 Khuyến nghị: Hybrid Sync

Spec khuyến nghị dùng **hybrid** — kết hợp immediate sync và batch sync:

| Trigger | Hành vi |
|---------|---------|
| **Vừa có mạng trở lại** | Chạy batch sync toàn bộ queue ngay lập tức |
| **App về foreground** | Kiểm tra queue, chạy sync nếu có items pending |
| **Sau mỗi lần ghi** | Nếu đang online: sync ngay item vừa ghi (immediate) |
| **Background interval** | Mỗi 15 phút nếu app đang chạy và có pending items |

> **Lý do không dùng fire-and-forget thuần túy:** Nếu request thất bại lặng lẽ (timeout, 5xx), dữ liệu sẽ chỉ nằm local mãi mà user không biết. Queue cho phép retry có kiểm soát.  
> **Lý do không dùng batch thuần túy:** Khi user online và ghi một entry, họ kỳ vọng data xuất hiện ngay trên server (ảnh hưởng AI Coach, Social feed). Sync ngay sau khi ghi cải thiện trải nghiệm này đáng kể.

### 6.2 Thứ tự xử lý queue

Sync Engine xử lý queue theo thứ tự **FIFO** (created_at ASC), nhưng với ưu tiên:

```
Priority 1: DELETE operations   (tránh dữ liệu "ma" trên server)
Priority 2: CREATE operations   (theo thứ tự created_at)
```

### 6.3 Batch Sync Flow

```
Sync Engine khởi động
    │
    ▼
Lấy tất cả items từ sync_queue WHERE status='pending'
AND (next_retry_at IS NULL OR next_retry_at <= now())
ORDER BY operation='DELETE' DESC, created_at ASC
    │
    ▼
FOR EACH item:
    │
    ├── Đánh status = 'processing'
    │
    ├── Gọi API tương ứng (POST /api/v1/meals, POST /api/v1/water, v.v.)
    │
    ├── Nếu 2xx:
    │       Cập nhật server_id vào bảng data
    │       Đánh sync_status = 'synced' trong bảng data
    │       Đánh status = 'done' trong sync_queue
    │
    ├── Nếu 4xx (lỗi vĩnh viễn — validation, auth, conflict):
    │       Đánh status = 'failed' trong sync_queue
    │       Đánh sync_status = 'failed' trong bảng data
    │       Ghi last_error
    │       KHÔNG retry
    │       Ngoại lệ 409: xem Edge Case 11.5
    │
    └── Nếu 5xx / timeout (lỗi tạm thời):
            attempts += 1
            IF attempts >= max_attempts:
                status = 'failed'
            ELSE:
                status = 'pending'
                next_retry_at = now() + backoff(attempts)
```

### 6.4 Retry Backoff

```
attempt 1 → retry sau  30 giây
attempt 2 → retry sau   2 phút
attempt 3 → retry sau  10 phút
attempt 3+ → status = 'failed', dừng retry
```

---

## 7. Xử lý Conflict

### 7.1 Meal / Water / Weight Entries

**Nguyên tắc: Client thắng, không có conflict thực sự.**

Mỗi entry có `local_id` (UUID do client tạo) và `client_created_at` (timestamp thực tế user hành động). Server nhận và lưu nguyên xi — không merge, không overwrite.

Trường hợp duy nhất cần xử lý: **user xóa một entry trước khi entry đó được sync.**

```
Trường hợp A — Xóa entry chưa sync lần nào (server_id = null):
  → Xóa luôn khỏi local SQLite
  → Xóa item tương ứng khỏi sync_queue
  → Không gọi API

Trường hợp B — Xóa entry đã sync (server_id != null):
  → Đánh sync_status = 'deleted_pending' trong bảng data
  → Thêm item DELETE vào sync_queue với payload { server_id }
  → Sync Engine sẽ gọi DELETE /api/v1/meals/:server_id

Trường hợp C — Xóa entry đang trong quá trình sync (sync_status = 'processing'):
  → Đánh sync_status = 'deleted_pending'
  → Sau khi CREATE sync xong và có server_id, Sync Engine tự động
     thêm DELETE vào queue
```

### 7.2 Profile Data

**Nguyên tắc: Server thắng.**

Profile (height, weight, goal, v.v.) chỉ được chỉnh sửa khi online. Local SQLite lưu bản cache từ server — không bao giờ ghi profile offline rồi sync.

Khi user mở app sau một thời gian offline, nếu profile trên server đã thay đổi (ví dụ đổi thiết bị, đăng nhập lại), server version ghi đè local.

---

## 8. Network State Management

### 8.1 Phát hiện trạng thái mạng

Dùng `@react-native-community/netinfo`:

```typescript
import NetInfo from '@react-native-community/netinfo';

// Lắng nghe thay đổi
NetInfo.addEventListener(state => {
  if (state.isConnected && state.isInternetReachable) {
    SyncEngine.triggerSync();
  }
});
```

> **Lưu ý:** `isConnected = true` không đảm bảo internet reachable (ví dụ kết nối WiFi captive portal). Luôn kiểm tra `isInternetReachable`.

### 8.2 Trạng thái UI theo network

| Trạng thái | Hiển thị |
|-----------|---------|
| Online, không có pending | Bình thường |
| Online, đang sync | Badge nhỏ "Đang đồng bộ..." ở header |
| Online, sync xong | Toast "Đã đồng bộ" (1 lần, tự mất sau 2 giây) |
| Offline, có pending items | Banner vàng "Đang offline — dữ liệu sẽ được lưu khi có mạng" |
| Offline, không có pending | Banner xám nhẹ "Đang offline" |
| Có items `failed` | Banner đỏ "Một số dữ liệu chưa đồng bộ được" + nút "Xem chi tiết" |

### 8.3 Các màn hình online-only

Khi mất mạng, các màn hình online-only hiển thị **empty state offline** thay vì spinner vô tận:

```
┌────────────────────────────┐
│                            │
│    [icon wifi gạch chân]   │
│                            │
│  Tính năng này cần kết nối │
│  internet để hoạt động.    │
│                            │
│  [Thử lại]                 │
│                            │
└────────────────────────────┘
```

Áp dụng cho: AI Coach, AI Photo, toàn bộ Social screens.

---

## 9. Từng chức năng Offline chi tiết

### 9.1 Log Meal Entry (offline)

**Luồng đầy đủ:**

```
1. User nhập food_name, calories, macros, meal_type, source
2. Client validate:
   - food_name không rỗng
   - calories > 0
   - meal_type ∈ { breakfast, lunch, dinner, snack }
   - source ∈ { manual, ai_photo }
3. Tạo:
   local_id = uuidv4()
   client_created_at = new Date().toISOString()
   logged_date = today (theo local timezone của device)
4. SQLite transaction:
   INSERT local_meal_entries (sync_status='pending')
   INSERT sync_queue (operation='CREATE', payload={
     food_name, meal_type, calories, protein_g, carb_g, fat_g,
     source, ai_confidence, logged_date, client_created_at
   })
5. UI refresh: đọc lại từ SQLite, hiển thị entry mới ngay
6. Nếu online: trigger Sync Engine
```

**API call khi sync:**
```
POST /api/v1/meals
Body: {
  food_name, meal_type, calories, protein_g, carb_g, fat_g,
  source, ai_confidence, logged_date, client_created_at
}
```

**Sau khi server trả 201:**
```sql
UPDATE local_meal_entries
SET server_id = :server_id, sync_status = 'synced'
WHERE local_id = :local_id;
```

---

### 9.2 Xóa Meal Entry (offline)

```
1. User swipe-to-delete hoặc nhấn xóa
2. Xác định trường hợp theo server_id và sync_status:

   CASE server_id IS NULL:
     -- Chưa bao giờ lên server
     DELETE FROM local_meal_entries WHERE local_id = ?
     DELETE FROM sync_queue WHERE local_id = ?
     -- Xong, không cần gọi API

   CASE server_id IS NOT NULL AND sync_status != 'processing':
     -- Đã có trên server
     UPDATE local_meal_entries SET sync_status='deleted_pending' WHERE local_id = ?
     INSERT sync_queue (operation='DELETE', entity_type='meal',
                        local_id, payload={ server_id })
     -- UI ẩn item ngay (optimistic)
     -- Sync Engine sẽ gọi DELETE /api/v1/meals/:server_id

   CASE sync_status = 'processing':
     -- Đang sync lên, đánh cờ để Sync Engine xử lý sau
     UPDATE local_meal_entries SET sync_status='deleted_pending' WHERE local_id = ?
```

**API call khi sync:**
```
DELETE /api/v1/meals/:server_id
```

---

### 9.3 Log Water Entry (offline)

Tương tự Log Meal, với validate:
- `volume_ml > 0`
- `volume_ml <= 5000`

**API call khi sync:**
```
POST /api/v1/water
Body: { volume_ml, logged_date, client_created_at }
```

---

### 9.4 Log Weight Entry (offline)

Validate:
- `weight_kg` trong khoảng `15.0–500.0`
- `logged_date` là ngày hợp lệ YYYY-MM-DD
- Mỗi ngày chỉ được log **một** lần — kiểm tra local trước khi insert:

```sql
SELECT 1 FROM local_weight_entries
WHERE user_id = ? AND logged_date = ? AND sync_status != 'deleted_pending'
LIMIT 1;
-- Nếu có kết quả → hiển thị lỗi "Bạn đã ghi cân nặng cho ngày này rồi"
```

**Lưu ý đặc biệt:** Sau khi sync weight thành công, server sẽ tự động cập nhật `bmi` trong profile. Mobile cần **refresh profile từ server** sau khi weight sync xong.

**API call khi sync:**
```
POST /api/v1/health/weight
Body: { weight_kg, logged_at, note, client_created_at }
```

**Post-sync action:**
```
Sau khi weight sync thành công → GET /api/v1/profile → upsert local_profile
```

---

### 9.5 Đọc Dashboard (offline)

Dashboard tính toán hoàn toàn từ SQLite local, không cần network:

```typescript
async function getDashboardData(date: string) {
  const profile = await db.get(
    `SELECT * FROM local_profile WHERE id = 1`
  );

  const meals = await db.all(
    `SELECT * FROM local_meal_entries
     WHERE logged_date = ? AND user_id = ?
     AND sync_status != 'deleted_pending'`,
    [date, profile.user_id]
  );

  const waters = await db.all(
    `SELECT * FROM local_water_entries
     WHERE logged_date = ? AND user_id = ?
     AND sync_status != 'deleted_pending'`,
    [date, profile.user_id]
  );

  const latestWeight = await db.get(
    `SELECT * FROM local_weight_entries
     WHERE user_id = ? AND sync_status != 'deleted_pending'
     ORDER BY logged_date DESC LIMIT 1`,
    [profile.user_id]
  );

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalWater    = waters.reduce((sum, w) => sum + w.volume_ml, 0);

  return {
    calories: { logged: totalCalories, target: profile.calorie_target },
    water:    { logged_ml: totalWater,  target_ml: profile.water_target_ml },
    // macros tương tự...
  };
}
```

> **Quan trọng:** Khi query phải loại trừ các entry có `sync_status = 'deleted_pending'` — những entry này user đã xóa nhưng chưa sync delete lên server.

---

### 9.6 Đọc Meal History / Water History / Weight History (offline)

Đọc thẳng từ SQLite, filter bỏ `deleted_pending`:

```sql
-- Meal History theo ngày
SELECT * FROM local_meal_entries
WHERE logged_date = :date
  AND user_id = :user_id
  AND sync_status != 'deleted_pending'
ORDER BY client_created_at ASC;

-- Water History theo ngày
SELECT * FROM local_water_entries
WHERE logged_date = :date
  AND user_id = :user_id
  AND sync_status != 'deleted_pending'
ORDER BY client_created_at ASC;

-- Weight History
SELECT * FROM local_weight_entries
WHERE user_id = :user_id
  AND sync_status != 'deleted_pending'
ORDER BY logged_date DESC
LIMIT :limit OFFSET :offset;
```

Nếu user yêu cầu ngày nằm ngoài 7 ngày đã pull, app gọi API online để lấy data và cache lại vào SQLite.

---

### 9.7 Progress Summary (offline)

Tính từ SQLite, không cần network. Áp dụng cho Daily / Weekly / Monthly:

```sql
-- Tổng calories theo ngày trong khoảng
SELECT
  logged_date,
  SUM(calories)   AS total_calories,
  SUM(protein_g)  AS total_protein,
  SUM(carb_g)     AS total_carb,
  SUM(fat_g)      AS total_fat
FROM local_meal_entries
WHERE user_id = :user_id
  AND logged_date BETWEEN :from AND :to
  AND sync_status != 'deleted_pending'
GROUP BY logged_date
ORDER BY logged_date ASC;
```

Các ngày không có data → client tự điền `0` khi build response cho UI.

---

## 10. Error Handling & Retry

### 10.1 Phân loại lỗi

| Loại lỗi | HTTP Code | Xử lý |
|----------|-----------|-------|
| **Lỗi vĩnh viễn** | 400, 403, 404 | Đánh `failed`, không retry, hiện thông báo |
| **Auth hết hạn** | 401 | Silent refresh → retry; nếu fail → force sign-out |
| **Lỗi tạm thời** | 500, 502, 503, 504, timeout | Retry với backoff |
| **Lỗi mạng** | Network error, no connection | Retry khi có mạng trở lại |
| **Duplicate** | 409 | Xử lý đặc biệt — xem Edge Case 11.5 |

### 10.2 Xử lý 401 trong Sync Engine

Nếu Sync Engine gặp `401`:
1. Dừng toàn bộ sync
2. Thử silent refresh (gọi `POST /api/v1/auth/refresh`)
3. Nếu re-auth thành công → resume sync với token mới
4. Nếu re-auth fail → force sign-out, giữ nguyên queue (user đăng nhập lại sẽ tiếp tục sync)

### 10.3 Hiển thị failed items cho user

Khi có items ở trạng thái `failed`, hiển thị trong Settings > Sync Status:

```
┌────────────────────────────────────────┐
│ Đồng bộ dữ liệu                        │
│                                        │
│ ✅ Đã đồng bộ: 47 mục                  │
│ ⏳ Đang chờ: 2 mục                     │
│ ❌ Thất bại: 3 mục                     │
│                                        │
│ 3 mục không thể đồng bộ:              │
│  • Bún bò Huế — 09/06 12:30            │
│  • Nước — 09/06 14:00 (200ml)          │
│  • Cân nặng — 08/06 (57.5kg)           │
│                                        │
│  [Thử lại]   [Bỏ qua tất cả]          │
└────────────────────────────────────────┘
```

**Nút "Thử lại":** Reset `status = 'pending'`, `attempts = 0` cho tất cả failed items, trigger sync.

**Nút "Bỏ qua tất cả":** Đánh `status = 'dismissed'` — item vẫn còn trong local SQLite nhưng không còn hiện cảnh báo. Dữ liệu local vẫn đúng, chỉ không có trên server.

---

## 11. Edge Cases

### 11.1 Thay đổi ngày (midnight rollover)

`logged_date` luôn lấy theo **local timezone của device** tại thời điểm user hành động, không phải UTC. Dùng:

```typescript
const loggedDate = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD' format
```

> `en-CA` locale cho ra format `YYYY-MM-DD` nhất quán trên mọi platform.

---

### 11.2 Offline trong thời gian dài (nhiều ngày)

Không giới hạn số lượng pending items trong queue. Khi sync lại sau nhiều ngày:
- Tất cả items trong queue sẽ được gửi lên server với đúng `client_created_at` và `logged_date`
- Server nhận và lưu đúng như vậy — không có cutoff time

---

### 11.3 User đăng xuất khi còn pending items

Đã được xử lý trong [2.8 Sign-Out thủ công](#28-sign-out-thủ-công-user-chọn).

---

### 11.4 Cài app trên thiết bị mới / xóa app

Sau khi đăng nhập lại trên thiết bị mới hoặc sau khi xóa-cài lại app:
- SQLite local trống
- App gọi các endpoint để pull data về (song song):

```
GET /api/v1/profile
    → INSERT OR REPLACE INTO local_profile (sync_status=n/a)

GET /api/v1/meals?date=:date  (lặp 7 ngày gần nhất)
    → INSERT INTO local_meal_entries (sync_status='synced')

GET /api/v1/water?date=:date  (lặp 7 ngày gần nhất)
    → INSERT INTO local_water_entries (sync_status='synced')

GET /api/v1/health/weight?limit=90&offset=0
    → INSERT INTO local_weight_entries (sync_status='synced')
```

> Dữ liệu meals/water lịch sử xa hơn 7 ngày được pull **on-demand** khi user navigate tới màn hình History với ngày cụ thể.

---

### 11.5 Duplicate khi mạng chập chờn

Tình huống: App gửi `POST /api/v1/meals`, server đã xử lý và lưu, nhưng response bị mất trước khi về tới client. App retry → server nhận request thứ hai.

**Phòng ngừa phía server:** Backend có duplicate guard — cùng `user_id + food_name + meal_type + logged_date` trong vòng 5 giây → trả `409 CONFLICT`.

**Xử lý phía client khi nhận 409:**
```
Nếu server trả 409 Conflict:
  → Gọi GET /api/v1/meals?date=:logged_date
  → Tìm entry khớp (food_name + meal_type + logged_date)
  → Lấy server_id (id) từ kết quả
  → Cập nhật local: server_id = :id, sync_status = 'synced'
  → Đánh sync_queue item = 'done'
  → Không tạo duplicate trong local
```

---

### 11.6 Đồng bộ nhiều thiết bị

NutriMind **không hỗ trợ real-time multi-device sync** trong phiên bản này. Nếu user dùng 2 thiết bị:
- Mỗi thiết bị có queue và SQLite riêng
- Khi cả hai online, cả hai push data lên server
- Server nhận và lưu tất cả (không merge, mỗi entry là độc lập)
- Thiết bị B sẽ thấy data của thiết bị A **sau khi pull** (khi navigate tới màn hình liên quan)

> Pull tự động chỉ xảy ra khi app khởi động và khi foreground sau 30 phút. Không có real-time push từ server về client trong scope này.

---

*NutriMind Mobile Offline & Auth Spec v1.1 — Ho Chi Minh City, June 2026*
