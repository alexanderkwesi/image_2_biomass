// reducers/authReducer.ts
import { AuthActionTypes, AuthAction } from "../actions/authActions";

// Types
export interface User {
  id: string | number;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
  isVerified?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  preferences?: Record<string, any>;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isVerifying: boolean;
  sessionExpiry: number | null;
  loginAttempts: number;
  lastActivity: number | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  isVerifying: false,
  sessionExpiry: null,
  loginAttempts: 0,
  lastActivity: Date.now(),
};

// Session timeout (24 hours)
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

// Check if session is expired
const isSessionExpired = (expiry: number | null): boolean => {
  if (!expiry) return false;
  return Date.now() > expiry;
};

// Helper to update last activity
const updateLastActivity = (state: AuthState): AuthState => ({
  ...state,
  lastActivity: Date.now(),
});

// Helper to set session expiry
const setSessionExpiry = (state: AuthState): AuthState => ({
  ...state,
  sessionExpiry: Date.now() + SESSION_TIMEOUT,
});

// Main reducer
const authReducer = (
  state: AuthState = initialState,
  action: AuthAction
): AuthState => {
  switch (action.type) {
    // Login flow
    case AuthActionTypes.LOGIN_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        loginAttempts: state.loginAttempts + 1,
      };

    case AuthActionTypes.LOGIN_SUCCESS:
      return setSessionExpiry({
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
        isAuthenticated: true,
        loginAttempts: 0,
        lastActivity: Date.now(),
      });

    case AuthActionTypes.LOGIN_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
        isAuthenticated: false,
        loginAttempts: Math.min(state.loginAttempts + 1, 5), // Cap at 5 attempts
      };

    // Registration flow
    case AuthActionTypes.REGISTER_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AuthActionTypes.REGISTER_SUCCESS:
      return setSessionExpiry({
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
        isAuthenticated: true,
        lastActivity: Date.now(),
      });

    case AuthActionTypes.REGISTER_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
        isAuthenticated: false,
      };

    // Logout
    case AuthActionTypes.LOGOUT:
      return {
        ...initialState,
      };

    // Clear error
    case AuthActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    // Token refresh
    case AuthActionTypes.REFRESH_TOKEN_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AuthActionTypes.REFRESH_TOKEN_SUCCESS:
      return setSessionExpiry({
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
      });

    case AuthActionTypes.REFRESH_TOKEN_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
        // Don't logout immediately, let user continue with potentially stale token
      };

    // User profile updates
    case AuthActionTypes.UPDATE_PROFILE_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AuthActionTypes.UPDATE_PROFILE_SUCCESS:
      return updateLastActivity({
        ...state,
        user: action.payload,
        loading: false,
        error: null,
      });

    case AuthActionTypes.UPDATE_PROFILE_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Verify authentication status
    case AuthActionTypes.VERIFY_AUTH_REQUEST:
      return {
        ...state,
        isVerifying: true,
        error: null,
      };

    case AuthActionTypes.VERIFY_AUTH_SUCCESS:
      return setSessionExpiry({
        ...state,
        isVerifying: false,
        isAuthenticated: true,
        lastActivity: Date.now(),
      });

    case AuthActionTypes.VERIFY_AUTH_FAILURE:
      return {
        ...state,
        isVerifying: false,
        isAuthenticated: false,
        error: action.payload,
      };

    // Update user activity
    case AuthActionTypes.UPDATE_ACTIVITY:
      return updateLastActivity(state);

    // Check session expiry
    case AuthActionTypes.CHECK_SESSION:
      if (state.sessionExpiry && isSessionExpired(state.sessionExpiry)) {
        return {
          ...state,
          isAuthenticated: false,
          error: "Session expired. Please login again.",
        };
      }
      return state;

    // Reset password flow
    case AuthActionTypes.FORGOT_PASSWORD_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AuthActionTypes.FORGOT_PASSWORD_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
      };

    case AuthActionTypes.FORGOT_PASSWORD_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case AuthActionTypes.RESET_PASSWORD_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AuthActionTypes.RESET_PASSWORD_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
      };

    case AuthActionTypes.RESET_PASSWORD_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Email verification
    case AuthActionTypes.VERIFY_EMAIL_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AuthActionTypes.VERIFY_EMAIL_SUCCESS:
      return updateLastActivity({
        ...state,
        user: state.user ? { ...state.user, isVerified: true } : null,
        loading: false,
        error: null,
      });

    case AuthActionTypes.VERIFY_EMAIL_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Social login
    case AuthActionTypes.SOCIAL_LOGIN_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AuthActionTypes.SOCIAL_LOGIN_SUCCESS:
      return setSessionExpiry({
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
        isAuthenticated: true,
        lastActivity: Date.now(),
      });

    case AuthActionTypes.SOCIAL_LOGIN_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Set authentication state (for initial load)
    case AuthActionTypes.SET_AUTH_STATE:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: !!action.payload.token,
        sessionExpiry: action.payload.sessionExpiry || null,
      };

    // Clear tokens (partial logout)
    case AuthActionTypes.CLEAR_TOKENS:
      return {
        ...state,
        token: null,
        refreshToken: null,
        sessionExpiry: null,
      };

    // Reset login attempts
    case AuthActionTypes.RESET_LOGIN_ATTEMPTS:
      return {
        ...state,
        loginAttempts: 0,
      };

    // Impersonation (admin feature)
    case AuthActionTypes.IMPERSONATE_USER:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        sessionExpiry: Date.now() + SESSION_TIMEOUT,
        lastActivity: Date.now(),
      };

    case AuthActionTypes.STOP_IMPERSONATING:
      // Restore original user from stored state
      return {
        ...state,
        user: action.payload.originalUser,
        token: action.payload.originalToken,
      };

    default:
      return state;
  }
};

// Selectors (for use with useSelector)
export const authSelectors = {
  // Basic selectors
  getUser: (state: { auth: AuthState }) => state.auth.user,
  getToken: (state: { auth: AuthState }) => state.auth.token,
  getRefreshToken: (state: { auth: AuthState }) => state.auth.refreshToken,
  getLoading: (state: { auth: AuthState }) => state.auth.loading,
  getError: (state: { auth: AuthState }) => state.auth.error,
  getIsAuthenticated: (state: { auth: AuthState }) =>
    state.auth.isAuthenticated,
  getIsVerifying: (state: { auth: AuthState }) => state.auth.isVerifying,

  // Derived selectors
  getUserRole: (state: { auth: AuthState }) => state.auth.user?.role,
  getUserName: (state: { auth: AuthState }) => state.auth.user?.name,
  getUserEmail: (state: { auth: AuthState }) => state.auth.user?.email,
  getUserAvatar: (state: { auth: AuthState }) => state.auth.user?.avatar,
  getIsVerified: (state: { auth: AuthState }) => state.auth.user?.isVerified,

  // Session selectors
  getSessionExpiry: (state: { auth: AuthState }) => state.auth.sessionExpiry,
  getLastActivity: (state: { auth: AuthState }) => state.auth.lastActivity,
  getLoginAttempts: (state: { auth: AuthState }) => state.auth.loginAttempts,

  // Check if session is about to expire (within 5 minutes)
  isSessionAboutToExpire: (state: { auth: AuthState }) => {
    if (!state.auth.sessionExpiry) return false;
    const fiveMinutes = 5 * 60 * 1000;
    return state.auth.sessionExpiry - Date.now() < fiveMinutes;
  },

  // Check if session is expired
  isSessionExpired: (state: { auth: AuthState }) => {
    return isSessionExpired(state.auth.sessionExpiry);
  },

  // Check if user has specific role
  hasRole: (role: string) => (state: { auth: AuthState }) => {
    return state.auth.user?.role === role;
  },

  // Check if user has any of the specified roles
  hasAnyRole: (roles: string[]) => (state: { auth: AuthState }) => {
    return roles.includes(state.auth.user?.role || "");
  },

  // Check if user is admin
  isAdmin: (state: { auth: AuthState }) => {
    return state.auth.user?.role === "admin";
  },
};

// Helper function to save auth state to localStorage
export const persistAuthState = (state: AuthState): void => {
  try {
    const authState = {
      user: state.user,
      token: state.token,
      refreshToken: state.refreshToken,
      sessionExpiry: state.sessionExpiry,
    };
    localStorage.setItem("auth_state", JSON.stringify(authState));
  } catch (error) {
    console.error("Failed to persist auth state:", error);
  }
};

// Helper function to load auth state from localStorage
export const loadAuthState = (): Partial<AuthState> => {
  try {
    const savedState = localStorage.getItem("auth_state");
    if (!savedState) return {};

    const parsedState = JSON.parse(savedState);

    // Check if session is still valid
    if (
      parsedState.sessionExpiry &&
      isSessionExpired(parsedState.sessionExpiry)
    ) {
      localStorage.removeItem("auth_state");
      return {};
    }

    return parsedState;
  } catch (error) {
    console.error("Failed to load auth state:", error);
    return {};
  }
};

// Helper function to clear auth state from localStorage
export const clearPersistedAuthState = (): void => {
  try {
    localStorage.removeItem("auth_state");
  } catch (error) {
    console.error("Failed to clear auth state:", error);
  }
};

// Middleware for automatic state persistence
export const authPersistMiddleware =
  (store: any) => (next: any) => (action: any) => {
    const result = next(action);

    // Persist state after certain actions
    const actionsToPersist = [
      AuthActionTypes.LOGIN_SUCCESS,
      AuthActionTypes.REGISTER_SUCCESS,
      AuthActionTypes.REFRESH_TOKEN_SUCCESS,
      AuthActionTypes.UPDATE_PROFILE_SUCCESS,
      AuthActionTypes.LOGOUT,
      AuthActionTypes.CLEAR_TOKENS,
    ];

    if (actionsToPersist.includes(action.type)) {
      const state = store.getState().auth;
      persistAuthState(state);
    }

    return result;
  };

// Root reducer example (if you have multiple reducers)
export const rootReducer = (state: any, action: any) => {
  // Clear all state on logout
  if (action.type === AuthActionTypes.LOGOUT) {
    state = undefined;
  }

  return state;
};

export default authReducer;
