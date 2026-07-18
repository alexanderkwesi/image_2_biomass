// services/settingsService.js
import { 
  AppSettings, 
  DEFAULT_SETTINGS, 
  SETTINGS_PRESETS,
  SettingsValidationRule 
} from '../types/settings';
import { storageManager } from '../utils/storageManager';

export class SettingsService {
  constructor() {
    this.settings = DEFAULT_SETTINGS;
    this.listeners = new Set();
    this.validationRules = this.getValidationRules();
    this.loadSettings();
  }

  getValidationRules() {
    return [
      {
        key: 'autoLogoutMinutes',
        validator: (value) => value >= 1 && value <= 480,
        message: 'Auto logout must be between 1 and 480 minutes'
      },
      {
        key: 'syncInterval',
        validator: (value) => value >= 1 && value <= 1440,
        message: 'Sync interval must be between 1 and 1440 minutes'
      },
      {
        key: 'cacheSize',
        validator: (value) => value >= 10 && value <= 1000,
        message: 'Cache size must be between 10 and 1000 MB'
      },
      {
        key: 'zoomLevel',
        validator: (value) => value >= 50 && value <= 200,
        message: 'Zoom level must be between 50% and 200%'
      }
    ];
  }

  async loadSettings() {
    try {
      // Try to load from IndexedDB first
      const savedSettings = await storageManager.getIndexed('settings', 'app_settings');
      
      if (savedSettings) {
        this.settings = this.mergeSettings(DEFAULT_SETTINGS, savedSettings);
      } else {
        // Fallback to localStorage
        const localSettings = storageManager.getLocal('app_settings');
        if (localSettings) {
          this.settings = this.mergeSettings(DEFAULT_SETTINGS, localSettings);
        }
      }
      
      // Apply theme if set
      if (this.settings.theme) {
        document.documentElement.setAttribute('data-theme', 
          this.settings.theme === 'auto' ? 
          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
          this.settings.theme
        );
      }
      
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return false;
    }
  }

  async saveSettings() {
    try {
      // Save to IndexedDB
      await storageManager.setIndexed('settings', 'app_settings', this.settings);
      
      // Also save to localStorage as backup
      storageManager.setLocal('app_settings', this.settings);
      
      // Apply theme changes immediately
      if (this.settings.theme) {
        const themeManager = (await import('../utils/themeManager')).themeManager;
        themeManager.applyTheme(this.settings.theme);
      }
      
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  mergeSettings(defaults, overrides) {
    const merged = { ...defaults };
    
    Object.keys(overrides).forEach(key => {
      if (key in merged && overrides[key] !== undefined) {
        merged[key] = overrides[key];
      }
    });
    
    return merged;
  }

  getSetting(key) {
    return this.settings[key];
  }

  async setSetting(key, value) {
    // Validate if there's a rule
    const rule = this.validationRules.find(r => r.key === key);
    if (rule && !rule.validator(value)) {
      throw new Error(rule.message);
    }

    const oldValue = this.settings[key];
    this.settings[key] = value;
    
    // Special handling for certain settings
    await this.handleSpecialSetting(key, value, oldValue);
    
    // Auto-save changes
    await this.saveSettings();
    
    // Create change event
    const changeEvent = {
      key,
      oldValue,
      newValue: value,
      source: 'user',
      timestamp: new Date()
    };
    
    this.notifyListeners(changeEvent);
  }

  async handleSpecialSetting(key, value, oldValue) {
    switch (key) {
      case 'theme':
        // Theme is handled in saveSettings
        break;
        
      case 'fontSize':
        this.applyFontSize(value);
        break;
        
      case 'highContrast':
        document.documentElement.classList.toggle('high-contrast', value);
        break;
        
      case 'reduceMotion':
        document.documentElement.classList.toggle('reduce-motion', value);
        break;
        
      case 'language':
        await this.changeLanguage(value);
        break;
    }
  }

  applyFontSize(size) {
    const sizes = {
      'small': '14px',
      'medium': '16px',
      'large': '18px',
      'x-large': '20px'
    };
    
    document.documentElement.style.fontSize = sizes[size] || sizes.medium;
  }

  async changeLanguage(lang) {
    // In a real app, you would load language files here
    console.log('Changing language to:', lang);
    
    // Update HTML lang attribute
    document.documentElement.lang = lang;
    
    // You could dispatch an event for components to react
    window.dispatchEvent(new CustomEvent('languagechange', { 
      detail: { language: lang } 
    }));
  }

  async applyPreset(presetId) {
    const preset = SETTINGS_PRESETS.find(p => p.id === presetId);
    if (!preset) {
      throw new Error(`Preset ${presetId} not found`);
    }

    this.settings = this.mergeSettings(this.settings, preset.settings);
    await this.saveSettings();
    
    // Notify with preset info
    this.notifyListeners({
      type: 'preset_applied',
      presetId,
      timestamp: new Date()
    });
  }

  resetToDefaults() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    
    // Reset theme
    const themeManager = (await import('../utils/themeManager')).themeManager;
    themeManager.applyTheme('auto');
  }

  exportSettings(format = 'json') {
    const data = {
      settings: this.settings,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.settingsToCSV(data);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  settingsToCSV(data) {
    const headers = ['Setting', 'Value'];
    const rows = Object.entries(data.settings).map(([key, value]) => [
      key,
      typeof value === 'object' ? JSON.stringify(value) : String(value)
    ]);
    
    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }

  async importSettings(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      
      // Basic validation
      if (!imported.settings || !imported.exportedAt) {
        throw new Error('Invalid settings file format');
      }

      this.settings = this.mergeSettings(this.settings, imported.settings);
      await this.saveSettings();
      
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(changeEvent = null) {
    this.listeners.forEach(listener => {
      try {
        listener(this.settings, changeEvent);
      } catch (error) {
        console.error('Settings listener error:', error);
      }
    });
  }

  getAllSettings() {
    return { ...this.settings };
  }

  getSettingsByCategory(category) {
    // Group settings by category logic
    const categories = {
      appearance: ['theme', 'fontSize', 'density', 'animations', 'highContrast'],
      notifications: ['pushNotifications', 'emailNotifications', 'predictionAlerts'],
      privacy: ['privacyMode', 'dataCollection', 'locationSharing'],
      // ... other categories
    };

    const categoryKeys = categories[category] || [];
    return categoryKeys.reduce((acc, key) => {
      if (key in this.settings) {
        acc[key] = this.settings[key];
      }
      return acc;
    }, {});
  }
}

// Singleton instance
export const settingsService = new SettingsService();