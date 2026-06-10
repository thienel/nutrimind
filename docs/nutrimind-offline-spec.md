# NutriMind — Mobile Offline Specification

**Version:** 1.0  
**Stack:** React Native · SQLite (expo-sqlite)  
**Phạm vi:** Các chức năng hoạt động offline và cơ chế sync lên server  
**Date:** June 2026

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Phạm vi Offline](#2-phạm-vi-offline)
3. [Local SQLite Schema](#3-local-sqlite-schema)
4. [Sync Queue — Cơ chế cốt lõi](#4-sync-queue--cơ-chế-cốt-lõi)
5. [Chiến lược Sync](#5-chiến-lược-sync)
6. [Xử lý Conflict](#6-xử-lý-conflict)
7. [Network State Management](#7-network-state-management)
8. [Từng chức năng Offline chi tiết](#8-từng-chức-năng-offline-chi-tiết)
9. [Error Handling & Retry](#9-error-handling--retry)
10. [Edge Cases](#10-edge-cases)

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

## 2. Phạm vi Offline

### 2.1 Hoạt động offline hoàn toàn ✅

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

### 2.2 Yêu cầu online ❌

| Chức năng | Lý do |
|-----------|-------|
| Google Sign-In | OAuth flow với Google |
| Onboarding / Update Profile | Cần server tính toán và lưu targets |
| AI Photo Analysis | Gọi Gemini API |
| AI Daily Advice | Gọi Gemini API |
| AI Meal Suggestion | Gọi Gemini API |
| Food Search (Open Food Facts) | Gọi external API |
| Tất cả Social features | Cần real-time data từ bạn bè |
| Push Notifications | Qua FCM |

### 2.3 Offline với fallback ⚠️

| Chức năng | Hành vi khi offline |
|-----------|-------------------|
| Reminder Settings | Đọc config local được, ghi phải online |
| View Profile | Hiển thị data đã cache, banner "Có thể chưa cập nhật" |

---

## 3. Local SQLite Schema

> Đây là schema **phía mobile**, tồn tại song song với PostgreSQL trên server. Không phải mirror 1:1 — chỉ lưu những gì cần thiết cho offline.

### 3.1 Bảng `local_profile`

```sql
CREATE TABLE IF NOT EXISTS local_profile (
    id                INTEGER PRIMARY KEY CHECK (id = 1), -- singleton row
    user_id           TEXT NOT NULL,
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

### 3.2 Bảng `local_meal_entries`

```sql
CREATE TABLE IF NOT EXISTS local_meal_entries (
    local_id          TEXT PRIMARY KEY, -- UUID tạo bởi client
    server_id         TEXT,             -- UUID từ server, null cho đến khi sync xong
    user_id           TEXT NOT NULL,
    food_name         TEXT NOT NULL,
    meal_type         TEXT NOT NULL,    -- breakfast | lunch | dinner | snack
    calories          REAL NOT NULL,
    protein_g         REAL NOT NULL DEFAULT 0,
    carb_g            REAL NOT NULL DEFAULT 0,
    fat_g             REAL NOT NULL DEFAULT 0,
    source            TEXT NOT NULL,    -- search | manual | ai_photo
    open_food_facts_id TEXT,
    ai_confidence     REAL,
    logged_date       TEXT NOT NULL,    -- YYYY-MM-DD
    client_created_at TEXT NOT NULL,    -- ISO8601, lúc user tạo
    sync_status       TEXT NOT NULL DEFAULT 'pending',
                                        -- pending | synced | failed | deleted_pending
    sync_attempts     INTEGER NOT NULL DEFAULT 0,
    last_sync_error   TEXT,
    created_at        TEXT NOT NULL     -- ISO8601
);

CREATE INDEX IF NOT EXISTS idx_local_meal_date
    ON local_meal_entries(user_id, logged_date);
CREATE INDEX IF NOT EXISTS idx_local_meal_sync
    ON local_meal_entries(sync_status);
```

---

### 3.3 Bảng `local_water_entries`

```sql
CREATE TABLE IF NOT EXISTS local_water_entries (
    local_id          TEXT PRIMARY KEY,
    server_id         TEXT,
    user_id           TEXT NOT NULL,
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

### 3.4 Bảng `local_weight_entries`

```sql
CREATE TABLE IF NOT EXISTS local_weight_entries (
    local_id          TEXT PRIMARY KEY,
    server_id         TEXT,
    user_id           TEXT NOT NULL,
    weight_kg         REAL NOT NULL,
    logged_date       TEXT NOT NULL,
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

### 3.5 Bảng `sync_queue`

Hàng đợi trung tâm — mọi thao tác cần sync đều được ghi vào đây.

```sql
CREATE TABLE IF NOT EXISTS sync_queue (
    id            TEXT PRIMARY KEY,     -- UUID
    operation     TEXT NOT NULL,        -- CREATE | DELETE
    entity_type   TEXT NOT NULL,        -- meal | water | weight
    local_id      TEXT NOT NULL,        -- local_id của record tương ứng
    payload       TEXT NOT NULL,        -- JSON string của request body
    status        TEXT NOT NULL DEFAULT 'pending',
                                        -- pending | processing | done | failed
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

## 4. Sync Queue — Cơ chế cốt lõi

Mọi thao tác ghi offline đều đi qua **hai bước nguyên tử** trong một SQLite transaction:

```
Transaction {
  1. INSERT/UPDATE record vào bảng data (local_meal_entries, v.v.)
  2. INSERT vào sync_queue
}
```

Nếu transaction fail → không có gì được ghi, UI báo lỗi local. Không bao giờ ghi vào data mà không ghi vào queue, và ngược lại.

### 4.1 Luồng ghi offline (ví dụ Log Meal)

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

### 4.2 Trạng thái sync_status

```
pending ──────────────────────────────▶ synced
   │                                      ▲
   │  (sync engine pick up)               │
   ▼                                      │
processing ──── server 2xx ──────────────┘
   │
   └──── server 4xx/5xx ──▶ failed (attempts >= max) 
   │                           │
   └──── retry ──────────────┘
   
   
pending ──▶ deleted_pending  (user xóa record trước khi sync xong)
               │
               ▼
           Sync Engine gửi DELETE lên server (nếu server_id đã có)
           hoặc chỉ xóa local (nếu chưa sync lần nào)
```

---

## 5. Chiến lược Sync

### 5.1 Khuyến nghị: Hybrid Sync

Spec khuyến nghị dùng **hybrid** — kết hợp immediate sync và batch sync:

| Trigger | Hành vi |
|---------|---------|
| **Vừa có mạng trở lại** | Chạy batch sync toàn bộ queue ngay lập tức |
| **App về foreground** | Kiểm tra queue, chạy sync nếu có items pending |
| **Sau mỗi lần ghi** | Nếu đang online: sync ngay item vừa ghi (immediate) |
| **Background interval** | Mỗi 15 phút nếu app đang chạy và có pending items |

> **Lý do không dùng fire-and-forget thuần túy:** Nếu request thất bại lặng lẽ (timeout, 5xx), dữ liệu sẽ chỉ nằm local mãi mà user không biết. Queue cho phép retry có kiểm soát.  
> **Lý do không dùng batch thuần túy:** Khi user online và ghi một entry, họ kỳ vọng data xuất hiện ngay trên server (ảnh hưởng AI Coach, Social feed). Sync ngay sau khi ghi cải thiện trải nghiệm này đáng kể.

### 5.2 Thứ tự xử lý queue

Sync Engine xử lý queue theo thứ tự **FIFO** (created_at ASC), nhưng với ưu tiên:

```
Priority 1: DELETE operations   (tránh dữ liệu "ma" trên server)
Priority 2: CREATE operations   (theo thứ tự created_at)
```

### 5.3 Batch Sync Flow

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
    ├── Gọi API tương ứng (POST /meals, POST /water, v.v.)
    │
    ├── Nếu 2xx:
    │       Cập nhật server_id vào bảng data
    │       Đánh sync_status = 'synced' trong bảng data
    │       Đánh status = 'done' trong sync_queue
    │
    ├── Nếu 4xx (lỗi vĩnh viễn — validation, auth):
    │       Đánh status = 'failed' trong sync_queue
    │       Đánh sync_status = 'failed' trong bảng data
    │       Ghi last_error
    │       KHÔNG retry
    │
    └── Nếu 5xx / timeout (lỗi tạm thời):
            attempts += 1
            IF attempts >= max_attempts:
                status = 'failed'
            ELSE:
                status = 'pending'
                next_retry_at = now() + backoff(attempts)
```

### 5.4 Retry Backoff

```
attempt 1 → retry sau  30 giây
attempt 2 → retry sau   2 phút
attempt 3 → retry sau  10 phút
attempt 3+ → status = 'failed', dừng retry
```

---

## 6. Xử lý Conflict

### 6.1 Meal / Water / Weight Entries

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
  → Sync Engine sẽ gọi DELETE /meals/:server_id

Trường hợp C — Xóa entry đang trong quá trình sync (sync_status = 'processing'):
  → Đánh sync_status = 'deleted_pending'
  → Sau khi CREATE sync xong và có server_id, Sync Engine tự động
     thêm DELETE vào queue
```

### 6.2 Profile Data

**Nguyên tắc: Server thắng.**

Profile (height, weight, goal, v.v.) chỉ được chỉnh sửa khi online. Local SQLite lưu bản cache từ server — không bao giờ ghi profile offline rồi sync.

Khi user mở app sau một thời gian offline, nếu profile trên server đã thay đổi (ví dụ đổi thiết bị, đăng nhập lại), server version ghi đè local.

---

## 7. Network State Management

### 7.1 Phát hiện trạng thái mạng

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

### 7.2 Trạng thái UI theo network

| Trạng thái | Hiển thị |
|-----------|---------|
| Online, không có pending | Bình thường |
| Online, đang sync | Badge nhỏ "Đang đồng bộ..." ở header |
| Online, sync xong | Toast "Đã đồng bộ" (1 lần, tự mất sau 2 giây) |
| Offline, có pending items | Banner vàng "Đang offline — dữ liệu sẽ được lưu khi có mạng" |
| Offline, không có pending | Banner xám nhẹ "Đang offline" |
| Có items `failed` | Banner đỏ "Một số dữ liệu chưa đồng bộ được" + nút "Xem chi tiết" |

### 7.3 Các màn hình online-only

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

Áp dụng cho: AI Coach, AI Photo, Food Search, toàn bộ Social screens.

---

## 8. Từng chức năng Offline chi tiết

### 8.1 Log Meal Entry (offline)

**Luồng đầy đủ:**

```
1. User nhập food_name, calories, macros, meal_type
2. Client validate:
   - food_name không rỗng
   - calories > 0
   - meal_type hợp lệ
3. Tạo:
   local_id = uuidv4()
   client_created_at = new Date().toISOString()
   logged_date = today (theo local timezone của device)
4. SQLite transaction:
   INSERT local_meal_entries (sync_status='pending')
   INSERT sync_queue (operation='CREATE', payload={
     food_name, meal_type, calories, protein_g, carb_g, fat_g,
     source, logged_date, client_created_at
   })
5. UI refresh: đọc lại từ SQLite, hiển thị entry mới ngay
6. Nếu online: trigger Sync Engine
```

**API call khi sync:**
```
POST /meals
Body: { food_name, meal_type, calories, protein_g, carb_g, fat_g,
        source, logged_date, client_created_at }
```

**Sau khi server trả 201:**
```sql
UPDATE local_meal_entries
SET server_id = :server_id, sync_status = 'synced'
WHERE local_id = :local_id;
```

---

### 8.2 Xóa Meal Entry (offline)

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
     -- Sync Engine sẽ gọi DELETE /meals/:server_id

   CASE sync_status = 'processing':
     -- Đang sync lên, đánh cờ để Sync Engine xử lý sau
     UPDATE local_meal_entries SET sync_status='deleted_pending' WHERE local_id = ?
```

**API call khi sync:**
```
DELETE /meals/:server_id
```

---

### 8.3 Log Water Entry (offline)

Tương tự Log Meal, với validate:
- `volume_ml > 0`
- `volume_ml <= 5000`

**API call khi sync:**
```
POST /water
Body: { volume_ml, logged_date, client_created_at }
```

---

### 8.4 Log Weight Entry (offline)

Validate:
- `weight_kg` trong khoảng 15–500

**Lưu ý đặc biệt:** Sau khi sync weight thành công, server sẽ tự động cập nhật `water_target_ml` và `bmi` trong profile. Mobile cần **refresh profile từ server** sau khi weight sync xong.

**API call khi sync:**
```
POST /health/weight
Body: { weight_kg, logged_at, note, client_created_at }
```

**Post-sync action:**
```
Sau khi weight sync thành công → gọi GET /profile → cập nhật local_profile
```

---

### 8.5 Đọc Dashboard (offline)

Dashboard tính toán hoàn toàn từ SQLite local, không cần network:

```typescript
// Pseudo-code
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

  // Tính toán local
  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalWater    = waters.reduce((sum, w) => sum + w.volume_ml, 0);
  // ... macros tương tự

  return {
    calories: { logged: totalCalories, target: profile.calorie_target },
    water:    { logged_ml: totalWater, target_ml: profile.water_target_ml },
    // ...
  };
}
```

> **Quan trọng:** Khi query phải loại trừ các entry có `sync_status = 'deleted_pending'` — những entry này user đã xóa nhưng chưa sync delete lên server.

---

### 8.6 Đọc Meal History / Water History / Weight History (offline)

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

---

### 8.7 Progress Summary (offline)

Tính từ SQLite, không cần network. Áp dụng cho Daily / Weekly / Monthly:

```sql
-- Ví dụ: tổng calories theo ngày trong khoảng
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

## 9. Error Handling & Retry

### 9.1 Phân loại lỗi

| Loại lỗi | HTTP Code | Xử lý |
|----------|-----------|-------|
| **Lỗi vĩnh viễn** | 400, 401, 403, 404, 409 | Đánh `failed`, không retry, hiện thông báo |
| **Lỗi tạm thời** | 500, 502, 503, 504, timeout | Retry với backoff |
| **Lỗi mạng** | Network error, no connection | Retry khi có mạng trở lại |

### 9.2 Xử lý 401 Unauthorized

Nếu Sync Engine gặp `401`:
1. Dừng toàn bộ sync
2. Thử silent re-auth (refresh token nếu có)
3. Nếu re-auth thành công → resume sync
4. Nếu re-auth fail → điều hướng user về màn hình Sign-In, giữ nguyên queue

### 9.3 Hiển thị failed items cho user

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

## 10. Edge Cases

### 10.1 Thay đổi ngày (midnight rollover)

`logged_date` luôn lấy theo **local timezone của device** tại thời điểm user hành động, không phải UTC. Dùng:

```typescript
const loggedDate = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD' format
```

> `en-CA` locale cho ra format `YYYY-MM-DD` nhất quán trên mọi platform.

---

### 10.2 Offline trong thời gian dài (nhiều ngày)

Không giới hạn số lượng pending items trong queue. Khi sync lại sau nhiều ngày:
- Tất cả items trong queue sẽ được gửi lên server với đúng `client_created_at` và `logged_date`
- Server nhận và lưu đúng như vậy — không có cutoff time

---

### 10.3 User đăng xuất khi còn pending items

```
User nhấn Sign Out
    │
    ▼
Kiểm tra sync_queue WHERE status IN ('pending', 'failed')
    │
    ├── Nếu queue rỗng: Sign out bình thường
    │
    └── Nếu có pending items:
        Hiển thị dialog:
        "Bạn còn X mục chưa được đồng bộ.
         Nếu đăng xuất ngay, dữ liệu này sẽ bị mất.
         Bạn có muốn đồng bộ trước không?"
        
        [Đồng bộ rồi đăng xuất]  [Đăng xuất ngay]
        
        Nếu chọn "Đăng xuất ngay":
          → Xóa toàn bộ SQLite data (bao gồm pending items)
          → Xóa JWT token
          → Navigate về Sign-In
```

---

### 10.4 Cài app trên thiết bị mới / xóa app

Sau khi đăng nhập lại trên thiết bị mới hoặc sau khi xóa-cài lại app:
- SQLite local trống
- App gọi các endpoint để pull data về:

```
GET /profile          → INSERT INTO local_profile
GET /meals?date=today → INSERT INTO local_meal_entries (sync_status='synced')
GET /water?date=today → INSERT INTO local_water_entries (sync_status='synced')
GET /health/weight?limit=90 → INSERT INTO local_weight_entries (sync_status='synced')
```

> Chỉ pull **dữ liệu gần đây** (90 ngày weight, today's meals/water). Dữ liệu lịch sử xa hơn sẽ được pull on-demand khi user navigate tới.

---

### 10.5 Duplicate khi mạng chập chờn

Tình huống: App gửi `POST /meals`, server đã xử lý và lưu, nhưng response bị mất trước khi về tới client. App retry → server nhận request thứ hai.

**Phòng ngừa phía server:** Backend spec đã có duplicate guard — cùng `user_id + food_name + meal_type + logged_date + calories` trong vòng 5 giây → trả `409`.

**Xử lý phía client khi nhận 409:**
```
Nếu server trả 409 Conflict:
  → Gọi GET /meals?date=:logged_date
  → Tìm entry khớp (food_name + meal_type + calories)
  → Lấy server_id từ kết quả
  → Cập nhật local: server_id = :server_id, sync_status = 'synced'
  → Đánh sync_queue item = 'done'
  → Không tạo duplicate trong local
```

---

### 10.6 Đồng bộ nhiều thiết bị

NutriMind **không hỗ trợ real-time multi-device sync** trong phiên bản này. Nếu user dùng 2 thiết bị:
- Mỗi thiết bị có queue và SQLite riêng
- Khi cả hai online, cả hai push data lên server
- Server nhận và lưu tất cả (không merge, mỗi entry là độc lập)
- Thiết bị B sẽ thấy data của thiết bị A **sau khi pull** (khi navigate tới màn hình liên quan)

> Pull tự động chỉ xảy ra khi app khởi động và khi foreground sau 30 phút. Không có real-time push từ server về client trong scope này.

---

*NutriMind Mobile Offline Spec v1.0 — Ho Chi Minh City, June 2026*
