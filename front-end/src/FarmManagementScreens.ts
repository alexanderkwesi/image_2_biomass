// app/screens/FarmManagementScreen.jsx
import React, { useState, useEffect } from 'react';
import './FarmManagementScreen.css';

// Import your modal components (adjust paths as needed)
import FarmFormModal from './components/FarmFormModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import ViewFarmModal from "./components/ViewFarmModal";

type Farm = {
  id: string | number;
  name: string;
  area_hectares: number;
  primary_crop?: string;
  soil_type?: string;
  description?: string;
  location?: string;
  is_active: boolean;
  created_at?: string;
};

type Stats = {
  totalFarms: number;
  activeFarms: number;
  totalArea: number;
};

// Define User type matching ProfileScreen
type User = {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  username?: string;
  role?: string;
  avatar_url?: string;
  phone?: string;
  address?: string;
  join_date?: string;
  farm_count?: number;
  created_at?: string;
};

const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/api/v1'
  : '/api/v1';

const COLORS = {
  primary: '#4CAF50',
  secondary: '#2196F3',
  error: '#f44336',
  background: '#f5f5f5',
  surface: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textLight: '#FFFFFF',
  border: '#E0E0E0',
};

// Custom storage utility for web
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    try {
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Storage multiRemove error:', error);
    }
  }
};

// Icon component
const Icon = ({ name, size, color, style }: { name: string; size: number; color: string; style?: any }) => {
  const emojiIcons: Record<string, string> = {
    'arrow-back': '⬅️',
    'add': '➕',
    'person': '👤',
    'business': '🏭',
    'business-outline': '🏭',
    'leaf': '🍃',
    'nutrition': '🥦',
    'checkmark-circle': '✅',
    'resize': '📐',
    'location': '📍',
    'earth': '🌍',
    'eye': '👁️',
    'create': '✏️',
    'trash': '🗑️',
  };

  return (
    <span style={{ fontSize: `${size}px`, color, ...style }}>
      {emojiIcons[name] || '📋'}
    </span>
  );
};

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = await storage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
};

export default function FarmManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [stats, setStats] = useState<Stats>({ totalFarms: 0, activeFarms: 0, totalArea: 0 });
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [farmToDelete, setFarmToDelete] = useState<{id: string | number; name: string} | null>(null);
  const [viewFarm, setViewFarm] = useState<Farm | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await checkAuth();
      await loadUserData();
      await loadFarms();
    } catch (error) {
      alert('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingUser(false);
    }
  };

  const checkAuth = async () => {
    const token = await storage.getItem('access_token');
    if (!token) {
      window.location.href = '/login';
    }
  };

  const loadUserData = async () => {
    try {
      const userDataString = await storage.getItem('user_data');
      
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setCurrentUser(userData);
      } else {
        await fetchUserFromAPI();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      await fetchUserFromAPI();
    }
  };

  const fetchUserFromAPI = async () => {
    try {
      const userData = await apiRequest('/auth/me');
      if (userData && userData.user) {
        setCurrentUser(userData.user);
        await storage.setItem('user_data', JSON.stringify(userData.user));
      }
    } catch (error) {
      console.error('Failed to fetch user from API:', error);
      setCurrentUser({ 
        first_name: 'Farm',
        last_name: 'Manager',
        email: 'user@farm.com',
      });
    }
  };

  const loadFarms = async () => {
    try {
      const data = await apiRequest('/farms');
      const farmsData: Farm[] = data.farms || [];
      
      setFarms(farmsData);
      
      const activeFarms = farmsData.filter(f => f.is_active).length;
      const totalArea = farmsData.reduce((sum, farm) => sum + (farm.area_hectares || 0), 0);
      
      setStats({
        totalFarms: farmsData.length,
        activeFarms,
        totalArea,
      });
    } catch (error: any) {
      if (error.message.includes('401') || error.message.includes('403')) {
        alert('Session Expired - Please login again');
        await storage.multiRemove(['access_token', 'user_data']);
        setCurrentUser(null);
        window.location.href = '/login';
      } else {
        throw error;
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFarms();
    setRefreshing(false);
  };

  const handleAddFarm = () => {
    setEditingFarm(null);
    setShowFarmModal(true);
  };

  const handleEditFarm = (farm: Farm) => {
    setEditingFarm(farm);
    setShowFarmModal(true);
  };

  const handleDeleteFarm = (farm: Farm) => {
    setFarmToDelete({ id: farm.id, name: farm.name });
    setShowDeleteModal(true);
  };

  const handleSaveFarm = async (farmData: Partial<Farm>) => {
    try {
      if (editingFarm) {
        const updatedFarm = await apiRequest(`/farms/${editingFarm.id}`, {
          method: 'PUT',
          body: JSON.stringify(farmData),
        });
        
        setFarms(farms.map(f => f.id === editingFarm.id ? updatedFarm.farm : f));
        alert('Farm updated successfully');
      } else {
        const newFarm = await apiRequest('/farms', {
          method: 'POST',
          body: JSON.stringify(farmData),
        });
        
        setFarms([...farms, newFarm.farm]);
        alert('Farm added successfully');
      }
      
      setShowFarmModal(false);
      loadFarms();
    } catch (error) {
      alert('Failed to save farm');
    }
  };

  const handleConfirmDelete = async () => {
    if (!farmToDelete) return;

    try {
      await apiRequest(`/farms/${farmToDelete.id}`, {
        method: 'DELETE',
      });
      
      setFarms(farms.filter(f => f.id !== farmToDelete.id));
      alert('Farm deleted successfully');
      setShowDeleteModal(false);
      loadFarms();
    } catch (error) {
      alert('Failed to delete farm');
    }
  };

  const handleViewFarm = (farm: Farm) => {
    setViewFarm(farm);
    setShowViewModal(true);
  };

  const goBack = () => {
    window.history.back();
  };

  const getUserDisplayName = () => {
    if (!currentUser) return 'USER';
    
    if (currentUser.first_name && currentUser.last_name) {
      return `${currentUser.first_name} ${currentUser.last_name}`;
    }
    
    return currentUser.name || currentUser.username || currentUser.email || 'USER';
  };

  const getUserEmail = () => {
    if (!currentUser) return 'user@example.com';
    return currentUser.email || 'user@example.com';
  };

  const getCropIcon = (crop?: string) => {
    switch (crop) {
      case 'Fruits': return 'leaf';
      case 'Vegetables': return 'nutrition';
      default: return 'business';
    }
  };

  const FarmCard = ({ farm }: { farm: Farm }) => (
    <div className="farm-card">
      <div className="farm-card-header">
        <div className="farm-info">
          <Icon name={getCropIcon(farm.primary_crop)} size={36} color={COLORS.primary} />
          <div className="farm-text">
            <h3 className="farm-name">{farm.name}</h3>
            <p className="farm-details">
              {farm.area_hectares} ha • {farm.primary_crop || 'Mixed'}
            </p>
          </div>
        </div>
        <div className={`farm-status ${farm.is_active ? 'active' : 'inactive'}`}>
          <span className="status-text">{farm.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
        </div>
      </div>

      <div className="farm-card-content">
        {farm.description && (
          <p className="farm-description">
            {farm.description}
          </p>
        )}

        <div className="farm-meta">
          {farm.location && (
            <div className="meta-item">
              <Icon name="location" size={22} color={COLORS.textSecondary} />
              <span className="meta-text">{farm.location}</span>
            </div>
          )}
          <div className="meta-item">
            <Icon name="earth" size={22} color={COLORS.textSecondary} />
            <span className="meta-text">{farm.soil_type || 'Unknown soil'}</span>
          </div>
        </div>

        <div className="farm-actions">
          <button className="action-btn view-btn" onClick={() => handleViewFarm(farm)}>
            <Icon name="eye" size={26} color={COLORS.secondary} />
            <span className="action-text">VIEW</span>
          </button>

          <button className="action-btn edit-btn" onClick={() => handleEditFarm(farm)}>
            <Icon name="create" size={26} color={COLORS.textSecondary} />
            <span className="action-text">EDIT</span>
          </button>

          <button className="action-btn delete-btn" onClick={() => handleDeleteFarm(farm)}>
            <Icon name="trash" size={26} color={COLORS.error} />
            <span className="action-text">DELETE</span>
          </button>
        </div>
      </div>
    </div>
  );

  const StatCard = ({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) => (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: `${color}20` }}>
        <Icon name={icon} size={30} color={color} />
      </div>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );

  const UserProfileDisplay = () => (
    <div className="profile-card">
      <div className="avatar-container">
        <div className="avatar">
          <Icon name="person" size={60} color="#fff" />
        </div>
        <div className="user-info">
          <h2 className="user-name">
            {getUserDisplayName()}
          </h2>
          <p className="user-email">
            {getUserEmail()}
          </p>
        </div>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="empty-state">
      <Icon name="business-outline" size={84} color={COLORS.textSecondary} />
      <h3 className="empty-title">NO FARMS YET</h3>
      <p className="empty-text">Add your first farm to get started</p>
      <button className="add-btn-large" onClick={handleAddFarm}>
        <Icon name="add" size={28} color="#fff" />
        <span className="add-btn-text">ADD FIRST FARM</span>
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">LOADING FARMS...</p>
      </div>
    );
  }

  return (
    <div className="farm-management-screen">
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <button 
              className="back-button"
              onClick={goBack}
            >
              <Icon name="arrow-back" size={34} color="#fff" />
            </button>
            <h1 className="header-title">FARM MANAGEMENT</h1>
            <button 
              className="add-button"
              onClick={handleAddFarm}
            >
              <Icon name="add" size={34} color="#fff" />
            </button>
          </div>
        </div>

        {/* User Profile Display */}
        <UserProfileDisplay />

        {/* Stats Section */}
        <div className="stats-section">
          <div className="stats">
            <StatCard icon="business" value={stats.totalFarms} label="TOTAL FARMS" color="#2196F3" />
            <StatCard icon="checkmark-circle" value={stats.activeFarms} label="ACTIVE" color="#4CAF50" />
            <StatCard icon="resize" value={stats.totalArea} label="AREA (HA)" color="#FF9800" />
          </div>
        </div>

        {/* Welcome Text */}
        <h2 className="welcome-text">
          YOUR FARMS
        </h2>
        <p className="subtitle-text">
          Manage your farms and pastures
        </p>

        {/* Content */}
        <div className="farms-list">
          {farms.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="farms-grid">
              {farms.map((farm) => (
                <FarmCard key={farm.id.toString()} farm={farm} />
              ))}
            </div>
          )}
          {farms.length > 0 && (
            <div className="refresh-container">
              <button 
                className="refresh-button"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh List'}
              </button>
            </div>
          )}
        </div>

        {/* Modals */}
        <ViewFarmModal 
          visible={showViewModal}
          farm={viewFarm}
          onClose={() => setShowViewModal(false)}
          onSave={() => {}}
        />

        <FarmFormModal
          visible={showFarmModal}
          farm={editingFarm}
          onClose={() => setShowFarmModal(false)}
          onSave={handleSaveFarm}
        />

        <DeleteConfirmationModal
          visible={showDeleteModal}
          farmName={farmToDelete?.name || ''}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  );
}