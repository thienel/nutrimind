# Git Workflow – Quy Trình Làm Việc Nhóm

---

## Mục Lục

1. [Tổng quan mô hình](#1-tổng-quan-mô-hình)
2. [Quy tắc đặt tên branch](#2-quy-tắc-đặt-tên-branch)
3. [Quy trình commit message](#3-quy-trình-commit-message)
4. [Quy trình tạo PR & Merge](#4-quy-trình-tạo-pr--merge)
5. [Checklist nhanh hằng ngày](#5-checklist-nhanh-hằng-ngày)

---

## 1. Tổng Quan Mô Hình

Nhóm sử dụng mô hình **Feature Branch Workflow** với nhánh chính duy nhất là `main`.

```
main  ──●──────────────────────●──────────────●──▶
         \                    /               /
          feature/linh/login──●   fix/nguyen/navbar──●
```

**Nguyên tắc cốt lõi:**

- `main` luôn là code **ổn định, chạy được**. Không ai được commit thẳng vào `main`.
- Mỗi tính năng / sửa lỗi = 1 branch riêng.
- Muốn đưa code vào `main` phải qua Pull Request (PR) và được author tự approve trước khi merge.

---

## 2. Quy Tắc Đặt Tên Branch

### Cấu trúc

```
<type>/<tên-người-làm>/<mô-tả-ngắn>
```

Dùng chữ thường, nối bằng dấu gạch ngang `-`, không dấu, không khoảng trắng.

Phần `<tên-người-làm>` dùng tên ngắn hoặc họ của thành viên, ví dụ: `linh`, `nguyen`, `thu`, `nhat`, `thien`.

### Các loại `type`

| Type       | Dùng khi                      | Ví dụ                        |
| ---------- | ----------------------------- | ---------------------------- |
| `feature`  | Thêm tính năng mới            | `feature/linh/login-page`    |
| `fix`      | Sửa bug                       | `fix/nguyen/navbar-overflow` |
| `style`    | Chỉnh CSS/UI, không đổi logic | `style/minh/button-color`    |
| `refactor` | Tái cấu trúc code             | `refactor/an/auth-module`    |
| `docs`     | Thêm/sửa tài liệu             | `docs/khoa/readme-update`    |
| `chore`    | Cấu hình, setup, cài package  | `chore/linh/setup-eslint`    |

### Ví dụ thực tế

```bash
# Đúng
feature/linh/user-registration
fix/nguyen/cart-total-wrong
docs/minh/api-endpoints

# Sai
Feature/Login               # Viết hoa, thiếu tên người
fix/sửa-lỗi-đăng-nhập      # Có dấu tiếng Việt
my-branch                   # Không rõ type, không có tên người
```

### Tạo branch mới

```bash
# Luôn tạo branch từ main mới nhất
git checkout main
git pull origin main
git checkout -b feature/ten-ban/ten-tinh-nang
```

---

## 3. Quy Trình Commit Message

Nhóm dùng chuẩn **Conventional Commits** để lịch sử commit rõ ràng, dễ đọc.

### Cấu trúc

```
<type>(<scope>): <short description in English>

[body – optional, explain in more detail if needed]
```

### Các loại `type`

| Type       | Ý nghĩa                                       |
| ---------- | --------------------------------------------- |
| `feat`     | Thêm tính năng mới                            |
| `fix`      | Sửa bug                                       |
| `style`    | Thay đổi CSS/UI, không ảnh hưởng logic        |
| `refactor` | Refactor code, không thêm feature hay sửa bug |
| `docs`     | Cập nhật tài liệu                             |
| `chore`    | Việc lặt vặt: cài package, config, v.v.       |
| `test`     | Thêm/sửa test                                 |

### `scope` – phạm vi thay đổi (tùy chọn nhưng khuyến khích)

Là module hoặc phần bị ảnh hưởng: `auth`, `cart`, `navbar`, `api`, `ui`...

### Ví dụ commit message

```bash
# Đúng
feat(auth): add Google login
fix(cart): fix incorrect total when discount code is applied
style(navbar): align menu items on mobile
docs: update setup instructions in README
chore: install eslint and prettier

# Sai
fix bug                   # Quá mơ hồ
updated code              # Không theo chuẩn
ADD LOGIN FEATURE         # Viết hoa, không có type
```

### Quy tắc viết commit

- Viết commit message **bằng tiếng Anh**.
- Mô tả ngắn **không quá 72 ký tự**.
- Dùng **thì hiện tại** (imperative): `add`, `fix`, `update` – không phải `added`, `fixed`.
- Commit **nhỏ và thường xuyên** – mỗi commit chỉ làm 1 việc.

---

## 4. Quy Trình Tạo PR & Merge

### Bước 1 – Chuẩn bị trước khi tạo PR

```bash
# Cập nhật main mới nhất về branch của bạn
git fetch origin
git merge origin/main

# Kiểm tra code chạy được, không lỗi, rồi push lên remote
git push origin feature/ten-ban/ten-tinh-nang
```

### Bước 2 – Tạo Pull Request

Lên GitHub → **New Pull Request** → đặt tên PR theo cùng format commit, ví dụ: `feat(auth): add Google login`.

### Bước 3 – Merge

- **Thiện** là người approve và merge PR.
- Chỉ dùng **"Merge Commit"** (không dùng Squash and Merge hay Rebase).
- Xóa branch sau khi merge thành công.

Luồng thực hiện:

```
Push branch lên remote
    ↓
Tạo Pull Request trên GitHub
    ↓
Thiện approve và bấm "Merge Commit"
    ↓
Xóa branch
```

---

## 5. Checklist Nhanh Hằng Ngày

### Khi bắt đầu làm việc

```bash
git checkout main
git pull origin main
git checkout feature/ten-ban/ten-branch
git merge origin/main   # đồng bộ với main mới nhất
```

### Khi kết thúc làm việc

```bash
git add .
git commit -m "feat(scope): short description"
git push origin feature/ten-ban/ten-branch
```

### Khi bị conflict

```bash
# Sau khi merge gặp conflict:
# 1. Mở file conflict, sửa tay
# 2. Sau khi sửa xong:
git add <file-da-sua>
git commit
git push origin feature/ten-ban/ten-branch
```

---

> **Lưu ý:** Khi gặp vấn đề không chắc, hãy hỏi nhóm trước – đừng tự xử lý trên `main`.
