// components/HelpScreen.jsx
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
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  IconButton,
  alpha,
} from "@mui/material";
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  Article as ArticleIcon,
  VideoLibrary as VideoIcon,
  ContactSupport as ContactIcon,
  Book as BookIcon,
  Forum as ForumIcon,
  Download as DownloadIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Share as ShareIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from "@mui/icons-material";
import { useParams } from "react-router-dom";

const HelpScreen = () => {
  const { topic } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(topic || "getting-started");
  const [feedback, setFeedback] = useState({});

  const helpCategories = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <HelpIcon />,
      articles: [
        { id: "gs-1", title: "Welcome to Farm Management System", views: 1240 },
        { id: "gs-2", title: "Setting Up Your First Farm", views: 890 },
        { id: "gs-3", title: "User Roles and Permissions", views: 650 },
        { id: "gs-4", title: "Dashboard Overview", views: 1120 },
      ],
    },
    {
      id: "farm-management",
      title: "Farm Management",
      icon: <BookIcon />,
      articles: [
        { id: "fm-1", title: "Adding and Managing Farms", views: 2100 },
        { id: "fm-2", title: "Crop Planning and Scheduling", views: 1560 },
        { id: "fm-3", title: "Inventory Management", views: 980 },
        { id: "fm-4", title: "Equipment Tracking", views: 740 },
      ],
    },
    {
      id: "analytics",
      title: "Analytics & Reports",
      icon: <ArticleIcon />,
      articles: [
        { id: "ar-1", title: "Understanding Analytics Dashboard", views: 890 },
        { id: "ar-2", title: "Generating Reports", views: 670 },
        { id: "ar-3", title: "Exporting Data", views: 540 },
        { id: "ar-4", title: "Custom Metrics", views: 320 },
      ],
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: <ContactIcon />,
      articles: [
        { id: "ts-1", title: "Common Login Issues", views: 1250 },
        { id: "ts-2", title: "Data Sync Problems", views: 760 },
        { id: "ts-3", title: "Mobile App Issues", views: 430 },
        { id: "ts-4", title: "Performance Optimization", views: 290 },
      ],
    },
  ];

  const popularArticles = [
    {
      id: "pop-1",
      title: "How to Add Multiple Farms",
      category: "Farm Management",
      likes: 245,
    },
    {
      id: "pop-2",
      title: "Understanding Soil Analytics",
      category: "Analytics",
      likes: 189,
    },
    {
      id: "pop-3",
      title: "Mobile App Setup Guide",
      category: "Getting Started",
      likes: 167,
    },
    {
      id: "pop-4",
      title: "Exporting Data to Excel",
      category: "Analytics",
      likes: 142,
    },
  ];

  const quickLinks = [
    { title: "Video Tutorials", icon: <VideoIcon />, count: 24 },
    { title: "User Guides", icon: <BookIcon />, count: 18 },
    { title: "API Documentation", icon: <ArticleIcon />, count: 12 },
    { title: "Community Forum", icon: <ForumIcon />, count: "1.2k+" },
  ];

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleFeedback = (articleId, helpful) => {
    setFeedback((prev) => ({
      ...prev,
      [articleId]: helpful,
    }));
  };

  const filteredCategories = helpCategories
    .map((category) => ({
      ...category,
      articles: category.articles.filter((article) =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.articles.length > 0);

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Hero Section */}
      <Paper
        sx={{
          p: 4,
          mb: 4,
          background: (theme) =>
            `linear-gradient(135deg, ${alpha(
              theme.palette.primary.main,
              0.1
            )} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
          borderRadius: 2,
        }}
      >
        <Grid container alignItems="center" spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              How can we help you?
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              paragraph
              sx={{ mb: 3 }}
            >
              Find answers to frequently asked questions, browse documentation,
              or get in touch with our support team.
            </Typography>
            <TextField
              fullWidth
              placeholder="Search for help articles, guides, or tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 600 }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: "center" }}>
              <HelpIcon
                sx={{ fontSize: 120, color: "primary.main", opacity: 0.8 }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Quick Links */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {quickLinks.map((link) => (
              <Grid item xs={6} sm={3} key={link.title}>
                <Card
                  sx={{
                    height: "100%",
                    cursor: "pointer",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      transition: "transform 0.2s",
                    },
                  }}
                >
                  <CardContent sx={{ textAlign: "center" }}>
                    <Box sx={{ color: "primary.main", mb: 1 }}>{link.icon}</Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {link.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {link.count} resources
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* FAQ Sections */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <HelpIcon />
              Frequently Asked Questions
            </Typography>
            {filteredCategories.map((category) => (
              <Accordion
                key={category.id}
                expanded={expanded === category.id}
                onChange={handleAccordionChange(category.id)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {category.icon}
                    <Typography variant="h6">{category.title}</Typography>
                    <Chip label={category.articles.length} size="small" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {category.articles.map((article, index) => (
                      <React.Fragment key={article.id}>
                        <ListItem
                          button
                          sx={{
                            borderRadius: 1,
                            mb: 1,
                            "&:hover": {
                              backgroundColor: "action.hover",
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Typography variant="body1">
                                  {article.title}
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {article.views} views
                                  </Typography>
                                  <ArrowRightIcon fontSize="small" />
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < category.articles.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>

          {/* Popular Articles */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Popular Articles
            </Typography>
            <Grid container spacing={2}>
              {popularArticles.map((article) => (
                <Grid item xs={12} sm={6} key={article.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography
                        variant="subtitle1"
                        fontWeight="medium"
                        gutterBottom
                      >
                        {article.title}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mt: 2,
                        }}
                      >
                        <Chip label={article.category} size="small" />
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <ThumbUpIcon fontSize="small" color="action" />
                          <Typography variant="caption">
                            {article.likes}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Contact Support */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <ContactIcon />
              Contact Support
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Can't find what you're looking for? Our support team is here to
              help.
            </Typography>
            <Button variant="contained" fullWidth sx={{ mb: 2 }}>
              Submit a Ticket
            </Button>
            <Button variant="outlined" fullWidth sx={{ mb: 2 }}>
              Live Chat
            </Button>
            <Button variant="text" fullWidth startIcon={<ForumIcon />}>
              Community Forum
            </Button>
          </Paper>

          {/* Resources */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resources
            </Typography>
            <List>
              <ListItem button>
                <ListItemText
                  primary="User Manual"
                  secondary="Complete guide to all features"
                />
                <DownloadIcon fontSize="small" />
              </ListItem>
              <Divider />
              <ListItem button>
                <ListItemText
                  primary="API Documentation"
                  secondary="Integration guides and references"
                />
                <ArticleIcon fontSize="small" />
              </ListItem>
              <Divider />
              <ListItem button>
                <ListItemText
                  primary="Video Tutorials"
                  secondary="Step-by-step video guides"
                />
                <VideoIcon fontSize="small" />
              </ListItem>
            </List>
          </Paper>

          {/* Article Feedback */}
          {topic && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Was this helpful?
              </Typography>
              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <Button
                  variant={feedback[topic] === true ? "contained" : "outlined"}
                  startIcon={<ThumbUpIcon />}
                  onClick={() => handleFeedback(topic, true)}
                  fullWidth
                >
                  Yes
                </Button>
                <Button
                  variant={feedback[topic] === false ? "contained" : "outlined"}
                  startIcon={<ThumbDownIcon />}
                  onClick={() => handleFeedback(topic, false)}
                  fullWidth
                >
                  No
                </Button>
              </Box>
              <Button variant="text" startIcon={<ShareIcon />} fullWidth>
                Share this article
              </Button>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default HelpScreen;
