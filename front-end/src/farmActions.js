import ApiClient from "./utils/ApiCalls";
import { API_ENDPOINTS, buildUrl } from "./EndUrls";

export const FARM_ACTION_TYPES = {
  // Core farm operations
  GET_FARMS_REQUEST: "FARM/GET_FARMS_REQUEST",
  GET_FARMS_SUCCESS: "FARM/GET_FARMS_SUCCESS",
  GET_FARMS_FAILURE: "FARM/GET_FARMS_FAILURE",

  CREATE_FARM_REQUEST: "FARM/CREATE_FARM_REQUEST",
  CREATE_FARM_SUCCESS: "FARM/CREATE_FARM_SUCCESS",
  CREATE_FARM_FAILURE: "FARM/CREATE_FARM_FAILURE",

  UPDATE_FARM_REQUEST: "FARM/UPDATE_FARM_REQUEST",
  UPDATE_FARM_SUCCESS: "FARM/UPDATE_FARM_SUCCESS",
  UPDATE_FARM_FAILURE: "FARM/UPDATE_FARM_FAILURE",

  DELETE_FARM_REQUEST: "FARM/DELETE_FARM_REQUEST",
  DELETE_FARM_SUCCESS: "FARM/DELETE_FARM_SUCCESS",
  DELETE_FARM_FAILURE: "FARM/DELETE_FARM_FAILURE",

  // Data fetching
  GET_FARM_PREDICTIONS_REQUEST: "FARM/GET_FARM_PREDICTIONS_REQUEST",
  GET_FARM_PREDICTIONS_SUCCESS: "FARM/GET_FARM_PREDICTIONS_SUCCESS",
  GET_FARM_PREDICTIONS_FAILURE: "FARM/GET_FARM_PREDICTIONS_FAILURE",

  GET_FARM_STATS_REQUEST: "FARM/GET_FARM_STATS_REQUEST",
  GET_FARM_STATS_SUCCESS: "FARM/GET_FARM_STATS_SUCCESS",
  GET_FARM_STATS_FAILURE: "FARM/GET_FARM_STATS_FAILURE",

  // Web-specific operations
  GET_FARM_BY_ID_REQUEST: "FARM/GET_FARM_BY_ID_REQUEST",
  GET_FARM_BY_ID_SUCCESS: "FARM/GET_FARM_BY_ID_SUCCESS",
  GET_FARM_BY_ID_FAILURE: "FARM/GET_FARM_BY_ID_FAILURE",

  EXPORT_FARM_DATA_REQUEST: "FARM/EXPORT_FARM_DATA_REQUEST",
  EXPORT_FARM_DATA_SUCCESS: "FARM/EXPORT_FARM_DATA_SUCCESS",
  EXPORT_FARM_DATA_FAILURE: "FARM/EXPORT_FARM_DATA_FAILURE",

  BATCH_FARM_OPERATIONS_REQUEST: "FARM/BATCH_FARM_OPERATIONS_REQUEST",
  BATCH_FARM_OPERATIONS_SUCCESS: "FARM/BATCH_FARM_OPERATIONS_SUCCESS",
  BATCH_FARM_OPERATIONS_FAILURE: "FARM/BATCH_FARM_OPERATIONS_FAILURE",

  // UI state
  SET_ACTIVE_FARM: "FARM/SET_ACTIVE_FARM",
  SET_FARMS_FILTER: "FARM/SET_FARMS_FILTER",
  SET_FARMS_SORT: "FARM/SET_FARMS_SORT",

  CLEAR_FARM_DATA: "FARM/CLEAR_FARM_DATA",
  CLEAR_FARM_ERROR: "FARM/CLEAR_FARM_ERROR",
};

// Helper function to get authentication headers
const getAuthHeaders = () => {
  const token = ApiClient.getToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

// Helper function to handle API errors consistently
const handleApiError = (error, dispatch, failureType) => {
  const errorMessage =
    error.response?.data?.message ||
    error.message ||
    "An unexpected error occurred";

  dispatch({
    type: failureType,
    payload: errorMessage,
  });

  // Log error for debugging
  console.error(`Farm Action Error (${failureType}):`, error);

  return { success: false, error: errorMessage };
};

// Get all farms with pagination and filtering support
export const getFarms =
  (params = {}) =>
  async (dispatch) => {
    dispatch({ type: FARM_ACTION_TYPES.GET_FARMS_REQUEST });

    try {
      // Build URL with query parameters for pagination, filtering, etc.
      const url = buildUrl(API_ENDPOINTS.FARMS.LIST, params);

      const response = await ApiClient.request(url, {
        headers: getAuthHeaders(),
        // Add timeout for web requests
        timeout: 30000,
      });

      dispatch({
        type: FARM_ACTION_TYPES.GET_FARMS_SUCCESS,
        payload: {
          farms: response.farms || response.data || [],
          pagination: response.pagination || response.meta || {},
          total: response.total || response.count || 0,
        },
      });

      return {
        success: true,
        farms: response.farms || response.data || [],
        pagination: response.pagination || response.meta || {},
      };
    } catch (error) {
      return handleApiError(
        error,
        dispatch,
        FARM_ACTION_TYPES.GET_FARMS_FAILURE
      );
    }
  };

// Get single farm by ID
export const getFarmById = (farmId) => async (dispatch) => {
  dispatch({ type: FARM_ACTION_TYPES.GET_FARM_BY_ID_REQUEST });

  try {
    const response = await ApiClient.request(
      API_ENDPOINTS.FARMS.GET_BY_ID(farmId),
      {
        headers: getAuthHeaders(),
        timeout: 15000,
      }
    );

    dispatch({
      type: FARM_ACTION_TYPES.GET_FARM_BY_ID_SUCCESS,
      payload: response.farm || response.data,
    });

    return {
      success: true,
      farm: response.farm || response.data,
    };
  } catch (error) {
    return handleApiError(
      error,
      dispatch,
      FARM_ACTION_TYPES.GET_FARM_BY_ID_FAILURE
    );
  }
};

// Create a new farm
export const createFarm = (farmData) => async (dispatch) => {
  dispatch({ type: FARM_ACTION_TYPES.CREATE_FARM_REQUEST });

  // Validate required fields for web
  const requiredFields = ["name", "area_hectares", "primary_crop"];
  const missingFields = requiredFields.filter((field) => !farmData[field]);

  if (missingFields.length > 0) {
    const error = new Error(
      `Missing required fields: ${missingFields.join(", ")}`
    );
    return handleApiError(
      error,
      dispatch,
      FARM_ACTION_TYPES.CREATE_FARM_FAILURE
    );
  }

  try {
    const response = await ApiClient.request(API_ENDPOINTS.FARMS.CREATE, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(farmData),
      timeout: 20000,
    });

    dispatch({
      type: FARM_ACTION_TYPES.CREATE_FARM_SUCCESS,
      payload: response.farm || response.data,
    });

    // Dispatch additional action to update farms list
    dispatch({
      type: FARM_ACTION_TYPES.SET_ACTIVE_FARM,
      payload: response.farm?.id,
    });

    return {
      success: true,
      farm: response.farm || response.data,
    };
  } catch (error) {
    return handleApiError(
      error,
      dispatch,
      FARM_ACTION_TYPES.CREATE_FARM_FAILURE
    );
  }
};

// Update existing farm
export const updateFarm = (farmId, farmData) => async (dispatch) => {
  dispatch({ type: FARM_ACTION_TYPES.UPDATE_FARM_REQUEST });

  try {
    const response = await ApiClient.request(
      API_ENDPOINTS.FARMS.UPDATE(farmId),
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(farmData),
        timeout: 20000,
      }
    );

    dispatch({
      type: FARM_ACTION_TYPES.UPDATE_FARM_SUCCESS,
      payload: response.farm || response.data,
    });

    return {
      success: true,
      farm: response.farm || response.data,
    };
  } catch (error) {
    return handleApiError(
      error,
      dispatch,
      FARM_ACTION_TYPES.UPDATE_FARM_FAILURE
    );
  }
};

// Delete farm
export const deleteFarm = (farmId) => async (dispatch) => {
  dispatch({ type: FARM_ACTION_TYPES.DELETE_FARM_REQUEST });

  try {
    await ApiClient.request(API_ENDPOINTS.FARMS.DELETE(farmId), {
      method: "DELETE",
      headers: getAuthHeaders(),
      timeout: 15000,
    });

    dispatch({
      type: FARM_ACTION_TYPES.DELETE_FARM_SUCCESS,
      payload: farmId,
    });

    return { success: true };
  } catch (error) {
    return handleApiError(
      error,
      dispatch,
      FARM_ACTION_TYPES.DELETE_FARM_FAILURE
    );
  }
};

// Get farm predictions with enhanced time range support
export const getFarmPredictions =
  (farmId, options = {}) =>
  async (dispatch) => {
    dispatch({ type: FARM_ACTION_TYPES.GET_FARM_PREDICTIONS_REQUEST });

    const {
      timeRange = "30d",
      limit = 50,
      offset = 0,
      startDate,
      endDate,
    } = options;

    try {
      // Build query parameters
      const params = {
        time_range: timeRange,
        limit,
        offset,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      };

      const url = buildUrl(API_ENDPOINTS.FARMS.GET_PLANTS(farmId), params);

      const response = await ApiClient.request(url, {
        headers: getAuthHeaders(),
        timeout: 25000,
      });

      dispatch({
        type: FARM_ACTION_TYPES.GET_FARM_PREDICTIONS_SUCCESS,
        payload: {
          farmId,
          predictions: response.predictions || response.data || [],
          pagination: response.pagination || {},
        },
      });

      return {
        success: true,
        predictions: response.predictions || response.data || [],
        pagination: response.pagination || {},
      };
    } catch (error) {
      return handleApiError(
        error,
        dispatch,
        FARM_ACTION_TYPES.GET_FARM_PREDICTIONS_FAILURE
      );
    }
  };

// Get farm statistics
export const getFarmStats = (farmId) => async (dispatch) => {
  dispatch({ type: FARM_ACTION_TYPES.GET_FARM_STATS_REQUEST });

  try {
    const response = await ApiClient.request(
      API_ENDPOINTS.FARMS.FARM_ANALYTICS(farmId),
      {
        headers: getAuthHeaders(),
        timeout: 20000,
      }
    );

    dispatch({
      type: FARM_ACTION_TYPES.GET_FARM_STATS_SUCCESS,
      payload: {
        farmId,
        stats: response.stats || response.data || {},
      },
    });

    return {
      success: true,
      stats: response.stats || response.data || {},
    };
  } catch (error) {
    return handleApiError(
      error,
      dispatch,
      FARM_ACTION_TYPES.GET_FARM_STATS_FAILURE
    );
  }
};

// Export farm data (web-specific)
export const exportFarmData =
  (farmId, format = "csv") =>
  async (dispatch) => {
    dispatch({ type: FARM_ACTION_TYPES.EXPORT_FARM_DATA_REQUEST });

    try {
      const response = await ApiClient.request(
        API_ENDPOINTS.FARMS.EXPORT_DATA(farmId),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ format }),
          timeout: 30000,
          responseType: "blob", // For file downloads
        }
      );

      // Create download link for the blob
      if (response instanceof Blob) {
        const url = window.URL.createObjectURL(response);
        const a = document.createElement("a");
        a.href = url;
        a.download = `farm-${farmId}-data.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      dispatch({
        type: FARM_ACTION_TYPES.EXPORT_FARM_DATA_SUCCESS,
        payload: farmId,
      });

      return { success: true };
    } catch (error) {
      return handleApiError(
        error,
        dispatch,
        FARM_ACTION_TYPES.EXPORT_FARM_DATA_FAILURE
      );
    }
  };

// Batch operations (web-specific)
export const batchFarmOperations = (operations) => async (dispatch) => {
  dispatch({ type: FARM_ACTION_TYPES.BATCH_FARM_OPERATIONS_REQUEST });

  try {
    const response = await ApiClient.request(
      `${API_ENDPOINTS.FARMS.BASE}/batch`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ operations }),
        timeout: 40000,
      }
    );

    dispatch({
      type: FARM_ACTION_TYPES.BATCH_FARM_OPERATIONS_SUCCESS,
      payload: response.results || [],
    });

    return {
      success: true,
      results: response.results || [],
    };
  } catch (error) {
    return handleApiError(
      error,
      dispatch,
      FARM_ACTION_TYPES.BATCH_FARM_OPERATIONS_FAILURE
    );
  }
};

// UI state actions
export const setActiveFarm = (farmId) => ({
  type: FARM_ACTION_TYPES.SET_ACTIVE_FARM,
  payload: farmId,
});

export const setFarmsFilter = (filter) => ({
  type: FARM_ACTION_TYPES.SET_FARMS_FILTER,
  payload: filter,
});

export const setFarmsSort = (sort) => ({
  type: FARM_ACTION_TYPES.SET_FARMS_SORT,
  payload: sort,
});

export const clearFarmError = () => ({
  type: FARM_ACTION_TYPES.CLEAR_FARM_ERROR,
});

export const clearFarmData = () => ({
  type: FARM_ACTION_TYPES.CLEAR_FARM_DATA,
});

// Action creators for direct dispatch (for use without thunk)
export const farmActions = {
  setActiveFarm,
  setFarmsFilter,
  setFarmsSort,
  clearFarmError,
  clearFarmData,
};
