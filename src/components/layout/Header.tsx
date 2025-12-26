import { Bell, Moon, Settings, Sun } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "./ThemeProvider";
import { useAppContext } from "@/contexts/AppContext";
import { getInitials } from "@/lib/utils";
import { MobileNavbar } from "./MobileNavbar";
import { useAuth } from "@/contexts/AuthContext";
import { LogoCompact } from "@/components/Logo";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { state } = useAppContext();
  const { currentUser } = state;
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Use authenticated user if available, otherwise use the app context user
  const displayUser = user || currentUser;

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Handle navigation to settings
  const handleSettingsClick = () => {
    navigate("/settings");
  };

  return (
    <header className="border-b sticky top-0 z-40 bg-background">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Mobile menu button */}
        <MobileNavbar />

        {/* Logo - only show on mobile when sidebar is hidden */}
        <Link to="/" className="md:hidden">
          <LogoCompact />
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme toggle, notifications & settings */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Toggle theme">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="icon" className="relative" onClick={() => navigate('/notifications')}>
            <Bell className="h-[1.2rem] w-[1.2rem]" />
            {state.notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[10px] flex items-center justify-center text-primary-foreground">
                {state.notifications.filter(n => !n.read).length}
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="hidden sm:flex"
            onClick={handleSettingsClick}
          >
            <Settings className="h-[1.2rem] w-[1.2rem]" />
          </Button>

          {/* User profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
                  <AvatarFallback>{getInitials(displayUser.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/profile')}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}