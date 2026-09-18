import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EmployeesClient } from "@/components/operations/employees-client";

export const metadata: Metadata = { title: "Employees" };

export default function EmployeesPage() {
  return (
    <div>
      <PageHeader
        title="Employees"
        description="Terminal OS employee management — authorized administrators only"
      />
      <EmployeesClient />
    </div>
  );
}
