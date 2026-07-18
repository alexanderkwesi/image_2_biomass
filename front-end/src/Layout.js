// components/Layout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import Sidebar from "./Sidebar";

const Layout = ({ showHeader = true, showFooter = true, showSidebar = false }) => {
  return (
    <div className="app-layout">
      {showHeader && <Header />}
      <div className="layout-content">
        {showSidebar && <Sidebar />}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout;