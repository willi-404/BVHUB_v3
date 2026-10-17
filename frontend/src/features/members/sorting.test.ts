import { describe, expect, it } from "vitest"
import { sortMembers } from "./sorting"
import type { Member } from "../../app/components/shared/MemberTypes"

const member = (
  id: string,
  displayName: string,
  firstName: string,
  lastName: string,
  created: string,
): Member => ({
  id,
  displayName,
  username: displayName,
  vorname: firstName,
  nachname: lastName,
  email: `${id}@example.test`,
  gruppe: "guest",
  memberSince: created.slice(0, 10),
  adresse: "",
  geburtstag: "",
  phone: "",
  accountCreated: created,
  accountUpdated: created,
  avatarColor: "#b45309",
})

describe("member sorting", () => {
  const items = [
    member("2", "Beta", "Zoe", "Adams", "2026-02-01"),
    member("1", "Alpha", "Amy", "Brown", "2026-03-01"),
  ]

  it("sorts each requested key in both directions without mutating the source", () => {
    expect(
      sortMembers(items, { key: "displayName", direction: "asc" }).map(
        (item) => item.id,
      ),
    ).toEqual(["1", "2"])
    expect(
      sortMembers(items, { key: "firstName", direction: "desc" }).map(
        (item) => item.id,
      ),
    ).toEqual(["2", "1"])
    expect(
      sortMembers(items, { key: "lastName", direction: "asc" }).map(
        (item) => item.id,
      ),
    ).toEqual(["2", "1"])
    expect(
      sortMembers(items, { key: "created", direction: "desc" }).map(
        (item) => item.id,
      ),
    ).toEqual(["1", "2"])
    expect(items.map((item) => item.id)).toEqual(["2", "1"])
  })
})
