// reducers/farmsReducer.ts
import { FarmActionTypes, FarmAction } from "../actions/farmActions";

// Types
export interface Farm {
  id: string | number;
  name: string;
  description?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  size: number; // in acres/hectares
  cropType: string;
  soilType?: string;
  irrigationSystem?: string;
  ownerId?: string | number;
  createdAt?: string;
  updatedAt?: string;
  status: "active" | "inactive" | "maintenance";
  images?: string[];
  sensors?: Sensor[];
}

export interface Sensor {
  id: string | number;
  farmId: string | number;
  type:
    | "temperature"
    | "humidity"
    | "soil_moisture"
    | "rainfall"
    | "wind_speed";
  value: number;
  unit: string;
  lastUpdated: string;
  batteryLevel?: number;
  status: "online" | "offline" | "maintenance";
}

export interface Prediction {
  id: string | number;
  farmId: string | number;
  type: "yield" | "disease" | "harvest_time" | "water_need";
  predictedValue: number;
  confidence: number;
  actualValue?: number;
  predictionDate: string;
  validUntil: string;
  algorithm?: string;
  factors?: Record<string, any>;
}

export interface FarmStats {
  farmId: string | number;
  totalYield: number;
  averageYield: number;
  waterUsage: number;
  fertilizerUsage: number;
  cropHealth: number; // 0-100 percentage
  lastHarvest: string;
  nextHarvest: string;
  alerts: number;
  weather?: WeatherData;
  soilHealth?: SoilHealthData;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  condition: "sunny" | "cloudy" | "rainy" | "stormy";
  forecast: DailyForecast[];
}

export interface SoilHealthData {
  phLevel: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter: number;
  moisture: number;
}

export interface DailyForecast {
  date: string;
  temperature: {
    min: number;
    max: number;
  };
  condition: string;
  rainfall: number;
}

export interface FarmsState {
  farms: Farm[];
  selectedFarm: Farm | null;
  loading: boolean;
  error: string | null;
  predictions: Record<string, Prediction[]>; // farmId -> predictions[]
  stats: Record<string, FarmStats>; // farmId -> stats
  filters: FarmFilters;
  pagination: Pagination;
  mapView: MapViewState;
}

export interface FarmFilters {
  cropType?: string;
  status?: string;
  minSize?: number;
  maxSize?: number;
  searchTerm?: string;
  sortBy: "name" | "size" | "createdAt" | "updatedAt";
  sortOrder: "asc" | "desc";
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MapViewState {
  center: [number, number]; // [latitude, longitude]
  zoom: number;
  bounds?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  selectedFarmId?: string | number;
}

// Initial state
const initialState: FarmsState = {
  farms: [],
  selectedFarm: null,
  loading: false,
  error: null,
  predictions: {},
  stats: {},
  filters: {
    sortBy: "name",
    sortOrder: "asc",
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  mapView: {
    center: [0, 0],
    zoom: 2,
  },
};

// Helper functions
const updateFarmInList = (farms: Farm[], updatedFarm: Farm): Farm[] => {
  return farms.map((farm) => (farm.id === updatedFarm.id ? updatedFarm : farm));
};

const removeFarmFromList = (farms: Farm[], farmId: string | number): Farm[] => {
  return farms.filter((farm) => farm.id !== farmId);
};

const updatePagination = (state: FarmsState, total: number): FarmsState => {
  const totalPages = Math.ceil(total / state.pagination.limit);
  return {
    ...state,
    pagination: {
      ...state.pagination,
      total,
      totalPages,
    },
  };
};

// Main reducer
const farmsReducer = (
  state: FarmsState = initialState,
  action: FarmAction
): FarmsState => {
  switch (action.type) {
    // General loading states
    case FarmActionTypes.GET_FARMS_REQUEST:
    case FarmActionTypes.CREATE_FARM_REQUEST:
    case FarmActionTypes.UPDATE_FARM_REQUEST:
    case FarmActionTypes.DELETE_FARM_REQUEST:
    case FarmActionTypes.GET_FARM_PREDICTIONS_REQUEST:
    case FarmActionTypes.GET_FARM_STATS_REQUEST:
    case FarmActionTypes.GET_FARM_DETAILS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    // Get farms
    case FarmActionTypes.GET_FARMS_SUCCESS:
      return updatePagination(
        {
          ...state,
          loading: false,
          farms: action.payload.farms,
          filters: action.payload.filters || state.filters,
          error: null,
        },
        action.payload.total || action.payload.farms.length
      );

    case FarmActionTypes.GET_FARMS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Create farm
    case FarmActionTypes.CREATE_FARM_SUCCESS:
      return updatePagination(
        {
          ...state,
          loading: false,
          farms: [action.payload, ...state.farms],
          selectedFarm: action.payload,
          error: null,
        },
        state.pagination.total + 1
      );

    case FarmActionTypes.CREATE_FARM_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Update farm
    case FarmActionTypes.UPDATE_FARM_SUCCESS:
      return {
        ...state,
        loading: false,
        farms: updateFarmInList(state.farms, action.payload),
        selectedFarm:
          state.selectedFarm?.id === action.payload.id
            ? action.payload
            : state.selectedFarm,
        error: null,
      };

    case FarmActionTypes.UPDATE_FARM_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Delete farm
    case FarmActionTypes.DELETE_FARM_SUCCESS:
      const newFarms = removeFarmFromList(state.farms, action.payload);
      return updatePagination(
        {
          ...state,
          loading: false,
          farms: newFarms,
          selectedFarm:
            state.selectedFarm?.id === action.payload
              ? null
              : state.selectedFarm,
          // Clean up related data
          predictions: Object.fromEntries(
            Object.entries(state.predictions).filter(
              ([farmId]) => farmId !== String(action.payload)
            )
          ),
          stats: Object.fromEntries(
            Object.entries(state.stats).filter(
              ([farmId]) => farmId !== String(action.payload)
            )
          ),
          error: null,
        },
        state.pagination.total - 1
      );

    case FarmActionTypes.DELETE_FARM_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Get farm details
    case FarmActionTypes.GET_FARM_DETAILS_SUCCESS:
      return {
        ...state,
        loading: false,
        selectedFarm: action.payload,
        // Update farm in list if it exists
        farms: state.farms.some((farm) => farm.id === action.payload.id)
          ? updateFarmInList(state.farms, action.payload)
          : [action.payload, ...state.farms],
        error: null,
      };

    case FarmActionTypes.GET_FARM_DETAILS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Predictions
    case FarmActionTypes.GET_FARM_PREDICTIONS_SUCCESS:
      return {
        ...state,
        loading: false,
        predictions: {
          ...state.predictions,
          [action.payload.farmId]: action.payload.predictions,
        },
        error: null,
      };

    case FarmActionTypes.GET_FARM_PREDICTIONS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Stats
    case FarmActionTypes.GET_FARM_STATS_SUCCESS:
      return {
        ...state,
        loading: false,
        stats: {
          ...state.stats,
          [action.payload.farmId]: action.payload.stats,
        },
        error: null,
      };

    case FarmActionTypes.GET_FARM_STATS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Filters and pagination
    case FarmActionTypes.SET_FARM_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
        pagination: {
          ...state.pagination,
          page: 1, // Reset to first page when filters change
        },
      };

    case FarmActionTypes.CLEAR_FARM_FILTERS:
      return {
        ...state,
        filters: initialState.filters,
        pagination: {
          ...state.pagination,
          page: 1,
        },
      };

    case FarmActionTypes.SET_PAGINATION:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          ...action.payload,
        },
      };

    // Map view
    case FarmActionTypes.SET_MAP_VIEW:
      return {
        ...state,
        mapView: {
          ...state.mapView,
          ...action.payload,
        },
      };

    case FarmActionTypes.SELECT_FARM_ON_MAP:
      return {
        ...state,
        mapView: {
          ...state.mapView,
          selectedFarmId: action.payload,
        },
        selectedFarm:
          state.farms.find((farm) => farm.id === action.payload) || null,
      };

    // Sensors
    case FarmActionTypes.GET_FARM_SENSORS_SUCCESS:
      if (!state.selectedFarm) return state;

      return {
        ...state,
        loading: false,
        selectedFarm: {
          ...state.selectedFarm,
          sensors: action.payload,
        },
        // Update in farms list
        farms: updateFarmInList(state.farms, {
          ...state.selectedFarm,
          sensors: action.payload,
        }),
        error: null,
      };

    case FarmActionTypes.GET_FARM_SENSORS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Bulk operations
    case FarmActionTypes.BULK_UPDATE_FARMS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FarmActionTypes.BULK_UPDATE_FARMS_SUCCESS:
      return {
        ...state,
        loading: false,
        farms: state.farms.map((farm) => {
          const update = action.payload.updates.find(
            (u: any) => u.id === farm.id
          );
          return update ? { ...farm, ...update } : farm;
        }),
        error: null,
      };

    case FarmActionTypes.BULK_UPDATE_FARMS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Clear data
    case FarmActionTypes.CLEAR_FARM_DATA:
      return {
        ...initialState,
      };

    case FarmActionTypes.CLEAR_SELECTED_FARM:
      return {
        ...state,
        selectedFarm: null,
        predictions: {},
        stats: {},
      };

    // Error handling
    case FarmActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Selectors
export const farmsSelectors = {
  // Basic selectors
  getFarms: (state: { farms: FarmsState }) => state.farms.farms,
  getSelectedFarm: (state: { farms: FarmsState }) => state.farms.selectedFarm,
  getLoading: (state: { farms: FarmsState }) => state.farms.loading,
  getError: (state: { farms: FarmsState }) => state.farms.error,
  getFilters: (state: { farms: FarmsState }) => state.farms.filters,
  getPagination: (state: { farms: FarmsState }) => state.farms.pagination,
  getMapView: (state: { farms: FarmsState }) => state.farms.mapView,

  // Derived selectors
  getFarmById: (farmId: string | number) => (state: { farms: FarmsState }) =>
    state.farms.farms.find((farm) => farm.id === farmId),

  getFarmPredictions:
    (farmId: string | number) => (state: { farms: FarmsState }) =>
      state.farms.predictions[farmId] || [],

  getFarmStats: (farmId: string | number) => (state: { farms: FarmsState }) =>
    state.farms.stats[farmId],

  // Filtered farms
  getFilteredFarms: (state: { farms: FarmsState }) => {
    const { farms, filters } = state.farms;

    return farms
      .filter((farm) => {
        // Search term
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          const matchesSearch =
            farm.name.toLowerCase().includes(searchLower) ||
            farm.description?.toLowerCase().includes(searchLower) ||
            farm.cropType.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }

        // Crop type filter
        if (filters.cropType && farm.cropType !== filters.cropType) {
          return false;
        }

        // Status filter
        if (filters.status && farm.status !== filters.status) {
          return false;
        }

        // Size filters
        if (filters.minSize && farm.size < filters.minSize) {
          return false;
        }
        if (filters.maxSize && farm.size > filters.maxSize) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sorting
        const order = filters.sortOrder === "asc" ? 1 : -1;

        switch (filters.sortBy) {
          case "name":
            return a.name.localeCompare(b.name) * order;
          case "size":
            return (a.size - b.size) * order;
          case "createdAt":
            return (
              new Date(a.createdAt || "").getTime() -
              new Date(b.createdAt || "").getTime() * order
            );
          case "updatedAt":
            return (
              new Date(a.updatedAt || "").getTime() -
              new Date(b.updatedAt || "").getTime() * order
            );
          default:
            return 0;
        }
      });
  },

  // Paginated farms
  getPaginatedFarms: (state: { farms: FarmsState }) => {
    const filtered = farmsSelectors.getFilteredFarms(state);
    const { page, limit } = state.farms.pagination;

    const start = (page - 1) * limit;
    const end = start + limit;

    return filtered.slice(start, end);
  },

  // Map data
  getFarmsForMap: (state: { farms: FarmsState }) => {
    return state.farms.farms.map((farm) => ({
      id: farm.id,
      name: farm.name,
      position: [farm.location.latitude, farm.location.longitude] as [
        number,
        number
      ],
      status: farm.status,
      cropType: farm.cropType,
      size: farm.size,
    }));
  },

  // Statistics
  getTotalFarms: (state: { farms: FarmsState }) => state.farms.farms.length,
  getTotalArea: (state: { farms: FarmsState }) =>
    state.farms.farms.reduce((sum, farm) => sum + farm.size, 0),

  getCropDistribution: (state: { farms: FarmsState }) => {
    const distribution: Record<string, number> = {};
    state.farms.farms.forEach((farm) => {
      distribution[farm.cropType] = (distribution[farm.cropType] || 0) + 1;
    });
    return distribution;
  },

  getStatusDistribution: (state: { farms: FarmsState }) => {
    const distribution: Record<string, number> = {};
    state.farms.farms.forEach((farm) => {
      distribution[farm.status] = (distribution[farm.status] || 0) + 1;
    });
    return distribution;
  },
};

// Persistence helpers
export const persistFarmsState = (state: FarmsState): void => {
  try {
    // Don't persist loading states or large data
    const stateToPersist = {
      farms: state.farms,
      filters: state.filters,
      pagination: state.pagination,
      mapView: state.mapView,
    };
    localStorage.setItem("farms_state", JSON.stringify(stateToPersist));
  } catch (error) {
    console.error("Failed to persist farms state:", error);
  }
};

export const loadFarmsState = (): Partial<FarmsState> => {
  try {
    const savedState = localStorage.getItem("farms_state");
    if (!savedState) return {};

    return JSON.parse(savedState);
  } catch (error) {
    console.error("Failed to load farms state:", error);
    return {};
  }
};

export const clearPersistedFarmsState = (): void => {
  try {
    localStorage.removeItem("farms_state");
  } catch (error) {
    console.error("Failed to clear farms state:", error);
  }
};

export default farmsReducer;
