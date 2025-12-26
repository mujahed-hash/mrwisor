import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useTheme } from "./ThemeProvider";
import { BottomStickyAd } from "@/components/ads/BottomStickyAd";
import { MobileDock } from "./MobileDock";

interface AppLayoutProps {
  children: ReactNode;
}

// Export both as default and named export to ensure compatibility
export function AppLayout({ children }: AppLayoutProps) {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen bg-background ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-col flex-1 w-full">
          <Header />
          <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-in-out">{children}</main>
        </div>
      </div>
      <MobileDock />
      <BottomStickyAd />
    </div>
  );
}

// Add default export to ensure compatibility
export default AppLayout;