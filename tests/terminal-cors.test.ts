import { describe, expect, it } from "vitest";
import { mainTerminalCorsHeaders, mainTerminalOptionsResponse } from "../lib/terminal-cors";

describe("Terminal OS customer API CORS", () => {
  it("allows the production customer terminal to request authenticated market data", async () => {
    const request = new Request("https://terminal-os.fundedwealth.com/api/terminal/realtime-ticket", {
      method: "OPTIONS",
      headers: { Origin: "https://charts.fundedwealth.com" },
    });
    const response = mainTerminalOptionsResponse(request, "POST, OPTIONS");

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://charts.fundedwealth.com");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("does not allow an unconfigured external origin", async () => {
    const request = new Request("https://terminal-os.fundedwealth.com/api/terminal/realtime-ticket", {
      method: "OPTIONS",
      headers: { Origin: "https://untrusted.example" },
    });

    expect(mainTerminalCorsHeaders(request)["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(mainTerminalOptionsResponse(request, "POST, OPTIONS").status).toBe(403);
  });
});
