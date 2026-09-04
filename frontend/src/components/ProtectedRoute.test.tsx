import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = { status: "unauthenticated" as "loading" | "authenticated" | "unauthenticated", role: undefined as string | undefined };

vi.mock("../features/auth/AuthProvider", () => ({
  useAuth: () => ({ status: authState.status }),
  useAuthUser: () => ({ data: authState.role ? { role: authState.role } : undefined }),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ isPending: false, isError: false }) }));
vi.mock("../lib/pocketbase", () => ({ pb: { authStore: { isValid: true, record: { id: "user-1" }, clear: vi.fn() }, collection: () => ({ getOne: vi.fn() }) } }));
vi.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => <span>NAV:{to}</span>,
  Outlet: () => <span>OUTLET</span>,
  useLocation: () => ({ pathname: "/members", search: "", hash: "" }),
}));

import ProtectedRoute from "./ProtectedRoute";

describe("ProtectedRoute", () => {
  beforeEach(() => { authState.status = "unauthenticated"; authState.role = undefined; });

  it("redirects unauthenticated users to login", () => {
    expect(renderToStaticMarkup(<ProtectedRoute />)).toContain("NAV:/login");
  });

  it("renders the outlet for authenticated users", () => {
    authState.status = "authenticated";
    expect(renderToStaticMarkup(<ProtectedRoute />)).toContain("OUTLET");
  });

  it("allows admin and super-admin roles on admin routes only", () => {
    authState.status = "authenticated";
    authState.role = "MEMBER";
    expect(renderToStaticMarkup(<ProtectedRoute admin />)).toContain("NAV:/dashboard");
    authState.role = "ADMIN";
    expect(renderToStaticMarkup(<ProtectedRoute admin />)).toContain("OUTLET");
    authState.role = "SUPER_ADMIN";
    expect(renderToStaticMarkup(<ProtectedRoute admin />)).toContain("OUTLET");
  });
});
