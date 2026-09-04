import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = { status: "unauthenticated" as "loading" | "authenticated" | "unauthenticated", role: undefined as "GUEST" | "MEMBER" | "ADMIN" | "SUPER_ADMIN" | undefined };

vi.mock("../features/auth/AuthProvider", () => ({
  useAuth: () => ({ status: authState.status }),
  useAuthUser: () => ({ data: authState.role ? { role: authState.role } : undefined }),
}));
vi.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => <span>NAV:{to}</span>,
  Outlet: () => <span>OUTLET</span>,
  useLocation: () => ({ pathname: "/private", search: "", hash: "" }),
}));

import { ProtectedRoute, PublicOnlyRoute, RoleGuard } from "./guards";

describe("route guards", () => {
  beforeEach(() => { authState.status = "unauthenticated"; authState.role = undefined; });

  it("redirects protected routes to login when unauthenticated", () => {
    expect(renderToStaticMarkup(<ProtectedRoute />)).toContain("NAV:/login");
    authState.status = "authenticated";
    expect(renderToStaticMarkup(<ProtectedRoute />)).toContain("OUTLET");
  });

  it("redirects authenticated users away from public-only routes", () => {
    authState.status = "authenticated";
    expect(renderToStaticMarkup(<PublicOnlyRoute><span>PUBLIC</span></PublicOnlyRoute>)).toContain("NAV:/dashboard");
  });

  it("allows only matching roles", () => {
    authState.role = "MEMBER";
    expect(renderToStaticMarkup(<RoleGuard roles={["ADMIN"]} />)).toContain("NAV:/");
    expect(renderToStaticMarkup(<RoleGuard roles={["MEMBER", "ADMIN"]} />)).toContain("OUTLET");
  });
});
