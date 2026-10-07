import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getBrokerCredentialById: vi.fn(),
  setActiveBroker: vi.fn(),
  writeActivityLog: vi.fn(),
}));

vi.mock("@/lib/auth/api-handler", () => ({
  withAuth: (_permission: unknown, handler: (context: unknown) => unknown) => handler,
  handleApiError: (error: unknown) => new Response(JSON.stringify({ error: { message: error instanceof Error ? error.message : "error" } }), { status: 500 }),
}));
vi.mock("@/server/services/broker-credentials", () => ({
  getBrokerCredentialById: mocks.getBrokerCredentialById,
  setActiveBroker: mocks.setActiveBroker,
}));
vi.mock("@/lib/logger", () => ({ writeActivityLog: mocks.writeActivityLog }));

import { POST } from "../app/api/terminal/broker/[id]/activate/route";

const credential = {
  id: "credential-1",
  broker_id: "dhan",
  label: "Dhan",
};

function post() {
  const req = new Request("https://terminal.test/api/terminal/broker/credential-1/activate", {
    method: "POST",
  });
  return POST({ req, employee: { id: "employee-1" } } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getBrokerCredentialById.mockResolvedValue(credential);
});

describe("broker credential activation route", () => {
  it("activates the saved broker credential", async () => {
    const response = await post();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getBrokerCredentialById).toHaveBeenCalledWith("credential-1");
    expect(mocks.setActiveBroker).toHaveBeenCalledWith("credential-1", "employee-1");
    expect(body.data).toEqual({ activated: true, broker_id: "dhan", label: "Dhan" });
    expect(mocks.writeActivityLog).toHaveBeenCalledWith(expect.objectContaining({
      resource: "broker_credentials",
      resource_id: "credential-1",
    }));
  });

  it("returns 404 when the saved credential does not exist", async () => {
    mocks.getBrokerCredentialById.mockResolvedValueOnce(null);

    const response = await post();

    expect(response.status).toBe(404);
    expect(mocks.setActiveBroker).not.toHaveBeenCalled();
  });
});
