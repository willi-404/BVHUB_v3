import type { Member } from "../../app/components/shared/MemberTypes"

export type MemberSortKey = "displayName" | "firstName" | "lastName" | "created"
export type MemberSort = { key: MemberSortKey; direction: "asc" | "desc" }

export function sortMembers(items: Member[], sort: MemberSort): Member[] {
  return [...items].sort((left, right) => {
    const leftValue =
      sort.key === "displayName"
        ? left.displayName || left.username
        : sort.key === "firstName"
          ? left.vorname
          : sort.key === "lastName"
            ? left.nachname
            : left.accountCreated
    const rightValue =
      sort.key === "displayName"
        ? right.displayName || right.username
        : sort.key === "firstName"
          ? right.vorname
          : sort.key === "lastName"
            ? right.nachname
            : right.accountCreated
    const result =
      sort.key === "created"
        ? leftValue.localeCompare(rightValue)
        : leftValue.localeCompare(rightValue, undefined, {
            sensitivity: "base",
          })
    return sort.direction === "asc" ? result : -result
  })
}
