import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./NotificationsScreen.css";

// Notification types
const NOTIFICATION_TYPES = {
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  INFO: "info",
  SYSTEM: "system",
  REMINDER: "reminder",
};

// Notification categories
const NOTIFICATION_CATEGORIES = {
  FARM: "farm",
  SYSTEM: "system",
  SECURITY: "security",
  UPDATE: "update",
  REMINDER: "reminder",
};

// Notification priority levels
const PRIORITY_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

// Storage utility (similar to SettingsScreen)
const Storage = {
  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  },

  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  },
};

// Storage keys
const StorageKeys = {
  NOTIFICATIONS: "app_notifications",
  NOTIFICATION_SETTINGS: "notification_settings",
  UNREAD_COUNT: "notification_unread_count",
};

// Notification settings structure
const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: true,
  sounds: true,
  vibration: false,
  desktopNotifications: false,
  emailNotifications: false,
  pushNotifications: false,
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "07:00",
  },
  categories: {
    [NOTIFICATION_CATEGORIES.FARM]: true,
    [NOTIFICATION_CATEGORIES.SYSTEM]: true,
    [NOTIFICATION_CATEGORIES.SECURITY]: true,
    [NOTIFICATION_CATEGORIES.UPDATE]: false,
    [NOTIFICATION_CATEGORIES.REMINDER]: true,
  },
  priorities: {
    [PRIORITY_LEVELS.LOW]: false,
    [PRIORITY_LEVELS.MEDIUM]: true,
    [PRIORITY_LEVELS.HIGH]: true,
    [PRIORITY_LEVELS.CRITICAL]: true,
  },
};

// Sample notifications (for demonstration)
const SAMPLE_NOTIFICATIONS = [
  {
    id: "1",
    title: "Farm Irrigation Needed",
    message:
      "Farm 'Green Valley' requires irrigation. Soil moisture is below 30%.",
    type: NOTIFICATION_TYPES.WARNING,
    category: NOTIFICATION_CATEGORIES.FARM,
    priority: PRIORITY_LEVELS.HIGH,
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    read: false,
    actionable: true,
    actionUrl: "/farms/1",
  },
  {
    id: "2",
    title: "Harvest Reminder",
    message: "Corn harvest is scheduled for tomorrow at Farm 'Sunset Ridge'.",
    type: NOTIFICATION_TYPES.REMINDER,
    category: NOTIFICATION_CATEGORIES.REMINDER,
    priority: PRIORITY_LEVELS.MEDIUM,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    read: true,
    actionable: true,
    actionUrl: "/farms/2",
  },
  {
    id: "3",
    title: "System Update Available",
    message: "New version 2.1.0 is available with improved analytics.",
    type: NOTIFICATION_TYPES.INFO,
    category: NOTIFICATION_CATEGORIES.UPDATE,
    priority: PRIORITY_LEVELS.MEDIUM,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    read: false,
    actionable: true,
    actionUrl: "/settings",
  },
  {
    id: "4",
    title: "Weather Alert",
    message: "Heavy rainfall predicted for your region tomorrow.",
    type: NOTIFICATION_TYPES.WARNING,
    category: NOTIFICATION_CATEGORIES.FARM,
    priority: PRIORITY_LEVELS.HIGH,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    read: true,
    actionable: false,
  },
  {
    id: "5",
    title: "Security Alert",
    message: "New login detected from unknown device.",
    type: NOTIFICATION_TYPES.ERROR,
    category: NOTIFICATION_CATEGORIES.SECURITY,
    priority: PRIORITY_LEVELS.CRITICAL,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    read: false,
    actionable: true,
    actionUrl: "/security",
  },
  {
    id: "6",
    title: "Data Backup Complete",
    message: "Your farm data has been successfully backed up.",
    type: NOTIFICATION_TYPES.SUCCESS,
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    priority: PRIORITY_LEVELS.LOW,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    read: true,
    actionable: false,
  },
];

// Custom Toggle Switch Component
const ToggleSwitch = ({ value, onChange, id, label, description }) => {
  const handleToggle = () => {
    onChange(!value);
  };

  return (
    <div className="toggle-item">
      <div className="toggle-content">
        <div className="toggle-text">
          <span className="toggle-label">{label}</span>
          {description && (
            <span className="toggle-description">{description}</span>
          )}
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            id={id}
            checked={value}
            onChange={handleToggle}
            className="toggle-input"
          />
          <span className="toggle-slider" />
        </label>
      </div>
    </div>
  );
};

// Time formatter
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    const diffHoursFloor = Math.floor(diffHours);
    return `${diffHoursFloor}h ago`;
  } else if (diffHours < 168) {
    // 7 days
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Priority badge component
const PriorityBadge = ({ priority }) => {
  const priorityConfig = {
    [PRIORITY_LEVELS.LOW]: { label: "Low", className: "priority-low" },
    [PRIORITY_LEVELS.MEDIUM]: { label: "Medium", className: "priority-medium" },
    [PRIORITY_LEVELS.HIGH]: { label: "High", className: "priority-high" },
    [PRIORITY_LEVELS.CRITICAL]: {
      label: "Critical",
      className: "priority-critical",
    },
  };

  const config =
    priorityConfig[priority] || priorityConfig[PRIORITY_LEVELS.MEDIUM];

  return (
    <span className={`priority-badge ${config.className}`}>{config.label}</span>
  );
};

// Type icon component
const TypeIcon = ({ type }) => {
  const icons = {
    [NOTIFICATION_TYPES.SUCCESS]: "✅",
    [NOTIFICATION_TYPES.WARNING]: "⚠️",
    [NOTIFICATION_TYPES.ERROR]: "❌",
    [NOTIFICATION_TYPES.INFO]: "ℹ️",
    [NOTIFICATION_TYPES.SYSTEM]: "⚙️",
    [NOTIFICATION_TYPES.REMINDER]: "⏰",
  };

  return <span className="type-icon">{icons[type] || "📢"}</span>;
};

// Category badge component
const CategoryBadge = ({ category }) => {
  const categoryLabels = {
    [NOTIFICATION_CATEGORIES.FARM]: "Farm",
    [NOTIFICATION_CATEGORIES.SYSTEM]: "System",
    [NOTIFICATION_CATEGORIES.SECURITY]: "Security",
    [NOTIFICATION_CATEGORIES.UPDATE]: "Update",
    [NOTIFICATION_CATEGORIES.REMINDER]: "Reminder",
  };

  return (
    <span className="category-badge">
      {categoryLabels[category] || category}
    </span>
  );
};

const NotificationsScreen = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all", "unread", "read"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);

  useEffect(() => {
    loadNotifications();
    loadSettings();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [
    notifications,
    activeTab,
    searchQuery,
    selectedCategories,
    selectedPriorities,
  ]);

  const loadNotifications = () => {
    setIsLoading(true);
    try {
      const savedNotifications = Storage.getItem(StorageKeys.NOTIFICATIONS);
      if (savedNotifications && Array.isArray(savedNotifications)) {
        setNotifications(savedNotifications);
      } else {
        // Load sample data if no saved notifications
        setNotifications(SAMPLE_NOTIFICATIONS);
        Storage.setItem(StorageKeys.NOTIFICATIONS, SAMPLE_NOTIFICATIONS);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      setNotifications(SAMPLE_NOTIFICATIONS);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = () => {
    try {
      const savedSettings = Storage.getItem(StorageKeys.NOTIFICATION_SETTINGS);
      if (savedSettings) {
        setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...savedSettings });
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    }
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    // Filter by tab
    if (activeTab === "unread") {
      filtered = filtered.filter((notification) => !notification.read);
    } else if (activeTab === "read") {
      filtered = filtered.filter((notification) => notification.read);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (notification) =>
          notification.title.toLowerCase().includes(query) ||
          notification.message.toLowerCase().includes(query)
      );
    }

    // Filter by selected categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((notification) =>
        selectedCategories.includes(notification.category)
      );
    }

    // Filter by selected priorities
    if (selectedPriorities.length > 0) {
      filtered = filtered.filter((notification) =>
        selectedPriorities.includes(notification.priority)
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setFilteredNotifications(filtered);
  };

  const markAsRead = (id) => {
    const updatedNotifications = notifications.map((notification) => {
      if (notification.id === id) {
        return { ...notification, read: true };
      }
      return notification;
    });

    setNotifications(updatedNotifications);
    Storage.setItem(StorageKeys.NOTIFICATIONS, updatedNotifications);
    updateUnreadCount();
  };

  const markAllAsRead = () => {
    if (window.confirm("Mark all notifications as read?")) {
      const updatedNotifications = notifications.map((notification) => ({
        ...notification,
        read: true,
      }));

      setNotifications(updatedNotifications);
      Storage.setItem(StorageKeys.NOTIFICATIONS, updatedNotifications);
      updateUnreadCount();
    }
  };

  const deleteNotification = (id) => {
    if (window.confirm("Delete this notification?")) {
      const updatedNotifications = notifications.filter(
        (notification) => notification.id !== id
      );
      setNotifications(updatedNotifications);
      Storage.setItem(StorageKeys.NOTIFICATIONS, updatedNotifications);
      updateUnreadCount();
    }
  };

  const deleteAllRead = () => {
    if (window.confirm("Delete all read notifications?")) {
      const updatedNotifications = notifications.filter(
        (notification) => !notification.read
      );
      setNotifications(updatedNotifications);
      Storage.setItem(StorageKeys.NOTIFICATIONS, updatedNotifications);
    }
  };

  const updateUnreadCount = () => {
    const unreadCount = notifications.filter((n) => !n.read).length;
    Storage.setItem(StorageKeys.UNREAD_COUNT, unreadCount);
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);

    if (notification.actionable && notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleSettingsChange = (key, value) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    Storage.setItem(StorageKeys.NOTIFICATION_SETTINGS, updatedSettings);
  };

  const handleCategoryChange = (category, value) => {
    const updatedCategories = { ...settings.categories, [category]: value };
    const updatedSettings = { ...settings, categories: updatedCategories };
    setSettings(updatedSettings);
    Storage.setItem(StorageKeys.NOTIFICATION_SETTINGS, updatedSettings);
  };

  const handlePriorityChange = (priority, value) => {
    const updatedPriorities = { ...settings.priorities, [priority]: value };
    const updatedSettings = { ...settings, priorities: updatedPriorities };
    setSettings(updatedSettings);
    Storage.setItem(StorageKeys.NOTIFICATION_SETTINGS, updatedSettings);
  };

  const handleQuietHoursChange = (key, value) => {
    const updatedQuietHours = { ...settings.quietHours, [key]: value };
    const updatedSettings = { ...settings, quietHours: updatedQuietHours };
    setSettings(updatedSettings);
    Storage.setItem(StorageKeys.NOTIFICATION_SETTINGS, updatedSettings);
  };

  const toggleCategoryFilter = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const togglePriorityFilter = (priority) => {
    if (selectedPriorities.includes(priority)) {
      setSelectedPriorities(selectedPriorities.filter((p) => p !== priority));
    } else {
      setSelectedPriorities([...selectedPriorities, priority]);
    }
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedPriorities([]);
    setSearchQuery("");
  };

  const getUnreadCount = () => {
    return notifications.filter((n) => !n.read).length;
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p className="loading-text">Loading Notifications...</p>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      {/* Header */}
      <div className="notifications-header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate(-1)}>
            <span className="back-icon">←</span>
          </button>
          <h1 className="header-title">NOTIFICATIONS</h1>
          <div className="header-actions">
            <button className="header-action-button" onClick={markAllAsRead}>
              <span className="action-icon">✓</span>
              <span className="action-text">Mark All Read</span>
            </button>
          </div>
        </div>
      </div>

      <div className="notifications-content">
        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value">{notifications.length}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{getUnreadCount()}</span>
            <span className="stat-label">Unread</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {notifications.filter((n) => n.actionable).length}
            </span>
            <span className="stat-label">Actionable</span>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="filter-section">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>

          {/* Category Filter */}
          <div className="filter-group">
            <h3 className="filter-title">Categories</h3>
            <div className="filter-chips">
              {Object.values(NOTIFICATION_CATEGORIES).map((category) => (
                <button
                  key={category}
                  className={`filter-chip ${
                    selectedCategories.includes(category) ? "active" : ""
                  }`}
                  onClick={() => toggleCategoryFilter(category)}
                >
                  <CategoryBadge category={category} />
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="filter-group">
            <h3 className="filter-title">Priority</h3>
            <div className="filter-chips">
              {Object.values(PRIORITY_LEVELS).map((priority) => (
                <button
                  key={priority}
                  className={`filter-chip ${
                    selectedPriorities.includes(priority) ? "active" : ""
                  }`}
                  onClick={() => togglePriorityFilter(priority)}
                >
                  <PriorityBadge priority={priority} />
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {(selectedCategories.length > 0 ||
            selectedPriorities.length > 0 ||
            searchQuery) && (
            <button className="clear-filters-button" onClick={clearAllFilters}>
              Clear All Filters
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <button
            className={`tab-button ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          <button
            className={`tab-button ${activeTab === "unread" ? "active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread ({getUnreadCount()})
          </button>
          <button
            className={`tab-button ${activeTab === "read" ? "active" : ""}`}
            onClick={() => setActiveTab("read")}
          >
            Read
          </button>
        </div>

        {/* Notifications List */}
        <div className="notifications-list">
          {filteredNotifications.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <h3 className="empty-title">No notifications found</h3>
              <p className="empty-description">
                {searchQuery ||
                selectedCategories.length > 0 ||
                selectedPriorities.length > 0
                  ? "Try changing your filters or search query"
                  : "All caught up! No new notifications"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${
                  notification.read ? "read" : "unread"
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-content">
                  <div className="notification-header">
                    <TypeIcon type={notification.type} />
                    <div className="notification-title-section">
                      <h3 className="notification-title">
                        {notification.title}
                      </h3>
                      <div className="notification-meta">
                        <CategoryBadge category={notification.category} />
                        <PriorityBadge priority={notification.priority} />
                        <span className="notification-time">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                    {!notification.read && <div className="unread-indicator" />}
                  </div>

                  <p className="notification-message">{notification.message}</p>

                  {notification.actionable && (
                    <div className="notification-actions">
                      <button className="action-link">
                        {notification.actionUrl?.includes("/farms")
                          ? "View Farm"
                          : notification.actionUrl?.includes("/settings")
                          ? "View Settings"
                          : "View Details"}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  title="Delete notification"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        {/* Bulk Actions */}
        <div className="bulk-actions">
          <button className="bulk-button" onClick={markAllAsRead}>
            Mark All as Read
          </button>
          <button className="bulk-button delete-button" onClick={deleteAllRead}>
            Delete All Read
          </button>
        </div>

        {/* Notification Settings */}
        <div className="settings-section">
          <h2 className="section-title">Notification Settings</h2>

          <ToggleSwitch
            value={settings.enabled}
            onChange={(value) => handleSettingsChange("enabled", value)}
            id="notifications-enabled"
            label="Enable Notifications"
            description="Receive notifications from the app"
          />

          <ToggleSwitch
            value={settings.sounds}
            onChange={(value) => handleSettingsChange("sounds", value)}
            id="notification-sounds"
            label="Notification Sounds"
            description="Play sound for new notifications"
          />

          {/* Category Settings */}
          <div className="category-settings">
            <h3 className="settings-subtitle">Notification Categories</h3>
            {Object.entries(settings.categories).map(([category, enabled]) => (
              <ToggleSwitch
                key={category}
                value={enabled}
                onChange={(value) => handleCategoryChange(category, value)}
                id={`category-${category}`}
                label={
                  <div className="category-label">
                    <CategoryBadge category={category} />
                  </div>
                }
              />
            ))}
          </div>

          {/* Priority Settings */}
          <div className="priority-settings">
            <h3 className="settings-subtitle">Priority Levels</h3>
            {Object.entries(settings.priorities).map(([priority, enabled]) => (
              <ToggleSwitch
                key={priority}
                value={enabled}
                onChange={(value) => handlePriorityChange(priority, value)}
                id={`priority-${priority}`}
                label={
                  <div className="priority-label">
                    <PriorityBadge priority={priority} />
                  </div>
                }
              />
            ))}
          </div>

          {/* Quiet Hours */}
          <div className="quiet-hours-settings">
            <h3 className="settings-subtitle">Quiet Hours</h3>
            <ToggleSwitch
              value={settings.quietHours.enabled}
              onChange={(value) => handleQuietHoursChange("enabled", value)}
              id="quiet-hours-enabled"
              label="Enable Quiet Hours"
              description="Silence notifications during specified hours"
            />

            {settings.quietHours.enabled && (
              <div className="time-inputs">
                <div className="time-input-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) =>
                      handleQuietHoursChange("start", e.target.value)
                    }
                    className="time-input"
                  />
                </div>
                <div className="time-input-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) =>
                      handleQuietHoursChange("end", e.target.value)
                    }
                    className="time-input"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsScreen;
