// components/routes/MainRoutes.jsx
import { Route, Routes } from "react-router-dom";
import AnalyticsScreen from "@src/AnalyticsScreen";
import FarmDetailScreen from "@src/FarmDetailsScreen";
import NotificationsScreen from "@src/NotificationsScreen";
import ProtectedRoute from "@src/ProtectedRoute";
import AddEditFarmScreen from "@src/AddEditFarmScreen";
import DashboardScreen from "@src/DashboardScreen";
import HelpScreen from "@src/HelpScreen";
import NotFoundScreen from "@src/NotFoundScreen";
import ReportsScreen from "@src/ReportsScreen";
import SettingsScreen from "@src/settings/SettingsScreen";
import FarmListScreen from "@src/FarmListScreen";
import AppLayout from "@src/Layouts/AppLayout";
import ProfileScreen from "../profile/ProfileScreen";

const MainRoutes = () => {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Routes>
          {/* Dashboard */}
          <Route path="/dashboard" element={<DashboardScreen />} />
          
          {/* Farm Management */}
          <Route path="/farms" element={<FarmListScreen />} />
          <Route path="/farms/add" element={<AddEditFarmScreen />} />
          <Route path="/farms/edit/:farmId" element={<AddEditFarmScreen />} />
          <Route path="/farms/:farmId" element={<FarmDetailScreen />} />
          <Route path="/farms/:farmId/analytics" element={<AnalyticsScreen />} />
          
          {/* Analytics & Reports */}
          <Route path="/analytics" element={<AnalyticsScreen />} />
          <Route path="/reports" element={<ReportsScreen />} />
          
          {/* User Profile & Settings */}
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/notifications" element={<NotificationsScreen />} />
          
          {/* Help & Support */}
          <Route path="/help" element={<HelpScreen />} />
          <Route path="/help/:topic" element={<HelpScreen />} />
          
          {/* Default redirect to dashboard */}
          <Route path="/" element={<DashboardScreen />} />
          
          {/* 404 within app */}
          <Route path="*" element={<NotFoundScreen isApp={true} />} />
        </Routes>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default MainRoutes;