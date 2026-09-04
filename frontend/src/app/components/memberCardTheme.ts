export type MemberCardGroup = "MemberER" | "MemberNUE" | "guest";

export function memberCardGroupLabels(group: string | readonly string[]): string[] {
  const groups = Array.isArray(group) ? group : [group];
  const labels = groups.flatMap((name) => {
    if (name === "MemberER" || name === "Member ER") return ["Member ER"];
    if (name === "MemberNUE" || name === "Member NUE") return ["Member NUE"];
    if (name === "guest" || name === "Guest") return ["Guest"];
    return [];
  });
  const uniqueLabels = [...new Set(labels)];
  return uniqueLabels.length ? uniqueLabels : ["Guest"];
}

export function resolveMemberCardGroup(group: string | readonly string[]): MemberCardGroup {
  const groups = memberCardGroupLabels(group);
  // A user can belong to both member branches. Member ER intentionally wins
  // so the card keeps the green Figma theme deterministically.
  if (groups.includes("Member ER")) return "MemberER";
  if (groups.includes("Member NUE")) return "MemberNUE";
  return "guest";
}
