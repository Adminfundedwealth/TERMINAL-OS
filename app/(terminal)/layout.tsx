import { getAuthenticatedEmployee } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";

export const dynamic = "force-dynamic";

export default async function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const employee = await getAuthenticatedEmployee();

  if (!employee) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar */}
      <Sidebar employeeRole={employee.role} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav employee={employee} />
        <main className="flex-1 overflow-y-auto thin-scrollbar">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
