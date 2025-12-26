import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { GroupsList } from "@/components/dashboard/GroupsList";
import { AppLayout } from "@/components/layout/AppLayout";
import { BannerAd } from "@/components/ads/BannerAd";
import { LocationPrompt } from "@/components/LocationPrompt";

export default function Dashboard() {
  return (
    <AppLayout>
      <LocationPrompt />
      <BannerAd />
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>

        <DashboardSummary />

        <div className="grid gap-6 md:grid-cols-2">
          <RecentActivity />
          <GroupsList />
        </div>
      </div>
    </AppLayout>
  );
}