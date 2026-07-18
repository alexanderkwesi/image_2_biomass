// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App.js"; // FIXED: Changed "/App.js" to "./App"
import "./index.css";
import reportWebVitals from "./reportWebVitals.js";

// Initialize theme from localStorage before rendering
const initializeTheme = () => {
  const savedTheme = localStorage.getItem("app_theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // If no saved theme, use system preference
  if (!savedTheme) {
    const theme = prefersDark ? "dark" : "light";
    localStorage.setItem("app_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }
};

// Initialize current user from localStorage
const initializeUser = () => {
  const savedUser = localStorage.getItem("current_user");
  if (!savedUser) {
    // Default user for demo purposes
    const defaultUser = {
      id: 1,
      name: "Demo Gardener",
      email: "gardener@example.com",
      role: "user",
    };
    localStorage.setItem("current_user", JSON.stringify(defaultUser));
  }
};

// Initialize sample farm data for demo
const initializeDemoData = () => {
  const farms = localStorage.getItem("garden_farms");
  if (!farms) {
    const sampleFarms = [
      {
        id: 1,
        name: "Sunshine Garden",
        is_active: true,
        area_hectares: 2.5,
        primary_crop: "Vegetables",
        soil_type: "Loam",
        location: "North Field",
        created_at: "2024-01-15T10:30:00Z",
        description:
          "A beautiful organic garden with mixed vegetables including tomatoes, peppers, and leafy greens.",
      },
      {
        id: 2,
        name: "Mountain Orchard",
        is_active: true,
        area_hectares: 5.0,
        primary_crop: "Fruits",
        soil_type: "Sandy Loam",
        location: "Hilltop",
        created_at: "2023-08-20T14:45:00Z",
        description:
          "Fruit orchard with apple, pear, and peach trees. Uses sustainable irrigation methods.",
      },
      {
        id: 3,
        name: "Herb Haven",
        is_active: false,
        area_hectares: 0.5,
        primary_crop: "Herbs",
        soil_type: "Clay",
        location: "Backyard",
        created_at: "2024-03-10T09:15:00Z",
        description:
          "Small herb garden with basil, mint, rosemary, and thyme. Currently under renovation.",
      },
    ];
    localStorage.setItem("garden_farms", JSON.stringify(sampleFarms));
  }
};

// Initialize app data
initializeTheme();
initializeUser();
initializeDemoData();

// Create root and render app
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
