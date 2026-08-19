export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt: Date;
}

export interface SessionPair {
  token: string;
  expiresAt: Date;
}
