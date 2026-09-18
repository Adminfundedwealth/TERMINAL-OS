import { NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getAccountById, getAccountSummaryStats } from "@/server/services/accounts";

export const GET = withAuth(
  PERMISSIONS.ACCOUNTS_VIEW,
  async ({ req }) => {
    try {
      // Extract id from URL path
      const id = req.nextUrl.pathname.split("/").pop();
      if (!id) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Account ID required." } },
          { status: 400 }
        );
      }

      const [account, stats] = await Promise.all([
        getAccountById(id),
        getAccountSummaryStats(id),
      ]);

      if (!account) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Account not found." } },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: { account, stats } });
    } catch (err) {
      return handleApiError(err);
    }
  }
);
