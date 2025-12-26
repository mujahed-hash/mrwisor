import { Link, useLocation } from "react-router-dom";
import { Home, Users, Receipt, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

const leftItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Users, label: "Groups", href: "/groups" },
];

const rightItems = [
    { icon: Receipt, label: "Expenses", href: "/expenses" },
    { icon: User, label: "Account", href: "/settings" },
];

export function MobileDock() {
    const location = useLocation();
    const isAddPageActive = location.pathname === '/expenses/new' || location.pathname.startsWith('/expenses/') && location.pathname.includes('/edit');

    // Scroll hide/show state
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                // Scrolling down - hide dock
                setIsVisible(false);
            } else if (currentScrollY < lastScrollY.current) {
                // Scrolling up - show dock
                setIsVisible(true);
            }

            lastScrollY.current = currentScrollY;

            // Show dock when scrolling stops
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
            scrollTimeout.current = setTimeout(() => {
                setIsVisible(true);
            }, 800);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, []);

    const renderItem = (item: { icon: any; label: string; href: string }) => {
        const Icon = item.icon;
        // Don't show other items as active if we're on the Add page
        const isActive = !isAddPageActive && (
            location.pathname === item.href ||
            (item.href !== "/" && location.pathname.startsWith(item.href))
        );

        return (
            <Link
                key={item.href}
                to={item.href}
                className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 w-14 py-2 rounded-2xl transition-all duration-300 ease-out",
                    isActive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                {/* Animated background pill */}
                <div className={cn(
                    "absolute inset-0 rounded-2xl bg-gradient-to-t from-emerald-500/20 to-teal-500/20 transition-all duration-300 ease-out",
                    isActive ? "opacity-100 scale-100" : "opacity-0 scale-90"
                )} />
                <Icon className={cn("relative h-5 w-5 transition-transform duration-300", isActive && "scale-110")} />
                <span className={cn("relative text-[10px] font-medium transition-all duration-300", isActive && "font-semibold")}>{item.label}</span>
            </Link>
        );
    };

    return (
        <div className={cn(
            "md:hidden fixed bottom-4 left-4 right-4 z-50 transition-all duration-300 ease-out",
            isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        )}>
            <nav className="flex items-center justify-around bg-background/80 backdrop-blur-xl border border-border/50 rounded-[22px] shadow-lg shadow-black/10 py-2 px-2">
                {/* Left items */}
                {leftItems.map(renderItem)}

                {/* Center + Button */}
                <Link
                    to="/expenses/new"
                    className="relative flex flex-col items-center justify-center gap-0.5 w-14 py-1"
                >
                    {/* Active indicator for Add button */}
                    <div className={cn(
                        "absolute inset-0 rounded-2xl bg-gradient-to-t from-emerald-500/20 to-teal-500/20 transition-all duration-300 ease-out",
                        isAddPageActive ? "opacity-100 scale-100" : "opacity-0 scale-90"
                    )} />
                    <div className={cn(
                        "relative flex items-center justify-center w-10 h-10 bg-primary rounded-full shadow-md transition-all duration-300",
                        isAddPageActive ? "shadow-emerald-500/40 ring-2 ring-emerald-400/50" : "shadow-primary/25"
                    )}>
                        <Plus className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className={cn(
                        "relative text-[10px] font-medium transition-all duration-300",
                        isAddPageActive ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-primary"
                    )}>Add</span>
                </Link>

                {/* Right items */}
                {rightItems.map(renderItem)}
            </nav>
        </div>
    );
}
