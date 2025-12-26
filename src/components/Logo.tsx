import { TrendingUp, Sparkles } from 'lucide-react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    className?: string;
}

/**
 * Wisely Spent brand logo with modern expressive design
 */
export function Logo({ size = 'md', showIcon = true, className = '' }: LogoProps) {
    const sizeClasses = {
        sm: {
            container: 'gap-2',
            icon: 'h-5 w-5',
            iconBg: 'w-8 h-8',
            text: 'text-2xl',
            sparkle: 'h-3 w-3',
        },
        md: {
            container: 'gap-3',
            icon: 'h-6 w-6',
            iconBg: 'w-10 h-10',
            text: 'text-4xl',
            sparkle: 'h-4 w-4',
        },
        lg: {
            container: 'gap-4',
            icon: 'h-8 w-8',
            iconBg: 'w-12 h-12',
            text: 'text-5xl',
            sparkle: 'h-5 w-5',
        },
    };

    const s = sizeClasses[size];

    return (
        <div className={`flex items-center ${s.container} ${className}`}>
            {showIcon && (
                <div className={`${s.iconBg} relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/40 transform hover:scale-105 transition-transform`}>
                    {/* Main icon */}
                    <TrendingUp className={`${s.icon} text-white`} strokeWidth={2.5} />
                    {/* Sparkle accent */}
                    <Sparkles className={`${s.sparkle} text-yellow-300 absolute -top-1 -right-1 drop-shadow-lg animate-pulse`} />
                </div>
            )}
            <div className="flex flex-col leading-none">
                <span
                    className={`${s.text} font-light tracking-tight`}
                    style={{
                        fontFamily: "'Cookie', cursive",
                        background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    Wisely Spent
                </span>
            </div>
        </div>
    );
}

/**
 * Compact logo for navigation/header - modern expressive design
 * Responsive: slightly smaller on very small screens but still readable
 */
export function LogoCompact({ className = '' }: { className?: string }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Modern icon with gradient and sparkle */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 relative flex items-center justify-center rounded-xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 transform hover:scale-105 transition-transform flex-shrink-0">
                <TrendingUp className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-white" strokeWidth={2.5} />
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-300 absolute -top-0.5 -right-0.5 drop-shadow animate-pulse" />
            </div>
            <span
                className="text-2xl sm:text-3xl tracking-tight whitespace-nowrap"
                style={{
                    fontFamily: "'Cookie', cursive",
                }}
            >
                {/* Two spans for light/dark mode with different gradients */}
                <span
                    className="dark:hidden"
                    style={{
                        background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        position: 'relative',
                        top: '0.1rem',
                    }}
                >
                    Wisely Spent
                </span>
                <span
                    className="hidden dark:inline"
                    style={{
                        background: 'linear-gradient(135deg, #34d399 0%, #2dd4bf 50%, #22d3ee 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        position: 'relative',
                        top: '0.1rem',
                    }}
                >
                    Wisely Spent
                </span>
            </span>
        </div>
    );
}
