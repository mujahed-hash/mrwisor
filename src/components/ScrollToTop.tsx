import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component - scrolls window to top on route change
 * Place inside BrowserRouter to enable scroll-to-top on navigation
 */
export function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Scroll to top on route change
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
