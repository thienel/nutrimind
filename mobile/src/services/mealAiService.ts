/**
 * mealAiService — gọi backend AI phân tích ảnh món ăn.
 *
 * Endpoint: POST /meals/ai-analyze (multipart/form-data)
 *   - field `image`       : file ảnh (JPEG/PNG, tối đa 10MB) — bắt buộc
 *   - field `description` : mô tả thêm (tùy chọn) — giúp AI chính xác hơn
 *
 * Trả về: { food_name, calories, protein_g, carb_g, fat_g, confidence,
 *           low_confidence, disclaimer }
 *
 * Dùng fetch + FormData thay vì apiClient.request() vì request() tự
 * JSON.stringify body, không gửi được multipart.
 */

import * as FileSystem from "expo-file-system/legacy";

import { API_BASE_URL } from "@/lib/constants";
import { getAppToken } from "@/lib/tokenStorage";
import type { ApiError } from "@/lib/apiClient";

export interface MealAnalysis {
  food_name: string;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  confidence: number;
  low_confidence: boolean;
  disclaimer: string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB — khớp giới hạn backend

/** Suy ra MIME type + tên file từ URI ảnh (expo-image-picker). */
function resolveImageMeta(uri: string): { type: string; name: string } {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) {
    return { type: "image/png", name: "meal.png" };
  }
  // Mặc định JPEG (camera/expo thường xuất .jpg)
  return { type: "image/jpeg", name: "meal.jpg" };
}

/**
 * Gửi ảnh món ăn lên backend để phân tích dinh dưỡng bằng AI.
 *
 * @param uri          URI ảnh local (từ ImagePicker)
 * @param description  mô tả thêm (tùy chọn)
 * @param fileSize     kích thước file (byte) để kiểm tra trước khi upload
 */
export async function analyzeMealPhoto(
  uri: string,
  description?: string,
  fileSize?: number
): Promise<MealAnalysis> {
  if (fileSize !== undefined && fileSize > MAX_IMAGE_BYTES) {
    throw {
      status: 400,
      message: "Ảnh vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.",
    } as ApiError;
  }

  const meta = resolveImageMeta(uri);
  const appToken = await getAppToken();

  // Dùng FileSystem.uploadAsync (multipart) — global fetch của Expo không
  // hỗ trợ FormData file part kiểu { uri, type, name }.
  const res = await FileSystem.uploadAsync(
    `${API_BASE_URL}/meals/ai-analyze`,
    uri,
    {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "image",
      mimeType: meta.type,
      parameters:
        description && description.trim()
          ? { description: description.trim() }
          : undefined,
      headers: {
        ...(appToken ? { Authorization: `Bearer ${appToken}` } : {}),
      },
    }
  );

  let json: any;
  try {
    json = JSON.parse(res.body);
  } catch {
    throw { status: res.status, message: "Phản hồi không hợp lệ từ máy chủ." } as ApiError;
  }

  if (res.status < 200 || res.status >= 300) {
    const errObj = json?.error as { code?: string; message?: string } | undefined;
    throw {
      status: res.status,
      code: errObj?.code ?? json?.code,
      message:
        errObj?.message ??
        json?.message ??
        "Không thể phân tích ảnh. Vui lòng thử lại.",
    } as ApiError;
  }

  // Backend wrap trong { success, data, message }
  return (json.data ?? json) as MealAnalysis;
}
