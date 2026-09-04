export type MemberCardGroup = "MemberER" | "MemberNUE" | "guest";

export function resolveMemberCardGroup(group: string | readonly string[]): MemberCardGroup {
  const groups = Array.isArray(group) ? group : [group];
  // A user can belong to both member branches. Member ER intentionally wins
  // so the card keeps the green Figma theme deterministically.
  if (groups.some((name) => name === "MemberER" || name === "Member ER")) return "MemberER";
  if (groups.some((name) => name === "MemberNUE" || name === "Member NUE")) return "MemberNUE";
  return "guest";
}
