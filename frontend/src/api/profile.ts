import client from "./client";

export interface HealthProfile {
  user_id: string;
  age: number;
  sex: "male" | "female";
  height_cm: number;
  weight_kg: number;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "cut" | "maintain" | "bulk" | "recomp" | "bodybuilding" | "gut_health";
  health_flags: { diabetic?: boolean; high_bp?: boolean };
  meals_per_day: number;
  updated_at: string | null;
}

export interface MacroTarget {
  user_id: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number | null;
  computed_at: string;
}

export interface ProfileResponse {
  profile: HealthProfile | null;
  macro_target: MacroTarget | null;
}

export const fetchProfile = (): Promise<ProfileResponse> =>
  client.get<ProfileResponse>("/api/profile").then((r) => r.data);

export const updateProfile = (data: Omit<HealthProfile, "user_id" | "updated_at">): Promise<ProfileResponse> =>
  client.put<ProfileResponse>("/api/profile", data).then((r) => r.data);
