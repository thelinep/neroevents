export interface UserSummary {
  id: string;
  email: string;
  displayName?: string | null;
}

export interface AuthResponse {
  user: UserSummary;
  token: string;
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  displayName?: string;
}

export interface RefreshResponse {
  token: string;
  expiresAt: string;
}
