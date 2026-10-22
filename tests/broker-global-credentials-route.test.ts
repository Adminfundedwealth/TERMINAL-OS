import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createBrokerCredential: vi.fn(),
  writeActivityLog: vi.fn(),
  serverLog: vi.fn(),
}));

vi.mock("@/lib/auth/api-handler", () => ({
  withAuth: (_permission: unknown, handler: (context: { req: Request; employee: { id: string } }) => Promise<Response>) =>
    (req: Request) => handler({ req, employee: { id: "founder-1" } }),
  handleApiError: vi.fn(),
}));
vi.mock("@/server/services/broker-credentials", () => ({
  getAllBrokerCredentials: vi.fn(),
  createBrokerCredential: mocks.createBrokerCredential,
}));
vi.mock("@/lib/logger", () => ({
  writeActivityLog: mocks.writeActivityLog,
  serverLog: mocks.serverLog,
}));

import { POST } from "../app/api/terminal/broker/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createBrokerCredential.mockResolvedValue({
    id: "global-dhan-credential",
    broker_id: "dhan",
    trading_account_id: null,
    label: "FundedWealth Global Dhan Market Data",
  });
  mocks.writeActivityLog.mockResolvedValue(undefined);
});

describe("global broker market-data credentials", () => {
  it("accepts Founder Dhan credentials without a trading-account binding", async () => {
    const req = new Request("https://terminal.test/api/terminal/broker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        broker_id: "dhan",
        label: "FundedWealth Global Dhan Market Data",
        credentials: { client_id: "test-client", access_token: "test-token" },
      }),
    });

    const response = await POST(req as never);

    expect(response.status).toBe(201);
    expect(mocks.createBrokerCredential).toHaveBeenCalledWith({
      broker_id: "dhan",
      label: "FundedWealth Global Dhan Market Data",
      credentials: { client_id: "test-client", access_token: "test-token" },
    }, "founder-1");
    expect((await response.json()).data.trading_account_id).toBeNull();
    expect(mocks.writeActivityLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "BROKER_CREDENTIALS_CREATED",
      metadata: { broker_id: "dhan", label: "FundedWealth Global Dhan Market Data" },
    }));
  });
});
