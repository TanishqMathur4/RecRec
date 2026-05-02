import client from "./client";

export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export const registerUser = (data: {
  email: string;
  password: string;
  display_name: string;
}): Promise<AuthResponse> =>
  client.post<AuthResponse>("/api/auth/register", data).then((r) => r.data);

export const loginUser = (data: {
  email: string;
  password: string;
}): Promise<AuthResponse> =>
  client.post<AuthResponse>("/api/auth/login", data).then((r) => r.data);

export const fetchMe = (): Promise<{ user: User }> =>
  client.get<{ user: User }>("/api/auth/me").then((r) => r.data);
