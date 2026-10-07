import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedEmployee } from "@/lib/auth/session";
import {
  requirePermission,
  PermissionDeniedError,
  UnauthenticatedError,
  type Permission,
} from "@/lib/rbac/permissions";
import { serverLog } from "@/lib/logger";
import type { Employee } from "@/types";

interface HandlerContext {
  employee: Employee;
  req: NextRequest;
}

type ApiHandler = (ctx: HandlerContext) => Promise<NextResponse>;

export function withAuth(permission: Permission | null, handler: ApiHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const employee = await requireAuthenticatedEmployee(req);

      if (permission) {
        requirePermission(employee.role, permission);
      }

      return await handler({ employee, req });
    } catch (err) {
      return handleApiError(err, req);
    }
  };
}

function getErrorLogMetadata(err: unknown): { message: string; error_code?: string } {
  if (err instanceof Error) return { message: err.message };
  if (typeof err === "string") return { message: err };

  if (typeof err === "object" && err !== null) {
    const error = err as { message?: unknown; code?: unknown; error_code?: unknown };
    const message = typeof error.message === "string"
      ? error.message
      : "Unhandled non-Error exception";
    const code = typeof error.code === "string"
      ? error.code
      : typeof error.error_code === "string"
        ? error.error_code
        : undefined;
    return { message, ...(code ? { error_code: code } : {}) };
  }

  return { message: "Unhandled non-Error exception" };
}

export function handleApiError(err: unknown, req?: NextRequest): NextResponse {
  if (err instanceof UnauthenticatedError) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Authentication required." } },
      { status: 401 }
    );
  }
  if (err instanceof PermissionDeniedError) {
    return NextResponse.json(
      { error: { code: "PERMISSION_DENIED", message: "You do not have permission to perform this action." } },
      { status: 403 }
    );
  }
  serverLog("error", "api", "unhandled_error", {
    ...getErrorLogMetadata(err),
    ...(req ? { method: req.method, path: req.nextUrl.pathname } : {}),
  });
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An internal error occurred." } },
    { status: 500 }
  );
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): NextResponse {
  return NextResponse.json({
    data,
    meta: {
      total,
      page,
      page_size: pageSize,
      has_more: page * pageSize < total,
    },
  });
}

export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("page_size") ?? "25", 10))
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}
