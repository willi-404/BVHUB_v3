import type { MessageKey } from "../i18n";

export type PrimaryNavTab = "dashboard" | "events" | "payments" | "memberApplication" | "profile";

export function primaryNavMessageKey(tab: PrimaryNavTab): Extract<MessageKey, `nav.${string}`> {
  return tab === "dashboard" ? "nav.home" : tab === "events" ? "nav.events" : tab === "payments" ? "nav.payments" : tab === "memberApplication" ? "nav.memberApplication" : "nav.profile";
}
