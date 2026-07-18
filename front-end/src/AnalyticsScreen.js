// screens/AnalyticsScreen.jsx
import React, { useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  MonetizationOn as MonetizationOnIcon,
  BarChart as BarChartIcon,
  DateRange as DateRangeIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DatePicker } from "@mui/x-date-pickers";
import { format, subDays, subMonths } from "date-fns";

const AnalyticsScreen = () => {
  const [dateRange, setDateRange] = useState("30days");
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [anchorEl, setAnchorEl] = useState(null);

  // Sample data for charts
  const revenueData = [
    { date: "Jan", revenue: 4000, profit: 2400 },
    { date: "Feb", revenue: 3000, profit: 1398 },
    { date: "Mar", revenue: 9800, profit: 2000 },
    { date: "Apr", revenue: 3908, profit: 2780 },
    { date: "May", revenue: 4800, profit: 1890 },
    { date: "Jun", revenue: 3800, profit: 2390 },
    { date: "Jul", revenue: 4300, profit: 3490 },
  ];

  const categoryData = [
    { name: "Vegetables", value: 400, color: "#0088FE" },
    { name: "Fruits", value: 300, color: "#00C49F" },
    { name: "Grains", value: 300, color: "#FFBB28" },
    { name: "Livestock", value: 200, color: "#FF8042" },
  ];

  const farmPerformanceData = [
    { farm: "North Farm", yield: 4200, revenue: 12500, efficiency: 85 },
    { farm: "South Farm", yield: 3800, revenue: 9800, efficiency: 72 },
    { farm: "East Farm", yield: 5100, revenue: 15800, efficiency: 92 },
    { farm: "West Farm", yield: 2900, revenue: 7200, efficiency: 65 },
  ];

  const metrics = [
    {
      title: "Total Revenue",
      value: "$45,231.89",
      change: "+20.1%",
      positive: true,
      icon: <MonetizationOnIcon />,
      color: "#4CAF50",
    },
    {
      title: "Total Yield",
      value: "15,842 kg",
      change: "+12.5%",
      positive: true,
      icon: <InventoryIcon />,
      color: "#2196F3",
    },
    {
      title: "Active Farms",
      value: "12",
      change: "+2",
      positive: true,
      icon: <PeopleIcon />,
      color: "#9C27B0",
    },
    {
      title: "Avg. Efficiency",
      value: "78.5%",
      change: "-2.3%",
      positive: false,
      icon: <TrendingUpIcon />,
      color: "#FF9800",
    },
  ];

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExport = (format) => {
    console.log(`Exporting analytics data as ${format}`);
    handleMenuClose();
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Insights and performance metrics for your farms
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="7days">Last 7 days</MenuItem>
              <MenuItem value="30days">Last 30 days</MenuItem>
              <MenuItem value="90days">Last 90 days</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
          {dateRange === "custom" && (
            <>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                renderInput={(params) => (
                  <TextField {...params} size="small" sx={{ width: 150 }} />
                )}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                renderInput={(params) => (
                  <TextField {...params} size="small" sx={{ width: 150 }} />
                )}
              />
            </>
          )}
          <IconButton onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => handleExport("pdf")}>
              Export as PDF
            </MenuItem>
            <MenuItem onClick={() => handleExport("excel")}>
              Export as Excel
            </MenuItem>
            <MenuItem onClick={() => handleExport("csv")}>
              Export as CSV
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box>
                    <Typography
                      color="textSecondary"
                      gutterBottom
                      variant="body2"
                    >
                      {metric.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {metric.value}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                      {metric.positive ? (
                        <TrendingUpIcon
                          sx={{ color: "success.main", mr: 0.5 }}
                          fontSize="small"
                        />
                      ) : (
                        <TrendingDownIcon
                          sx={{ color: "error.main", mr: 0.5 }}
                          fontSize="small"
                        />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          color: metric.positive
                            ? "success.main"
                            : "error.main",
                        }}
                      >
                        {metric.change} from last period
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: metric.color + "20",
                      borderRadius: "50%",
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {React.cloneElement(metric.icon, {
                      sx: { color: metric.color, fontSize: 24 },
                    })}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Revenue Trend Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6">Revenue & Profit Trends</Typography>
              <Button startIcon={<DownloadIcon />} size="small">
                Export
              </Button>
            </Box>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#82ca9d"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Category Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Farm Performance */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Farm Performance Comparison
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={farmPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="farm" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="yield" fill="#8884d8" name="Yield (kg)" />
                <Bar dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
                <Bar
                  dataKey="efficiency"
                  fill="#ffc658"
                  name="Efficiency (%)"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Insights Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Key Insights
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="primary" gutterBottom>
                  Top Performer
                </Typography>
                <Typography variant="body2">
                  East Farm shows the highest efficiency at 92%. Consider
                  implementing their practices across other farms.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="primary" gutterBottom>
                  Growth Opportunity
                </Typography>
                <Typography variant="body2">
                  Vegetables category shows 40% growth potential. Consider
                  expanding vegetable cultivation.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="primary" gutterBottom>
                  Attention Needed
                </Typography>
                <Typography variant="body2">
                  West Farm efficiency dropped 2.3%. Schedule inspection and
                  review irrigation system.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AnalyticsScreen;
