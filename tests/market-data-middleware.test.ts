import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

const previousOrigins = process.env.MAIN_TERMINAL_ORIGINS;

afterEach(() => {
  if (previousOrigins === undefined) delete process.env.MAIN_TERMINAL_ORIGINS;
  else process.env.MAIN_TERMINAL_ORIGINS = previousOrigins;
});

describe("market-data CORS middleware", () => {
  it("permits preflight only from explicitly configured customer app origins", async () => {
    process.env.MAIN_TERMINAL_ORIGINS = "https://main.example.test,https://staging.example.test";

    const allowed = await middleware(new NextRequest("https://terminal.test/api/terminal/market-data", {
      method: "OPTIONS",
      headers: { origin: "https://main.example.test" },
    }));
    const denied = await middleware(new NextRequest("https://terminal.test/api/terminal/market-data", {
      method: "OPTIONS",
      headers: { origin: "https://attacker.example.test" },
    }));

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe("https://main.example.test");
    expect(allowed.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
    expect(denied.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});