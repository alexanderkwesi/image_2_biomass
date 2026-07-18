// components/Sidebar.jsx
import React, { useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Box,
  Tooltip,
  Collapse,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  ShoppingCart as OrdersIcon,
  BarChart as AnalyticsIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Home as HomeIcon,
  Category as CategoryIcon,
  AccountCircle as UserIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { styled, useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";

const drawerWidth = 240;
const collapsedWidth = 64;

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

const Sidebar = ({ collapsed, onToggle }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [openSubmenus, setOpenSubmenus] = useState({});

  // Main menu items
  const menuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/dashboard",
    },
    {
      text: "Users",
      icon: <PeopleIcon />,
      path: "/users",
      subItems: [
        { text: "All Users", path: "/users" },
        { text: "Admins", path: "/users/admins" },
        { text: "Customers", path: "/users/customers" },
      ],
    },
    {
      text: "Products",
      icon: <InventoryIcon />,
      path: "/products",
      subItems: [
        { text: "All Products", path: "/products" },
        { text: "Categories", path: "/products/categories" },
        { text: "Inventory", path: "/products/inventory" },
      ],
    },
    {
      text: "Orders",
      icon: <OrdersIcon />,
      path: "/orders",
    },
    {
      text: "Analytics",
      icon: <AnalyticsIcon />,
      path: "/analytics",
    },
    {
      text: "Settings",
      icon: <SettingsIcon />,
      path: "/settings",
      subItems: [
        { text: "General", path: "/settings/general" },
        { text: "Security", path: "/settings/security" },
        { text: "Notifications", path: "/settings/notifications" },
      ],
    },
  ];

  const handleToggleSubmenu = (text) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [text]: !prev[text],
    }));
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? collapsedWidth : drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: collapsed ? collapsedWidth : drawerWidth,
          boxSizing: "border-box",
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: "hidden",
        },
      }}
    >
      {/* Collapse Button */}
      <DrawerHeader>
        {!collapsed && (
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ ml: 2 }}>
              <HomeIcon color="primary" />
            </Box>
            <IconButton onClick={onToggle}>
              <ChevronLeftIcon />
            </IconButton>
          </Box>
        )}
        {collapsed && (
          <IconButton onClick={onToggle} sx={{ width: "100%" }}>
            <ChevronRightIcon />
          </IconButton>
        )}
      </DrawerHeader>

      <Divider />

      {/* Menu Items */}
      <List sx={{ px: collapsed ? 0 : 1 }}>
        {menuItems.map((item) => (
          <React.Fragment key={item.text}>
            {!item.subItems ? (
              // Regular menu item
              <Tooltip title={collapsed ? item.text : ""} placement="right">
                <ListItem disablePadding sx={{ display: "block" }}>
                  <ListItemButton
                    selected={isActive(item.path)}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      minHeight: 48,
                      justifyContent: collapsed ? "center" : "initial",
                      px: 2.5,
                      borderRadius: 1,
                      mb: 0.5,
                      "&.Mui-selected": {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        "&:hover": {
                          backgroundColor: theme.palette.primary.dark,
                        },
                        "& .MuiListItemIcon-root": {
                          color: "inherit",
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: collapsed ? 0 : 3,
                        justifyContent: "center",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && <ListItemText primary={item.text} />}
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            ) : (
              // Menu item with submenu
              <>
                <Tooltip title={collapsed ? item.text : ""} placement="right">
                  <ListItem disablePadding sx={{ display: "block" }}>
                    <ListItemButton
                      selected={isActive(item.path)}
                      onClick={() => {
                        if (collapsed) {
                          handleNavigation(item.path);
                        } else {
                          handleToggleSubmenu(item.text);
                        }
                      }}
                      sx={{
                        minHeight: 48,
                        justifyContent: collapsed ? "center" : "initial",
                        px: 2.5,
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          mr: collapsed ? 0 : 3,
                          justifyContent: "center",
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {!collapsed && (
                        <>
                          <ListItemText primary={item.text} />
                          {openSubmenus[item.text] ? (
                            <ExpandLess />
                          ) : (
                            <ExpandMore />
                          )}
                        </>
                      )}
                    </ListItemButton>
                  </ListItem>
                </Tooltip>

                {!collapsed && (
                  <Collapse
                    in={openSubmenus[item.text]}
                    timeout="auto"
                    unmountOnExit
                  >
                    <List component="div" disablePadding>
                      {item.subItems.map((subItem) => (
                        <ListItemButton
                          key={subItem.text}
                          selected={isActive(subItem.path)}
                          onClick={() => handleNavigation(subItem.path)}
                          sx={{
                            pl: 4,
                            py: 1,
                            borderRadius: 1,
                            mb: 0.5,
                            "&.Mui-selected": {
                              backgroundColor: theme.palette.action.selected,
                            },
                          }}
                        >
                          <ListItemText primary={subItem.text} />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </>
            )}
          </React.Fragment>
        ))}
      </List>

      <Divider />

      {/* Quick Actions */}
      {!collapsed && (
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            Quick Actions
          </Typography>
          <List>
            <ListItemButton
              onClick={() => navigate("/create")}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <ListItemIcon>
                <CategoryIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Create New" />
            </ListItemButton>
            <ListItemButton
              onClick={() => navigate("/profile")}
              sx={{ borderRadius: 1 }}
            >
              <ListItemIcon>
                <UserIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="My Profile" />
            </ListItemButton>
          </List>
        </Box>
      )}
    </Drawer>
  );
};

export default Sidebar;
