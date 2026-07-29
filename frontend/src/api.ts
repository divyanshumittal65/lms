const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000/api" : "/api");

export type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "student";
  status?: "active" | "blocked";
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function api<T>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("lms_token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
}
