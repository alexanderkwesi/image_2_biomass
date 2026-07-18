import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";

const DocumentScreen = ({ navigation }) => {
  const [activeDocument, setActiveDocument] = useState("terms"); // 'terms' or 'privacy'
  const [userTheme, setUserTheme] = useState("light");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  // Initialize theme from localStorage on component mount
  useEffect(() => {
    const initializeFromStorage = () => {
      try {
        // Get theme from localStorage
        const savedTheme = localStorage.getItem("userTheme");
        if (savedTheme) {
          setUserTheme(savedTheme);
          applyTheme(savedTheme);
        }

        // Get login status from localStorage
        const savedLoginStatus = localStorage.getItem("isLoggedIn");
        if (savedLoginStatus === "true") {
          setIsLoggedIn(true);
        }

        // Get username from localStorage
        const savedUserName = localStorage.getItem("userName");
        if (savedUserName) {
          setUserName(savedUserName);
        }
      } catch (error) {
        console.error("Error reading from localStorage:", error);
      }
    };

    initializeFromStorage();

    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === "userTheme") {
        const newTheme = e.newValue || "light";
        setUserTheme(newTheme);
        applyTheme(newTheme);
      } else if (e.key === "isLoggedIn") {
        setIsLoggedIn(e.newValue === "true");
      } else if (e.key === "userName") {
        setUserName(e.newValue || "");
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Apply theme to document body
  const applyTheme = (theme) => {
    document.body.style.backgroundColor =
      theme === "dark" ? "#121212" : "#ffffff";
    document.body.style.color = theme === "dark" ? "#ffffff" : "#000000";

    // Also set theme attribute for CSS variables
    document.documentElement.setAttribute("data-theme", theme);
  };

  // Save theme to localStorage
  const saveThemeToStorage = (theme) => {
    try {
      localStorage.setItem("userTheme", theme);
      console.log("Theme saved to localStorage:", theme);

      // Dispatch custom event for other components in same tab
      window.dispatchEvent(new Event("themeChanged"));
    } catch (error) {
      console.error("Error saving theme to localStorage:", error);
    }
  };

  // Save login status to localStorage
  const saveLoginStatusToStorage = (status, name = "") => {
    try {
      localStorage.setItem("isLoggedIn", status.toString());
      if (name) {
        localStorage.setItem("userName", name);
      }
      console.log("Login status saved to localStorage:", status, name);
    } catch (error) {
      console.error("Error saving login status to localStorage:", error);
    }
  };

  // Simulate login/logout for demonstration
  const handleLoginToggle = () => {
    if (isLoggedIn) {
      setIsLoggedIn(false);
      setUserName("");
      saveLoginStatusToStorage(false, "");
    } else {
      setIsLoggedIn(true);
      const name = "Demo User";
      setUserName(name);
      saveLoginStatusToStorage(true, name);
    }
  };

  // Simulate theme toggle for demonstration
  const handleThemeToggle = () => {
    const newTheme = userTheme === "light" ? "dark" : "light";
    setUserTheme(newTheme);
    applyTheme(newTheme);
    saveThemeToStorage(newTheme);
  };

  // Handle navigation
  const handleGoBack = () => {
    if (navigation && navigation.navigate) {
      navigation.navigate("Home");
    } else {
      // Fallback for web-only demonstration
      window.history.back();
    }
  };

  // Handle navigation to settings
  const handleGoToSettings = () => {
    if (navigation && navigation.navigate) {
      navigation.navigate("Settings");
    } else {
      // Fallback for web-only demonstration
      alert("Settings page would open here");
      console.log("Navigate to Settings");
    }
  };

  // Dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: userTheme === "dark" ? "#121212" : "#ffffff",
      minHeight: "100vh",
    },
    header: {
      backgroundColor: userTheme === "dark" ? "#1a1a1a" : "#27ae60",
      padding: 20,
      paddingTop: 40,
      alignItems: "center",
      position: "relative",
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: userTheme === "dark" ? "#ffffff" : "white",
      marginBottom: 5,
    },
    headerSubtitle: {
      fontSize: 14,
      color:
        userTheme === "dark"
          ? "rgba(255, 255, 255, 0.8)"
          : "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
    },
    selectorContainer: {
      flexDirection: "row",
      backgroundColor: userTheme === "dark" ? "#2a2a2a" : "#f8f9fa",
      borderBottomWidth: 1,
      borderBottomColor: userTheme === "dark" ? "#444" : "#e0e0e0",
    },
    activeButton: {
      borderBottomWidth: 3,
      borderBottomColor: "#27ae60",
      backgroundColor: userTheme === "dark" ? "#333" : "white",
    },
    selectorText: {
      fontSize: 16,
      color: userTheme === "dark" ? "#bdc3c7" : "#7f8c8d",
      fontWeight: "500",
    },
    activeText: {
      color: "#27ae60",
      fontWeight: "600",
    },
    documentScroll: {
      padding: 20,
      backgroundColor: userTheme === "dark" ? "#121212" : "#ffffff",
      flex: 1,
    },
    documentTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: userTheme === "dark" ? "#ffffff" : "#2c3e50",
      marginBottom: 15,
    },
    documentText: {
      fontSize: 16,
      color: userTheme === "dark" ? "#ecf0f1" : "#34495e",
      lineHeight: 24,
      marginBottom: 15,
    },
    footerNote: {
      backgroundColor: userTheme === "dark" ? "#1a1a1a" : "#f8f9fa",
      padding: 15,
      borderTopWidth: 1,
      borderTopColor: userTheme === "dark" ? "#444" : "#e0e0e0",
    },
    footerText: {
      fontSize: 12,
      color: userTheme === "dark" ? "#95a5a6" : "#7f8c8d",
      textAlign: "center",
      fontStyle: "italic",
    },
    userInfo: {
      position: "absolute",
      right: 15,
      top: 45,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    userText: {
      color: "white",
      fontSize: 14,
      cursor: "pointer",
    },
    themeToggle: {
      position: "absolute",
      right: 15,
      top: 80,
      backgroundColor:
        userTheme === "dark" ? "#333" : "rgba(255, 255, 255, 0.2)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 5,
      cursor: "pointer",
    },
    themeText: {
      color: "white",
      fontSize: 12,
    },
    settingsButton: {
      position: "absolute",
      right: 15,
      top: 110,
      backgroundColor:
        userTheme === "dark" ? "#333" : "rgba(255, 255, 255, 0.2)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 5,
      cursor: "pointer",
    },
    settingsText: {
      color: "white",
      fontSize: 12,
    },
  });

  // Terms of Service Component
  const TermsOfService = () => (
    <ScrollView style={dynamicStyles.documentScroll}>
      <Text style={dynamicStyles.documentTitle}>Terms of Service</Text>
      <Text style={dynamicStyles.documentText}>
        Welcome to PlantGuard ML. This is a demonstration project for the CSIRO
        Kaggle Biomass Prediction Competition.
      </Text>
      <Text style={dynamicStyles.documentText}>
        By using this application, you agree to these terms. This project is for
        demonstration purposes only and not for commercial use.
      </Text>
      <Text style={dynamicStyles.documentText}>
        All data and predictions are provided as-is without any warranties. The
        developers are not responsible for any decisions made based on this
        application's outputs.
      </Text>
      <Text style={dynamicStyles.documentText}>
        You may not use this application for any illegal purposes. All
        intellectual property rights remain with their respective owners.
      </Text>
      <Text style={dynamicStyles.documentText}>
        This web version uses browser localStorage to save your preferences
        (theme, login status). Clearing browser data will remove these settings.
      </Text>
    </ScrollView>
  );

  // Privacy Policy Component
  const PrivacyPolicy = () => (
    <ScrollView style={dynamicStyles.documentScroll}>
      <Text style={dynamicStyles.documentTitle}>Privacy Policy</Text>
      <Text style={dynamicStyles.documentText}>
        PlantGuard ML respects your privacy. This is a demonstration project and
        does not collect personal information for commercial purposes.
      </Text>
      <Text style={dynamicStyles.documentText}>
        Any data you provide (such as plant images) is processed locally on your
        device when possible. No personal data is transmitted to external
        servers without your consent.
      </Text>
      <Text style={dynamicStyles.documentText}>
        For the competition demonstration, anonymous usage statistics may be
        collected to improve the application. This data cannot be used to
        identify individual users.
      </Text>
      <Text style={dynamicStyles.documentText}>
        We implement reasonable security measures to protect any data stored
        locally on your device. This web version uses browser localStorage to
        store theme preferences and login status.
      </Text>
      <Text style={dynamicStyles.documentText}>
        <Text style={{ fontWeight: "bold" }}>Storage Notice:</Text> Your theme
        preference ({userTheme} mode) and login status{" "}
        {isLoggedIn ? `(Logged in as ${userName})` : "(Not logged in)"}
        are stored in your browser's localStorage. You can clear this data by
        clearing your browser cache or using developer tools.
      </Text>
    </ScrollView>
  );

  return (
    <View style={dynamicStyles.container}>
      {/* Header with Back Button */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* User Info */}
        <View style={dynamicStyles.userInfo}>
          <Text style={dynamicStyles.userText}>
            {isLoggedIn ? `👤 ${userName}` : "👤 Guest"}
          </Text>
          <TouchableOpacity onPress={handleLoginToggle}>
            <Text style={[dynamicStyles.userText, styles.loginButton]}>
              {isLoggedIn ? "Logout" : "Login"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={dynamicStyles.headerTitle}>PlantGuard ML</Text>
        <Text style={dynamicStyles.headerSubtitle}>
          CSIRO Kaggle Competition Demonstration
        </Text>

        {/* Theme Toggle */}
        <TouchableOpacity
          style={dynamicStyles.themeToggle}
          onPress={handleThemeToggle}
        >
          <Text style={dynamicStyles.themeText}>
            {userTheme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </Text>
        </TouchableOpacity>

        {/* Settings Button */}
        <TouchableOpacity
          style={dynamicStyles.settingsButton}
          onPress={handleGoToSettings}
        >
          <Text style={dynamicStyles.settingsText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Document Selector */}
      <View style={dynamicStyles.selectorContainer}>
        <TouchableOpacity
          style={[
            styles.selectorButton,
            activeDocument === "terms" && dynamicStyles.activeButton,
          ]}
          onPress={() => setActiveDocument("terms")}
        >
          <Text
            style={[
              dynamicStyles.selectorText,
              activeDocument === "terms" && dynamicStyles.activeText,
            ]}
          >
            Terms of Service
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectorButton,
            activeDocument === "privacy" && dynamicStyles.activeButton,
          ]}
          onPress={() => setActiveDocument("privacy")}
        >
          <Text
            style={[
              dynamicStyles.selectorText,
              activeDocument === "privacy" && dynamicStyles.activeText,
            ]}
          >
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      {/* Document Content */}
      <View style={styles.documentContainer}>
        {activeDocument === "terms" ? <TermsOfService /> : <PrivacyPolicy />}
      </View>

      {/* Footer Note */}
      <View style={dynamicStyles.footerNote}>
        <Text style={dynamicStyles.footerText}>
          This is a demonstration project for the CSIRO Kaggle Biomass
          Prediction Competition. Not for commercial use.
        </Text>
        <Text style={[dynamicStyles.footerText, { marginTop: 5 }]}>
          Current theme: {userTheme} | Status:{" "}
          {isLoggedIn ? `Logged in (${userName})` : "Guest"}
        </Text>
      </View>
    </View>
  );
};

// Base styles that don't change with theme
const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    left: 15,
    top: 45,
    padding: 5,
    cursor: "pointer",
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    cursor: "pointer",
    userSelect: "none",
  },
  documentContainer: {
    flex: 1,
    overflow: "hidden",
  },
  loginButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
});

// Add CSS for better web experience
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    [data-theme="dark"] {
      --background: #121212;
      --text: #ffffff;
    }
    
    [data-theme="light"] {
      --background: #ffffff;
      --text: #000000;
    }
    
    body {
      margin: 0;
      transition: background-color 0.3s ease, color 0.3s ease;
    }
    
    /* Improve scrollbar for web */
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
    
    [data-theme="dark"] ::-webkit-scrollbar-track {
      background: #2a2a2a;
    }
    
    [data-theme="dark"] ::-webkit-scrollbar-thumb {
      background: #555;
    }
    
    [data-theme="dark"] ::-webkit-scrollbar-thumb:hover {
      background: #777;
    }
  `;
  document.head.appendChild(style);
}

export default DocumentScreen;
