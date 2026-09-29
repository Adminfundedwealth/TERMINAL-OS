import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/auth/session";
import { getRuleManagementContext, manageRuleConfiguration } from "@/server/services/rules";

const ACTIONS = new Set([
  "save_product",
  "save_phase",
  "create_rule_version",
  "publish_rule_version",
  "unpublish_rule_version",
  "apply_rule_version",
]);

async function authenticatedEmployee() {
  const employee = await getAuthenticatedEmployee();
  if (!employee || employee.status !== "ACTIVE") return null;
  return employee;
}

function isRuleAdmin(email: string): boolean {
  const allowlist = (process.env.RULE_MANAGEMENT_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.trim().toLowerCase());
}

export async function GET() {
  const employee = await authenticatedEmployee();
  if (!employee) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const data = await getRuleManagementContext();
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Canonical rule data is unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const employee = await authenticatedEmployee();
  if (!employee) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!isRuleAdmin(employee.email)) {
    return NextResponse.json({ error: "Rule administration is not authorized for this employee" }, { status: 403 });
  }

  let request: Record<string, unknown>;
  try {
    request = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  if (typeof request.action !== "string" || !ACTIONS.has(request.action)) {
    return NextResponse.json({ error: "Unsupported rule-management action" }, { status: 400 });
  }

  try {
    const data = await manageRuleConfiguration({ ...request, actor_email: employee.email, created_by: null });
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Canonical rule change failed" }, { status: 409 });
  }
}