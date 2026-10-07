import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";

const { requireAuthenticatedEmployee } = vi.hoisted(() => ({
  requireAuthenticatedEmployee: vi.fn(),
}));
const { serverLog } = vi.hoisted(() => ({
  serverLog: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuthenticatedEmployee,
}));
vi.mock("@/lib/logger", () => ({
  serverLog,
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

  it("logs structured database errors without exposing details in the API response", async () => {
    requireAuthenticatedEmployee.mockResolvedValue({
      id: "admin-user-id",
      email: "admin@example.test",
      full_name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
      last_login_at: null,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    });
    const databaseError = {
      code: "42703",
      message: "column watchlists.updated_at does not exist",
      details: "Sensitive row data must not be logged",
    };
    const req = new NextRequest("https://terminal.test/api/terminal/watchlists");
    const handler = vi.fn(async () => {
      throw databaseError;
    });

    const response = await withAuth(PERMISSIONS.WATCHLISTS_VIEW, handler)(req);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "An internal error occurred." },
    });
    expect(serverLog).toHaveBeenCalledWith("error", "api", "unhandled_error", {
      message: databaseError.message,
      error_code: databaseError.code,
      method: "GET",
      path: "/api/terminal/watchlists",
    });
    expect(JSON.stringify(serverLog.mock.calls)).not.toContain(databaseError.details);
  });
});
