// screens/ReportsScreen.jsx
import React, { useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers";

const ReportsScreen = () => {
  const [reportType, setReportType] = useState("financial");
  const [dateRange, setDateRange] = useState("monthly");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedReports, setSelectedReports] = useState([]);
  const [includeCharts, setIncludeCharts] = useState(true);

  // Sample reports data
  const reports = [
    {
      id: 1,
      name: "Q3 2024 Financial Report",
      type: "financial",
      period: "Jul 2024 - Sep 2024",
      generated: "2024-10-15",
      size: "2.4 MB",
      status: "completed",
      format: "PDF",
    },
    {
      id: 2,
      name: "Annual Crop Yield Analysis",
      type: "production",
      period: "Jan 2024 - Dec 2024",
      generated: "2024-10-10",
      size: "1.8 MB",
      status: "completed",
      format: "Excel",
    },
    {
      id: 3,
      name: "Soil Quality Monitoring",
      type: "environmental",
      period: "Aug 2024",
      generated: "2024-09-28",
      size: "3.2 MB",
      status: "completed",
      format: "PDF",
    },
    {
      id: 4,
      name: "Equipment Maintenance Log",
      type: "maintenance",
      period: "Sep 2024",
      generated: "2024-10-05",
      size: "1.1 MB",
      status: "pending",
      format: "PDF",
    },
    {
      id: 5,
      name: "Monthly Expense Report",
      type: "financial",
      period: "Sep 2024",
      generated: "2024-10-01",
      size: "0.8 MB",
      status: "completed",
      format: "Excel",
    },
    {
      id: 6,
      name: "Harvest Schedule 2024",
      type: "production",
      period: "2024",
      generated: "2024-09-20",
      size: "1.5 MB",
      status: "completed",
      format: "PDF",
    },
    {
      id: 7,
      name: "Water Usage Report",
      type: "environmental",
      period: "Q3 2024",
      generated: "2024-10-12",
      size: "2.1 MB",
      status: "completed",
      format: "Excel",
    },
    {
      id: 8,
      name: "Staff Performance Review",
      type: "hr",
      period: "Q3 2024",
      generated: "2024-10-08",
      size: "1.9 MB",
      status: "completed",
      format: "PDF",
    },
  ];

  const reportTypes = [
    { value: "financial", label: "Financial Reports" },
    { value: "production", label: "Production Reports" },
    { value: "environmental", label: "Environmental Reports" },
    { value: "maintenance", label: "Maintenance Reports" },
    { value: "hr", label: "HR Reports" },
    { value: "all", label: "All Reports" },
  ];

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectReport = (id) => {
    setSelectedReports((prev) =>
      prev.includes(id)
        ? prev.filter((reportId) => reportId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedReports.length === filteredReports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(filteredReports.map((report) => report.id));
    }
  };

  const handleGenerateReport = () => {
    alert(`Generating ${reportType} report for ${dateRange} period`);
  };

  const handleExportSelected = (format) => {
    if (selectedReports.length === 0) {
      alert("Please select reports to export");
      return;
    }
    alert(`Exporting ${selectedReports.length} reports as ${format}`);
  };

  const filteredReports = reports.filter((report) => {
    if (reportType !== "all" && report.type !== reportType) return false;
    if (
      searchQuery &&
      !report.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

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
            Reports
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate and manage farm reports
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleGenerateReport}
          >
            Generate Report
          </Button>
        </Box>
      </Box>

      {/* Report Generator */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Generate New Report
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                label="Report Type"
                onChange={(e) => setReportType(e.target.value)}
              >
                {reportTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateRange}
                label="Date Range"
                onChange={(e) => setDateRange(e.target.value)}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {dateRange === "custom" && (
            <>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="Start Date"
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="End Date"
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
            </>
          )}
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                />
              }
              label="Include Charts"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Reports List */}
      <Paper sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6">Available Reports</Typography>
            <TextField
              size="small"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ color: "action.active", mr: 1 }} />
                ),
              }}
              sx={{ width: 300 }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {selectedReports.length > 0 && (
              <>
                <Button
                  startIcon={<PdfIcon />}
                  onClick={() => handleExportSelected("PDF")}
                  variant="outlined"
                  size="small"
                >
                  Export as PDF
                </Button>
                <Button
                  startIcon={<ExcelIcon />}
                  onClick={() => handleExportSelected("Excel")}
                  variant="outlined"
                  size="small"
                >
                  Export as Excel
                </Button>
              </>
            )}
            <IconButton>
              <FilterListIcon />
            </IconButton>
            <IconButton>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedReports.length === filteredReports.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Report Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Generated</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReports
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(report.id)}
                        onChange={() => handleSelectReport(report.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="medium">{report.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.type}
                        size="small"
                        color={
                          report.type === "financial"
                            ? "primary"
                            : report.type === "production"
                            ? "success"
                            : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>{report.period}</TableCell>
                    <TableCell>{report.generated}</TableCell>
                    <TableCell>{report.size}</TableCell>
                    <TableCell>
                      <Chip
                        label={report.status}
                        size="small"
                        color={
                          report.status === "completed" ? "success" : "warning"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {report.format === "PDF" ? <PdfIcon /> : <ExcelIcon />}
                        <Typography>{report.format}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton size="small" title="Preview">
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton size="small" title="Download">
                          <DownloadIcon />
                        </IconButton>
                        <IconButton size="small" title="Print">
                          <PrintIcon />
                        </IconButton>
                        <IconButton size="small" title="Email">
                          <EmailIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredReports.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Reports
              </Typography>
              <Typography variant="h4">{reports.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                This Month
              </Typography>
              <Typography variant="h4">3</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Size
              </Typography>
              <Typography variant="h4">1.8 MB</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h4">1</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsScreen;
