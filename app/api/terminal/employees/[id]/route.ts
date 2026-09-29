import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
const unavailable = () =>
  NextResponse.json(
    { error: { code: "UNAVAILABLE", message: "Staff administration is unavailable until a canonical Auth-to-staff contract is verified." } },
    { status: 503 }
  );

export const GET = withAuth(PERMISSIONS.EMPLOYEES_VIEW, async () => unavailable());

export const PATCH = withAuth(PERMISSIONS.EMPLOYEES_UPDATE, async () => unavailable());
