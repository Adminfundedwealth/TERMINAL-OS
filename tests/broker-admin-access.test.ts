import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedEmployee: vi.fn(),
  createCentralBrokerConnection: vi.fn(),
  getCentralBrokerConnectionById: vi.fn(),
  deactivateCentralBrokerConnection: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuthenticatedEmployee: mocks.requireAuthenticatedEmployee,
}));
vi.mock("@/server/services/broker-connections", () => ({
  getCentralBrokerConnections: vi.fn(),
  createCentralBrokerConnection: mocks.createCentralBrokerConnection,
  getCentralBrokerConnectionById: mocks.getCentralBrokerConnectionById,
  deactivateCentralBrokerConnection: mocks.deactivateCentralBrokerConnection,
}));
vi.mock("@/lib/logger", () => ({ writeActivityLog: vi.fn(), serverLog: vi.fn() }));

import { POST } from "../app/api/terminal/broker/route";
import { POST as deactivatePost } from "../app/api/terminal/broker/[id]/deactivate/route";

function request() {
  return new Request("https://terminal.test/api/terminal/broker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ broker_id: "dhan", credentials: { client_id: "fake", access_token: "fake" } }),
  });
}

function deactivateRequest() {
  return new Request("https://terminal.test/api/terminal/broker/connection-1/deactivate", {
    method: "POST",
  });
}

beforeEach(() => vi.clearAllMocks());

describe("central broker admin access", () => {
  it("rejects a customer without an authenticated employee session", async () => {
    const { UnauthenticatedError } = await import("@/lib/rbac/permissions");
    mocks.requireAuthenticatedEmployee.mockRejectedValueOnce(new UnauthenticatedError());

    const response = await POST(request() as never);

    expect(response.status).toBe(401);
    expect(mocks.createCentralBrokerConnection).not.toHaveBeenCalled();
  });

  it("rejects non-admin employee roles before credential storage", async () => {
    mocks.requireAuthenticatedEmployee.mockResolvedValueOnce({ id: "support-1", role: "SUPPORT" });

    const response = await POST(request() as never);

    expect(response.status).toBe(403);
    expect(mocks.createCentralBrokerConnection).not.toHaveBeenCalled();
  });

  it("allows admins and rejects non-admins on central connection deactivation", async () => {
    mocks.requireAuthenticatedEmployee.mockResolvedValueOnce({ id: "support-1", role: "SUPPORT" });
    const denied = await deactivatePost(deactivateRequest() as never);
    expect(denied.status).toBe(403);
    expect(mocks.deactivateCentralBrokerConnection).not.toHaveBeenCalled();

    mocks.requireAuthenticatedEmployee.mockResolvedValueOnce({ id: "admin-1", role: "ADMIN" });
    mocks.getCentralBrokerConnectionById.mockResolvedValueOnce({
      id: "connection-1",
      broker_id: "dhan",
      label: "FundedWealth Dhan",
    });
    mocks.deactivateCentralBrokerConnection.mockResolvedValueOnce(undefined);
    const allowed = await deactivatePost(deactivateRequest() as never);

    expect(allowed.status).toBe(200);
    expect(mocks.deactivateCentralBrokerConnection).toHaveBeenCalledWith("connection-1", "admin-1");
  });
});