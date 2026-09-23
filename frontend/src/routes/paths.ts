import type { PrimaryNavTab } from "../pages/navigationLabels";

export const routes = {
  home: "/home",
  events: "/events",
  payments: "/payments",
  profile: "/profile",
  adminMembers: "/admin/members",
  adminEvents: "/admin/events",
  adminPayments: "/admin/payments",
  adminMemberCardScanner: "/admin/member-card-scanner",
} as const;

export const primaryNavigation: Readonly<Record<PrimaryNavTab, string>> = {
  dashboard: routes.home,
  events: routes.events,
  payments: routes.payments,
  profile: routes.profile,
};

export function primaryTabForPath(pathname: string): PrimaryNavTab | undefined {
  return (Object.entries(primaryNavigation) as Array<[PrimaryNavTab, string]>).find(
    ([, path]) => pathname === path,
  )?.[0];
}
