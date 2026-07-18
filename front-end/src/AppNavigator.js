// AppNavigator.jsx - Enhanced version
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Import screens
import LandingScreen from ".././components/LandingScreen";
import LoginScreen from ".././components/LoginScreen";
import RegisterScreen from ".././components/RegisterScreen";
import DashboardScreen from ".././components/DashboardScreen";
import ProfileScreen from ".././profile/ProfileScreen";
import SettingsScreen from ".././settings/SettingsScreen";
import FarmListScreen from ".././components/FarmListScreen";
import AddEditFarmScreen from ".././components/AddEditFarmScreen";

// Import components
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import PublicLayout from "./components/Layout/PublicLayout";
import NotFoundScreen from ".././/NotFoundScreen";

const AppNavigator = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes with Public Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
        </Route>

        {/* Protected Routes with Main Layout */}
        <Route element={<ProtectedRoute><Layout showSidebar={true} /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/farms" element={<FarmListScreen />} />
          <Route path="/farms/add" element={<AddEditFarmScreen />} />
          <Route path="/farms/edit/:farmId" element={<AddEditFarmScreen />} />
        </Route>

        {/* Minimal Layout Routes */}
        <Route element={<ProtectedRoute><Layout showHeader={false} showFooter={false} /></ProtectedRoute>}>
          <Route path="/fullscreen" element={<DashboardScreen />} />
        </Route>

        {/* 404 Not Found */}
        <Route path="/404" element={<NotFoundScreen />} />
        
        {/* Catch-all route - redirect to 404 */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  );
};

export default AppNavigator;