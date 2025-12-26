import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { LogoCompact } from "@/components/Logo";
import {
  Home,
  PlusCircle,
  Receipt,
  Users,
  CreditCard,
  BarChart4,
  Settings,
  LogOut,
  UserCircle,
  Bell,
  BarChart3,
  UserPlus,
  ShoppingBag
} from "lucide-react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: number;
}

function SidebarItem({ icon, label, href, isActive, onClick, badge }: SidebarItemProps) {
  const content = (
    <>
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-2",
          isActive && "bg-secondary text-secondary-foreground"
        )}
        onClick={onClick}
      >
        {content}
      </Button>
    );
  }

  return (
    <Link to={href || "#"}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-2",
          isActive && "bg-secondary text-secondary-foreground"
        )}
      >
        {content}
      </Button>
    </Link>
  );
}

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { state } = useAppContext();
  const unreadCount = state.notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const routes = [
    {
      icon: <Home className="h-5 w-5" />,
      label: "Dashboard",
      href: "/",
    },
    {
      icon: <Bell className="h-5 w-5" />,
      label: "Notifications",
      href: "/notifications",
      badge: unreadCount,
    },
    {
      icon: <PlusCircle className="h-5 w-5" />,
      label: "Add Expense",
      href: "/expenses/new",
    },
    {
      icon: <Receipt className="h-5 w-5" />,
      label: "Shared Expenses",
      href: "/expenses",
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      label: "Personal Expenses",
      href: "/personal-expenses",
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Groups",
      href: "/groups",
    },
    {
      icon: <UserCircle className="h-5 w-5" />, // Reusing UserCircle or distinct icon if available
      label: "Friends",
      href: "/friends",
    },
    {
      icon: <ShoppingBag className="h-5 w-5" />,
      label: "Purchases",
      href: "/purchases",
    },
    {
      icon: <BarChart4 className="h-5 w-5" />,
      label: "Reports",
      href: "/reports",
    },
  ];

  const bottomRoutes = [
    {
      icon: <UserCircle className="h-5 w-5" />,
      label: "Profile",
      href: "/profile",
    },
    {
      icon: <Settings className="h-5 w-5" />,
      label: "Settings",
      href: "/settings",
    },
  ];

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/">
          <LogoCompact />
        </Link>
      </div>

      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          {routes.map((route, i) => (
            <SidebarItem
              key={i}
              icon={route.icon}
              label={route.label}
              href={route.href}
              isActive={pathname === route.href}
              badge={(route as any).badge}
            />
          ))}
        </nav>
      </div>

      <Separator />
      <nav className="grid gap-1 px-2 py-2">
        {bottomRoutes.map((route, i) => (
          <SidebarItem
            key={i}
            icon={route.icon}
            label={route.label}
            href={route.href}
            isActive={pathname === route.href}
          />
        ))}
        <SidebarItem
          icon={<LogOut className="h-5 w-5" />}
          label="Logout"
          onClick={handleLogout}
        />
      </nav>
    </aside>
  );
}