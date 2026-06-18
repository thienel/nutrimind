import { request } from "@/lib/apiClient";
import type { MealType } from "@/lib/repositories/mealRepository";
import { ApiAuthError, ApiClientError, ApiServerError } from "./errors";

async function wrapRequest<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      throw new ApiAuthError(err.message || "Xác thực thất bại", err.status);
    }
    if (err?.status >= 400 && err?.status < 500) {
      throw new ApiClientError(err.message || "Lỗi dữ liệu", err.status);
    }
    if (err?.status >= 500) {
      throw new ApiServerError(err.message || "Lỗi máy chủ", err.status);
    }
    throw err;
  }
}

export const WeightApi = {
  logWeight: async (data: {
    date: string;
    weight_kg: number;
    note?: string;
  }) => {
    return wrapRequest(request<{ id: number }>("/health/weight", {
      method: "POST",
      body: {
        weight_kg: data.weight_kg,
        logged_at: data.date,
        note: data.note || "",
        client_created_at: new Date().toISOString(),
      },
    }));
  },
  deleteWeight: async (id: number) => {
    // Spec mentions DELETE operation but there is a comment in syncManager that no endpoint exists.
    // Assuming backend will have this endpoint /health/weight/:id
    return wrapRequest(request(`/health/weight/${id}`, {
      method: "DELETE",
    }));
  },
};

export const MealApi = {
  logMeal: async (data: {
    food_name: string;
    meal_type: string;
    calories: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
    source: string;
    ai_confidence?: number;
    logged_date: string;
    client_created_at: string;
  }) => {
    return wrapRequest(request<{ id: number }>("/meals", {
      method: "POST",
      body: data,
    }));
  },
  deleteMeal: async (id: number) => {
    return wrapRequest(request(`/meals/${id}`, {
      method: "DELETE",
    }));
  },
};

export const WaterApi = {
  logWater: async (data: {
    volume_ml: number;
    logged_date: string;
    client_created_at: string;
  }) => {
    return wrapRequest(request<{ id: number }>("/water", {
      method: "POST",
      body: data,
    }));
  },
  deleteWater: async (id: number) => {
    return wrapRequest(request(`/water/${id}`, {
      method: "DELETE",
    }));
  },
};
