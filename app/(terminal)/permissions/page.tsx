import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_PERMISSIONS } from "@/components/operations/permissions-display";

export const metadata: Metadata = { title: "Permissions" };

export default function PermissionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions"
        description="Role-based permission matrix — read-only reference"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => (
          <Card key={role}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant="secondary">{role}</Badge>
                <span className="text-xs text-muted-foreground font-normal">
                  {permissions.length} permission{permissions.length !== 1 ? "s" : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {permissions.map((p) => (
                  <Badge key={p} variant="outline" className="text-[10px] font-mono">
                    {p}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
