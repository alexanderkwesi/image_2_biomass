// components/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  CircularProgress,
  Alert,
  Switch,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  CameraAlt as CameraIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  WbSunny as SunIcon,
  DarkMode as MoonIcon,
  BrightnessAuto as AutoIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  Storage as StorageIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useAuth } from '.././contexts/AuthContext';
import { format } from 'date-fns';

// Define types
interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at?: string;
  farm_name?: string;
  phone?: string;
  location?: string;
  avatar?: string;
  role?: string;
}

interface Stats {
  farms: number;
  scans: number;
  predictions: number;
  accuracy: number;
}

interface MenuItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  route: string;
  color: string;
}

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<Stats>({
    farms: 0,
    scans: 0,
    predictions: 0,
    accuracy: 85.5,
  });
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('auto');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Use auth context user if available
        if (user) {
          setUserData(user);
        } else {
          // Fallback to localStorage
          const storedUser = localStorage.getItem('user_data');
          if (storedUser) {
            setUserData(JSON.parse(storedUser));
          }
        }

        // Load stats (mock data - replace with API calls)
        setTimeout(() => {
          setStats({
            farms: 12,
            scans: 156,
            predictions: 342,
            accuracy: 87.3,
          });
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme_mode') as 'light' | 'dark' | 'auto' || 'auto';
    setThemeMode(savedTheme);
  }, []);

  const handleLogout = async () => {
    const confirmLogout = window.confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };

  const handleEditProfile = () => {
    navigate('/profile/edit');
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setThemeMode(newTheme);
    localStorage.setItem('theme_mode', newTheme);
    // Dispatch theme change event for app to handle
    const themeChangeEvent = new CustomEvent('theme-change', { 
      detail: { theme: newTheme } 
    });
    window.dispatchEvent(themeChangeEvent);
  };

  const handleNotificationsToggle = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem('notifications_enabled', newValue.toString());
  };

  const handleSyncData = async () => {
    try {
      setSyncStatus('syncing');
      // Simulate API sync
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('synced'), 3000);
    }
  };

  const menuItems: MenuItem[] = [
    {
      icon: <BusinessIcon />,
      title: 'My Farms',
      description: 'Manage your farms and pastures',
      route: '/farms',
      color: '#FF9800',
    },
    {
      icon: <CameraIcon />,
      title: 'Scan Plants',
      description: 'Identify plants with AI',
      route: '/scan',
      color: '#4CAF50',
    },
    {
      icon: <HistoryIcon />,
      title: 'History',
      description: 'View your scan history',
      route: '/history',
      color: '#2196F3',
    },
    {
      icon: <SettingsIcon />,
      title: 'Settings',
      description: 'App preferences and settings',
      route: '/settings',
      color: '#9C27B0',
    },
    {
      icon: <HelpIcon />,
      title: 'Help & Support',
      description: 'Get help and contact support',
      route: '/help',
      color: '#795548',
    },
    {
      icon: <SecurityIcon />,
      title: 'Security',
      description: 'Account security and privacy',
      route: '/security',
      color: '#F44336',
    },
  ];

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading Profile...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            Profile
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEditProfile}
          >
            Edit Profile
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - User Info */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  fontSize: '2.5rem',
                  bgcolor: 'primary.main',
                  mb: 2,
                }}
                src={userData?.avatar}
              >
                {getInitials(userData?.first_name, userData?.last_name)}
              </Avatar>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {userData ? `${userData.first_name} ${userData.last_name}` : 'Guest User'}
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                {userData?.email || 'user@example.com'}
              </Typography>
              {userData?.role && (
                <Chip
                  label={userData.role}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{ mt: 1 }}
                />
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* User Details */}
            <List dense>
              {userData?.phone && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'action.hover' }}>
                      <PhoneIcon fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Phone"
                    secondary={userData.phone}
                  />
                </ListItem>
              )}
              {userData?.location && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'action.hover' }}>
                      <LocationIcon fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Location"
                    secondary={userData.location}
                  />
                </ListItem>
              )}
              {userData?.farm_name && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'action.hover' }}>
                      <BusinessIcon fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Farm Name"
                    secondary={userData.farm_name}
                  />
                </ListItem>
              )}
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'action.hover' }}>
                    <CalendarIcon fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Member Since"
                  secondary={formatDate(userData?.created_at)}
                />
              </ListItem>
            </List>

            {/* Stats Summary */}
            <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Quick Stats
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="h6" align="center">
                    {stats.farms}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" align="center" display="block">
                    Farms
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6" align="center">
                    {stats.scans}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" align="center" display="block">
                    Scans
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6" align="center">
                    {stats.predictions}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" align="center" display="block">
                    Predictions
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6" align="center">
                    {stats.accuracy}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" align="center" display="block">
                    Accuracy
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Paper>
        </Grid>

        {/* Right Column - Actions & Settings */}
        <Grid item xs={12} md={8}>
          {/* Quick Actions */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              {menuItems.map((item, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        transition: 'transform 0.2s',
                        boxShadow: 3,
                      },
                    }}
                    onClick={() => navigate(item.route)}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Box
                        sx={{
                          color: item.color,
                          mb: 2,
                          display: 'flex',
                          justifyContent: 'center',
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Settings
            </Typography>
            <List>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'action.hover' }}>
                    <AutoIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Theme"
                  secondary="Choose your preferred theme"
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label="Light"
                      onClick={() => handleThemeChange('light')}
                      variant={themeMode === 'light' ? 'filled' : 'outlined'}
                      color="primary"
                      icon={<SunIcon />}
                    />
                    <Chip
                      label="Dark"
                      onClick={() => handleThemeChange('dark')}
                      variant={themeMode === 'dark' ? 'filled' : 'outlined'}
                      color="primary"
                      icon={<MoonIcon />}
                    />
                    <Chip
                      label="Auto"
                      onClick={() => handleThemeChange('auto')}
                      variant={themeMode === 'auto' ? 'filled' : 'outlined'}
                      color="primary"
                      icon={<AutoIcon />}
                    />
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'action.hover' }}>
                    <NotificationsIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Notifications"
                  secondary="Receive app notifications"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notificationsEnabled}
                    onChange={handleNotificationsToggle}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'action.hover' }}>
                    <LanguageIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Language"
                  secondary="English (US)"
                />
                <ListItemSecondaryAction>
                  <Button size="small">Change</Button>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'action.hover' }}>
                    <StorageIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Data Management"
                  secondary={`Last synced: ${format(new Date(), 'MMM dd, hh:mm a')}`}
                />
                <ListItemSecondaryAction>
                  <Button
                    size="small"
                    onClick={handleSyncData}
                    disabled={syncStatus === 'syncing'}
                  >
                    {syncStatus === 'syncing' ? (
                      <>
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                        Syncing...
                      </>
                    ) : (
                      'Sync Now'
                    )}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Paper>

          {/* Danger Zone */}
          <Paper sx={{ 
            p: 3, 
            border: '2px solid', 
            borderColor: 'error.light', 
            backgroundColor: 'error.light' + '10' 
          }}>
            <Typography variant="h6" color="error" gutterBottom>
              Danger Zone
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              These actions are irreversible. Please proceed with caution.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
              >
                Logout
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => navigate('/delete-account')}
              >
                Delete Account
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => navigate('/export-data')}
              >
                Export Data
              </Button>
            </Box>
          </Paper>

          {/* Storage Info */}
          <Alert
            severity="info"
            icon={<StorageIcon />}
            sx={{ mt: 3 }}
          >
            <Typography variant="body2">
              <strong>Storage Information:</strong> Your data is securely stored in your browser's local storage.
              Theme preferences and user settings persist across sessions.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProfileScreen;