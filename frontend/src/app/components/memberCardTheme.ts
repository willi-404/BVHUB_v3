export type MemberCardGroup = "MemberER" | "MemberNUE" | "guest";

export function resolveMemberCardGroup(group: string): MemberCardGroup {
  if (group === "MemberER" || group === "Member ER") return "MemberER";
  if (group === "MemberNUE" || group === "Member NUE") return "MemberNUE";
  return "guest";
}
