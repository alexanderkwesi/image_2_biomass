// components/layouts/AppLayout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Sidebar from "../components/SideBar";

const AppLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="app-layout">
      {/* Header */}
      <Header 
        user={user}
        onToggleSidebar={toggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
      />
      
      {/* Main Content Area */}
      <div className="layout-container">
        {/* Sidebar */}
        <Sidebar 
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
        
        {/* Main Content */}
        <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="content-wrapper">
            {children || <Outlet />}
          </div>
        </main>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AppLayout;