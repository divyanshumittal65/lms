export type Role = "admin" | "student";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};
