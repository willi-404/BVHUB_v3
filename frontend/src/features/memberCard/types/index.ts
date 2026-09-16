export interface MemberCardTokenResponse {
  token: string;
  expiresAt: string;
  refreshAt: string;
}

export interface MemberCardVerificationResponse {
  valid: boolean;
  member?: {
    id: string;
    displayName: string;
    groups: string[];
  };
  tokenExpiresAt?: string;
  verifiedAt?: string;
}
