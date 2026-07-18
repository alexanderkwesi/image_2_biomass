// front-end/src/AppRoutes.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@src/@contexts/AuthContext";
import LoadingScreen from "@src/LoadingSpinner";

// Import components (adjust paths as needed)
import LoginScreen from "@src/LoginScreen";
import RegisterScreen from "@src/RegisterScreen";
import ForgotPasswordScreen from "@src/ForgottenPasswordScreen";
import ResetPasswordScreen from "@src/ResetPasswordScreen";
import PublicLayout from "@src/Layouts/PublicLayout";
import AuthLayout from "@src/Layouts/AuthLayout";
import AppLayout from "@src/Layouts/AppLayout";
import ProtectedRoute from "@src/ProtectedRoute";

// Import screens/components
import LandingScreen from "@src/LandingScreen";
import AboutScreen from "@src/AboutScreen";
import FeaturesScreen from "@src/FeaturesScreen";
import PricingScreen from "@src/PricingScreen";
import ContactScreen from "@src/ContactScreen";
import FAQScreen from "@src/FAQScreen";
import PrivacyPolicyScreen from "@src/PrivacyPolicyScreen";
import TermsOfServiceScreen from "@src/TermsOfServiceScreen";
import BlogScreen from "@src/BlogScreen";
import BlogPostScreen from "@src/BlogPostScreen";
import NotFoundScreen from "@src/NotFoundScreen";
import DashboardScreen from "@src/DashboardScreen";
import FarmListScreen from "@src/FarmListScreen";
import AddEditFarmScreen from "@src/AddEditFarmScreen";
import FarmDetailScreen from "@src/FarmDetailsScreen";
import AnalyticsScreen from "@src/AnalyticsScreen";
import ReportsScreen from "@src/ReportsScreen";
import ProfileScreen from "@src/ProfileScreen";
import SettingsScreen from "@src/settings/SettingsScreen";
import NotificationsScreen from "@src/NotificationsScreen";
import HelpScreen from "@src/HelpScreen";

import { SCREENS } from "@src/constants/screenNames";

// Protected Route Component (copied from ProtectedRoute.js)
const ProtectedRouteWrapper = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Routes Component (copied from PublicRoutes.js)
const PublicRoutes = () => {
  return (
    <PublicLayout>
      <Routes>
        <Route path="/" element={<LandingScreen />} />
        <Route path="/about" element={<AboutScreen />} />
        <Route path="/features" element={<FeaturesScreen />} />
        <Route path="/pricing" element={<PricingScreen />} />
        <Route path="/contact" element={<ContactScreen />} />
        <Route path="/faq" element={<FAQScreen />} />
        <Route path="/privacy" element={<PrivacyPolicyScreen />} />
        <Route path="/terms" element={<TermsOfServiceScreen />} />
        <Route path="/blog" element={<BlogScreen />} />
        <Route path="/blog/:slug" element={<BlogPostScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </PublicLayout>
  );
};

// Auth Routes Component (copied from AuthRoutes.js)
const AuthRoutes = () => {
  return (
    <AuthLayout>
      <Routes>
        <Route path={SCREENS.AUTH.LOGIN} element={<LoginScreen />} />
        <Route path={SCREENS.AUTH.REGISTER} element={<RegisterScreen />} />
        <Route
          path={SCREENS.AUTH.FORGOT_PASSWORD}
          element={<ForgotPasswordScreen />}
        />
        <Route
          path={SCREENS.AUTH.RESET_PASSWORD}
          element={<ResetPasswordScreen />}
        />
      </Routes>
    </AuthLayout>
  );
};

// Main Routes Component (copied from MainRoutes.js)
const MainRoutes = () => {
  return (
    <ProtectedRouteWrapper>
      <AppLayout>
        <Routes>
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/farms" element={<FarmListScreen />} />
          <Route path="/farms/add" element={<AddEditFarmScreen />} />
          <Route path="/farms/edit/:farmId" element={<AddEditFarmScreen />} />
          <Route path="/farms/:farmId" element={<FarmDetailScreen />} />
          <Route
            path="/farms/:farmId/analytics"
            element={<AnalyticsScreen />}
          />
          <Route path="/analytics" element={<AnalyticsScreen />} />
          <Route path="/reports" element={<ReportsScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/notifications" element={<NotificationsScreen />} />
          <Route path="/help" element={<HelpScreen />} />
          <Route path="/help/:topic" element={<HelpScreen />} />
          <Route path="/" element={<DashboardScreen />} />
          <Route path="*" element={<NotFoundScreen isApp={true} />} />
        </Routes>
      </AppLayout>
    </ProtectedRouteWrapper>
  );
};

// Main App Routes Component (to be used in App.js)
const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public website routes */}
      <Route path="/*" element={<PublicRoutes />} />

      {/* Authentication routes */}
      {!isAuthenticated && <Route path="/auth/*" element={<AuthRoutes />} />}

      {/* Protected app routes */}
      {isAuthenticated && <Route path="/app/*" element={<MainRoutes />} />}

      {/* Smart redirects */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/app/dashboard" replace />
          ) : (
            <Navigate to="/auth/login" replace />
          )
        }
      />

      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/app/dashboard" replace />
          ) : (
            <Navigate to="/auth/register" replace />
          )
        }
      />

      {/* Default route */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/app/dashboard" replace />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
};

export default AppRoutes;
