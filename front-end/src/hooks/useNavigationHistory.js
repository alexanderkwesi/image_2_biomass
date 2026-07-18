// hooks/useNavigationHistory.js
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useNavigationHistory = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page views for analytics
    if (window.gtag) {
      window.gtag("config", "GA_MEASUREMENT_ID", {
        page_path: location.pathname + location.search,
      });
    }

    // Scroll to top on route change
    window.scrollTo(0, 0);

    // Store last visited page for back navigation
    const previousPath = localStorage.getItem("previousPath");
    const currentPath = location.pathname + location.search;

    if (previousPath !== currentPath) {
      localStorage.setItem("previousPath", currentPath);
    }
  }, [location]);
};

// Usage in AppNavigator:
const AppNavigator = () => {
  useNavigationHistory(); // Add this hook

  return <Router>{/* ... routes ... */}</Router>;
};
