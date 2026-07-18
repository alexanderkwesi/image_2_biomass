import { combineReducers } from "redux";
import authReducer from "./authReducer";
import imageReducer from "./imageReducer";
import userReducer from "./userReducer";
import farmReducer from "./farmsReducer";

const appReducer = combineReducers({
  auth: authReducer,
  image: imageReducer,
  user: userReducer,
  farms: farmReducer,
});

// Root reducer with clear state on logout
const rootReducer = (state, action) => {
  // Clear all data on logout
  if (action.type === "AUTH/LOGOUT") {
    // Clear localStorage for web (equivalent to AsyncStorage in React Native)
    try {
      localStorage.removeItem("persist:root");
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }

    state = undefined;
  }

  return appReducer(state, action);
};

export default rootReducer;
