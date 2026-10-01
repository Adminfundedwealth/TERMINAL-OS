import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCentralBrokerConnectionTestTarget: vi.fn(),
  testCentralBrokerConnection: vi.fn(),
  writeActivityLog: vi.fn(),
}));

vi.mock("@/lib/auth/api-handler", () => ({
  withAuth: (_permission: unknown, handler: (context: unknown) => unknown) => handler,
  handleApiError: (error: unknown) => new Response(JSON.stringify({ error: { message: error instanceof Error ? error.message : "error" } }), { status: 500 }),
}));
vi.mock("@/server/services/broker-credentials", () => ({
  getCentralBrokerConnectionTestTarget: mocks.getCentralBrokerConnectionTestTarget,
  testCentralBrokerConnection: mocks.testCentralBrokerConnection,
}));
vi.mock("@/server/services/broker-connections", () => ({
  getCentralBrokerConnectionTestTarget: mocks.getCentralBrokerConnectionTestTarget,
  testCentralBrokerConnection: mocks.testCentralBrokerConnection,
}));
vi.mock("@/lib/logger", () => ({ writeActivityLog: mocks.writeActivityLog }));

import { POST } from "../app/api/terminal/broker/[id]/test/route";

const credential = {
  id: "credential-1",
  broker_id: "dhan",
  environment: "production",
  label: "Dhan",
};

function request(body: unknown) {
  return new Request("https://terminal.test/api/terminal/broker/credential-1/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function post(req: Request) {
  return POST({ req, employee: { id: "employee-1" } } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCentralBrokerConnectionTestTarget.mockResolvedValue(credential.id);
  mocks.testCentralBrokerConnection.mockResolvedValue({ success: false, implemented: true, message: "Broker authentication failed." });
});

describe("scoped broker connection test route", () => {
  it.each([
    { broker_id: "dhan", environment: "production" },
    { broker_id: "zerodha", environment: "production" },
    { broker_id: "dhan", environment: "paper" },
  ])("rejects an out-of-scope credential before decryption/testing", async (scope) => {
    mocks.getCentralBrokerConnectionTestTarget.mockResolvedValueOnce(null);
    const response = await post(request(scope));

    expect(response.status).toBe(404);
    expect(mocks.getCentralBrokerConnectionTestTarget).toHaveBeenCalledWith("credential-1", scope);
    expect(mocks.testCentralBrokerConnection).not.toHaveBeenCalled();
    expect(mocks.writeActivityLog).not.toHaveBeenCalled();
  });

  it("tests only the matching scope and returns no credential values", async () => {
    const response = await post(request({
      broker_id: "dhan",
      environment: "production",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.testCentralBrokerConnection).toHaveBeenCalledWith("credential-1", {
      broker_id: "dhan",
      environment: "production",
    }, "employee-1");
    expect(body.data).toMatchObject({ success: false, broker_id: "dhan", message: "Broker authentication failed." });
    expect(JSON.stringify(body)).not.toContain("encrypted_credentials");
    expect(mocks.writeActivityLog).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ broker_id: "dhan", test_result: "Broker authentication failed." }),
    }));
  });
});