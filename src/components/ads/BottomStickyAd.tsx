import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { Ad } from "@/types";
import { AdCarousel } from "./AdCarousel";
import { useLocation } from "@/hooks/useLocation";

export const BottomStickyAd = () => {
    const { state } = useAppContext();
    const { location: userLocation } = useLocation();
    const [isVisible, setIsVisible] = useState(false); // Initially hidden, shows after delay
    const [ad, setAd] = useState<Ad | null>(null);

    const adsEnabled = state.settings?.ads_enabled === 'true';

    useEffect(() => {
        const fetchAd = async () => {
            try {
                // Build URL with location params for targeting
                let url = '/api/ads?type=BOTTOM_STICKY&activeOnly=true';
                if (userLocation?.country) url += `&userCountry=${encodeURIComponent(userLocation.country)}`;
                if (userLocation?.state) url += `&userState=${encodeURIComponent(userLocation.state)}`;
                if (userLocation?.city) url += `&userCity=${encodeURIComponent(userLocation.city)}`;

                const response = await fetch(url);
                if (response.ok) {
                    const ads = await response.json();
                    if (ads.length > 0) {
                        setAd(ads[0]);
                        // Show ad after 5 seconds
                        setTimeout(() => setIsVisible(true), 5000);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch bottom ad", error);
            }
        };

        if (adsEnabled) {
            fetchAd();
        }
    }, [adsEnabled, userLocation?.country, userLocation?.state, userLocation?.city]);

    if (!adsEnabled || !isVisible || !ad) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 w-1/2 md:w-1/5 min-w-[200px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-700">
            <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sponsored</span>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close ad"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {ad.mediaUrls && ad.mediaUrls.length > 0 && (
                <div className="w-full h-24 md:h-40 bg-gray-100">
                    <AdCarousel mediaUrls={ad.mediaUrls} autoPlay={true} />
                </div>
            )}

            <div className="p-2 md:p-4">
                <h4 className="font-bold text-gray-900 text-sm md:text-base mb-1">{ad.title}</h4>
                <div className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3 line-clamp-2" dangerouslySetInnerHTML={{ __html: ad.content }} />
                <button className="w-full py-1.5 md:py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-xs md:text-sm transition-colors">
                    Check it out
                </button>
            </div>
        </div>
    );
};
