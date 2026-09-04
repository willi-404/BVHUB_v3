import type { Role } from "../../auth/policy";

export interface ProfileUser {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  active: boolean;
  verified: boolean;
  created: string;
  updated: string;
}

export interface ProfileDetails {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  birthDate: string;
  phone: string;
  contactInfo: string;
  created: string;
  updated: string;
}

export interface ProfileGroup {
  membershipId: string;
  id: string;
  name: string;
  active: boolean;
  created: string;
  updated: string;
}

export interface ProfileDto {
  user: ProfileUser;
  profile: ProfileDetails | null;
  groups: ProfileGroup[];
}

export type ProfilePatch = Partial<Pick<ProfileUser, "displayName" | "firstName" | "lastName"> & Pick<ProfileDetails, "street" | "houseNumber" | "postalCode" | "city" | "birthDate" | "phone" | "contactInfo">>;
