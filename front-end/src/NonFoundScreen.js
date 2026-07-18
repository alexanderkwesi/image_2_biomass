// components/routes/NotFoundScreen.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Grid,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { SentimentDissatisfied as SadIcon } from "@mui/icons-material";

const NotFoundScreen = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleGoHome = () => {
    navigate("/");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, md: 6 },
            width: "100%",
            maxWidth: 800,
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              mb: 4,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <SadIcon
              sx={{
                fontSize: 100,
                color: "error.main",
                opacity: 0.8,
              }}
            />
          </Box>

          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: "4rem", md: "6rem" },
              fontWeight: "bold",
              color: "primary.main",
              mb: 2,
            }}
          >
            404
          </Typography>

          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{
              fontWeight: 600,
              mb: 2,
            }}
          >
            Oops! Page Not Found
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: 4,
              maxWidth: 600,
              mx: "auto",
            }}
          >
            The page you are looking for might have been removed, had its name
            changed, or is temporarily unavailable. Please check the URL for
            spelling errors or try navigating from our homepage.
          </Typography>

          <Grid container spacing={2} justifyContent="center" sx={{ mt: 4 }}>
            <Grid item>
              <Button
                variant="contained"
                size="large"
                startIcon={<HomeIcon />}
                onClick={handleGoHome}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                }}
              >
                Go to Homepage
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                size="large"
                startIcon={<ArrowBackIcon />}
                onClick={handleGoBack}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                }}
              >
                Go Back
              </Button>
            </Grid>
          </Grid>

          {/* Optional: Search or help section */}
          <Box sx={{ mt: 6, pt: 4, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="h6" gutterBottom>
              Need Help?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              If you believe this is an error, please contact our support team
              or check our documentation for more information.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="text"
                color="primary"
                onClick={() => navigate("/contact")}
                sx={{ mr: 2 }}
              >
                Contact Support
              </Button>
              <Button
                variant="text"
                color="primary"
                onClick={() => navigate("/help")}
              >
                Visit Help Center
              </Button>
            </Box>
          </Box>

          {/* Optional: Suggest popular pages */}
          {!isMobile && (
            <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="subtitle1" gutterBottom>
                Popular Pages
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                <Button variant="text" onClick={() => navigate("/about")}>
                  About Us
                </Button>
                <Button variant="text" onClick={() => navigate("/services")}>
                  Services
                </Button>
                <Button variant="text" onClick={() => navigate("/blog")}>
                  Blog
                </Button>
                <Button variant="text" onClick={() => navigate("/contact")}>
                  Contact
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFoundScreen;
