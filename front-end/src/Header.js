// components/Header.jsx
import React from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  Badge,
  InputBase,
  alpha,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Mail as MailIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  marginRight: theme.spacing(2),
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(3),
    width: "auto",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  width: "100%",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    [theme.breakpoints.up("md")]: {
      width: "20ch",
      "&:focus": {
        width: "30ch",
      },
    },
  },
}));

const Header = ({ user, onToggleSidebar, sidebarCollapsed }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] =
    React.useState(null);
  const [darkMode, setDarkMode] = React.useState(false);

  // User menu handlers
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Notifications menu handlers
  const handleNotificationsOpen = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchorEl(null);
  };

  // Menu item handlers
  const handleProfileClick = () => {
    navigate("/profile");
    handleMenuClose();
  };

  const handleSettingsClick = () => {
    navigate("/settings");
    handleMenuClose();
  };

  const handleLogoutClick = () => {
    logout();
    navigate("/login");
    handleMenuClose();
  };

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
    // Here you would typically update your theme context
  };

  // Mock notifications data
  const notifications = [
    { id: 1, text: "New message from John", time: "5 min ago" },
    { id: 2, text: "System update completed", time: "1 hour ago" },
    { id: 3, text: "New user registered", time: "2 hours ago" },
  ];

  const unreadNotifications = 2;

  return (
    <AppBar
      position="fixed"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar>
        {/* Sidebar Toggle Button */}
        <IconButton
          color="inherit"
          edge="start"
          onClick={onToggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo/Brand */}
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ display: { xs: "none", sm: "block" }, cursor: "pointer" }}
          onClick={() => navigate("/dashboard")}
        >
          MyApp
        </Typography>

        {/* Search Bar */}
        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Search…"
            inputProps={{ "aria-label": "search" }}
          />
        </Search>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Action Icons */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {/* Dark Mode Toggle */}
          <Tooltip
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            <IconButton color="inherit" onClick={handleToggleDarkMode}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton color="inherit" onClick={handleNotificationsOpen}>
              <Badge badgeContent={unreadNotifications} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={notificationsAnchorEl}
            open={Boolean(notificationsAnchorEl)}
            onClose={handleNotificationsClose}
            PaperProps={{
              sx: { width: 320, maxHeight: 400 },
            }}
          >
            <MenuItem disabled>
              <Typography variant="subtitle2" fontWeight="bold">
                Notifications
              </Typography>
            </MenuItem>
            <Divider />
            {notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={handleNotificationsClose}
              >
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography variant="body2">{notification.text}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {notification.time}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
            <Divider />
            <MenuItem
              onClick={() => {
                navigate("/notifications");
                handleNotificationsClose();
              }}
            >
              <Typography
                variant="body2"
                color="primary"
                textAlign="center"
                width="100%"
              >
                View all notifications
              </Typography>
            </MenuItem>
          </Menu>

          {/* User Menu */}
          <Tooltip title="Account settings">
            <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 1 }}>
              <Avatar
                sx={{ width: 32, height: 32 }}
                src={user?.avatar}
                alt={user?.name || "User"}
              >
                {user?.name?.charAt(0) || "U"}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: { width: 200 },
            }}
          >
            <MenuItem disabled>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {user?.name || "User"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email || "user@example.com"}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleProfileClick}>
              <PersonIcon sx={{ mr: 2, fontSize: 20 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleSettingsClick}>
              <SettingsIcon sx={{ mr: 2, fontSize: 20 }} />
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogoutClick}>
              <LogoutIcon sx={{ mr: 2, fontSize: 20 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
