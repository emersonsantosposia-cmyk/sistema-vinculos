import { DashboardWithSuspense } from "@/components/dashboard/DashboardView";
import { DashboardShell } from "@/components/layout/DashboardShell";

export const metadata = {
  title: "Dashboard",
};

export default function HomePage() {
  return (
    <DashboardShell title="Dashboard" flush>
      <DashboardWithSuspense />
    </DashboardShell>
  );
}
