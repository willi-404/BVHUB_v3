import { pb } from "../../../lib/pocketbase";
import type { Member } from "../types";
export async function getMembers(): Promise<Member[]> {
  const result = await pb.collection("users").getList<Member>(1, 50, { sort: "displayName" });
  return result.items;
}
