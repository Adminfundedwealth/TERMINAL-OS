import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAuthenticatedEmployee,
  requireAuthenticatedEmployee,
} from "@/lib/auth/session";

const { createRouteHandlerSupabaseClient, getUser } = vi.hoisted(() => ({
  createRouteHandlerSupabaseClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/route-handler-client", () => ({
  createRouteHandlerSupabaseClient,
}));

const previousAdminEmails = process.env.TERMINAL_OS_ADMIN_EMAILS;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TERMINAL_OS_ADMIN_EMAILS = "employee@example.test";
  createRouteHandlerSupabaseClient.mockResolvedValue({
    auth: { getUser },
  });
});

afterEach(() => {
  if (previousAdminEmails === undefined) delete process.env.TERMINAL_OS_ADMIN_EMAILS;
  else process.env.TERMINAL_OS_ADMIN_EMAILS = previousAdminEmails;
});

function authenticatedAs(email: string) {
  getUser.mockResolvedValue({
    data: {
      user: {
        id: "test-user-id",
        email,
        created_at: "2025-01-01T00:00:00.000Z",
        user_metadata: {},
      },
    },
    error: null,
  });
}

describe("employee API authentication", () => {
  it("preserves cookie-session authentication when no Authorization header is supplied", async () => {
    authenticatedAs("employee@example.test");

    const employee = await getAuthenticatedEmployee(new Request("https://terminal.test/api/terminal/system-health"));

    expect(employee?.role).toBe("SUPER_ADMIN");
    expect(createRouteHandlerSupabaseClient).toHaveBeenCalledWith(undefined);
    expect(getUser).toHaveBeenCalledWith();
  });

  it("authenticates an allowlisted employee from a Bearer access token", async () => {
    authenticatedAs("employee@example.test");
    const token = "employee-test-access-token";
    const request = new Request("https://terminal.test/api/terminal/system-health", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const employee = await requireAuthenticatedEmployee(request);

    expect(employee.role).toBe("SUPER_ADMIN");
    expect(createRouteHandlerSupabaseClient).toHaveBeenCalledWith(token);
    expect(getUser).toHaveBeenCalledWith(token);
  });

  it("rejects a valid Supabase customer token as unauthenticated", async () => {
    authenticatedAs("customer@example.test");
    const request = new Request("https://terminal.test/api/terminal/system-health", {
      headers: { Authorization: "Bearer customer-test-access-token" },
    });

    await expect(requireAuthenticatedEmployee(request)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("does not fall back to a cookie session for malformed Authorization credentials", async () => {
    const request = new Request("https://terminal.test/api/terminal/system-health", {
      headers: { Authorization: "Basic invalid-test-credential" },
    });

    expect(await getAuthenticatedEmployee(request)).toBeNull();
    expect(createRouteHandlerSupabaseClient).not.toHaveBeenCalled();
  });
});
