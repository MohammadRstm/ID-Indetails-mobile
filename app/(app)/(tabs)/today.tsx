import { AdminTodayScreen } from "@/features/today/admin/screens/AdminTodayScreen";
import { CompanyTodayScreen } from "@/features/today/company/screens/CompanyTodayScreen";
import { DesignTodayScreen } from "@/features/today/design/screens/DesignTodayScreen";
import { ExecutionTodayScreen } from "@/features/today/execution/screens/ExecutionTodayScreen";
import { WebsiteTodayScreen } from "@/features/today/website/screens/WebsiteTodayScreen";
import { persona } from "@/permissions/screens";
import { usePermissions } from "@/permissions/usePermissions";

/** Each kind of person has their own Today. */
export default function TodayRoute() {
  switch (persona(usePermissions())) {
    case "super_admin":
      return <CompanyTodayScreen />;
    case "admin":
      return <AdminTodayScreen />;
    case "execution_employee":
      return <ExecutionTodayScreen />;
    case "design_employee":
      return <DesignTodayScreen />;
    case "website_staff":
      return <WebsiteTodayScreen />;
  }
}
