// components/Footer.jsx
import React from "react";
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  IconButton,
  Divider,
} from "@mui/material";
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Instagram as InstagramIcon,
  GitHub as GitHubIcon,
} from "@mui/icons-material";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Documentation", href: "/docs" },
      { label: "API", href: "/api" },
    ],
    Company: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
    ],
    Support: [
      { label: "Help Center", href: "/help" },
      { label: "Contact Us", href: "/contact" },
      { label: "Status", href: "/status" },
      { label: "Community", href: "/community" },
    ],
    Legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "GDPR", href: "/gdpr" },
    ],
  };

  const socialLinks = [
    { icon: <FacebookIcon />, label: "Facebook", href: "https://facebook.com" },
    { icon: <TwitterIcon />, label: "Twitter", href: "https://twitter.com" },
    { icon: <LinkedInIcon />, label: "LinkedIn", href: "https://linkedin.com" },
    {
      icon: <InstagramIcon />,
      label: "Instagram",
      href: "https://instagram.com",
    },
    { icon: <GitHubIcon />, label: "GitHub", href: "https://github.com" },
  ];

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: (theme) => theme.palette.background.paper,
        borderTop: 1,
        borderColor: "divider",
        mt: "auto",
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Logo and Description */}
          <Grid item xs={12} md={3}>
            <Typography
              variant="h6"
              color="primary"
              gutterBottom
              fontWeight="bold"
            >
              MyApp
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Building amazing experiences for users worldwide. Join us in
              creating the future of digital solutions.
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {socialLinks.map((social) => (
                <IconButton
                  key={social.label}
                  aria-label={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: "text.secondary",
                    "&:hover": {
                      color: "primary.main",
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Box>
          </Grid>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <Grid item xs={6} sm={3} md={2} key={category}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {category}
              </Typography>
              <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
                {links.map((link) => (
                  <Box component="li" key={link.label} sx={{ mb: 1 }}>
                    <Link
                      href={link.href}
                      color="text.secondary"
                      underline="hover"
                      sx={{
                        "&:hover": {
                          color: "primary.main",
                        },
                      }}
                    >
                      {link.label}
                    </Link>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Bottom Section */}
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              © {currentYear} MyApp. All rights reserved.
            </Typography>
          </Grid>
          <Grid item>
            <Box sx={{ display: "flex", gap: 3 }}>
              <Link
                href="/accessibility"
                color="text.secondary"
                variant="body2"
                underline="hover"
              >
                Accessibility
              </Link>
              <Link
                href="/sitemap"
                color="text.secondary"
                variant="body2"
                underline="hover"
              >
                Sitemap
              </Link>
              <Link
                href="/contact"
                color="text.secondary"
                variant="body2"
                underline="hover"
              >
                Contact
              </Link>
            </Box>
          </Grid>
        </Grid>

        {/* Version Info (optional) */}
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            Version 1.0.0 • Built with React & Material-UI
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
