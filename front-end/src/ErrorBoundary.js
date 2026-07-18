// ErrorBoundary.jsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
} from "react-native";

// Colors for consistent styling
const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  error: '#FF3B30',
  warning: '#FF9500',
  success: '#34C759',
  background: '#F2F2F7',
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F2F2F7',
  gray300: '#C7C7CC',
  gray500: '#8E8E93',
  textPrimary: '#000000',
  textSecondary: '#3C3C43',
};

// Storage utility for web
const BrowserStorage = {
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  },

  getItem: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  },

  removeItem: (key) => {
    localStorage.removeItem(key);
  },

  clearAll: () => {
    localStorage.clear();
  },
};

// Theme context for dark/light mode
const ThemeContext = React.createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = BrowserStorage.getItem('appTheme', 'light');
    return savedTheme;
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.backgroundColor = theme === 'dark' ? '#121212' : '#ffffff';
    document.body.style.color = theme === 'dark' ? '#ffffff' : '#000000';
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    BrowserStorage.setItem('appTheme', newTheme);
  };

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, toggleTheme } },
    children
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Enhanced ErrorBoundary component for React web
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Log error to console for debugging
    console.group('Error Details');
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();

    // Optional: Send to error reporting service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-report if endpoint is provided
    if (this.props.autoReport && this.props.errorReportingEndpoint) {
      this.sendErrorReport(error, errorInfo);
    }
  }

  sendErrorReport = async (error, errorInfo) => {
    try {
      const errorData = {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        localStorageData: this.getLocalStorageData(),
      };

      await fetch(this.props.errorReportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      });
    } catch (reportError) {
      console.error('Failed to send error report:', reportError);
    }
  };

  getLocalStorageData = () => {
    try {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Exclude sensitive data
        if (!key.includes('password') && !key.includes('token')) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    } catch {
      return null;
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }

    // Optionally reload the app
    if (this.props.reloadOnReset) {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (this.props.navigation?.navigate) {
      this.props.navigation.navigate('Home');
      this.handleReset();
    } else {
      // For web, navigate to home page
      window.location.href = '/';
    }
  };

  handleRefresh = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  copyErrorToClipboard = () => {
    const errorText = `${this.state.error?.toString()}\n\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorText).then(() => {
      alert('Error details copied to clipboard');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Error details copied to clipboard');
    });
  };

  render() {
    if (this.state.hasError) {
      const { theme } = this.props.useTheme ? this.props.useTheme() : { theme: 'light' };
      const isDark = theme === 'dark';

      return React.createElement(
        View,
        { style: [styles.container, isDark && styles.containerDark] },
        React.createElement(
          View,
          { style: [styles.content, isDark && styles.contentDark] },
          // Error Icon
          React.createElement(
            View,
            { style: styles.iconContainer },
            React.createElement(
              Text,
              { style: styles.errorIcon },
              "⚠️"
            )
          ),

          // Title
          React.createElement(
            Text,
            { style: [styles.title, isDark && styles.titleDark] },
            "Oops! Something went wrong"
          ),

          // Message
          React.createElement(
            Text,
            { style: [styles.message, isDark && styles.messageDark] },
            "We encountered an unexpected error. Don't worry, our team has been notified."
          ),

          // Action Buttons
          React.createElement(
            View,
            { style: styles.actions },
            React.createElement(
              TouchableOpacity,
              {
                style: [styles.button, styles.primaryButton],
                onPress: this.handleReset,
                accessibilityLabel: "Try Again",
                role: "button"
              },
              React.createElement(Text, { style: styles.buttonText }, "Try Again")
            ),
            React.createElement(
              TouchableOpacity,
              {
                style: [styles.button, styles.secondaryButton, isDark && styles.secondaryButtonDark],
                onPress: this.handleGoHome,
                accessibilityLabel: "Go to Home",
                role: "button"
              },
              React.createElement(Text, { style: [styles.secondaryButtonText, isDark && styles.secondaryButtonTextDark] }, "Go Home")
            )
          ),

          // Details Toggle
          React.createElement(
            TouchableOpacity,
            {
              style: styles.detailsToggle,
              onPress: this.toggleDetails,
              accessibilityLabel: "Toggle error details",
              role: "button"
            },
            React.createElement(
              Text,
              { style: [styles.detailsToggleText, isDark && styles.detailsToggleTextDark] },
              this.state.showDetails ? "Hide Details" : "Show Details"
            )
          ),

          // Error Details (if shown)
          this.state.showDetails && React.createElement(
            View,
            { style: [styles.detailsContainer, isDark && styles.detailsContainerDark] },
            React.createElement(
              View,
              { style: styles.detailsHeader },
              React.createElement(
                Text,
                { style: [styles.detailsTitle, isDark && styles.detailsTitleDark] },
                "Error Details"
              ),
              React.createElement(
                TouchableOpacity,
                {
                  style: styles.copyButton,
                  onPress: this.copyErrorToClipboard,
                  accessibilityLabel: "Copy error details",
                  role: "button"
                },
                React.createElement(Text, { style: styles.copyButtonText }, "📋 Copy")
              )
            ),
            React.createElement(
              ScrollView,
              { style: styles.detailsScroll },
              React.createElement(
                Text,
                { style: [styles.errorText, isDark && styles.errorTextDark] },
                this.state.error?.toString()
              ),
              React.createElement(
                Text,
                { style: [styles.stackText, isDark && styles.stackTextDark] },
                this.state.errorInfo?.componentStack
              )
            )
          ),

          // Support Link
          this.props.supportUrl && React.createElement(
            TouchableOpacity,
            {
              style: styles.supportLink,
              onPress: () => Linking.openURL(this.props.supportUrl),
              accessibilityLabel: "Contact support",
              role: "link"
            },
            React.createElement(
              Text,
              { style: [styles.supportText, isDark && styles.supportTextDark] },
              "Need help? Contact Support"
            )
          )
        )
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: '100vh',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  content: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    maxWidth: 600,
    width: '100%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  contentDark: {
    backgroundColor: '#1E1E1E',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  iconContainer: {
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  titleDark: {
    color: '#FFFFFF',
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  messageDark: {
    color: '#CCCCCC',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      opacity: 0.9,
    },
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryButtonDark: {
    backgroundColor: '#2D2D2D',
    borderColor: '#007AFF',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonTextDark: {
    color: '#007AFF',
  },
  detailsToggle: {
    marginBottom: 20,
    padding: 8,
    cursor: 'pointer',
  },
  detailsToggleText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  detailsToggleTextDark: {
    color: '#007AFF',
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  detailsContainerDark: {
    backgroundColor: '#2D2D2D',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray300,
  },
  detailsHeaderDark: {
    borderBottomColor: '#444444',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  detailsTitleDark: {
    color: '#FFFFFF',
  },
  copyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    cursor: 'pointer',
  },
  copyButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  detailsScroll: {
    maxHeight: 200,
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginBottom: 8,
    fontFamily: 'monospace',
    wordBreak: 'break-word',
  },
  errorTextDark: {
    color: '#FF453A',
  },
  stackText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  stackTextDark: {
    color: '#CCCCCC',
  },
  supportLink: {
    paddingVertical: 8,
  },
  supportText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  supportTextDark: {
    color: '#007AFF',
  },
});

// HOC for wrapping components with ErrorBoundary
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  return function WrappedComponent(props) {
    return React.createElement(
      ErrorBoundary,
      errorBoundaryProps,
      React.createElement(Component, props)
    );
  };
};

// HOC for wrapping screens with ErrorBoundary and ThemeProvider
export const wrapScreenWithErrorBoundary = (ScreenComponent, errorBoundaryProps = {}) => {
  return function WrappedScreen(props) {
    return React.createElement(
      ThemeProvider,
      null,
      React.createElement(
        ErrorBoundary,
        { ...errorBoundaryProps, navigation: props.navigation },
        React.createElement(ScreenComponent, props)
      )
    );
  };
};

// Create a global error handler
export const setupGlobalErrorHandling = (options = {}) => {
  const {
    onError,
    errorReportingEndpoint,
    autoReport = true,
  } = options;

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (onError) {
      onError(event.reason, { type: 'unhandledrejection' });
    }

    if (autoReport && errorReportingEndpoint) {
      fetch(errorReportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: event.reason.toString(),
          stack: event.reason.stack,
          type: 'unhandledrejection',
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }),
      }).catch(console.error);
    }
  });

  // Handle window errors
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('Global error:', message, error);

    if (originalOnError) {
      originalOnError(message, source, lineno, colno, error);
    }

    if (onError) {
      onError(error || new Error(message), {
        source,
        lineno,
        colno,
        type: 'window.onerror',
      });
    }

    return true; // Prevent default browser error handling
  };
};

export default ErrorBoundary;