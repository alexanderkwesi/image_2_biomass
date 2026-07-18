// components/SettingsManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService';
import { SETTINGS_PRESETS, SETTINGS_CATEGORIES } from '../types/settings';
import './Settings.css';

const SettingsManager = () => {
  const [settings, setSettings] = useState(settingsService.getAllSettings());
  const [activeCategory, setActiveCategory] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Subscribe to settings changes
    const unsubscribe = settingsService.subscribe((newSettings, changeEvent) => {
      setSettings(newSettings);
      
      if (changeEvent) {
        console.log('Setting changed:', changeEvent);
      }
    });

    return unsubscribe;
  }, []);

  const handleSettingChange = useCallback(async (key, value) => {
    setIsSaving(true);
    setError('');
    
    try {
      await settingsService.setSetting(key, value);
      setSuccess(`Setting "${key}" updated successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handlePresetApply = async (presetId) => {
    if (!window.confirm(`Apply "${presetId}" preset? This will override some of your current settings.`)) {
      return;
    }

    setIsSaving(true);
    setError('');
    
    try {
      await settingsService.applyPreset(presetId);
      setSuccess(`"${presetId}" preset applied successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to default? This cannot be undone.')) {
      settingsService.resetToDefaults();
    }
  };

  const handleExport = () => {
    const data = settingsService.exportSettings('json');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        await settingsService.importSettings(e.target.result);
        setSuccess('Settings imported successfully');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message);
      }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const filteredCategories = SETTINGS_CATEGORIES.filter(category => {
    if (!searchTerm) return true;
    
    return (
      category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const renderSettingControl = (key, setting) => {
    const value = settings[key];
    
    switch (setting.type) {
      case 'toggle':
        return (
          <label className="toggle-control">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleSettingChange(key, e.target.checked)}
              disabled={isSaving || setting.disabled}
            />
            <span className="toggle-slider"></span>
          </label>
        );
        
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            disabled={isSaving || setting.disabled}
            className="select-control"
          >
            {setting.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
        
      case 'slider':
        return (
          <div className="slider-control">
            <input
              type="range"
              min={setting.min}
              max={setting.max}
              step={setting.step || 1}
              value={value}
              onChange={(e) => handleSettingChange(key, parseFloat(e.target.value))}
              disabled={isSaving || setting.disabled}
            />
            <span className="slider-value">{value}{setting.unit || ''}</span>
          </div>
        );
        
      case 'button':
        return (
          <button
            onClick={() => setting.action?.()}
            disabled={isSaving || setting.disabled}
            className="button-control"
          >
            {setting.buttonText || 'Action'}
          </button>
        );
        
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            disabled={isSaving || setting.disabled}
            placeholder={setting.placeholder}
            className="text-control"
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleSettingChange(key, parseFloat(e.target.value))}
            disabled={isSaving || setting.disabled}
            min={setting.min}
            max={setting.max}
            step={setting.step || 1}
            className="number-control"
          />
        );
        
      default:
        return <span className="value-display">{String(value)}</span>;
    }
  };

  const renderSettingsForCategory = (categoryId) => {
    // This would be populated from your settings configuration
    // For demonstration, using a static mapping
    const categorySettings = {
      general: [
        { id: 'language', title: 'Language', type: 'select', options: [
          { label: 'English', value: 'en' },
          { label: 'Spanish', value: 'es' },
          { label: 'French', value: 'fr' }
        ]},
        { id: 'timezone', title: 'Timezone', type: 'select' },
        { id: 'autoSave', title: 'Auto Save', type: 'toggle' },
      ],
      appearance: [
        { id: 'theme', title: 'Theme', type: 'select', options: [
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
          { label: 'Auto', value: 'auto' }
        ]},
        { id: 'fontSize', title: 'Font Size', type: 'select', options: [
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' }
        ]},
        { id: 'animations', title: 'Animations', type: 'toggle' },
      ],
      // ... other categories
    };

    const settings = categorySettings[categoryId] || [];
    
    return (
      <div className="settings-grid">
        {settings.map(setting => (
          <div key={setting.id} className="setting-item">
            <div className="setting-info">
              <h4 className="setting-title">{setting.title}</h4>
              {setting.description && (
                <p className="setting-description">{setting.description}</p>
              )}
            </div>
            <div className="setting-control">
              {renderSettingControl(setting.id, setting)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="settings-manager">
      <div className="settings-header">
        <h2>Settings</h2>
        
        <div className="settings-actions">
          <button onClick={handleExport} disabled={isSaving}>
            Export
          </button>
          
          <label className="import-button">
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
          
          <button onClick={handleReset} disabled={isSaving} className="reset-button">
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          <span>{success}</span>
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      <div className="settings-search">
        <input
          type="text"
          placeholder="Search settings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="presets-section">
        <h3>Quick Presets</h3>
        <div className="presets-grid">
          {SETTINGS_PRESETS.map(preset => (
            <div key={preset.id} className="preset-card">
              <div className="preset-icon">{preset.icon}</div>
              <div className="preset-info">
                <h4>{preset.name}</h4>
                <p>{preset.description}</p>
              </div>
              <button
                onClick={() => handlePresetApply(preset.id)}
                disabled={isSaving}
                className="preset-button"
              >
                Apply
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-layout">
        <div className="categories-sidebar">
          {filteredCategories.map(category => (
            <button
              key={category.id}
              className={`category-button ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <div className="category-info">
                <span className="category-title">{category.title}</span>
                <span className="category-description">{category.description}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="settings-content">
          <div className="category-header">
            <h3>
              {SETTINGS_CATEGORIES.find(c => c.id === activeCategory)?.title}
            </h3>
            <p className="category-description">
              {SETTINGS_CATEGORIES.find(c => c.id === activeCategory)?.description}
            </p>
          </div>
          
          {renderSettingsForCategory(activeCategory)}
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;