import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdCarouselProps {
    mediaUrls: string[];
    autoPlay?: boolean;
    interval?: number;
}

export function AdCarousel({ mediaUrls, autoPlay = true, interval = 5000 }: AdCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Reset index when mediaUrls change
    useEffect(() => {
        setCurrentIndex(0);
    }, [mediaUrls]);

    // Handle auto-play
    useEffect(() => {
        if (!isPlaying || mediaUrls.length <= 1) return;

        const currentMedia = mediaUrls[currentIndex];
        const isVideo = currentMedia.match(/\.(mp4|webm|ogg)$/i);

        if (isVideo) {
            // Video handles its own duration, but we fallback to interval if it fails to play
            return;
        }

        const timer = setInterval(() => {
            nextSlide();
        }, interval);

        return () => clearInterval(timer);
    }, [currentIndex, isPlaying, mediaUrls, interval]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % mediaUrls.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    const handleVideoEnded = () => {
        if (isPlaying) {
            nextSlide();
        }
    };

    if (!mediaUrls || mediaUrls.length === 0) return null;

    const currentUrl = mediaUrls[currentIndex];
    const isVideo = currentUrl.match(/\.(mp4|webm|ogg)$/i);

    return (
        <div className="relative group w-full h-full overflow-hidden rounded-md bg-black/5">
            <div className="relative w-full h-full flex items-center justify-center">
                {isVideo ? (
                    <video
                        ref={videoRef}
                        src={currentUrl}
                        className="w-full h-full object-contain"
                        autoPlay={isPlaying}
                        muted={true} // Muted required for auto-play policy
                        playsInline
                        onEnded={handleVideoEnded}
                        controls={false}
                    />
                ) : (
                    <img
                        src={currentUrl}
                        alt={`Ad slide ${currentIndex + 1}`}
                        className="w-full h-full object-contain animate-in fade-in duration-500"
                    />
                )}
            </div>

            {/* Navigation Arrows */}
            {mediaUrls.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {mediaUrls.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); goToSlide(idx); }}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? "bg-white w-4" : "bg-white/50 hover:bg-white/80"
                                    }`}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
