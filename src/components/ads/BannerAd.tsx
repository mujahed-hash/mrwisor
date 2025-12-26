import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { Ad } from "@/types";
import { AdCarousel } from "./AdCarousel";
import { useLocation } from "@/hooks/useLocation";

export function BannerAd() {
    const { state } = useAppContext();
    const { location: userLocation } = useLocation();
    const [isVisible, setIsVisible] = useState(true);
    const [ads, setAds] = useState<Ad[]>([]);
    const [currentAdIndex, setCurrentAdIndex] = useState(0);

    const adsEnabled = state.settings?.ads_enabled === 'true';

    useEffect(() => {
        if (!adsEnabled) return;

        const fetchAds = async () => {
            try {
                // Build URL with location params for targeting
                let url = '/api/ads?type=TOP_BANNER&activeOnly=true';
                if (userLocation?.country) url += `&userCountry=${encodeURIComponent(userLocation.country)}`;
                if (userLocation?.state) url += `&userState=${encodeURIComponent(userLocation.state)}`;
                if (userLocation?.city) url += `&userCity=${encodeURIComponent(userLocation.city)}`;

                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        // Latest first (already sorted by createdAt DESC from backend)
                        setAds(data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch banner ads", error);
            }
        };

        fetchAds();
    }, [adsEnabled, userLocation?.country, userLocation?.state, userLocation?.city]);

    // Auto-scroll every 5 seconds
    useEffect(() => {
        if (ads.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % ads.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [ads.length]);

    const goToAd = (index: number) => {
        setCurrentAdIndex(index);
    };

    const prevAd = () => {
        setCurrentAdIndex((prev) => (prev - 1 + ads.length) % ads.length);
    };

    const nextAd = () => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    };

    if (!adsEnabled || !isVisible || ads.length === 0) return null;

    const currentAd = ads[currentAdIndex];

    return (
        <div className="relative w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white group">
            {/* Close button */}
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-2 right-2 z-20 p-1 bg-black/30 hover:bg-black/50 rounded-full transition-colors"
                aria-label="Close ad"
            >
                <X className="h-4 w-4 text-white" />
            </button>

            {/* Navigation arrows (show on hover if multiple ads) */}
            {ads.length > 1 && (
                <>
                    <button
                        onClick={prevAd}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={nextAd}
                        className="absolute right-10 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </>
            )}

            {/* Ad content */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4">
                {/* Media - full width on mobile, fixed on desktop */}
                {currentAd.mediaUrls && currentAd.mediaUrls.length > 0 && (
                    <div className="w-full md:w-48 h-32 shrink-0 rounded overflow-hidden bg-black/20">
                        <AdCarousel mediaUrls={currentAd.mediaUrls} interval={5000} />
                    </div>
                )}

                {/* Text content */}
                <div className="flex-1 min-w-0">
                    <span className="text-xs uppercase tracking-wider opacity-70">Sponsored</span>
                    <h3 className="font-bold text-lg mb-1">{currentAd.title}</h3>
                    <div className="text-sm opacity-90" dangerouslySetInnerHTML={{ __html: currentAd.content }} />
                </div>

                {/* Button - full width on mobile, auto on desktop */}
                <button className="w-full md:w-auto shrink-0 bg-white text-purple-600 px-4 py-2 rounded-full font-semibold text-sm hover:bg-opacity-90 transition-colors">
                    Learn More
                </button>
            </div>

            {/* Carousel dots */}
            {ads.length > 1 && (
                <div className="flex justify-center gap-2 pb-3">
                    {ads.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => goToAd(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${idx === currentAdIndex
                                ? "bg-white w-4"
                                : "bg-white/50 hover:bg-white/80"
                                }`}
                            aria-label={`Go to ad ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
