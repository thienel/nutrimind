# NutriMind — Backend API Specification

**Version:** 1.0  
**Stack:** Golang · PostgreSQL · JWT Bearer Auth  
**Scope:** Tất cả service trừ Auth (đã hoàn thiện riêng)  
**Date:** June 2026

---

## Mục lục

1. [Quy ước chung](#1-quy-ước-chung)
2. [Database Schema](#2-database-schema)
3. [Profile Management Service](#3-profile-management-service)
4. [Health Metric Tracking Service](#4-health-metric-tracking-service)
5. [Meal Logging & Nutrition Tracking Service](#5-meal-logging--nutrition-tracking-service)
6. [Water Intake Tracking Service](#6-water-intake-tracking-service)
7. [AI Nutrition Coach Service](#7-ai-nutrition-coach-service)
8. [Notification & Reminder Service](#8-notification--reminder-service)
9. [Progress Dashboard & Reporting Service](#9-progress-dashboard--reporting-service)
10. [Social Motivation Service](#10-social-motivation-service)
11. [Error Codes](#11-error-codes)

---

## 1. Quy ước chung

### 1.1 Base URL

```
https://api.nutrimind.app/v1
```

### 1.2 Authentication

Mọi endpoint (trừ Auth) đều yêu cầu header:

```
Authorization: Bearer <jwt_token>
```

Token do Auth Server cấp sau khi xác thực Google OAuth. Nếu thiếu hoặc token hết hạn → `401 Unauthorized`.

### 1.3 Request / Response Format

- Content-Type: `application/json`
- Tất cả timestamp dùng **ISO 8601 UTC**: `2026-06-10T08:30:00Z`
- Tất cả date (không có giờ) dùng: `2026-06-10`
- Số thực dùng tối đa 2 chữ số thập phân

### 1.4 Response envelope

**Thành công:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Lỗi:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Weight must be between 15 and 300 kg",
    "field": "weight"
  }
}
```

### 1.5 HTTP Status Codes

| Status | Ý nghĩa |
|--------|---------|
| `200` | OK |
| `201` | Created |
| `204` | No Content (DELETE thành công) |
| `400` | Bad Request / Validation Error |
| `401` | Unauthorized |
| `403` | Forbidden (không có quyền với resource) |
| `404` | Not Found |
| `409` | Conflict (duplicate, rate limit) |
| `429` | Too Many Requests |
| `500` | Internal Server Error |
| `503` | Service Unavailable (Gemini API down) |

### 1.6 Pagination

Các endpoint trả về danh sách dùng offset-limit pagination:

```
GET /health/weight?limit=30&offset=0
```

| Param | Default | Max |
|-------|---------|-----|
| `limit` | 20 | 100 |
| `offset` | 0 | — |

Response:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 85,
    "limit": 30,
    "offset": 0
  }
}
```

### 1.7 Offline Sync

Các endpoint hỗ trợ offline sync (meal, water, weight) chấp nhận thêm field `client_created_at` trong request body — timestamp do client tạo khi offline. Server dùng field này làm thời điểm ghi nhận thực tế thay vì `now()`.

---

## 2. Database Schema

### 2.1 Bảng `users`

> Được tạo bởi Auth Service. Spec này chỉ **đọc**, không tạo thêm cột.

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub    TEXT UNIQUE NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    display_name  TEXT NOT NULL,
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 Bảng `health_profiles`

```sql
CREATE TABLE health_profiles (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    age              INT NOT NULL CHECK (age BETWEEN 10 AND 120),
    gender           TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    height_cm        NUMERIC(5,1) NOT NULL CHECK (height_cm BETWEEN 50 AND 300),
    weight_kg        NUMERIC(5,1) NOT NULL CHECK (weight_kg BETWEEN 15 AND 500),
    goal             TEXT NOT NULL CHECK (goal IN ('lose_weight','gain_muscle','maintain','eat_healthier')),
    activity_level   TEXT NOT NULL CHECK (activity_level IN ('sedentary','lightly_active','moderately_active','very_active')),
    -- Calculated fields (stored for fast reads)
    bmi              NUMERIC(5,2),
    bmr              NUMERIC(7,2),
    tdee             NUMERIC(7,2),
    calorie_target   NUMERIC(7,2),
    protein_target_g NUMERIC(6,2),
    carb_target_g    NUMERIC(6,2),
    fat_target_g     NUMERIC(6,2),
    water_target_ml  INT,
    social_enabled   BOOLEAN NOT NULL DEFAULT true,
    onboarding_done  BOOLEAN NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);
```

**Công thức tính (phải implement trong business logic):**

```
BMI            = weight_kg / (height_m ^ 2)
BMR (male)     = 10*weight + 6.25*height_cm - 5*age + 5
BMR (female)   = 10*weight + 6.25*height_cm - 5*age - 161
Activity multiplier:
  sedentary          → 1.2
  lightly_active     → 1.375
  moderately_active  → 1.55
  very_active        → 1.725
TDEE           = BMR * activity_multiplier
Calorie target:
  lose_weight   → TDEE - 300
  gain_muscle   → TDEE + 250
  maintain / eat_healthier → TDEE
Macro ratio (default 30/40/30 P/C/F):
  protein_target_g = calorie_target * 0.30 / 4
  carb_target_g    = calorie_target * 0.40 / 4
  fat_target_g     = calorie_target * 0.30 / 9
Water target   = weight_kg * 35  (ml)
```

### 2.3 Bảng `weight_entries`

```sql
CREATE TABLE weight_entries (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight_kg         NUMERIC(5,1) NOT NULL CHECK (weight_kg BETWEEN 15 AND 500),
    note              TEXT,
    logged_at         DATE NOT NULL,         -- ngày user chọn
    client_created_at TIMESTAMPTZ,           -- timestamp offline
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_weight_user_date ON weight_entries(user_id, logged_at DESC);
```

### 2.4 Bảng `meal_entries`

```sql
CREATE TABLE meal_entries (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_name         TEXT NOT NULL,
    meal_type         TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
    calories          NUMERIC(7,2) NOT NULL CHECK (calories > 0),
    protein_g         NUMERIC(6,2) NOT NULL DEFAULT 0,
    carb_g            NUMERIC(6,2) NOT NULL DEFAULT 0,
    fat_g             NUMERIC(6,2) NOT NULL DEFAULT 0,
    source            TEXT NOT NULL CHECK (source IN ('search','manual','ai_photo')),
    open_food_facts_id TEXT,                 -- nếu source = search
    ai_confidence     NUMERIC(4,3),          -- nếu source = ai_photo, 0.0–1.0
    logged_date       DATE NOT NULL,         -- ngày bữa ăn thuộc về
    client_created_at TIMESTAMPTZ,           -- timestamp offline
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meal_user_date ON meal_entries(user_id, logged_date DESC);
```

### 2.5 Bảng `water_entries`

```sql
CREATE TABLE water_entries (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    volume_ml         INT NOT NULL CHECK (volume_ml > 0),
    logged_date       DATE NOT NULL,
    client_created_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_water_user_date ON water_entries(user_id, logged_date DESC);
```

### 2.6 Bảng `reminder_configs`

```sql
CREATE TABLE reminder_configs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_type    TEXT NOT NULL CHECK (reminder_type IN ('water','meal','daily_review')),
    enabled          BOOLEAN NOT NULL DEFAULT true,
    frequency_min    INT,                  -- null nếu dùng specific_times
    specific_times   TIME[],              -- mảng giờ cụ thể, null nếu dùng frequency
    window_start     TIME NOT NULL DEFAULT '07:00',
    window_end       TIME NOT NULL DEFAULT '22:00',
    custom_message   TEXT,
    fcm_token        TEXT,               -- FCM device token của user
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, reminder_type)
);
```

### 2.7 Bảng `notification_logs`

```sql
CREATE TABLE notification_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder','ai_insight','social','system')),
    title            TEXT NOT NULL,
    body             TEXT NOT NULL,
    deep_link        TEXT,
    status           TEXT NOT NULL CHECK (status IN ('delivered','failed','queued')),
    scheduled_at     TIMESTAMPTZ NOT NULL,
    sent_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON notification_logs(user_id, created_at DESC);
```

### 2.8 Bảng Social

```sql
-- Friendship
CREATE TABLE friendships (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL CHECK (status IN ('pending','accepted','declined')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);
CREATE INDEX idx_friendship_addressee ON friendships(addressee_id, status);

-- Cheer reactions
CREATE TABLE cheer_reactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction     TEXT NOT NULL CHECK (reaction IN ('keep_going','nice_job','great_progress')),
    reacted_date DATE NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cheer_sender_date ON cheer_reactions(sender_id, recipient_id, reacted_date);

-- Challenge catalogue (managed server-side)
CREATE TABLE challenge_catalogue (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    type         TEXT NOT NULL CHECK (type IN ('hydration','calorie_goal')),
    duration_days INT NOT NULL,
    description  TEXT NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Challenge enrollments
CREATE TABLE challenge_enrollments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenge_catalogue(id),
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    status       TEXT NOT NULL CHECK (status IN ('active','completed','abandoned')),
    badge_awarded BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, challenge_id, start_date)
);

-- Daily completion per enrollment
CREATE TABLE challenge_daily_completions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id   UUID NOT NULL REFERENCES challenge_enrollments(id) ON DELETE CASCADE,
    completion_date DATE NOT NULL,
    met_goal        BOOLEAN NOT NULL DEFAULT false,
    evaluated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(enrollment_id, completion_date)
);
```

---

## 3. Profile Management Service

### 3.1 Tạo / Hoàn tất Onboarding

**`POST /profile/onboarding`**

Dùng sau khi user đăng nhập lần đầu, hoặc nếu `onboarding_done = false`.

**Request Body:**
```json
{
  "age": 25,
  "gender": "female",
  "height_cm": 162.0,
  "weight_kg": 58.5,
  "goal": "lose_weight",
  "activity_level": "lightly_active"
}
```

| Field | Type | Bắt buộc | Validation |
|-------|------|----------|------------|
| `age` | int | ✓ | 10–120 |
| `gender` | string | ✓ | `male` \| `female` |
| `height_cm` | float | ✓ | 50–300 |
| `weight_kg` | float | ✓ | 15–500 |
| `goal` | string | ✓ | `lose_weight` \| `gain_muscle` \| `maintain` \| `eat_healthier` |
| `activity_level` | string | ✓ | `sedentary` \| `lightly_active` \| `moderately_active` \| `very_active` |

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "bmi": 22.29,
    "bmi_category": "Normal",
    "bmr": 1397.25,
    "tdee": 1921.22,
    "calorie_target": 1621.22,
    "protein_target_g": 121.59,
    "carb_target_g": 162.12,
    "fat_target_g": 54.04,
    "water_target_ml": 2047
  }
}
```

**BMI Category mapping:**
- `< 18.5` → `"Underweight"`
- `18.5–24.9` → `"Normal"`
- `25–29.9` → `"Overweight"`
- `>= 30` → `"Obese"`

**Errors:**
- `400` nếu bất kỳ field nào fail validation, kèm `field` trong error object

---

### 3.2 Lấy Profile

**`GET /profile`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "display_name": "Nguyen Van A",
    "avatar_url": "https://...",
    "age": 25,
    "gender": "female",
    "height_cm": 162.0,
    "weight_kg": 58.5,
    "goal": "lose_weight",
    "activity_level": "lightly_active",
    "bmi": 22.29,
    "bmi_category": "Normal",
    "bmr": 1397.25,
    "tdee": 1921.22,
    "calorie_target": 1621.22,
    "protein_target_g": 121.59,
    "carb_target_g": 162.12,
    "fat_target_g": 54.04,
    "water_target_ml": 2047,
    "social_enabled": true,
    "onboarding_done": true
  }
}
```

**Errors:**
- `404` nếu chưa hoàn thành onboarding

---

### 3.3 Cập nhật Profile

**`PATCH /profile`**

Cho phép update một hoặc nhiều field. Server sẽ tính lại toàn bộ BMI/BMR/TDEE/targets sau khi update.

**Request Body** (tất cả optional, ít nhất 1 field):
```json
{
  "weight_kg": 57.0,
  "goal": "maintain",
  "activity_level": "moderately_active"
}
```

**Response `200`:** Tương tự `GET /profile`, trả về profile đầy đủ sau khi tính lại.

**Behavior:**
- Nếu `weight_kg` thay đổi → tự động tạo một `weight_entry` mới với `logged_at = today`
- Tất cả targets phải được recalculate và lưu lại ngay

---

### 3.4 Lấy trạng thái Social Toggle

**`PATCH /profile/social`**

**Request Body:**
```json
{
  "social_enabled": false
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "social_enabled": false }
}
```

**Behavior khi `social_enabled = false`:**
- Ẩn user khỏi feed của bạn bè (họ không thấy data của user này)
- Không xóa dữ liệu friendship hay challenge
- Khi bật lại, data load lại bình thường

---

## 4. Health Metric Tracking Service

### 4.1 Log Weight Entry

**`POST /health/weight`**

**Request Body:**
```json
{
  "weight_kg": 57.5,
  "logged_at": "2026-06-10",
  "note": "Sau khi tập gym",
  "client_created_at": "2026-06-10T07:30:00Z"
}
```

| Field | Type | Bắt buộc | Validation |
|-------|------|----------|------------|
| `weight_kg` | float | ✓ | 15–500 |
| `logged_at` | date | ✓ | Không được là tương lai quá 1 ngày |
| `note` | string | ✗ | Max 200 ký tự |
| `client_created_at` | timestamp | ✗ | Dùng cho offline sync |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "weight_kg": 57.5,
    "logged_at": "2026-06-10",
    "note": "Sau khi tập gym",
    "bmi": 21.91,
    "bmi_category": "Normal",
    "created_at": "2026-06-10T07:30:00Z"
  }
}
```

**Behavior:**
- Sau khi lưu, cập nhật `weight_kg` trong `health_profiles` và tính lại `bmi`, `water_target_ml`
- Không ghi đè entry cũ — mỗi lần gọi là một entry mới

**Errors:**
- `400` nếu `weight_kg` ngoài range

---

### 4.2 Lấy Weight History

**`GET /health/weight?limit=30&offset=0`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "weight_kg": 57.5,
        "logged_at": "2026-06-10",
        "note": "Sau khi tập gym",
        "bmi": 21.91,
        "bmi_category": "Normal",
        "created_at": "2026-06-10T07:30:00Z"
      }
    ],
    "total": 45,
    "limit": 30,
    "offset": 0
  }
}
```

---

### 4.3 Lấy Health Summary

**`GET /health/summary`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "bmi": 21.91,
    "bmi_category": "Normal",
    "bmr": 1383.5,
    "tdee": 1902.31,
    "calorie_target": 1602.31,
    "protein_target_g": 120.17,
    "carb_target_g": 160.23,
    "fat_target_g": 53.41,
    "water_target_ml": 2012,
    "latest_weight": {
      "weight_kg": 57.5,
      "logged_at": "2026-06-10"
    },
    "weight_history": [
      { "logged_at": "2026-06-10", "weight_kg": 57.5 },
      { "logged_at": "2026-06-05", "weight_kg": 58.0 }
    ]
  }
}
```

> `weight_history` trả về tối đa **90 ngày gần nhất** để vẽ chart.

**Errors:**
- `404` nếu `onboarding_done = false`

---

## 5. Meal Logging & Nutrition Tracking Service

### 5.1 Tìm kiếm Food (Open Food Facts proxy)

**`GET /food/search?q=<query>&limit=20`**

Server gọi Open Food Facts API và trả về kết quả đã được normalize. Client **không** gọi thẳng Open Food Facts.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "open_food_facts_id": "737628064502",
        "food_name": "Gà rán KFC",
        "calories_per_100g": 265.0,
        "protein_per_100g": 17.2,
        "carb_per_100g": 12.5,
        "fat_per_100g": 16.3,
        "serving_size_g": 100
      }
    ]
  }
}
```

**Behavior:**
- Cache kết quả search trong Redis (hoặc in-memory) trong **1 giờ** để tránh spam Open Food Facts
- Nếu Open Food Facts unavailable → `503` với message gợi ý nhập manual

---

### 5.2 Log Meal Entry

**`POST /meals`**

**Request Body:**
```json
{
  "food_name": "Gà rán KFC",
  "meal_type": "lunch",
  "calories": 265.0,
  "protein_g": 17.2,
  "carb_g": 12.5,
  "fat_g": 16.3,
  "source": "search",
  "open_food_facts_id": "737628064502",
  "logged_date": "2026-06-10",
  "client_created_at": "2026-06-10T12:15:00Z"
}
```

| Field | Type | Bắt buộc | Ghi chú |
|-------|------|----------|---------|
| `food_name` | string | ✓ | Max 200 ký tự |
| `meal_type` | string | ✓ | `breakfast` \| `lunch` \| `dinner` \| `snack` |
| `calories` | float | ✓ | > 0 |
| `protein_g` | float | ✗ | Default 0 |
| `carb_g` | float | ✗ | Default 0 |
| `fat_g` | float | ✗ | Default 0 |
| `source` | string | ✓ | `search` \| `manual` \| `ai_photo` |
| `open_food_facts_id` | string | ✗ | Chỉ khi `source = search` |
| `ai_confidence` | float | ✗ | 0.0–1.0, chỉ khi `source = ai_photo` |
| `logged_date` | date | ✓ | |
| `client_created_at` | timestamp | ✗ | Offline sync |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "food_name": "Gà rán KFC",
    "meal_type": "lunch",
    "calories": 265.0,
    "protein_g": 17.2,
    "carb_g": 12.5,
    "fat_g": 16.3,
    "source": "search",
    "logged_date": "2026-06-10",
    "created_at": "2026-06-10T12:15:00Z"
  }
}
```

**Duplicate guard:** Nếu cùng `user_id` + `food_name` + `meal_type` + `logged_date` + `calories` được gửi trong vòng **5 giây** → trả về `409 Conflict` để tránh double-submit.

---

### 5.3 AI Photo Analysis

**`POST /meals/ai-analyze`**

**Request Body:** `multipart/form-data`

| Field | Type | Bắt buộc | Ghi chú |
|-------|------|----------|---------|
| `image` | file | ✓ | JPEG/PNG, max 10MB |
| `description` | string | ✗ | Mô tả thêm từ user |

**Flow server-side:**
1. Nhận ảnh, convert sang base64
2. Gọi Gemini Vision API với system prompt chuẩn
3. Parse response → extract `food_name`, `calories`, `protein_g`, `carb_g`, `fat_g`, `confidence`
4. **Không lưu ảnh** — chỉ trả về kết quả phân tích
5. Client xem xét, chỉnh sửa nếu cần, rồi gọi `POST /meals` để lưu

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "food_name": "Phở bò tái",
    "calories": 420.0,
    "protein_g": 28.0,
    "carb_g": 55.0,
    "fat_g": 8.5,
    "confidence": 0.82,
    "low_confidence": false,
    "disclaimer": "AI estimate — please verify before saving"
  }
}
```

**Behavior:**
- `low_confidence = true` khi `confidence < 0.70`
- Nếu Gemini unavailable → `503` với gợi ý dùng manual entry
- `disclaimer` luôn có trong response, không phụ thuộc confidence

**Errors:**
- `400` nếu file không phải ảnh hoặc quá 10MB
- `503` nếu Gemini API unavailable

---

### 5.4 Lấy Meal History theo ngày

**`GET /meals?date=2026-06-10`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "date": "2026-06-10",
    "meals": {
      "breakfast": [
        {
          "id": "uuid",
          "food_name": "Bánh mì trứng",
          "calories": 320.0,
          "protein_g": 12.0,
          "carb_g": 38.0,
          "fat_g": 14.0,
          "source": "manual",
          "created_at": "2026-06-10T07:30:00Z"
        }
      ],
      "lunch": [...],
      "dinner": [...],
      "snack": [...]
    },
    "daily_totals": {
      "calories": 1240.0,
      "protein_g": 68.5,
      "carb_g": 152.0,
      "fat_g": 41.2
    }
  }
}
```

---

### 5.5 Xóa Meal Entry

**`DELETE /meals/:id`**

**Response `204 No Content`**

**Errors:**
- `403` nếu entry không thuộc về user đang request
- `404` nếu không tìm thấy entry

---

## 6. Water Intake Tracking Service

### 6.1 Log Water Entry

**`POST /water`**

**Request Body:**
```json
{
  "volume_ml": 350,
  "logged_date": "2026-06-10",
  "client_created_at": "2026-06-10T09:00:00Z"
}
```

| Field | Type | Bắt buộc | Validation |
|-------|------|----------|------------|
| `volume_ml` | int | ✓ | > 0, max 5000 |
| `logged_date` | date | ✓ | |
| `client_created_at` | timestamp | ✗ | Offline sync |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "volume_ml": 350,
    "logged_date": "2026-06-10",
    "daily_total_ml": 700,
    "water_target_ml": 2047,
    "created_at": "2026-06-10T09:00:00Z"
  }
}
```

---

### 6.2 Lấy Water History theo ngày

**`GET /water?date=2026-06-10`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "date": "2026-06-10",
    "entries": [
      {
        "id": "uuid",
        "volume_ml": 350,
        "created_at": "2026-06-10T09:00:00Z"
      },
      {
        "id": "uuid",
        "volume_ml": 500,
        "created_at": "2026-06-10T12:30:00Z"
      }
    ],
    "daily_total_ml": 850,
    "water_target_ml": 2047
  }
}
```

---

### 6.3 Lấy Water History theo khoảng ngày (cho chart)

**`GET /water/history?from=2026-06-01&to=2026-06-10`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      { "date": "2026-06-01", "total_ml": 1800 },
      { "date": "2026-06-02", "total_ml": 2200 },
      { "date": "2026-06-10", "total_ml": 850 }
    ],
    "water_target_ml": 2047
  }
}
```

> Ngày không có data vẫn trả về với `total_ml: 0`.

---

## 7. AI Nutrition Coach Service

### 7.1 Get Daily Advice

**`POST /ai/advice`**

Server tự động tổng hợp context từ database, client không cần gửi data.

**Request Body** (optional):
```json
{
  "prompt": "Hôm nay tôi ăn ít rau quá, gợi ý cho tôi?"
}
```

**Server tự build context gồm:**
- Profile: age, gender, weight, height, goal, activity_level, calorie_target, macro targets
- Ngày hôm nay: tất cả meal entries, tổng calories, macro breakdown, water intake
- Ngày hôm nay: water intake vs target

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "advice": "Dựa trên dữ liệu hôm nay của bạn, bạn đã nạp 1.240 kcal trong tổng mục tiêu 1.621 kcal...",
    "disclaimer": "Đây là tư vấn từ AI và không thay thế ý kiến chuyên gia dinh dưỡng.",
    "context_summary": {
      "calories_logged": 1240,
      "calorie_target": 1621,
      "water_ml_logged": 850,
      "water_target_ml": 2047
    }
  }
}
```

**Errors:**
- `503` nếu Gemini API unavailable, kèm message: `"AI Coach is temporarily unavailable. Please try again later."`

---

### 7.2 Get Meal Suggestion

**`POST /ai/meal-suggestion`**

**Request Body:**
```json
{
  "meal_type": "dinner"
}
```

| Field | Type | Bắt buộc |
|-------|------|----------|
| `meal_type` | string | ✓ | `breakfast` \| `lunch` \| `dinner` \| `snack` |

**Server tự build context:** remaining calorie budget, remaining macro budget, user goal.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "suggestion": "Với khoảng 380 kcal còn lại cho bữa tối, bạn có thể thử: Bún bò Huế nhỏ (khoảng 350 kcal) với 25g protein...",
    "estimated_calories": 350,
    "estimated_protein_g": 25,
    "estimated_carb_g": 45,
    "estimated_fat_g": 8,
    "disclaimer": "Đây là ước tính từ AI, giá trị thực tế có thể khác tùy cách chế biến."
  }
}
```

**Errors:**
- `503` nếu Gemini API unavailable

---

## 8. Notification & Reminder Service

### 8.1 Đăng ký / Cập nhật FCM Token

**`POST /notifications/fcm-token`**

Gọi mỗi khi app khởi động hoặc FCM token rotate.

**Request Body:**
```json
{
  "fcm_token": "dRjx7...",
  "platform": "android"
}
```

**Response `200`:**
```json
{ "success": true }
```

---

### 8.2 Lấy tất cả Reminder Configs

**`GET /reminders`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "reminders": [
      {
        "id": "uuid",
        "reminder_type": "water",
        "enabled": true,
        "frequency_min": 60,
        "specific_times": null,
        "window_start": "08:00",
        "window_end": "21:00",
        "custom_message": null
      },
      {
        "id": "uuid",
        "reminder_type": "meal",
        "enabled": true,
        "frequency_min": null,
        "specific_times": ["07:30", "12:00", "18:30"],
        "window_start": "07:00",
        "window_end": "22:00",
        "custom_message": "Đừng quên log bữa ăn nhé!"
      }
    ]
  }
}
```

---

### 8.3 Tạo / Cập nhật Reminder Config

**`PUT /reminders/:type`**

`:type` = `water` | `meal` | `daily_review`

**Request Body:**
```json
{
  "enabled": true,
  "frequency_min": 60,
  "specific_times": null,
  "window_start": "08:00",
  "window_end": "21:00",
  "custom_message": "Uống nước nào!"
}
```

> Chỉ được gửi một trong hai: `frequency_min` hoặc `specific_times`. Nếu gửi cả hai → `400`.

**Response `200`:** Trả về config vừa cập nhật.

**Behavior:**
- Upsert (tạo mới nếu chưa có, update nếu đã có)
- Thay đổi có hiệu lực cho **lần gửi thông báo tiếp theo**

---

### 8.4 Lấy In-App Notifications

**`GET /notifications?limit=10`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "notification_type": "reminder",
        "title": "Uống nước nhé!",
        "body": "Bạn mới uống 850ml, còn thiếu 1.197ml nữa.",
        "deep_link": "nutrimind://water/log",
        "status": "delivered",
        "scheduled_at": "2026-06-10T10:00:00Z",
        "sent_at": "2026-06-10T10:00:05Z"
      }
    ],
    "total": 8,
    "limit": 10,
    "offset": 0
  }
}
```

> Tối đa **10 unread notifications** được lưu. Khi quá 10, xóa entry cũ nhất.

---

### 8.5 Scheduler (Internal — không expose API)

Đây là background job chạy server-side, không có HTTP endpoint.

**Cơ chế:**
- Mỗi phút, scheduler đọc tất cả `reminder_configs` đang `enabled = true`
- Kiểm tra xem có reminder nào cần gửi tại thời điểm hiện tại không (dựa trên `frequency_min` hoặc `specific_times` và `window_start/window_end`)
- Nếu có, gọi FCM API gửi notification
- Ghi log vào `notification_logs`
- Nếu FCM gửi fail → status `queued`, retry sau 5 phút, tối đa 3 lần

**Deep link payload theo loại:**
```
water         → nutrimind://water/log
meal          → nutrimind://meal/log
daily_review  → nutrimind://dashboard
```

---

## 9. Progress Dashboard & Reporting Service

### 9.1 Home Dashboard

**`GET /dashboard`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "date": "2026-06-10",
    "calories": {
      "logged": 1240.0,
      "target": 1621.22,
      "remaining": 381.22
    },
    "macros": {
      "protein": { "logged_g": 68.5, "target_g": 121.59 },
      "carb":    { "logged_g": 152.0, "target_g": 162.12 },
      "fat":     { "logged_g": 41.2, "target_g": 54.04 }
    },
    "water": {
      "logged_ml": 850,
      "target_ml": 2047,
      "remaining_ml": 1197
    },
    "latest_weight": {
      "weight_kg": 57.5,
      "logged_at": "2026-06-10",
      "bmi": 21.91,
      "bmi_category": "Normal"
    },
    "calorie_balance": {
      "value": -381.22,
      "type": "deficit",
      "color_hint": "green"
    }
  }
}
```

**`calorie_balance.color_hint` logic:**
- Goal `lose_weight`: deficit → `"green"`, surplus 0–200 → `"amber"`, surplus > 200 → `"red"`
- Goal `gain_muscle`: surplus → `"green"`, deficit → `"amber"`
- Goal `maintain` / `eat_healthier`: ±200 → `"green"`, else → `"amber"`

---

### 9.2 Progress Summary (Daily / Weekly / Monthly)

**`GET /reports/summary?period=weekly&date=2026-06-10`**

| Param | Values | Ghi chú |
|-------|--------|---------|
| `period` | `daily` \| `weekly` \| `monthly` | Bắt buộc |
| `date` | date | Mốc tham chiếu (ngày trong tuần/tháng cần xem) |

**Response `200` (ví dụ `weekly`):**
```json
{
  "success": true,
  "data": {
    "period": "weekly",
    "from": "2026-06-08",
    "to": "2026-06-14",
    "summary": {
      "avg_calories_per_day": 1380.5,
      "calorie_target": 1621.22,
      "days_target_met": 3,
      "total_days": 7
    },
    "macro_avg": {
      "protein_g": 95.2,
      "carb_g": 148.0,
      "fat_g": 42.5
    },
    "water_avg_ml": 1650,
    "water_target_ml": 2047,
    "weight_chart": [
      { "date": "2026-06-08", "weight_kg": 58.0 },
      { "date": "2026-06-10", "weight_kg": 57.5 }
    ],
    "daily_breakdown": [
      {
        "date": "2026-06-08",
        "calories": 1520.0,
        "protein_g": 110.0,
        "carb_g": 160.0,
        "fat_g": 45.0,
        "water_ml": 2100
      }
    ]
  }
}
```

> Ngày không có data vẫn xuất hiện trong `daily_breakdown` với tất cả giá trị = `0`.

---

### 9.3 Calorie Deficit / Surplus Tracker

**`GET /reports/calorie-balance?from=2026-06-01&to=2026-06-10`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "date": "2026-06-01",
        "calories_logged": 1800.0,
        "calorie_target": 1621.22,
        "balance": 178.78,
        "type": "surplus",
        "color_hint": "amber"
      },
      {
        "date": "2026-06-10",
        "calories_logged": 1240.0,
        "calorie_target": 1621.22,
        "balance": -381.22,
        "type": "deficit",
        "color_hint": "green"
      }
    ],
    "weekly_total_balance": -450.5
  }
}
```

---

## 10. Social Motivation Service

> **Lưu ý:** Tất cả endpoint trong section này yêu cầu `social_enabled = true` trong profile của user. Nếu `social_enabled = false` → `403` với message `"Social features are disabled. Enable them in settings."`

### 10.1 Tìm kiếm User để kết bạn

**`GET /social/users/search?q=<query>`**

`:q` là display_name hoặc email.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "user_id": "uuid",
        "display_name": "Tran Thi B",
        "avatar_url": "https://...",
        "friendship_status": "none"
      }
    ]
  }
}
```

`friendship_status`: `none` | `pending_sent` | `pending_received` | `accepted`

> **Không expose:** weight, age, health goal, email trong kết quả search.

---

### 10.2 Gửi Friend Request

**`POST /social/friends/request`**

**Request Body:**
```json
{ "addressee_id": "uuid" }
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "friendship_id": "uuid",
    "status": "pending"
  }
}
```

**Behavior:**
- Gửi FCM notification tới `addressee`: `"[Name] gửi cho bạn một lời mời kết bạn trên NutriMind."`

**Errors:**
- `409` nếu đã là bạn bè hoặc đã có pending request

---

### 10.3 Phản hồi Friend Request

**`PATCH /social/friends/request/:friendship_id`**

**Request Body:**
```json
{ "action": "accept" }
```

`action`: `accept` | `decline`

**Response `200`:**
```json
{
  "success": true,
  "data": { "status": "accepted" }
}
```

**Errors:**
- `403` nếu user không phải `addressee` của request này
- `404` nếu request không tồn tại hoặc không còn `pending`

---

### 10.4 Hủy Friend Request đã gửi

**`DELETE /social/friends/request/:friendship_id`**

Chỉ `requester` mới có quyền hủy request đang `pending`.

**Response `204 No Content`**

---

### 10.5 Xóa bạn bè

**`DELETE /social/friends/:user_id`**

**Response `204 No Content`**

**Behavior:**
- Xóa bidirectional: cả hai bên đều mất kết nối ngay lập tức
- Không gửi notification

---

### 10.6 Lấy danh sách bạn bè

**`GET /social/friends`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "friends": [
      {
        "user_id": "uuid",
        "display_name": "Tran Thi B",
        "avatar_url": "https://...",
        "current_streak": 5,
        "last_activity_at": "2026-06-10T11:00:00Z"
      }
    ],
    "pending_received": [
      {
        "friendship_id": "uuid",
        "user_id": "uuid",
        "display_name": "Le Van C",
        "avatar_url": "https://...",
        "requested_at": "2026-06-09T18:00:00Z"
      }
    ]
  }
}
```

---

### 10.7 Friend Progress Feed

**`GET /social/feed`**

Lấy progress hôm nay của toàn bộ bạn bè.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "date": "2026-06-10",
    "items": [
      {
        "user_id": "uuid",
        "display_name": "Tran Thi B",
        "avatar_url": "https://...",
        "current_streak": 5,
        "completed_all_goals_today": true,
        "calories": {
          "logged": 1450.0,
          "target": 1800.0
        },
        "macros": {
          "protein": { "logged_g": 120.0, "target_g": 135.0 },
          "carb":    { "logged_g": 180.0, "target_g": 180.0 },
          "fat":     { "logged_g": 48.0, "target_g": 60.0 }
        },
        "water": {
          "logged_ml": 2100,
          "target_ml": 2450
        },
        "weight_progress": {
          "latest_kg": 65.0,
          "starting_kg": 70.0,
          "available": true
        },
        "cheer_sent_today": "nice_job",
        "cheer_count_today": 2,
        "last_activity_at": "2026-06-10T11:00:00Z"
      }
    ]
  }
}
```

**Quy tắc visibility:**
- `weight_progress.available = false` nếu bạn bè chưa có weight entry nào
- Không bao giờ expose: food names, meal details, age, goal
- Chỉ trả về data của bạn bè có `social_enabled = true`

**`current_streak` tính như sau:**
- Đếm số ngày liên tiếp (tính từ hôm qua trở về trước) mà user đạt **cả hai** calorie target và water target
- Hôm nay chưa kết thúc nên không tính vào streak

---

### 10.8 Gửi Cheer Reaction

**`POST /social/cheer`**

**Request Body:**
```json
{
  "recipient_id": "uuid",
  "reaction": "nice_job"
}
```

`reaction`: `keep_going` | `nice_job` | `great_progress`

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "reaction": "nice_job",
    "cheer_count_today": 3,
    "cheer_limit": 5
  }
}
```

**Behavior:**
- Gửi FCM notification tới recipient: `"[Name] đã cổ vũ bạn: 👏 Nice Job!"`
- Rate limit: **5 reactions per sender per recipient per calendar day**, enforced server-side

**Errors:**
- `409` với code `CHEER_RATE_LIMIT` nếu đã đạt 5 reactions
- `403` nếu không phải bạn bè

---

### 10.9 Lấy Challenge Catalogue

**`GET /social/challenges`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "catalogue": [
      {
        "id": "uuid",
        "name": "7-Day Hydration Challenge",
        "type": "hydration",
        "duration_days": 7,
        "description": "Đạt mục tiêu uống nước hằng ngày trong 7 ngày liên tiếp",
        "friends_enrolled": 2,
        "my_enrollment": null
      },
      {
        "id": "uuid",
        "name": "7-Day Calorie Goal Challenge",
        "type": "calorie_goal",
        "duration_days": 7,
        "description": "Duy trì lượng calories trong mục tiêu 7 ngày liên tiếp",
        "friends_enrolled": 1,
        "my_enrollment": {
          "enrollment_id": "uuid",
          "start_date": "2026-06-05",
          "end_date": "2026-06-11",
          "status": "active",
          "day_current": 6,
          "day_total": 7
        }
      }
    ]
  }
}
```

---

### 10.10 Join Challenge

**`POST /social/challenges/:challenge_id/join`**

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "enrollment_id": "uuid",
    "start_date": "2026-06-11",
    "end_date": "2026-06-17",
    "status": "active"
  }
}
```

**Behavior:**
- `start_date = tomorrow` (challenge bắt đầu từ ngày mai)
- Gửi FCM notification tới tất cả bạn bè đang enrolled cùng challenge: `"[Name] vừa tham gia 7-Day Hydration Challenge!"`

**Errors:**
- `409` nếu user đã enrolled vào cùng challenge và đang active

---

### 10.11 Lấy tiến độ Challenge

**`GET /social/challenges/:challenge_id/progress`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "challenge": {
      "id": "uuid",
      "name": "7-Day Hydration Challenge",
      "type": "hydration"
    },
    "my_progress": {
      "enrollment_id": "uuid",
      "start_date": "2026-06-05",
      "end_date": "2026-06-11",
      "day_current": 6,
      "day_total": 7,
      "grid": [
        { "date": "2026-06-05", "met_goal": true },
        { "date": "2026-06-06", "met_goal": true },
        { "date": "2026-06-07", "met_goal": false },
        { "date": "2026-06-08", "met_goal": true },
        { "date": "2026-06-09", "met_goal": true },
        { "date": "2026-06-10", "met_goal": null }
      ],
      "badge_awarded": false
    },
    "friends_progress": [
      {
        "user_id": "uuid",
        "display_name": "Tran Thi B",
        "avatar_url": "https://...",
        "grid": [
          { "date": "2026-06-05", "met_goal": true },
          { "date": "2026-06-06", "met_goal": false }
        ]
      }
    ]
  }
}
```

> `met_goal = null` cho ngày hôm nay (chưa kết thúc ngày).

---

### 10.12 Abandon Challenge

**`DELETE /social/challenges/:challenge_id/enrollment`**

**Response `204 No Content`**

**Behavior:**
- Đánh `status = abandoned`, không xóa data
- Không gửi notification cho bạn bè

---

### 10.13 Challenge Daily Evaluation (Internal — không expose API)

Background job chạy lúc **23:59 local time** của từng user.

**Logic:**
```
FOR mỗi enrollment đang active:
  IF challenge.type = 'hydration':
    met_goal = (daily_water_total >= water_target)
  IF challenge.type = 'calorie_goal':
    met_goal = (daily_calories_total <= calorie_target)
  
  INSERT INTO challenge_daily_completions (enrollment_id, completion_date, met_goal)
  
  IF today = enrollment.end_date:
    all_days_met = COUNT(met_goal=true) = challenge.duration_days
    IF all_days_met:
      UPDATE enrollment SET status='completed', badge_awarded=true
    ELSE:
      UPDATE enrollment SET status='completed'
```

---

### 10.14 Weekly Leaderboard

**`GET /social/leaderboard`**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "week_start": "2026-06-08",
    "week_end": "2026-06-14",
    "note": "Today's data is still in progress and not counted.",
    "rankings": [
      {
        "rank": 1,
        "user_id": "uuid",
        "display_name": "Tran Thi B",
        "avatar_url": "https://...",
        "goals_completed": 8,
        "is_me": false
      },
      {
        "rank": 2,
        "user_id": "uuid",
        "display_name": "Nguyen Van A",
        "avatar_url": "https://...",
        "goals_completed": 6,
        "is_me": true
      }
    ]
  }
}
```

**Cách tính `goals_completed`:**
- Mỗi ngày từ Monday → yesterday (hôm nay không tính)
- Nếu `calories_logged <= calorie_target` → +1
- Nếu `water_logged >= water_target` → +1
- Tối đa 2 goals/ngày × 6 ngày = tối đa 12 trong tuần

**Tie-breaking:** Cùng score → sort alphabetically theo `display_name`.

**Reset:** Mỗi thứ Hai 00:00 giờ local của user → data cũ không bị xóa, chỉ calculation window thay đổi.

---

## 11. Error Codes

| Code | HTTP | Mô tả |
|------|------|-------|
| `UNAUTHORIZED` | 401 | Token thiếu hoặc hết hạn |
| `FORBIDDEN` | 403 | Không có quyền với resource |
| `NOT_FOUND` | 404 | Resource không tồn tại |
| `VALIDATION_ERROR` | 400 | Input không hợp lệ, kèm `field` |
| `DUPLICATE_ENTRY` | 409 | Duplicate trong 5 giây (meal log) |
| `ALREADY_FRIENDS` | 409 | Đã là bạn bè |
| `REQUEST_PENDING` | 409 | Friend request đã tồn tại |
| `CHEER_RATE_LIMIT` | 409 | Đã gửi 5 cheers cho bạn bè này hôm nay |
| `CHALLENGE_ALREADY_ENROLLED` | 409 | Đã tham gia challenge này |
| `SOCIAL_DISABLED` | 403 | Social feature bị tắt trong settings |
| `ONBOARDING_REQUIRED` | 403 | Chưa hoàn thành onboarding |
| `GEMINI_UNAVAILABLE` | 503 | Gemini API không khả dụng |
| `FOOD_DB_UNAVAILABLE` | 503 | Open Food Facts không khả dụng |
| `INTERNAL_ERROR` | 500 | Lỗi server không xác định |

---

*NutriMind Backend API Spec v1.0 — Ho Chi Minh City, June 2026*
