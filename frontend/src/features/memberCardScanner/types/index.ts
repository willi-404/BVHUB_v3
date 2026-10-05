export type AdminMemberDetails = {
  id: string;
  username: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "GUEST" | "MEMBER" | "ADMIN" | "SUPER_ADMIN" | string;
  active: boolean;
  verified: boolean;
  created: string;
  updated: string;
  memberSince: string;
  groups: Array<{ id: string; name: string }>;
  address: string;
  birthDate: string;
  phone: string;
};

export type AdminMemberCardScanResult =
  | { status: "VALID_MEMBER"; reason: null; member: AdminMemberDetails; tokenExpiresAt: string; verifiedAt: string }
  | { status: "GUEST_NON_MEMBER"; reason: "GUEST_ACCOUNT" | "NO_ACTIVE_MEMBER_GROUP"; member: AdminMemberDetails; tokenExpiresAt: string; verifiedAt: string }
  | { status: "INVALID"; reason: "MALFORMED_TOKEN" | "UNKNOWN_TOKEN" | "EXPIRED_TOKEN" | "USER_NOT_FOUND" | "INACTIVE_ACCOUNT" | "UNVERIFIED_ACCOUNT" | "FEATURE_DISABLED" };
