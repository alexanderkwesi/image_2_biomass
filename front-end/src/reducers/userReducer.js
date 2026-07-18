import { USER_ACTION_TYPES } from "../userActions";

const initialState = {
  userProfile: null,
  predictionHistory: [],
  totalHistoryCount: 0,
  userStats: null,
  isLoading: false,
  error: null,
};

const userReducer = (state = initialState, action) => {
  switch (action.type) {
    // Profile Actions
    case USER_ACTION_TYPES.GET_PROFILE_REQUEST:
    case USER_ACTION_TYPES.UPDATE_PROFILE_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case USER_ACTION_TYPES.GET_PROFILE_SUCCESS:
    case USER_ACTION_TYPES.UPDATE_PROFILE_SUCCESS:
      return {
        ...state,
        isLoading: false,
        userProfile: action.payload,
        error: null,
      };

    case USER_ACTION_TYPES.GET_PROFILE_FAILURE:
    case USER_ACTION_TYPES.UPDATE_PROFILE_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    // Prediction History Actions
    case USER_ACTION_TYPES.GET_PREDICTION_HISTORY_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case USER_ACTION_TYPES.GET_PREDICTION_HISTORY_SUCCESS:
      return {
        ...state,
        isLoading: false,
        predictionHistory: action.payload.predictions || [],
        totalHistoryCount: action.payload.total_count || 0,
        error: null,
      };

    case USER_ACTION_TYPES.GET_PREDICTION_HISTORY_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    // User Stats Actions
    case USER_ACTION_TYPES.GET_USER_STATS_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case USER_ACTION_TYPES.GET_USER_STATS_SUCCESS:
      return {
        ...state,
        isLoading: false,
        userStats: action.payload,
        error: null,
      };

    case USER_ACTION_TYPES.GET_USER_STATS_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    // Clear Actions
    case USER_ACTION_TYPES.CLEAR_USER_DATA:
      return {
        ...initialState,
      };

    case USER_ACTION_TYPES.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

export default userReducer;
