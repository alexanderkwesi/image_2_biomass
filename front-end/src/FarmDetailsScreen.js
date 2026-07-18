import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useDispatch, useSelector } from "react-redux";

// Use MaterialIcons for web instead of Ionicons
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

// Icon mapping for MaterialIcons
const Icons = {
  "arrow-back": (props) => <MaterialIcons name="arrow-back" {...props} />,
  "camera-outline": (props) => <MaterialIcons name="photo-camera" {...props} />,
  "leaf-outline": (props) => <MaterialIcons name="spa" {...props} />,
  "time-outline": (props) => <MaterialIcons name="access-time" {...props} />,
  "earth-outline": (props) => <MaterialIcons name="public" {...props} />,
  camera: (props) => <MaterialIcons name="camera-alt" {...props} />,
  warning: (props) => <MaterialIcons name="warning" {...props} />,
  info: (props) => <MaterialIcons name="info" {...props} />,
  chart: (props) => <MaterialIcons name="show-chart" {...props} />,
  location: (props) => <MaterialIcons name="location-on" {...props} />,
  area: (props) => <MaterialIcons name="square-foot" {...props} />,
  soil: (props) => <MaterialIcons name="terrain" {...props} />,
  plant: (props) => <MaterialIcons name="grass" {...props} />,
  status: (props) => <MaterialIcons name="circle" {...props} />,
  calendar: (props) => <MaterialIcons name="calendar-today" {...props} />,
  clock: (props) => <MaterialIcons name="schedule" {...props} />,
  biomass: (props) => <MaterialIcons name="scale" {...props} />,
  confidence: (props) => <MaterialIcons name="verified" {...props} />,
};

const Icon = ({ name, ...props }) => {
  const IconComponent = Icons[name];
  if (!IconComponent) {
    return <MaterialIcons name="error" {...props} />;
  }
  return <IconComponent {...props} />;
};

// Colors
const COLORS = {
  primary: "#4CAF50",
  secondary: "#2196F3",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  info: "#2196F3",
  white: "#FFFFFF",
  black: "#000000",
  gray100: "#F5F5F5",
  gray200: "#EEEEEE",
  gray300: "#E0E0E0",
  gray400: "#BDBDBD",
  gray500: "#9E9E9E",
  textPrimary: "#212121",
  textSecondary: "#757575",
  background: "#FAFAFA",
};

// Import actions
import { getFarmPredictions, getFarmStats } from "./farmActions";

const FarmDetailsScreen = ({ route, navigation }) => {
  const { farm } = route.params;
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("30d");
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get("window").width
  );

  const dispatch = useDispatch();
  const { farmPredictions, farmStats, isLoading } = useSelector(
    (state) => state.farms
  );

  // Handle window resize for responsive chart
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(Dimensions.get("window").width);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadFarmData();
  }, [farm.id, timeRange]);

  const loadFarmData = async () => {
    try {
      await Promise.all([
        dispatch(getFarmPredictions(farm.id, timeRange)),
        dispatch(getFarmStats(farm.id)),
      ]);
    } catch (error) {
      console.error("Error loading farm data:", error);
    }
  };

  const navigateToScan = () => {
    navigation.navigate("Camera", { farmId: farm.id });
  };

  const handleRefresh = () => {
    loadFarmData();
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    iconName,
    color = COLORS.primary,
  }) => (
    <View style={[styles.statCard, { borderColor: color + "20" }]}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Icon name={iconName} size={20} color={COLORS.white} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const TimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      {["7d", "30d", "90d", "1y"].map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeButton,
            timeRange === range && styles.timeRangeButtonActive,
          ]}
          onPress={() => setTimeRange(range)}
        >
          <Text
            style={[
              styles.timeRangeText,
              timeRange === range && styles.timeRangeTextActive,
            ]}
          >
            {range}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const OverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Key Stats */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Scans"
          value={farmStats?.total_scans || 0}
          iconName="camera-outline"
          color={COLORS.info}
        />
        <StatCard
          title="Avg Biomass"
          value={
            farmStats?.avg_biomass
              ? `${farmStats.avg_biomass.toFixed(0)}g`
              : "N/A"
          }
          subtitle="per scan"
          iconName="leaf-outline"
          color={COLORS.success}
        />
        <StatCard
          title="Last Scan"
          value={
            farmStats?.last_scan
              ? new Date(farmStats.last_scan).toLocaleDateString()
              : "Never"
          }
          iconName="time-outline"
          color={COLORS.warning}
        />
        <StatCard
          title="Soil Health"
          value={farmStats?.soil_health || "Unknown"}
          iconName="earth-outline"
          color={COLORS.secondary}
        />
      </View>

      {/* Biomass Trend Chart */}
      {farmPredictions && farmPredictions.length > 0 && (
        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Biomass Trend</Text>
            <TouchableOpacity
              onPress={handleRefresh}
              style={styles.refreshButton}
            >
              <Icon name="refresh" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: farmPredictions
                  .slice(-7)
                  .map((p) => new Date(p.created_at).getDate().toString()),
                datasets: [
                  {
                    data: farmPredictions
                      .slice(-7)
                      .map((p) => p.dry_total_g || 0),
                  },
                ],
              }}
              width={Math.min(windowWidth - 40, 600)}
              height={220}
              chartConfig={{
                backgroundColor: COLORS.white,
                backgroundGradientFrom: COLORS.white,
                backgroundGradientTo: COLORS.white,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: COLORS.primary,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        </View>
      )}

      {/* Farm Information */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Farm Details</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Icon name="location" size={16} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Farm Name</Text>
              <Text style={styles.infoValue}>{farm.name}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Icon name="area" size={16} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Area</Text>
              <Text style={styles.infoValue}>
                {farm.area_hectares} hectares
              </Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Icon name="soil" size={16} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Soil Type</Text>
              <Text style={styles.infoValue}>
                {farm.soil_type || "Not specified"}
              </Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Icon name="plant" size={16} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Pasture Type</Text>
              <Text style={styles.infoValue}>
                {farm.pasture_type || "Mixed"}
              </Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Icon name="location" size={16} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>
                {farm.location || "Not specified"}
              </Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Icon name="status" size={16} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: farm.is_active
                      ? COLORS.success
                      : COLORS.gray300,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {farm.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Additional Info */}
      {farm.description && (
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{farm.description}</Text>
        </View>
      )}
    </ScrollView>
  );

  const ScansTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.scansHeader}>
        <Text style={styles.scansTitle}>Recent Scans</Text>
        <TouchableOpacity style={styles.scanNowButton} onPress={navigateToScan}>
          <Icon name="camera" size={16} color={COLORS.white} />
          <Text style={styles.scanNowButtonText}>New Scan</Text>
        </TouchableOpacity>
      </View>

      {farmPredictions && farmPredictions.length > 0 ? (
        farmPredictions.map((prediction, index) => (
          <TouchableOpacity
            key={prediction.id || index}
            style={styles.scanItem}
            onPress={() =>
              navigation.navigate("PredictionResults", { prediction })
            }
          >
            <View style={styles.scanHeader}>
              <View>
                <Text style={styles.scanDate}>
                  {new Date(prediction.created_at).toLocaleDateString()}
                </Text>
                <Text style={styles.scanTime}>
                  {new Date(prediction.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View style={styles.scanStatus}>
                <Icon name="chevron-right" size={20} color={COLORS.gray400} />
              </View>
            </View>
            <View style={styles.scanMetrics}>
              <View style={styles.scanMetric}>
                <Icon name="biomass" size={16} color={COLORS.primary} />
                <View style={styles.metricContent}>
                  <Text style={styles.metricValue}>
                    {(prediction.dry_total_g || 0).toFixed(1)}g
                  </Text>
                  <Text style={styles.metricLabel}>Total Biomass</Text>
                </View>
              </View>
              <View style={styles.scanMetric}>
                <Icon name="confidence" size={16} color={COLORS.warning} />
                <View style={styles.metricContent}>
                  <Text style={styles.metricValue}>
                    {((prediction.confidence_score || 0) * 100).toFixed(0)}%
                  </Text>
                  <Text style={styles.metricLabel}>Confidence</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Icon name="camera-outline" size={48} color={COLORS.gray400} />
          <Text style={styles.emptyStateTitle}>No scans yet</Text>
          <Text style={styles.emptyStateText}>
            Start scanning this farm to track pasture biomass
          </Text>
          <TouchableOpacity style={styles.scanButton} onPress={navigateToScan}>
            <Icon name="camera" size={16} color={COLORS.white} />
            <Text style={styles.scanButtonText}>Take First Scan</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Farm Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.farmName}>{farm.name}</Text>
          <Text style={styles.farmLocation}>{farm.location}</Text>
        </View>
        <TouchableOpacity
          style={styles.scanButtonHeader}
          onPress={navigateToScan}
        >
          <Icon name="camera" size={20} color={COLORS.white} />
          <Text style={styles.scanButtonTextHeader}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.tabActive]}
          onPress={() => setActiveTab("overview")}
        >
          <Icon
            name="info"
            size={20}
            color={activeTab === "overview" ? COLORS.primary : COLORS.gray400}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "overview" && styles.tabTextActive,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "scans" && styles.tabActive]}
          onPress={() => setActiveTab("scans")}
        >
          <Icon
            name="camera-outline"
            size={20}
            color={activeTab === "scans" ? COLORS.primary : COLORS.gray400}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "scans" && styles.tabTextActive,
            ]}
          >
            Scans ({farmPredictions?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Time Range Selector */}
      {activeTab === "overview" && (
        <View style={styles.timeRangeWrapper}>
          <TimeRangeSelector />
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
          >
            <Icon name="refresh" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading farm data...</Text>
        </View>
      ) : activeTab === "overview" ? (
        <OverviewTab />
      ) : (
        <ScansTab />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    cursor: "pointer",
  },
  headerContent: {
    flex: 1,
  },
  farmName: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  farmLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scanButtonHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#388E3C",
    },
  },
  scanButtonTextHeader: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  timeRangeWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  timeRangeContainer: {
    flexDirection: "row",
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.gray100,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  timeRangeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  timeRangeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  timeRangeTextActive: {
    color: COLORS.white,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: COLORS.gray200,
    },
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  tabContent: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.gray200,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  statSubtitle: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
  chartSection: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  chartContainer: {
    alignItems: "center",
  },
  chart: {
    borderRadius: 12,
  },
  infoSection: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "calc(50% - 8px)",
    padding: 12,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: "500",
  },
  descriptionSection: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  scansHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  scansTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  scanNowButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#388E3C",
    },
  },
  scanNowButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  scanItem: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      borderColor: COLORS.primary,
      transform: "translateY(-1px)",
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
  },
  scanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  scanDate: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  scanTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scanStatus: {
    padding: 4,
  },
  scanMetrics: {
    flexDirection: "row",
    gap: 24,
  },
  scanMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricContent: {
    flexDirection: "column",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#388E3C",
    },
  },
  scanButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default FarmDetailsScreen;
