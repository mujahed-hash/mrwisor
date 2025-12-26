import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LogoCompact } from "@/components/Logo";
import { cn } from "@/lib/utils";
import {
  Menu,
  Home,
  PlusCircle,
  Receipt,
  Users,
  CreditCard,
  BarChart4,
  Settings,
  LogOut,
  UserCircle,
  Wallet,
  ShoppingCart
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function MobileNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
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
      icon: <Wallet className="h-5 w-5" />,
      label: "Personal Expenses",
      href: "/personal-expenses",
    },
    {
      icon: <ShoppingCart className="h-5 w-5" />,
      label: "Purchases",
      href: "/purchases",
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Groups",
      href: "/groups",
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
    <div className="md:hidden flex items-center">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 items-center border-b px-4">
            <Link
              to="/"
              onClick={() => setOpen(false)}
            >
              <LogoCompact />
            </Link>
          </div>

          <div className="flex-1 overflow-auto py-2">
            <nav className="grid gap-1 px-2">
              {routes.map((route, i) => (
                <Link
                  key={i}
                  to={route.href}
                  onClick={() => setOpen(false)}
                >
                  <Button
                    variant={location.pathname === route.href ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2",
                      location.pathname === route.href && "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {route.icon}
                    <span className="ml-2">{route.label}</span>
                  </Button>
                </Link>
              ))}
            </nav>
          </div>

          <div className="border-t">
            <nav className="grid gap-1 px-2 py-2">
              {bottomRoutes.map((route, i) => (
                <Link
                  key={i}
                  to={route.href}
                  onClick={() => setOpen(false)}
                >
                  <Button
                    variant={location.pathname === route.href ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2",
                      location.pathname === route.href && "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {route.icon}
                    <span className="ml-2">{route.label}</span>
                  </Button>
                </Link>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span className="ml-2">Logout</span>
              </Button>
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}