import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedEmployee } from "@/lib/auth/session";
import { hasPermission, PERMISSIONS } from "@/lib/rbac/permissions";
import { BrokerApiKeysClient } from "@/components/broker/broker-api-keys-client";

export const metadata: Metadata = { title: "Broker API Keys" };

export default async function BrokerApiKeysPage() {
  const employee = await getAuthenticatedEmployee();
  if (!employee) redirect("/login");

  if (!hasPermission(employee.role, PERMISSIONS.BROKER_VIEW)) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(employee.role, PERMISSIONS.BROKER_MANAGE);

  return <BrokerApiKeysClient canManage={canManage} />;
}
