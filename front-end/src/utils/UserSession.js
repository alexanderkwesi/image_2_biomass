// utils/UserSession.js
import BrowserStorage from "./BrowserStorage";

export default class UserSession {
  // Check if user is logged in
  static isLoggedIn() {
    const token = BrowserStorage.getItem("access_token");
    const isLoggedIn = BrowserStorage.getItem("is_logged_in");

    if (!token || isLoggedIn !== "true") {
      return false;
    }

    // Check token expiration
    const expiresAt = BrowserStorage.getItem("token_expires_at");
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      if (expirationDate <= new Date()) {
        this.logout();
        return false;
      }
    }

    return true;
  }

  // Get user data
  static getUser() {
    const userJson = BrowserStorage.getItem("user_data");
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch (e) {
        console.error("Error parsing user data:", e);
        return null;
      }
    }
    return null;
  }

  // Get user initials
  static getUserInitials() {
    const user = this.getUser();
    if (!user) return "U";

    const firstInitial = user.first_name?.charAt(0)?.toUpperCase() || "";
    const lastInitial = user.last_name?.charAt(0)?.toUpperCase() || "";

    if (firstInitial && lastInitial) {
      return `${firstInitial}${lastInitial}`;
    } else if (firstInitial) {
      return firstInitial;
    } else if (lastInitial) {
      return lastInitial;
    }
    return "U";
  }

  // Get auth token
  static getToken() {
    return BrowserStorage.getItem("access_token");
  }

  // Save login session
  static saveLogin(userData, token) {
    // Save user data
    BrowserStorage.setItem("user_data", JSON.stringify(userData));

    // Save auth token
    BrowserStorage.setItem("access_token", token);

    // Set login status
    BrowserStorage.setItem("is_logged_in", "true");

    // Set token expiration (30 days for web)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    BrowserStorage.setItem("token_expires_at", expiresAt.toISOString());

    console.log("User session saved for 30 days");
  }

  // Logout user
  static logout() {
    BrowserStorage.removeItem("access_token");
    BrowserStorage.removeItem("user_data");
    BrowserStorage.removeItem("is_logged_in");
    BrowserStorage.removeItem("token_expires_at");
    BrowserStorage.removeItem("user_farms");
    BrowserStorage.removeItem("user_predictions");
    console.log("User logged out, session cleared");
  }

  // Save user farms
  static saveFarms(farms) {
    BrowserStorage.setItem("user_farms", JSON.stringify(farms));
  }

  // Get user farms
  static getFarms() {
    const farmsJson = BrowserStorage.getItem("user_farms");
    if (farmsJson) {
      try {
        return JSON.parse(farmsJson);
      } catch (e) {
        console.error("Error parsing farms:", e);
        return [];
      }
    }
    return [];
  }
}
