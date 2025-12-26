import { ReactNode } from "react";
import { AppLayout } from "./AppLayout";

interface LayoutProps {
  children: ReactNode;
}

// Simple wrapper component that uses AppLayout
export default function Layout({ children }: LayoutProps) {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}