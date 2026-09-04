import type { ProfileDto, ProfilePatch } from "./types";

const PROFILE_FIELDS = ["street", "houseNumber", "postalCode", "city", "birthDate", "phone", "contactInfo"] as const;

/** Build the edit form from the DTO without copying server-only metadata. */
export function profilePatchFromDto(data: ProfileDto): ProfilePatch {
  const profile = data.profile;
  return {
    displayName: data.user.displayName,
    firstName: data.user.firstName,
    lastName: data.user.lastName,
    ...Object.fromEntries(PROFILE_FIELDS.map((field) => [field, profile?.[field] ?? ""])),
  } as ProfilePatch;
}
