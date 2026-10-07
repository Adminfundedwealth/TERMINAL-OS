import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";

const { requireAuthenticatedEmployee } = vi.hoisted(() => ({
  requireAuthenticatedEmployee: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuthenticatedEmployee,
}));

describe("withAuth", () => {
  it("passes the request to employee authentication and retains permission enforcement", async () => {
    requireAuthenticatedEmployee.mockResolvedValue({
      id: "support-user-id",
      email: "support@example.test",
      full_name: "Support",
      role: "SUPPORT",
      status: "ACTIVE",
      last_login_at: null,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    });
    const handler = vi.fn(async () => NextResponse.json({ data: "private" }));
    const req = new NextRequest("https://terminal.test/api/terminal/system-health", {
      headers: { Authorization: "Bearer customer-test-access-token" },
    });

    const response = await withAuth(PERMISSIONS.SYSTEM_HEALTH_VIEW, handler)(req);

    expect(requireAuthenticatedEmployee).toHaveBeenCalledWith(req);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "PERMISSION_DENIED" },
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
