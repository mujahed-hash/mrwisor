import { Ad } from "@/types";
import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { AdCarousel } from "./AdCarousel";
import { useLocation } from "@/hooks/useLocation";

export const InFeedAd = () => {
    const { state } = useAppContext();
    const { location: userLocation } = useLocation();
    const [ad, setAd] = useState<Ad | null>(null);

    const adsEnabled = state.settings?.ads_enabled === 'true';

    useEffect(() => {
        const fetchAd = async () => {
            try {
                // Build URL with location params for targeting
                let url = '/api/ads?type=FEED&activeOnly=true';
                if (userLocation?.country) url += `&userCountry=${encodeURIComponent(userLocation.country)}`;
                if (userLocation?.state) url += `&userState=${encodeURIComponent(userLocation.state)}`;
                if (userLocation?.city) url += `&userCity=${encodeURIComponent(userLocation.city)}`;

                const response = await fetch(url);
                if (response.ok) {
                    const ads = await response.json();
                    if (ads.length > 0) {
                        setAd(ads[0]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch feed ad", error);
            }
        };

        if (adsEnabled) {
            fetchAd();
        }
    }, [adsEnabled, userLocation?.country, userLocation?.state, userLocation?.city]);

    if (!adsEnabled || !ad) return null;

    return (
        <div className="my-4 p-4 bg-gray-50 border border-gray-100 rounded-lg shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Sponsored</span>

            {ad.mediaUrls && ad.mediaUrls.length > 0 && (
                <div className="w-full h-48 mb-3 rounded-md overflow-hidden bg-gray-200">
                    <AdCarousel mediaUrls={ad.mediaUrls} />
                </div>
            )}

            <h4 className="font-bold text-gray-900 mb-1">{ad.title}</h4>
            <div className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: ad.content }} />
        </div>
    );
};
