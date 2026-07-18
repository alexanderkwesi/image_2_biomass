// CameraView.tsx - React Web Version
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  Ref,
  useCallback,
} from "react";
import "./CameraView.css";

// API Configuration - update these URLs for your environment
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api/v1'
  : 'https://your-production-api.com/api/v1';

// Type definitions
type CameraMode = "mobile" | "webcam" | "drone" | "tablet" | "external";
type CameraPosition = "front" | "back";
type PermissionStatus = boolean | null;
type ThemeMode = "light" | "dark" | "auto";

interface ValidationResult {
  isValid: boolean;
  issues?: string[];
  score?: number;
}

interface ImageData {
  uri: string;
  width: number;
  height: number;
  base64?: string;
  metadata: {
    timestamp: string;
    captureType: CameraMode;
    cameraPosition: CameraPosition;
    platform: string;
    deviceType: string;
    source: string;
    resolution: string;
    userAgent?: string;
  };
  validation?: ValidationResult;
}

interface ProcessingMetadata {
  pastureName: string;
  farmId?: string;
  location?: string;
  notes?: string;
  captureDate: string;
  estimatedBiomass?: string;
  qualityRating?: number;
  tags?: string[];
  selectedPastureId?: string;
}

interface CameraViewProps {
  navigation?: any;
  onImageCapture?: (image: ImageData) => void;
  onValidation?: (imageUri: string) => Promise<ValidationResult>;
  hasPermission?: boolean;
  onRequestPermission?: () => Promise<boolean>;
  onSaveToImageProcessingTable?: (imageData: ImageData, metadata: ProcessingMetadata) => Promise<void>;
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
}

interface DeviceInfo {
  platform: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWeb: boolean;
  supportsMultipleCameras: boolean;
  supportsDrone: boolean;
  supportsFrontCamera: boolean;
  supportsBackCamera: boolean;
  userAgent: string;
}

interface CameraViewHandle {
  takePicture: () => Promise<ImageData | null>;
  checkCameraReady: () => boolean;
  requestPermission: () => Promise<boolean>;
  setCameraMode: (mode: CameraMode) => void;
  setCameraPosition: (position: CameraPosition) => void;
  getAvailableModes: () => CameraMode[];
  getDeviceInfo: () => DeviceInfo;
  getAvailableCameraPositions: () => CameraPosition[];
  cleanup: () => void;
  logout: () => Promise<void>;
  getTheme: () => ThemeMode;
  setTheme: (theme: ThemeMode) => Promise<void>;
}

interface FarmData {
  id: string;
  name: string;
  location?: string;
  pastures?: PastureData[];
}

interface PastureData {
  id: string;
  name: string;
  farm_id: string;
  farm_name?: string;
  location?: string;
  area_hectares?: number;
  current_biomass?: number;
}

interface SelectItem {
  label: string;
  value: string;
  originalData?: FarmData;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  token: string;
  refreshToken: string;
  expiresAt: number;
  farms?: FarmData[];
}

// Constants
const DEFAULT_CAMERA_CONSTRAINTS = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

// Storage Keys for web browser storage
const STORAGE_KEYS = {
  AUTH_TOKEN: 'pasture_app_auth_token',
  REFRESH_TOKEN: 'pasture_app_refresh_token',
  USER_DATA: 'pasture_app_user_data',
  THEME: 'pasture_app_theme',
  LAST_FARM: 'pasture_app_last_farm',
  LAST_PASTURE: 'pasture_app_last_pasture',
  CAMERA_SETTINGS: 'pasture_app_camera_settings',
  USER_SETTINGS: 'pasture_app_user_settings',
} as const;

// Web Browser Storage Manager (localStorage)
class WebStorageManager {
  static async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
    }
  }

  static async clear(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // Theme Management
  static async getTheme(): Promise<ThemeMode> {
    try {
      const theme = await this.getItem(STORAGE_KEYS.THEME);
      if (theme === 'light' || theme === 'dark' || theme === 'auto') {
        return theme as ThemeMode;
      }
      return 'auto'; // Default theme
    } catch (error) {
      console.error('Error getting theme:', error);
      return 'auto';
    }
  }

  static async setTheme(theme: ThemeMode): Promise<void> {
    try {
      await this.setItem(STORAGE_KEYS.THEME, theme);
      this.applyTheme(theme);
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  }

  static applyTheme(theme: ThemeMode): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;

    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark');
    body.classList.remove('theme-light', 'theme-dark');

    let effectiveTheme = theme;
    
    if (theme === 'auto') {
      // Use prefers-color-scheme for auto theme
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Add new theme class
    root.classList.add(`theme-${effectiveTheme}`);
    body.classList.add(`theme-${effectiveTheme}`);

    // Update CSS variables
    const isDark = effectiveTheme === 'dark';
    
    // Set CSS custom properties for theme
    if (isDark) {
      root.style.setProperty('--bg-color', '#000000');
      root.style.setProperty('--text-color', '#ffffff');
      root.style.setProperty('--primary-color', '#4CAF50');
      root.style.setProperty('--secondary-color', '#333333');
      root.style.setProperty('--accent-color', '#FFD700');
    } else {
      root.style.setProperty('--bg-color', '#ffffff');
      root.style.setProperty('--text-color', '#000000');
      root.style.setProperty('--primary-color', '#4CAF50');
      root.style.setProperty('--secondary-color', '#f0f0f0');
      root.style.setProperty('--accent-color', '#FF9800');
    }
  }

  // User Data Management
  static async getUserData(): Promise<UserData | null> {
    try {
      const userData = await this.getItem(STORAGE_KEYS.USER_DATA);
      if (userData) {
        const parsed = JSON.parse(userData);
        
        // Validate expiration
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          console.log('User data expired, clearing...');
          await this.clearUserData();
          return null;
        }
        
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  static async setUserData(userData: UserData): Promise<void> {
    try {
      await this.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      await this.setItem(STORAGE_KEYS.AUTH_TOKEN, userData.token);
      await this.setItem(STORAGE_KEYS.REFRESH_TOKEN, userData.refreshToken);
    } catch (error) {
      console.error('Error setting user data:', error);
    }
  }

  static async clearUserData(): Promise<void> {
    try {
      // Only clear app-specific data, not all localStorage
      await this.removeItem(STORAGE_KEYS.USER_DATA);
      await this.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await this.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await this.removeItem(STORAGE_KEYS.LAST_FARM);
      await this.removeItem(STORAGE_KEYS.LAST_PASTURE);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }

  // User Settings Management
  static async getUserSettings(): Promise<any> {
    try {
      const settings = await this.getItem(STORAGE_KEYS.USER_SETTINGS);
      if (settings) {
        return JSON.parse(settings);
      }
      return {};
    } catch (error) {
      console.error('Error getting user settings:', error);
      return {};
    }
  }

  static async setUserSettings(settings: any): Promise<void> {
    try {
      await this.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error setting user settings:', error);
    }
  }

  // Camera Settings Management
  static async getCameraSettings(): Promise<{
    cameraMode?: CameraMode;
    cameraPosition?: CameraPosition;
    selectedDeviceId?: string;
  }> {
    try {
      const settings = await this.getItem(STORAGE_KEYS.CAMERA_SETTINGS);
      if (settings) {
        return JSON.parse(settings);
      }
      return {};
    } catch (error) {
      console.error('Error getting camera settings:', error);
      return {};
    }
  }

  static async setCameraSettings(settings: {
    cameraMode?: CameraMode;
    cameraPosition?: CameraPosition;
    selectedDeviceId?: string;
  }): Promise<void> {
    try {
      await this.setItem(STORAGE_KEYS.CAMERA_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error setting camera settings:', error);
    }
  }

  // Preferences Management
  static async getLastFarm(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.LAST_FARM);
  }

  static async setLastFarm(farmId: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.LAST_FARM, farmId);
  }

  static async getLastPasture(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.LAST_PASTURE);
  }

  static async setLastPasture(pastureId: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.LAST_PASTURE, pastureId);
  }
}

// Authentication Manager for Web Browser
class AuthManager {
  private static instance: AuthManager;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  async getAuthToken(): Promise<string> {
    try {
      const token = await WebStorageManager.getItem(STORAGE_KEYS.AUTH_TOKEN) || '';
      
      if (token) {
        try {
          // Check JWT expiration (simple check - in production, decode properly)
          const parts = token.split('.');
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(atob(parts[1]));
              const isExpired = payload.exp && Date.now() >= payload.exp * 1000;
              
              if (isExpired) {
                console.log('Token expired, attempting refresh...');
                const newToken = await this.refreshToken();
                return newToken;
              }
            } catch (e) {
              console.log('Token is not a JWT or can\'t be parsed', e);
            }
          }
        } catch (e) {
          console.log('Error checking token expiration:', e);
        }
      }
      
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return '';
    }
  }

  async refreshToken(): Promise<string> {
    try {
      if (this.isRefreshing) {
        return new Promise((resolve) => {
          this.refreshSubscribers.push((token: string) => {
            resolve(token);
          });
        });
      }

      this.isRefreshing = true;
      
      const refreshToken = await WebStorageManager.getItem(STORAGE_KEYS.REFRESH_TOKEN) || '';
      const userData = await WebStorageManager.getUserData();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          refresh_token: refreshToken,
          user_id: userData?.id 
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      // Update user data with new tokens
      if (userData) {
        userData.token = data.access_token;
        userData.refreshToken = data.refresh_token;
        userData.expiresAt = Date.now() + (data.expires_in * 1000);
        await WebStorageManager.setUserData(userData);
      }
      
      this.refreshSubscribers.forEach(callback => callback(data.access_token));
      this.refreshSubscribers = [];
      
      return data.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.clearTokens();
      
      // Show login prompt
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          const userConfirmed = window.confirm('Your session has expired. Please log in again.');
          if (userConfirmed) {
            window.location.href = '/login';
          }
        }
      }, 100);
      
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  async storeTokens(accessToken: string, refreshToken: string, userData?: Partial<UserData>): Promise<void> {
    try {
      if (userData) {
        const existingUserData = await WebStorageManager.getUserData();
        const newUserData: UserData = {
          ...(existingUserData || {} as UserData),
          ...userData,
          token: accessToken,
          refreshToken: refreshToken,
          expiresAt: Date.now() + (3600 * 1000), // 1 hour default
        } as UserData;
        
        await WebStorageManager.setUserData(newUserData);
      } else {
        await WebStorageManager.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
        await WebStorageManager.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  async clearTokens(): Promise<void> {
    try {
      await WebStorageManager.clearUserData();
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      const userData = await WebStorageManager.getUserData();
      if (!userData || !userData.token) return false;
      
      // Check token expiration
      if (userData.expiresAt && Date.now() > userData.expiresAt) {
        try {
          await this.refreshToken();
          return true;
        } catch {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  async getUserInfo(): Promise<UserData | null> {
    try {
      const userData = await WebStorageManager.getUserData();
      if (!userData || !userData.token) return null;
      
      // Refresh token if needed
      if (userData.expiresAt && Date.now() > userData.expiresAt) {
        try {
          await this.refreshToken();
          return await WebStorageManager.getUserData();
        } catch {
          return null;
        }
      }
      
      return userData;
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }
}

// Authenticated Fetch for Web Browser
const authFetch = async (url: string, options: RequestInit = {}) => {
  const authManager = AuthManager.getInstance();
  
  const token = await authManager.getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && token) {
    try {
      console.log('Received 401, attempting token refresh...');
      const newToken = await authManager.refreshToken();
      
      headers['Authorization'] = `Bearer ${newToken}`;
      
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (refreshError) {
      console.error('Failed to refresh token:', refreshError);
      await authManager.clearTokens();
      
      // Show login prompt
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          const userConfirmed = window.confirm('Your session has expired. Please log in again.');
          if (userConfirmed) {
            window.location.href = '/login';
          }
        }
      }, 100);
      
      throw new Error('Authentication failed');
    }
  }

  return response;
};

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await authFetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// Image Compression for Web Browser
const compressImage = async (uri: string): Promise<{ uri: string; base64: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxWidth = 1024;
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedUri = canvas.toDataURL('image/jpeg', 0.7);
        const base64 = compressedUri.split(',')[1];
        
        resolve({
          uri: compressedUri,
          base64,
          width: canvas.width,
          height: canvas.height,
        });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = (error) => {
      reject(new Error(`Failed to load image: ${error}`));
    };
    img.src = uri;
  });
};

// Custom Dropdown Component for Web Browser
interface CustomDropdownProps {
  items: Array<{label: string; value: string}>;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  items,
  value,
  onValueChange,
  placeholder = "Select...",
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>("");

  useEffect(() => {
    const selectedItem = items.find(item => item.value === value);
    setSelectedLabel(selectedItem?.label || placeholder);
  }, [value, items, placeholder]);

  const handleSelect = (itemValue: string, itemLabel: string) => {
    onValueChange(itemValue);
    setSelectedLabel(itemLabel);
    setIsOpen(false);
  };

  return (
    <div className={`custom-dropdown-container ${className || ''}`}>
      <button
        className="custom-dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`custom-dropdown-button-text ${
          value === "" ? "custom-dropdown-placeholder" : ""
        }`}>
          {selectedLabel}
        </span>
        <span className="custom-dropdown-icon">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>
      
      {isOpen && (
        <div className="custom-dropdown-menu">
          <div className="custom-dropdown-scroll">
            {items.map((item) => (
              <button
                key={item.value}
                className={`custom-dropdown-item ${
                  value === item.value ? "custom-dropdown-item-active" : ""
                }`}
                onClick={() => handleSelect(item.value, item.label)}
              >
                <span className={`custom-dropdown-item-text ${
                  value === item.value ? "custom-dropdown-item-text-active" : ""
                }`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CameraView = forwardRef<CameraViewHandle, CameraViewProps>(
  (
    {
      navigation,
      onImageCapture,
      onValidation,
      hasPermission: externalHasPermission,
      onRequestPermission,
      onSaveToImageProcessingTable,
      theme: externalTheme,
      onThemeChange,
    },
    ref: Ref<CameraViewHandle>
  ) => {
    // Refs
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    
    // State
    const [cameraReady, setCameraReady] = useState<boolean>(false);
    const [isCapturing, setIsCapturing] = useState<boolean>(false);
    const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>(null);
    const [showInstructions, setShowInstructions] = useState<boolean>(true);
    const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
    const [webStream, setWebStream] = useState<MediaStream | null>(null);
    const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    
    // Device detection
    const IS_MOBILE_WEB = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent || '');
    const IS_TABLET_WEB = typeof navigator !== 'undefined' && /Tablet|iPad/i.test(navigator.userAgent || '');
    const IS_DESKTOP_WEB = !IS_MOBILE_WEB && !IS_TABLET_WEB;
    
    // Camera configuration with localStorage persistence
    const [cameraMode, setCameraMode] = useState<CameraMode>(() => {
      if (IS_MOBILE_WEB) return "mobile";
      if (IS_TABLET_WEB) return "tablet";
      return "webcam";
    });
    
    const [cameraPosition, setCameraPosition] = useState<CameraPosition>("back");

    // Device info
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
      platform: 'web',
      isMobile: IS_MOBILE_WEB,
      isTablet: IS_TABLET_WEB,
      isDesktop: IS_DESKTOP_WEB,
      isWeb: true,
      supportsMultipleCameras: false,
      supportsDrone: false,
      supportsFrontCamera: false,
      supportsBackCamera: false,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });

    // Save modal states
    const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
    const [capturedImageData, setCapturedImageData] = useState<ImageData | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [processingMetadata, setProcessingMetadata] = useState<ProcessingMetadata>({
      pastureName: "",
      location: "",
      notes: "",
      captureDate: new Date().toISOString().split('T')[0],
      estimatedBiomass: "",
      qualityRating: 3,
      tags: [],
      selectedPastureId: "",
    });

    // User data states
    const [userFarms, setUserFarms] = useState<FarmData[]>([]);
    const [userPastures, setUserPastures] = useState<PastureData[]>([]);
    const [loadingFarms, setLoadingFarms] = useState<boolean>(false);
    const [loadingPastures, setLoadingPastures] = useState<boolean>(false);
    const [showPastureList, setShowPastureList] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [userData, setUserData] = useState<UserData | null>(null);

    // Theme state with localStorage persistence
    const [theme, setTheme] = useState<ThemeMode>('auto');

    // Dropdown states
    const [selectedFarm, setSelectedFarm] = useState<string>("");
    const [selectItems, setSelectItems] = useState<SelectItem[]>([
      { label: "Select a farm", value: "" }
    ]);
    const [userFarmList, setUserFarmList] = useState<FarmData[]>([]);

    // Derived state
    const hasPermission: PermissionStatus = externalHasPermission !== undefined
      ? externalHasPermission
      : permissionStatus;

    // Initialize theme, auth, and camera settings from localStorage
    useEffect(() => {
      const initialize = async () => {
        // Load theme from localStorage
        const storedTheme = await WebStorageManager.getTheme();
        setTheme(storedTheme);
        
        // Apply theme
        WebStorageManager.applyTheme(storedTheme);
        
        // Load camera settings from localStorage
        const cameraSettings = await WebStorageManager.getCameraSettings();
        if (cameraSettings.cameraMode) {
          setCameraMode(cameraSettings.cameraMode);
        }
        if (cameraSettings.cameraPosition) {
          setCameraPosition(cameraSettings.cameraPosition);
        }
        if (cameraSettings.selectedDeviceId) {
          setSelectedDeviceId(cameraSettings.selectedDeviceId);
        }
        
        // Check login status
        const authManager = AuthManager.getInstance();
        const loggedIn = await authManager.isLoggedIn();
        setIsLoggedIn(loggedIn);
        
        if (loggedIn) {
          const userInfo = await authManager.getUserInfo();
          setUserData(userInfo);
        }
        
        // Initialize camera
        await checkWebCameras();
        await detectDeviceCapabilities();
      };

      initialize();

      // Cleanup function
      return () => {
        if (webStream) {
          webStream.getTracks().forEach((track) => track.stop());
        }
        if (navigator.mediaDevices) {
          navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        }
      };
    }, []);

    // Listen for theme changes from parent
    useEffect(() => {
      if (externalTheme && externalTheme !== theme) {
        setTheme(externalTheme);
        WebStorageManager.setTheme(externalTheme);
      }
    }, [externalTheme]);

    // Save camera settings to localStorage when they change
    useEffect(() => {
      const saveCameraSettings = async () => {
        await WebStorageManager.setCameraSettings({
          cameraMode,
          cameraPosition,
          selectedDeviceId,
        });
      };
      saveCameraSettings();
    }, [cameraMode, cameraPosition, selectedDeviceId]);

    // Theme change handler
    const handleThemeChange = async (newTheme: ThemeMode) => {
      setTheme(newTheme);
      await WebStorageManager.setTheme(newTheme);
      onThemeChange?.(newTheme);
    };

    // Memoized callbacks
    const getDeviceType = useCallback((): string => {
      if (IS_MOBILE_WEB) return "mobile_browser";
      if (IS_TABLET_WEB) return "tablet_browser";
      return "desktop_browser";
    }, []);

    const navigateToLogin = () => {
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('Login');
      } else {
        window.location.href = '/login';
      }
    };

    // Handle logout
    const handleLogout = async () => {
      if (window.confirm("Are you sure you want to logout?")) {
        try {
          const authManager = AuthManager.getInstance();
          await authManager.clearTokens();
          setIsLoggedIn(false);
          setUserData(null);
          
          // Clear local state
          setUserFarms([]);
          setUserPastures([]);
          setSelectedFarm("");
          
          alert("You have been logged out.");
        } catch (error) {
          console.error("Logout error:", error);
          alert("Failed to logout. Please try again.");
        }
      }
    };

    // Fetch user farms and pastures when modal opens
    useEffect(() => {
      if (showSaveModal && isLoggedIn) {
        fetchUserFarms();
        fetchUserPastures();
      }
    }, [showSaveModal, isLoggedIn]);

    // Load last selected farm and pasture from localStorage
    useEffect(() => {
      const loadLastSelections = async () => {
        if (isLoggedIn) {
          const lastFarm = await WebStorageManager.getLastFarm();
          const lastPasture = await WebStorageManager.getLastPasture();
          
          if (lastFarm) {
            setSelectedFarm(lastFarm);
          }
          
          if (lastPasture && userPastures.length > 0) {
            const pasture = userPastures.find(p => p.id === lastPasture);
            if (pasture) {
              setProcessingMetadata(prev => ({
                ...prev,
                pastureName: pasture.name,
                selectedPastureId: pasture.id,
                farmId: pasture.farm_id,
                location: pasture.location || prev.location,
              }));
            }
          }
        }
      };
      
      loadLastSelections();
    }, [isLoggedIn, userPastures]);

    // Filter pastures based on search
    const filteredPastures = React.useMemo(() => {
      if (!searchQuery.trim()) return userPastures;
      
      const query = searchQuery.toLowerCase();
      return userPastures.filter((pasture: PastureData) => 
        pasture.name.toLowerCase().includes(query) ||
        (pasture.farm_name && pasture.farm_name.toLowerCase().includes(query)) ||
        (pasture.location && pasture.location.toLowerCase().includes(query))
      );
    }, [userPastures, searchQuery]);

    // Prepare picker items
    const pickerItems = React.useMemo(() => {
      return selectItems.map(item => ({
        label: item.label,
        value: item.value,
      }));
    }, [selectItems]);

    // Imperative handle
    useImperativeHandle(ref, () => ({
      takePicture: async (): Promise<ImageData | null> => {
        if (!isLoggedIn) {
          alert("Please login to capture images.");
          navigateToLogin();
          return null;
        }
        return await captureWebImage();
      },
      checkCameraReady: (): boolean => cameraReady,
      requestPermission: async (): Promise<boolean> => {
        return await handlePermissionRequest();
      },
      setCameraMode: (mode: CameraMode): void => {
        setCameraMode(mode);
        // Save to localStorage
        WebStorageManager.setCameraSettings({ cameraMode: mode, cameraPosition, selectedDeviceId });
      },
      setCameraPosition: (position: CameraPosition): void => {
        setCameraPosition(position);
        // Save to localStorage
        WebStorageManager.setCameraSettings({ cameraMode, cameraPosition: position, selectedDeviceId });
      },
      getAvailableModes: (): CameraMode[] => {
        const modes: CameraMode[] = [];
        
        if (deviceInfo.isMobile || deviceInfo.isTablet) {
          modes.push("mobile");
          if (deviceInfo.isTablet) modes.push("tablet");
        }
        
        modes.push("webcam");
        
        if (deviceInfo.supportsDrone) {
          modes.push("drone");
        }
        if (availableDevices.length > 1) {
          modes.push("external");
        }
        
        return modes;
      },
      getAvailableCameraPositions: (): CameraPosition[] => {
        const positions: CameraPosition[] = [];
        if (deviceInfo.supportsBackCamera) positions.push("back");
        if (deviceInfo.supportsFrontCamera) positions.push("front");
        return positions;
      },
      getDeviceInfo: (): DeviceInfo => deviceInfo,
      cleanup: (): void => {
        if (webStream) {
          webStream.getTracks().forEach((track) => track.stop());
          setWebStream(null);
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      },
      logout: handleLogout,
      getTheme: (): ThemeMode => theme,
      setTheme: handleThemeChange,
    }));

    // Device change listener
    useEffect(() => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      }
      
      return () => {
        if (navigator.mediaDevices) {
          navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        }
      };
    }, []);

    // Fetch user farms
    const fetchUserFarms = async () => {
      try {
        if (!isLoggedIn) {
          alert("Please login to view your farms.");
          navigateToLogin();
          return;
        }

        setLoadingFarms(true);
        
        const data = await apiRequest(`/farms`);
        
        const userFarmData = data?.farms || data || [];
        
        // Set state
        setUserFarmList(userFarmData);
        setUserFarms(userFarmData);
        
        // Transform data for select
        const selectItemsData = userFarmData.map((farm: FarmData) => ({
          label: farm.name || `Farm ${farm.id}`,
          value: farm.id.toString(),
          originalData: farm
        }));
        
        // Add a default option
        const items = [
          { label: "Select a farm", value: "" },
          ...selectItemsData
        ];
        
        setSelectItems(items);
        
        if (userFarmData.length > 0) {
          console.log(`Loaded ${userFarmData.length} farms`);
        }
        
        return userFarmData;
      } catch (error: any) {
        console.error('Error fetching farms:', error);
        if (error.message !== 'Authentication failed') {
          alert('Unable to load farms. Please check your connection.');
        }
      } finally {
        setLoadingFarms(false);
      }
    };

    // Fetch user pastures
    const fetchUserPastures = async () => {
      try {
        if (!isLoggedIn) {
          alert("Please login to view your pastures.");
          navigateToLogin();
          return;
        }

        setLoadingPastures(true);
        
        const data = await apiRequest("/pastures");
        
        setUserPastures(data.pastures || data || []);
      } catch (error: any) {
        console.error('Error fetching pastures:', error);
        if (error.message !== 'Authentication failed') {
          alert('Unable to load pastures. Please check your connection.');
        }
      } finally {
        setLoadingPastures(false);
      }
    };

    // Handle farm selection change
    const handleFarmChange = (value: string) => {
      setSelectedFarm(value);
      
      const selectedFarmObject = userFarmList.find(farm => 
        farm.id.toString() === value
      );
      
      if (selectedFarmObject) {
        setProcessingMetadata(prev => ({
          ...prev,
          farmId: selectedFarmObject.id,
          location: selectedFarmObject.location || prev.location,
        }));
        
        // Save to localStorage
        WebStorageManager.setLastFarm(value);
      } else {
        setProcessingMetadata(prev => ({
          ...prev,
          farmId: undefined,
        }));
      }
    };

    // Detect device capabilities
    const detectDeviceCapabilities = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          console.warn('Media devices API not available');
          return;
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        
        let hasFrontCamera = false;
        let hasBackCamera = false;
        
        for (const device of videoDevices) {
          const label = device.label.toLowerCase();
          if (label.includes('front') || label.includes('user')) {
            hasFrontCamera = true;
          }
          if (label.includes('back') || label.includes('environment') || label.includes('rear')) {
            hasBackCamera = true;
          }
        }
        
        // Fallback logic
        if (videoDevices.length > 0 && !hasBackCamera && !hasFrontCamera) {
          hasBackCamera = true;
          if (videoDevices.length > 1) {
            hasFrontCamera = true;
          }
        }
        
        setDeviceInfo(prev => ({
          ...prev,
          supportsMultipleCameras: videoDevices.length > 1,
          supportsDrone: videoDevices.some(device =>
            device.label.toLowerCase().includes('drone') ||
            device.label.toLowerCase().includes('gopro') ||
            device.label.toLowerCase().includes('mavic') ||
            device.label.toLowerCase().includes('dji')
          ),
          supportsFrontCamera: hasFrontCamera,
          supportsBackCamera: hasBackCamera,
        }));
        
        setAvailableDevices(videoDevices);
        if (videoDevices.length > 0) {
          // Try to use saved device ID first
          const cameraSettings = await WebStorageManager.getCameraSettings();
          if (cameraSettings.selectedDeviceId && videoDevices.some(d => d.deviceId === cameraSettings.selectedDeviceId)) {
            setSelectedDeviceId(cameraSettings.selectedDeviceId);
          } else {
            // Use back camera or first available
            const backCamera = videoDevices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('environment') ||
              d.label.toLowerCase().includes('rear')
            );
            setSelectedDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
          }
        }
      } catch (error) {
        console.error('Error detecting device capabilities:', error);
      }
    };

    const handleDeviceChange = async () => {
      await checkWebCameras();
      await detectDeviceCapabilities();
    };

    const checkWebCameras = async (): Promise<void> => {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(
            (device) => device.kind === "videoinput"
          );

          console.log("Available cameras:", videoDevices.map(d => d.label || 'Unlabeled camera'));

          setPermissionStatus(videoDevices.length > 0);
          setAvailableDevices(videoDevices);
        } else {
          setPermissionStatus(false);
        }
      } catch (error) {
        console.error("Error checking web cameras:", error);
        setPermissionStatus(false);
      }
    };

    const handlePermissionRequest = async (deviceId?: string): Promise<boolean> => {
      try {
        // Check if we're in a browser environment
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          alert("Your browser does not support camera access.");
          return false;
        }
        
        // Cleanup existing stream
        if (webStream) {
          webStream.getTracks().forEach((track) => track.stop());
        }
        
        const constraints: MediaStreamConstraints = {
          video: {
            width: DEFAULT_CAMERA_CONSTRAINTS.width,
            height: DEFAULT_CAMERA_CONSTRAINTS.height,
            facingMode: cameraPosition === "front" ? "user" : "environment",
            deviceId: deviceId || selectedDeviceId ? { exact: deviceId || selectedDeviceId } : undefined,
          } as MediaTrackConstraints,
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setWebStream(stream);
        setPermissionStatus(true);
        setCameraReady(true);
        
        // Save selected device to localStorage
        if (deviceId) {
          setSelectedDeviceId(deviceId);
          await WebStorageManager.setCameraSettings({
            cameraMode,
            cameraPosition,
            selectedDeviceId: deviceId,
          });
        }
        
        // Set up video element
        if (!videoRef.current) {
          const video = document.createElement('video');
          video.autoplay = true;
          video.playsInline = true;
          video.style.position = 'absolute';
          video.style.width = '1px';
          video.style.height = '1px';
          video.style.opacity = '0';
          video.style.pointerEvents = 'none';
          document.body.appendChild(video);
          videoRef.current = video;
        }
        
        videoRef.current.srcObject = stream;
        
        return true;
      } catch (error) {
        console.error("Permission request error:", error);
        alert("Unable to request camera permission. Please check your device settings.");
        return false;
      }
    };

    const selectCameraDevice = async (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      
      // Save to localStorage
      await WebStorageManager.setCameraSettings({
        cameraMode,
        cameraPosition,
        selectedDeviceId: deviceId,
      });
      
      if (permissionStatus && webStream) {
        await handlePermissionRequest(deviceId);
      }
    };

    const handleCameraPositionChange = async (position: CameraPosition) => {
      setCameraPosition(position);
      
      // Save to localStorage
      await WebStorageManager.setCameraSettings({
        cameraMode,
        cameraPosition: position,
        selectedDeviceId,
      });
      
      if (webStream && permissionStatus) {
        webStream.getTracks().forEach((track) => track.stop());
        setWebStream(null);
        setCameraReady(false);
        await handlePermissionRequest();
      }
    };

    // Capture using HTML5 Media API
    const captureWebImage = async (): Promise<ImageData | null> => {
      if (!isLoggedIn) {
        alert("Please login to capture images.");
        navigateToLogin();
        return null;
      }

      if (!permissionStatus || !webStream) {
        alert("Please allow camera access first");
        return null;
      }

      try {
        setIsCapturing(true);

        const video = videoRef.current;
        if (!video) {
          throw new Error("Video element not found");
        }
        
        // Create canvas if not exists
        if (!canvasRef.current) {
          const canvas = document.createElement('canvas');
          canvas.style.position = 'absolute';
          canvas.style.width = '1px';
          canvas.style.height = '1px';
          canvas.style.opacity = '0';
          canvas.style.pointerEvents = 'none';
          document.body.appendChild(canvas);
          canvasRef.current = canvas;
        }
        
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          throw new Error("Could not get canvas context");
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to data URL
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        const base64Data = dataUrl.split(",")[1];

        // Compress image
        const compressed = await compressImage(dataUrl);

        const imageData: ImageData = {
          uri: compressed.uri,
          width: compressed.width,
          height: compressed.height,
          base64: compressed.base64,
          metadata: {
            timestamp: new Date().toISOString(),
            captureType: cameraMode,
            cameraPosition: cameraPosition,
            platform: 'web',
            deviceType: getDeviceType(),
            source: cameraMode === "drone" ? "drone_camera" : 
                   cameraMode === "external" ? "external_camera" : "webcam",
            resolution: `${compressed.width}x${compressed.height}`,
            userAgent: navigator.userAgent || '',
          },
        };

        // Validate image if callback provided
        if (onValidation) {
          const validation = await onValidation(compressed.uri);
          imageData.validation = validation;
          
          if (!validation.isValid) {
            alert(
              `The pasture image needs improvement:\n\n${
                validation.issues?.join("\n• ") ||
                "Please ensure good lighting and focus"
              }\n\nTry again with better conditions.`
            );
            return null;
          }
        } else {
          // Default validation
          imageData.validation = { isValid: true, issues: [], score: 100 };
        }

        setCapturedPreview(compressed.uri);
        setCapturedImageData(imageData);
        setShowSaveModal(true);

        // Call the onImageCapture callback
        onImageCapture?.(imageData);

        return imageData;
      } catch (error) {
        console.error("Web capture error:", error);
        alert("Failed to capture image. Please check your camera connection.");
        return null;
      } finally {
        setIsCapturing(false);
      }
    };

    const handleCapture = async (): Promise<void> => {
      const image = await captureWebImage();
      if (image && onImageCapture) {
        onImageCapture(image);
      }
    };

    const handleModeChange = async (mode: CameraMode): Promise<void> => {
      setCameraMode(mode);
      
      // Save to localStorage
      await WebStorageManager.setCameraSettings({
        cameraMode: mode,
        cameraPosition,
        selectedDeviceId,
      });
      
      // Cleanup existing stream if changing modes
      if (webStream) {
        webStream.getTracks().forEach((track) => track.stop());
        setWebStream(null);
        setCameraReady(false);
        
        // Request new stream with updated mode
        if (permissionStatus) {
          await handlePermissionRequest();
        }
      }
      
      const modeMessages: Record<CameraMode, string> = {
        drone: "🚁 Drone camera selected. Ensure your drone camera is connected and visible to the system.",
        webcam: "💻 Web camera selected. Using your computer's webcam.",
        mobile: "📱 Mobile camera selected. Using mobile device camera.",
        tablet: "📱 Tablet camera selected. Using tablet camera.",
        external: "🔗 External camera selected. Ensure external camera is connected."
      };
      
      alert(`Switched to ${mode} mode. ${modeMessages[mode] || ''}`);
    };

    // Handle saving to IMAGE_PROCESSING_TABLE
    const handleSaveToProcessingTable = async (): Promise<void> => {
      if (!capturedImageData) return;
      
      setIsSaving(true);
      try {
        const imageId = `pasture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const requestData = {
          image_id: imageId,
          pasture_name: processingMetadata.pastureName,
          pasture_id: processingMetadata.selectedPastureId || null,
          farm_id: processingMetadata.farmId || null,
          location: processingMetadata.location || '',
          notes: processingMetadata.notes || '',
          capture_date: processingMetadata.captureDate,
          estimated_biomass: processingMetadata.estimatedBiomass ? 
            parseFloat(processingMetadata.estimatedBiomass) : null,
          quality_rating: processingMetadata.qualityRating || 3,
          tags: processingMetadata.tags || [],
          image_data: capturedImageData.base64 || (capturedImageData.uri.includes(',') ? capturedImageData.uri.split(',')[1] : ''),
          metadata: {
            ...capturedImageData.metadata,
            validation: capturedImageData.validation,
            platform: 'web',
            device_info: deviceInfo,
            camera_mode: cameraMode,
            camera_position: cameraPosition,
            user_id: userData?.id,
          }
        };
        
        const response = await authFetch(`${API_BASE_URL}/pasture-images`, {
          method: 'POST',
          body: JSON.stringify(requestData),
        });
        
        if (response.ok) {
          const result = await response.json();
          
          alert(`Image saved to pasture database successfully!\n\nImage ID: ${result.image_id}`);

          setShowSaveModal(false);
          
          onSaveToImageProcessingTable?.(capturedImageData, processingMetadata);
          
          // Save last pasture to localStorage
          if (processingMetadata.selectedPastureId) {
            await WebStorageManager.setLastPasture(processingMetadata.selectedPastureId);
          }
          
          // Reset states
          setShowSaveModal(false);
          setCapturedPreview(null);
          setCapturedImageData(null);
          setProcessingMetadata({
            pastureName: "",
            location: "",
            notes: "",
            captureDate: new Date().toISOString().split('T')[0],
            estimatedBiomass: "",
            qualityRating: 3,
            tags: [],
            selectedPastureId: "",
          });
          setShowPastureList(false);
          setSearchQuery("");
        } else {
          const errorText = await response.text();
          let errorMessage = 'Failed to save image';
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch (e) {
            errorMessage = `Server error: ${response.status}`;
          }
          
          throw new Error(errorMessage);
        }
        
      } catch (error: any) {
        console.error("Error saving image:", error);
        
        if (error.message !== 'Authentication failed') {
          alert(`Failed to save image to pasture database: ${error.message}`);
        }
      } finally {
        setIsSaving(false);
      }
    };

    // Handle discarding the image
    const handleDiscardImage = (): void => {
      if (window.confirm("Are you sure you want to discard this image?")) {
        setShowSaveModal(false);
        setCapturedPreview(null);
        setCapturedImageData(null);
        setProcessingMetadata({
          pastureName: "",
          location: "",
          notes: "",
          captureDate: new Date().toISOString().split('T')[0],
          estimatedBiomass: "",
          qualityRating: 3,
          tags: [],
          selectedPastureId: "",
        });
        setShowPastureList(false);
        setSearchQuery("");
      }
    };

    // Handle selecting a pasture from the list
    const handleSelectPasture = async (pasture: PastureData) => {
      setProcessingMetadata(prev => ({
        ...prev,
        pastureName: pasture.name,
        selectedPastureId: pasture.id,
        farmId: pasture.farm_id,
        location: pasture.location || prev.location,
      }));
      
      // Save to localStorage
      await WebStorageManager.setLastPasture(pasture.id);
      
      setShowPastureList(false);
      setSearchQuery("");
    };

    // Handle creating a new pasture
    const handleCreateNewPasture = () => {
      setShowPastureList(false);
      setSearchQuery("");
      // Clear selected pasture to allow new input
      setProcessingMetadata(prev => ({
        ...prev,
        selectedPastureId: "",
      }));
    };

    // Theme selector component
    const renderThemeSelector = () => {
      if (!onThemeChange) return null;

      return (
        <div className="theme-selector">
          <div className="theme-selector-title">Theme:</div>
          <div className="theme-buttons">
            <button
              className={`theme-button ${theme === 'light' ? 'theme-button-active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <div className="theme-button-icon">🌞</div>
              <div className="theme-button-text">Light</div>
            </button>
            <button
              className={`theme-button ${theme === 'dark' ? 'theme-button-active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <div className="theme-button-icon">🌙</div>
              <div className="theme-button-text">Dark</div>
            </button>
            <button
              className={`theme-button ${theme === 'auto' ? 'theme-button-active' : ''}`}
              onClick={() => handleThemeChange('auto')}
            >
              <div className="theme-button-icon">⚙️</div>
              <div className="theme-button-text">Auto</div>
            </button>
          </div>
        </div>
      );
    };

    // User info component
    const renderUserInfo = () => {
      if (!isLoggedIn || !userData) return null;

      return (
        <div className="user-info-container">
          <div className="user-info">
            <div className="user-name">👤 {userData.name}</div>
            <div className="user-email">{userData.email}</div>
          </div>
          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      );
    };

    // Login prompt component
    const renderLoginPrompt = () => {
      if (isLoggedIn) return null;

      return (
        <div className="login-prompt">
          <div className="login-prompt-title">🔒 Login Required</div>
          <div className="login-prompt-text">
            Please login to access camera features and save pasture images.
          </div>
          <button
            className="login-button"
            onClick={navigateToLogin}
          >
            Login / Sign Up
          </button>
        </div>
      );
    };

    // Render pasture list
    const renderPastureList = () => {
      return (
        <div className="pasture-list-container">
          <div className="search-container">
            <input
              className="search-input"
              type="text"
              placeholder="Search pastures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className="close-list-button"
              onClick={() => setShowPastureList(false)}
            >
              ✕
            </button>
          </div>
          
          {loadingPastures ? (
            <div className="loading-pastures">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading pastures...</div>
            </div>
          ) : filteredPastures.length > 0 ? (
            <div className="pasture-list">
              {filteredPastures.map((item) => (
                <button
                  key={item.id}
                  className="pasture-item"
                  onClick={() => handleSelectPasture(item)}
                >
                  <div className="pasture-item-content">
                    <div className="pasture-name">{item.name}</div>
                    <div className="pasture-details">
                      {item.farm_name ? `Farm: ${item.farm_name}` : ''}
                      {item.location ? ` • Location: ${item.location}` : ''}
                      {item.area_hectares ? ` • Area: ${item.area_hectares} ha` : ''}
                    </div>
                    {item.current_biomass !== undefined && (
                      <div className="biomass-info">
                        Current biomass: {item.current_biomass} kg/ha
                      </div>
                    )}
                  </div>
                  <div className="select-button">✓</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="no-pastures-container">
              <div className="no-pastures-icon">🌱</div>
              <div className="no-pastures-title">No Pastures Found</div>
              <div className="no-pastures-text">
                You haven't created any pastures yet.
              </div>
            </div>
          )}
          
          <button
            className="create-new-button"
            onClick={handleCreateNewPasture}
          >
            + Create New Pasture
          </button>
        </div>
      );
    };

    // Device selector
    const renderDeviceSelector = (): JSX.Element | null => {
      if (availableDevices.length <= 1) return null;
      
      return (
        <div className="device-selector">
          <div className="device-selector-title">Select Camera:</div>
          {availableDevices.map((device) => (
            <button
              key={device.deviceId}
              className={`device-button ${selectedDeviceId === device.deviceId ? 'device-button-active' : ''}`}
              onClick={() => selectCameraDevice(device.deviceId)}
            >
              {device.label || `Camera ${device.deviceId.substring(0, 8)}`}
            </button>
          ))}
        </div>
      );
    };

    // Camera position selector
    const renderCameraPositionSelector = (): JSX.Element | null => {
      const positions = deviceInfo.supportsFrontCamera && deviceInfo.supportsBackCamera 
        ? ["back", "front"] 
        : deviceInfo.supportsBackCamera 
        ? ["back"] 
        : deviceInfo.supportsFrontCamera 
        ? ["front"] 
        : [];
      
      if (positions.length <= 1) return null;
      
      return (
        <div className="position-selector">
          <div className="position-selector-title">Camera:</div>
          <div className="position-buttons">
            <button
              className={`position-button ${cameraPosition === "back" ? 'position-button-active' : ''}`}
              onClick={() => handleCameraPositionChange("back")}
            >
              📷 Rear Camera
            </button>
            <button
              className={`position-button ${cameraPosition === "front" ? 'position-button-active' : ''}`}
              onClick={() => handleCameraPositionChange("front")}
            >
              🤳 Front Camera
            </button>
          </div>
        </div>
      );
    };

    // Save Modal
    const renderSaveModal = (): JSX.Element => {
      return (
        <div className={`modal-overlay ${showSaveModal ? 'modal-overlay-show' : ''}`}>
          <div className="save-modal">
            <div className="save-modal-title">📸 Save Pasture Image</div>
            
            {!isLoggedIn ? (
              <div className="login-required">
                <div className="login-required-icon">🔒</div>
                <div className="login-required-title">Login Required</div>
                <div className="login-required-text">
                  Please login to save pasture images to your account.
                </div>
                <button
                  className="login-required-button"
                  onClick={() => {
                    setShowSaveModal(false);
                    navigateToLogin();
                  }}
                >
                  Login / Sign Up
                </button>
              </div>
            ) : (
              <>
                <div className="save-modal-content">
                  {/* Image Preview */}
                  {capturedImageData && (
                    <div className="save-image-preview">
                      <img
                        src={capturedImageData.uri}
                        className="save-image"
                        alt="Captured pasture"
                      />
                      <div className="save-image-info">
                        Resolution: {capturedImageData.metadata.resolution}
                      </div>
                      <div className="save-image-info">
                        Captured: {new Date(capturedImageData.metadata.timestamp).toLocaleString()}
                      </div>
                    </div>
                  )}
                  
                  {/* Metadata Form */}
                  <div className="metadata-form">
                    <div className="form-section-title">Pasture Information</div>
                    
                    {/* Farm Selection */}
                    <div className="form-group">
                      <label className="form-label">Select Farm *</label>
                      <div className="select-container">
                        <CustomDropdown
                          items={pickerItems}
                          value={selectedFarm}
                          onValueChange={handleFarmChange}
                          placeholder="Select a farm..."
                        />
                      </div>
                      {loadingFarms && (
                        <div className="loading-text">Loading farms...</div>
                      )}
                    </div>

                    {/* Pasture Selection */}
                    <div className="form-group">
                      <label className="form-label">Select Pasture *</label>
                      <div className="pasture-selection-container">
                        <button
                          className="pasture-select-button"
                          onClick={() => setShowPastureList(true)}
                        >
                          <span className="pasture-select-button-text">
                            {processingMetadata.pastureName || "Tap to select a pasture"}
                          </span>
                          <span className="pasture-select-button-icon">▼</span>
                        </button>
                        {processingMetadata.selectedPastureId && (
                          <button
                            className="clear-selection-button"
                            onClick={() => {
                              setProcessingMetadata(prev => ({
                                ...prev,
                                pastureName: "",
                                selectedPastureId: "",
                              }));
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="pasture-help-text">
                        Select an existing pasture or enter a new name
                      </div>
                    </div>

                    {/* Or manually enter pasture name if no selection */}
                    {!processingMetadata.selectedPastureId && (
                      <div className="form-group">
                        <label className="form-label">Or Enter Pasture Name</label>
                        <input
                          className="form-input"
                          type="text"
                          value={processingMetadata.pastureName}
                          onChange={(e) => setProcessingMetadata(prev => ({...prev, pastureName: e.target.value}))}
                          placeholder="Enter new pasture name"
                        />
                      </div>
                    )}

                    {/* Tags Input */}
                    <div className="form-group">
                      <label className="form-label">Tags (comma-separated)</label>
                      <input
                        className="form-input"
                        type="text"
                        value={processingMetadata.tags?.join(', ')}
                        onChange={(e) => {
                          const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                          setProcessingMetadata(prev => ({...prev, tags}));
                        }}
                        placeholder="e.g., north_field, dry_weather, high_biomass"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Location</label>
                      <input
                        className="form-input"
                        type="text"
                        value={processingMetadata.location}
                        onChange={(e) => setProcessingMetadata(prev => ({...prev, location: e.target.value}))}
                        placeholder="GPS coordinates or area name"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Capture Date</label>
                      <input
                        className="form-input"
                        type="date"
                        value={processingMetadata.captureDate}
                        onChange={(e) => setProcessingMetadata(prev => ({...prev, captureDate: e.target.value}))}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Estimated Biomass (kg/ha)</label>
                      <input
                        className="form-input"
                        type="number"
                        value={processingMetadata.estimatedBiomass}
                        onChange={(e) => setProcessingMetadata(prev => ({...prev, estimatedBiomass: e.target.value}))}
                        placeholder="Optional"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Quality Rating (1-5)</label>
                      <div className="rating-container">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            className={`rating-button ${processingMetadata.qualityRating === rating ? 'rating-button-active' : ''}`}
                            onClick={() => setProcessingMetadata(prev => ({...prev, qualityRating: rating}))}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-input textarea"
                        value={processingMetadata.notes}
                        onChange={(e) => setProcessingMetadata(prev => ({...prev, notes: e.target.value}))}
                        placeholder="Additional observations or comments..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="form-section-title">Image Details</div>
                    <div className="image-details">
                      <div className="detail-row">
                        <span className="detail-label">Source:</span>
                        <span className="detail-value">{capturedImageData?.metadata.source}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Camera:</span>
                        <span className="detail-value">
                          {capturedImageData?.metadata.captureType} ({capturedImageData?.metadata.cameraPosition})
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Device:</span>
                        <span className="detail-value">{capturedImageData?.metadata.deviceType}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Platform:</span>
                        <span className="detail-value">{capturedImageData?.metadata.platform}</span>
                      </div>
                      {capturedImageData?.validation && (
                        <div className="detail-row">
                          <span className="detail-label">Validation Score:</span>
                          <span className={`detail-value ${capturedImageData.validation.score && capturedImageData.validation.score >= 80 
                            ? 'score-high' 
                            : capturedImageData.validation.score && capturedImageData.validation.score >= 60 
                            ? 'score-medium' 
                            : 'score-low'}`}>
                            {capturedImageData.validation.score || 'N/A'}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="save-modal-actions">
                  <button
                    className="save-modal-button discard-button"
                    onClick={handleDiscardImage}
                    disabled={isSaving}
                  >
                    Discard
                  </button>
                  
                  <button
                    className="save-modal-button save-button"
                    onClick={handleSaveToProcessingTable}
                    disabled={isSaving || !processingMetadata.pastureName.trim()}
                  >
                    {isSaving ? (
                      <div className="loading-spinner-small"></div>
                    ) : (
                      processingMetadata.pastureName.trim() ? "Save Pasture Image" : "Select or Enter Pasture Name"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Pasture List Modal */}
          {showPastureList && (
            <div className="modal-overlay modal-overlay-show">
              <div className="pasture-list-modal">
                {renderPastureList()}
              </div>
            </div>
          )}
        </div>
      );
    };

    // Camera Interface
    const renderWebCamera = (): JSX.Element => {
      return (
        <div className="camera-view-container">
          {/* Header with User Info and Theme Selector */}
          <div className="header">
            {renderUserInfo()}
            {renderThemeSelector()}
          </div>

          {/* Login Prompt if not logged in */}
          {renderLoginPrompt()}

          {showInstructions && (
            <div className="modal-overlay modal-overlay-show">
              <div className="modal">
                <div className="modal-title">
                  🌱 Camera Setup Instructions
                </div>
                
                <div className="device-info">
                  📱 Device: {deviceInfo.isMobile ? 'Mobile' : deviceInfo.isTablet ? 'Tablet' : 'Desktop'}
                  {deviceInfo.supportsMultipleCameras && ' | Multiple cameras detected'}
                  {deviceInfo.supportsDrone && ' | Drone compatible'}
                </div>

                <div className="mode-selector">
                  {deviceInfo.isMobile && (
                    <button
                      className={`mode-button ${cameraMode === "mobile" ? 'mode-button-active' : ''}`}
                      onClick={() => handleModeChange("mobile")}
                    >
                      <div className="mode-button-icon">📱</div>
                      <div className="mode-button-text">Mobile</div>
                    </button>
                  )}

                  {deviceInfo.isTablet && (
                    <button
                      className={`mode-button ${cameraMode === "tablet" ? 'mode-button-active' : ''}`}
                      onClick={() => handleModeChange("tablet")}
                    >
                      <div className="mode-button-icon">📱</div>
                      <div className="mode-button-text">Tablet</div>
                    </button>
                  )}

                  <button
                    className={`mode-button ${cameraMode === "webcam" ? 'mode-button-active' : ''}`}
                    onClick={() => handleModeChange("webcam")}
                  >
                    <div className="mode-button-icon">💻</div>
                    <div className="mode-button-text">Webcam</div>
                  </button>

                  {deviceInfo.supportsDrone && (
                    <button
                      className={`mode-button ${cameraMode === "drone" ? 'mode-button-active' : ''}`}
                      onClick={() => handleModeChange("drone")}
                    >
                      <div className="mode-button-icon">🚁</div>
                      <div className="mode-button-text">Drone</div>
                    </button>
                  )}

                  {availableDevices.length > 1 && (
                    <button
                      className={`mode-button ${cameraMode === "external" ? 'mode-button-active' : ''}`}
                      onClick={() => handleModeChange("external")}
                    >
                      <div className="mode-button-icon">🔗</div>
                      <div className="mode-button-text">External</div>
                    </button>
                  )}
                </div>

                {renderCameraPositionSelector()}
                {renderDeviceSelector()}

                <div className="instruction-item">
                  <div className="instruction-icon">1️⃣</div>
                  <div className="instruction-text">
                    Select your camera mode above
                  </div>
                </div>

                <div className="instruction-item">
                  <div className="instruction-icon">2️⃣</div>
                  <div className="instruction-text">
                    Allow camera permissions when prompted
                  </div>
                </div>

                <div className="instruction-item">
                  <div className="instruction-icon">3️⃣</div>
                  <div className="instruction-text">
                    Click "Capture Image" when ready
                  </div>
                </div>

                <button
                  className="modal-button"
                  onClick={() => setShowInstructions(false)}
                >
                  Start Camera
                </button>
              </div>
            </div>
          )}

          <div className="camera-container">
            <div className="camera-mode-title">
              {cameraMode === "drone" ? "🚁 Drone Camera" :
               cameraMode === "tablet" ? "📱 Tablet Camera" :
               cameraMode === "webcam" ? "💻 Web Camera" :
               cameraMode === "external" ? "🔗 External Camera" :
               "📱 Mobile Camera"}
            </div>
            
            <div className="device-info-small">
              {deviceInfo.isMobile ? 'Mobile Browser' : 
               deviceInfo.isTablet ? 'Tablet Browser' : 'Desktop Browser'} | 
              {cameraPosition === "front" ? "Front Camera" : "Rear Camera"}
            </div>

            {webStream ? (
              <div className="camera-placeholder">
                <div className="placeholder-text">
                  Camera feed active ({cameraMode} mode)
                </div>
                <div className="placeholder-subtext">
                  {cameraPosition === "front" ? "Front Camera" : "Rear Camera"} | Click capture button to take a photo
                </div>
              </div>
            ) : (
              <div className="camera-placeholder">
                <div className="placeholder-text">
                  {permissionStatus
                    ? `Camera ready for ${cameraMode} mode`
                    : "Camera access required"}
                </div>
                {permissionStatus && !webStream && (
                  <div className="placeholder-subtext">
                    Click "Allow Camera Access" to start
                  </div>
                )}
              </div>
            )}

            {renderCameraPositionSelector()}
            {renderDeviceSelector()}

            <div className="camera-controls">
              {!isLoggedIn ? (
                <button
                  className="login-button"
                  onClick={navigateToLogin}
                >
                  Login to Use Camera
                </button>
              ) : !webStream ? (
                <button
                  className="permission-button"
                  onClick={() => handlePermissionRequest()}
                >
                  {permissionStatus ? "Start Camera" : "Allow Camera Access"}
                </button>
              ) : (
                <button
                  className={`capture-button ${isCapturing ? 'capture-button-disabled' : ''}`}
                  onClick={handleCapture}
                  disabled={isCapturing}
                >
                  {isCapturing ? "Capturing..." : "📸 Capture Image"}
                </button>
              )}
            </div>

            {capturedPreview && (
              <div className="preview-container">
                <img
                  src={capturedPreview}
                  className="preview-image"
                  alt="Captured preview"
                />
                <div className="preview-text">✅ Image Captured</div>
              </div>
            )}
          </div>

          {/* Save Modal */}
          {renderSaveModal()}
        </div>
      );
    };

    // Web-only rendering
    return renderWebCamera();
  }
);

// Export with theme-aware styles
export default CameraView;

// Utility functions for theme and authentication
export const getCurrentTheme = (): ThemeMode => {
  if (typeof window !== 'undefined') {
    const theme = localStorage.getItem('pasture_app_theme') as ThemeMode;
    return theme || 'auto';
  }
  return 'auto';
};

export const setTheme = async (theme: ThemeMode): Promise<void> => {
  await WebStorageManager.setTheme(theme);
};

export const isUserLoggedIn = async (): Promise<boolean> => {
  const authManager = AuthManager.getInstance();
  return await authManager.isLoggedIn();
};

export const getUserData = async (): Promise<UserData | null> => {
  const authManager = AuthManager.getInstance();
  return await authManager.getUserInfo();
};

export const logoutUser = async (): Promise<void> => {
  const authManager = AuthManager.getInstance();
  await authManager.clearTokens();
};

export const storeUserData = async (userData: UserData): Promise<void> => {
  await WebStorageManager.setUserData(userData);
};

export const getCameraSettings = async (): Promise<{
  cameraMode?: CameraMode;
  cameraPosition?: CameraPosition;
  selectedDeviceId?: string;
}> => {
  return await WebStorageManager.getCameraSettings();
};