// app/DashboardScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

// Using react-native-vector-icons for web
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

// Import your utility classes
import BrowserStorage from "../screens/utils/BrowserStorage";
import UserSession from "../screens/utils/UserSession";
import ThemeManager from "../screens/utils/ThemeManager";
import ResponsiveUtils from "../screens/utils/ResponsiveUtils";

// Icon mapping - simplified for web
const Icons = {
  menu: (props) => <MaterialIcons name="menu" {...props} />,
  "chevron-forward": (props) => (
    <MaterialIcons name="chevron-right" {...props} />
  ),
  "person-outline": (props) => (
    <MaterialIcons name="person-outline" {...props} />
  ),
  "person-circle": (props) => (
    <MaterialIcons name="account-circle" {...props} />
  ),
  "settings-outline": (props) => <MaterialIcons name="settings" {...props} />,
  "log-out-outline": (props) => <MaterialIcons name="logout" {...props} />,
  "add-circle-outline": (props) => (
    <MaterialIcons name="add-circle-outline" {...props} />
  ),
  camera: (props) => <MaterialIcons name="camera-alt" {...props} />,
  "camera-outline": (props) => <MaterialIcons name="photo-camera" {...props} />,
  "eye-outline": (props) => <MaterialIcons name="remove-red-eye" {...props} />,
  leaf: (props) => <MaterialIcons name="spa" {...props} />,
  "leaf-outline": (props) => <MaterialIcons name="nature" {...props} />,
  business: (props) => <MaterialIcons name="business" {...props} />,
  "business-outline": (props) => (
    <MaterialIcons name="business-center" {...props} />
  ),
  "location-outline": (props) => (
    <MaterialIcons name="location-on" {...props} />
  ),
  "earth-outline": (props) => <MaterialIcons name="public" {...props} />,
  analytics: (props) => <MaterialIcons name="analytics" {...props} />,
  list: (props) => <MaterialIcons name="list" {...props} />,
  "cloud-outline": (props) => <MaterialIcons name="cloud" {...props} />,
  "cloud-upload-outline": (props) => (
    <MaterialIcons name="cloud-upload" {...props} />
  ),
  wifi: (props) => <MaterialIcons name="wifi" {...props} />,
  "wifi-outline": (props) => <MaterialIcons name="wifi-off" {...props} />,
  "cube-outline": (props) => <MaterialIcons name="cube" {...props} />,
  "calendar-outline": (props) => (
    <MaterialIcons name="calendar-today" {...props} />
  ),
  "checkmark-circle": (props) => (
    <MaterialIcons name="check-circle" {...props} />
  ),
  sun: (props) => <MaterialIcons name="wb-sunny" {...props} />,
  moon: (props) => <MaterialIcons name="nights-stay" {...props} />,
  palette: (props) => <MaterialIcons name="palette" {...props} />,
  contrast: (props) => <MaterialIcons name="contrast" {...props} />,
};

const Icon = ({ name, ...props }) => {
  const IconComponent = Icons[name];
  if (!IconComponent) {
    return <MaterialIcons name="error" {...props} />;
  }
  return <IconComponent {...props} />;
};

// Main Dashboard Component
export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [themeColors, setThemeColors] = useState(ThemeManager.getThemeColors());

  // Responsive calculations
  const isMobile = ResponsiveUtils.isMobile(width);
  const isTablet = ResponsiveUtils.isTablet(width);
  const isDesktop = ResponsiveUtils.isDesktop(width);

  // State management
  const [userData, setUserData] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInitials, setUserInitials] = useState("U");
  const [dataMode, setDataMode] = useState("dummy");
  const [apiConnected, setApiConnected] = useState(false);
  const [hideQuickStats, setHideQuickStats] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(ThemeManager.getTheme());

  // Listen for theme changes from Settings page
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === BrowserStorage.PREFIX + "theme") {
        const newTheme =
          BrowserStorage.getItem("theme") || ThemeManager.THEMES.LIGHT;
        setCurrentTheme(newTheme);
        setThemeColors(ThemeManager.getThemeColors());

        // Apply theme to document for CSS variables
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", newTheme);
        }
      }
    };

    // Listen for storage events (cross-tab communication)
    window.addEventListener("storage", handleStorageChange);

    // Listen for custom theme change event (same tab)
    const handleThemeChanged = () => {
      const newTheme =
        BrowserStorage.getItem("theme") || ThemeManager.THEMES.LIGHT;
      setCurrentTheme(newTheme);
      setThemeColors(ThemeManager.getThemeColors());
    };

    window.addEventListener("themeChanged", handleThemeChanged);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("themeChanged", handleThemeChanged);
    };
  }, []);

  // Apply CSS theme variables
  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.style.setProperty("--primary-color", themeColors.primary);
      root.style.setProperty("--secondary-color", themeColors.secondary);
      root.style.setProperty("--background-color", themeColors.background);
      root.style.setProperty("--text-color", themeColors.text);
      root.style.setProperty(
        "--text-secondary-color",
        themeColors.textSecondary
      );
      root.style.setProperty("--card-color", themeColors.card);
      root.style.setProperty("--header-color", themeColors.header);
      root.style.setProperty("--border-color", themeColors.border);
    }
  }, [themeColors]);

  // Load user data on component mount
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Check if user is logged in using browser storage
        if (!UserSession.isLoggedIn()) {
          Alert.alert("Session Expired", "Please login again", [
            { text: "OK", onPress: () => navigation.replace("LoginScreen") },
          ]);
          return;
        }

        // Load user data from browser storage
        await loadUserData();

        // Load initial data based on mode
        await loadInitialData();

        // Check if theme is set in storage and apply it
        const savedTheme = BrowserStorage.getItem("theme");
        if (savedTheme) {
          setCurrentTheme(savedTheme);
          setThemeColors(ThemeManager.getThemeColors());

          // Apply theme to document
          if (typeof document !== "undefined") {
            document.documentElement.setAttribute("data-theme", savedTheme);
          }
        }
      } catch (error) {
        console.error("Failed to initialize dashboard:", error);
        Alert.alert("Error", "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  // Load data when mode changes
  useEffect(() => {
    if (userData && !loading) {
      loadDataByMode();
    }
  }, [dataMode]);

  // Load user data from browser storage
  const loadUserData = async () => {
    try {
      const user = UserSession.getUser();
      if (user) {
        setUserData(user);
        setUserInitials(UserSession.getUserInitials());
        console.log("User data loaded from browser storage:", user.email);
      } else {
        throw new Error("No user data found in browser storage");
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
      throw error;
    }
  };

  // Load data based on current mode
  const loadDataByMode = async () => {
    if (dataMode === "dummy") {
      await loadDummyData();
    } else {
      await loadLiveData();
    }
  };

  // Mock data generator function
  const generateMockPredictions = (userId, farmCount = 2) => {
    const predictions = [];
    const plantNames = [
      { name: "Tomato Plant", scientific: "Solanum lycopersicum" },
      { name: "Rose", scientific: "Rosa" },
      { name: "Lavender", scientific: "Lavandula" },
      { name: "Basil", scientific: "Ocimum basilicum" },
      { name: "Sunflower", scientific: "Helianthus annuus" },
    ];

    const predictionCount = Math.floor(Math.random() * 6) + 5;

    for (let i = 0; i < predictionCount; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const plant = plantNames[Math.floor(Math.random() * plantNames.length)];
      const confidence = Math.random() * 0.3 + 0.6;
      const farmId = `farm${
        Math.floor(Math.random() * farmCount) + 1
      }_${userId}`;

      predictions.push({
        id: `prediction-${userId}-${i}`,
        confidence_score: confidence,
        plant_name: plant.name,
        scientific_name: plant.scientific,
        image_uri: `https://picsum.photos/seed/${userId}-${i}/150/150`,
        created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
        farm_id: farmId,
        user_id: userId,
      });
    }

    return predictions.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  };

  const generateMockFarms = (userId) => {
    const farmTemplates = [
      {
        name: "Home Garden",
        area_hectares: 0.1,
        primary_crop: "Vegetables",
        description: "Small vegetable garden in the backyard",
        location: "Backyard",
        soil_type: "Loam",
      },
      {
        name: "Backyard Orchard",
        area_hectares: 0.5,
        primary_crop: "Fruits",
        description: "Fruit trees and berry bushes",
        location: "Backyard",
        soil_type: "Clay",
      },
      {
        name: "Herb Garden",
        area_hectares: 0.05,
        primary_crop: "Herbs",
        description: "Collection of culinary herbs",
        location: "Side yard",
        soil_type: "Sandy Loam",
      },
    ];

    return farmTemplates.map((template, index) => ({
      id: `farm${index + 1}_${userId}`,
      ...template,
      is_active: true,
      created_at: new Date(Date.now() - index * 86400000).toISOString(),
      updated_at: new Date(Date.now() - index * 86400000).toISOString(),
      user_id: userId,
    }));
  };

  // Load dummy data
  const loadDummyData = async () => {
    if (!userData) return;

    try {
      // Generate mock farms
      const mockFarms = generateMockFarms(userData.id);
      setFarms(mockFarms);

      // Save to browser storage
      UserSession.saveFarms(mockFarms);

      // Generate mock predictions
      const mockPredictions = generateMockPredictions(
        userData.id,
        mockFarms.length
      );
      setPredictionHistory(mockPredictions);

      console.log("Loaded dummy data from browser mock");
    } catch (error) {
      console.error("Failed to load dummy data:", error);
      Alert.alert("Error", "Failed to load dummy data");
    }
  };

  // Load live data from API (if implemented)
  const loadLiveData = async () => {
    if (!userData) {
      Alert.alert("Error", "No user data available");
      setDataMode("dummy");
      return;
    }

    try {
      // Try to load from browser storage first
      const savedFarms = UserSession.getFarms();
      if (savedFarms && savedFarms.length > 0) {
        setFarms(savedFarms);
      }

      // For now, use dummy data as fallback
      const mockPredictions = generateMockPredictions(
        userData.id,
        farms.length || 2
      );
      setPredictionHistory(mockPredictions);

      console.log("Loaded data from browser storage");
    } catch (error) {
      console.error("Failed to load live data:", error);
      Alert.alert(
        "Data Error",
        "Failed to load data. Switching to dummy data.",
        [{ text: "OK", onPress: () => setDataMode("dummy") }]
      );
    }
  };

  // Initial data load
  const loadInitialData = async () => {
    await loadDataByMode();
  };

  // Handle logout - clears browser storage
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (!confirmLogout) return;

    try {
      // Clear browser storage
      UserSession.logout();

      alert("You have been logged out successfully");
      navigation.replace("LoginScreen");
    } catch (error) {
      console.error("Logout error:", error);
      alert("An error occurred during logout. Please try again.");
    }
  };

  // Navigation handlers
  const navigateToCamera = () => {
    navigation.navigate("CameraView");
  };

  const navigateToFarmManagement = () => {
    navigation.navigate("FarmManagementScreen");
  };

  const navigateToHistory = () => {
    navigation.navigate("HistoryScreens");
  };

  const navigateToProfile = () => {
    navigation.navigate("ProfileScreen");
  };

  const navigateToSettings = () => {
    navigation.navigate("SettingScreen");
  };

  const navigateToTermsPolicy = () => {
    navigation.navigate("DocumentScreen");
  };

  const navigateToEditProfileScreen = () => {
    navigation.navigate("EditProfileScreen");
  };

  // Helper functions
  const getUserFullName = () => {
    if (userData?.first_name && userData?.last_name) {
      return `${userData.first_name} ${userData.last_name}`;
    } else if (userData?.first_name) {
      return userData.first_name;
    } else if (userData?.last_name) {
      return userData.last_name;
    }
    return "Gardener";
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const toggleQuickStats = () => {
    setHideQuickStats(!hideQuickStats);
  };

  // Generate dynamic styles based on theme
  const getDynamicStyles = () => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: themeColors.background,
        minHeight: "100vh",
      },
      headerBackground: {
        backgroundColor: themeColors.header,
      },
      title: {
        color: themeColors.text,
      },
      subtitle: {
        color: themeColors.textSecondary,
      },
      statCard: {
        backgroundColor: themeColors.card,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
      section: {
        backgroundColor: themeColors.card,
        borderColor: themeColors.border,
        borderWidth: 1,
      },
      sectionTitle: {
        color: themeColors.text,
      },
      card: {
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
      },
      text: {
        color: themeColors.text,
      },
      textSecondary: {
        color: themeColors.textSecondary,
      },
    });
  };

  const dynamicStyles = getDynamicStyles();

  // Loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingIcon}>
            <Icon
              name="leaf"
              size={isDesktop ? 96 : isTablet ? 84 : 72}
              color={themeColors.primary}
            />
          </View>
          <Text style={[styles.loadingTitle, dynamicStyles.title]}>
            Loading Your Dashboard
          </Text>
          <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>
            Preparing your garden management dashboard...
          </Text>
          <ActivityIndicator
            size="large"
            color={themeColors.primary}
            style={styles.loadingSpinner}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[styles.headerBackground, dynamicStyles.headerBackground]}
        />
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.title, dynamicStyles.title]}>
                Welcome Back
              </Text>
              <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                {getGreeting()}, {getUserFullName()}!
              </Text>

              {/* Data Mode Toggle */}
              <View style={styles.dataModeContainer}>
                <Text
                  style={[styles.dataModeLabel, dynamicStyles.textSecondary]}
                >
                  Data Source:
                </Text>
                <View style={styles.dataModeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.dataModeButton,
                      dataMode === "dummy" && {
                        backgroundColor: themeColors.secondary,
                      },
                    ]}
                    onPress={() => setDataMode("dummy")}
                  >
                    <Icon name="cube-outline" size={16} color="#fff" />
                    <Text style={styles.dataModeButtonText}>Dummy Data</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.dataModeButton,
                      dataMode === "live" && {
                        backgroundColor: themeColors.primary,
                      },
                      !apiConnected && styles.dataModeButtonDisabled,
                    ]}
                    onPress={() => setDataMode("live")}
                    disabled={!apiConnected}
                  >
                    <Icon name="cloud-outline" size={16} color="#fff" />
                    <Text style={styles.dataModeButtonText}>Live Data</Text>
                  </TouchableOpacity>
                </View>

                {/* Current Theme Indicator */}
                <View style={styles.themeIndicator}>
                  <Text
                    style={[styles.dataModeLabel, dynamicStyles.textSecondary]}
                  >
                    Theme: {currentTheme}
                  </Text>
                  <Icon
                    name={currentTheme === "dark" ? "moon" : "sun"}
                    size={16}
                    color={themeColors.textSecondary}
                  />
                </View>
              </View>
            </View>

            {/* Profile Section */}
            <View style={styles.profileSection}>
              <TouchableOpacity onPress={navigateToProfile}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: themeColors.primary },
                  ]}
                >
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogout}
                style={styles.logoutButton}
              >
                <Icon name="log-out-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Stats */}
          {!hideQuickStats && (
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, dynamicStyles.statCard]}>
                <View style={styles.statContent}>
                  <Text style={[styles.statValue, dynamicStyles.title]}>
                    {predictionHistory?.length || 0}
                  </Text>
                  <Text style={[styles.statTitle, dynamicStyles.textSecondary]}>
                    Total Scans
                  </Text>
                </View>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: `${themeColors.primary}20` },
                  ]}
                >
                  <Icon
                    name="camera-outline"
                    size={28}
                    color={themeColors.primary}
                  />
                </View>
              </View>

              <View style={[styles.statCard, dynamicStyles.statCard]}>
                <View style={styles.statContent}>
                  <Text style={[styles.statValue, dynamicStyles.title]}>
                    {farms?.filter((f) => f.is_active).length || 0}
                  </Text>
                  <Text style={[styles.statTitle, dynamicStyles.textSecondary]}>
                    Active Gardens
                  </Text>
                </View>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: `${themeColors.primary}20` },
                  ]}
                >
                  <Icon
                    name="business-outline"
                    size={28}
                    color={themeColors.primary}
                  />
                </View>
              </View>

              {/* Theme Status Card */}
              <View style={[styles.statCard, dynamicStyles.statCard]}>
                <View style={styles.statContent}>
                  <Text style={[styles.statValue, dynamicStyles.title]}>
                    {currentTheme}
                  </Text>
                  <Text style={[styles.statTitle, dynamicStyles.textSecondary]}>
                    Current Theme
                  </Text>
                </View>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: `${themeColors.primary}20` },
                  ]}
                >
                  <Icon name="palette" size={28} color={themeColors.primary} />
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Quick Actions */}
        <View style={[styles.section, dynamicStyles.section]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
              Quick Actions
            </Text>
            <TouchableOpacity onPress={toggleQuickStats}>
              <Text style={[styles.hideButton, dynamicStyles.textSecondary]}>
                {hideQuickStats ? "Show Stats" : "Hide Stats"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={navigateToCamera}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: themeColors.primary },
              ]}
            >
              <Icon name="camera" size={24} color="#fff" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, dynamicStyles.title]}>
                Identify Plant
              </Text>
              <Text
                style={[styles.actionSubtitle, dynamicStyles.textSecondary]}
              >
                Capture and analyze plant images
              </Text>
            </View>
            <Icon
              name="chevron-forward"
              size={20}
              color={themeColors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={navigateToSettings}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: themeColors.secondary },
              ]}
            >
              <Icon name="settings-outline" size={24} color="#fff" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, dynamicStyles.title]}>
                Theme Settings
              </Text>
              <Text
                style={[styles.actionSubtitle, dynamicStyles.textSecondary]}
              >
                Change theme: {currentTheme}
              </Text>
            </View>
            <Icon
              name="chevron-forward"
              size={20}
              color={themeColors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={navigateToFarmManagement}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#4CAF50" }]}>
              <Icon name="business-outline" size={24} color="#fff" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, dynamicStyles.title]}>
                Manage Gardens
              </Text>
              <Text
                style={[styles.actionSubtitle, dynamicStyles.textSecondary]}
              >
                View and manage your gardens
              </Text>
            </View>
            <Icon
              name="chevron-forward"
              size={20}
              color={themeColors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 26,
  },
  loadingSpinner: {
    marginTop: 24,
  },
  header: {
    position: "relative",
    paddingBottom: 32,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerContent: {
    paddingTop: 70,
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  dataModeContainer: {
    marginTop: 8,
  },
  dataModeLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  dataModeButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  themeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dataModeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    gap: 6,
    cursor: "pointer",
  },
  dataModeButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  dataModeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    cursor: "pointer",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  logoutButton: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    cursor: "pointer",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 24,
    overflowY: "auto",
  },
  section: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  hideButton: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
    cursor: "pointer",
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    cursor: "pointer",
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
  },
});
