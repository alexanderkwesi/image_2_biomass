// utils/validations.js - Enhanced for React Web

// Import validation messages
import { VALIDATION_MESSAGES } from "../strings";

// Regex Patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  STRONG_PASSWORD:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  PHONE: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  ALPHANUMERIC: /^[a-zA-Z0-9\s]+$/,
  ALPHABETS_ONLY: /^[a-zA-Z\s]+$/,
  NUMBERS_ONLY: /^[0-9]+$/,
  DECIMAL: /^[0-9]+(\.[0-9]{1,2})?$/,
  ZIP_CODE: /^\d{5}(-\d{4})?$/,
  DATE_YYYY_MM_DD: /^\d{4}-\d{2}-\d{2}$/,
  TIME_24H: /^([01]\d|2[0-3]):([0-5]\d)$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

// Validation Rules
export const VALIDATION_RULES = {
  REQUIRED: "required",
  EMAIL: "email",
  MIN_LENGTH: "minLength",
  MAX_LENGTH: "maxLength",
  PATTERN: "pattern",
  CUSTOM: "custom",
  NUMERIC: "numeric",
  DATE: "date",
  PHONE: "phone",
  URL: "url",
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @param {Object} options - Validation options
 * @returns {string|null} Error message or null if valid
 */
export const validateEmail = (email, options = {}) => {
  const {
    required = true,
    allowEmpty = !required,
    message = VALIDATION_MESSAGES?.email ||
      "Please enter a valid email address",
  } = options;

  // Check if empty and allowed
  if (!email || email.trim() === "") {
    return allowEmpty
      ? null
      : VALIDATION_MESSAGES?.required || "This field is required";
  }

  // Validate format
  if (!PATTERNS.EMAIL.test(email)) {
    return message;
  }

  // Check for disposable emails (optional)
  if (options.checkDisposable) {
    const disposableDomains = [
      "tempmail.com",
      "mailinator.com",
      "10minutemail.com",
    ];
    const domain = email.split("@")[1];
    if (disposableDomains.some((d) => domain.includes(d))) {
      return "Disposable email addresses are not allowed";
    }
  }

  return null;
};

/**
 * Validate password with configurable requirements
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {string|null} Error message or null if valid
 */
export const validatePassword = (password, options = {}) => {
  const {
    required = true,
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecial = true,
    customMessage = null,
  } = options;

  // Check if empty
  if (!password || password.trim() === "") {
    return required
      ? VALIDATION_MESSAGES?.required || "This field is required"
      : null;
  }

  // Check minimum length
  if (password.length < minLength) {
    return (
      customMessage ||
      VALIDATION_MESSAGES?.password ||
      `Password must be at least ${minLength} characters`
    );
  }

  // Check uppercase
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  // Check lowercase
  if (requireLowercase && !/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  // Check numbers
  if (requireNumbers && !/\d/.test(password)) {
    return "Password must contain at least one number";
  }

  // Check special characters
  if (requireSpecial && !/[@$!%*?&]/.test(password)) {
    return "Password must contain at least one special character (@$!%*?&)";
  }

  // Check for common passwords
  if (options.checkCommon) {
    const commonPasswords = ["password", "12345678", "qwerty", "admin"];
    if (commonPasswords.includes(password.toLowerCase())) {
      return "Password is too common. Please choose a stronger password";
    }
  }

  return null;
};

/**
 * Validate password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @param {Object} options - Validation options
 * @returns {string|null} Error message or null if valid
 */
export const validateConfirmPassword = (
  password,
  confirmPassword,
  options = {}
) => {
  const {
    required = true,
    message = VALIDATION_MESSAGES?.confirmPassword || "Passwords do not match",
  } = options;

  if (!confirmPassword || confirmPassword.trim() === "") {
    return required
      ? VALIDATION_MESSAGES?.required || "This field is required"
      : null;
  }

  if (password !== confirmPassword) {
    return message;
  }

  return null;
};

/**
 * Generic field validator
 * @param {*} value - Value to validate
 * @param {Object} rules - Validation rules
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
export const validateField = (value, rules = {}) => {
  const errors = [];

  // Check required
  if (
    rules.required &&
    (!value || (typeof value === "string" && value.trim() === ""))
  ) {
    errors.push(
      rules.requiredMessage ||
        VALIDATION_MESSAGES?.required ||
        "This field is required"
    );
  }

  // Skip further validation if value is empty (and not required)
  if (!value || (typeof value === "string" && value.trim() === "")) {
    return errors;
  }

  // Check min length
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(
      rules.minLengthMessage || `Must be at least ${rules.minLength} characters`
    );
  }

  // Check max length
  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(
      rules.maxLengthMessage || `Must be at most ${rules.maxLength} characters`
    );
  }

  // Check pattern
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(rules.patternMessage || "Invalid format");
  }

  // Check numeric
  if (rules.numeric && isNaN(Number(value))) {
    errors.push(rules.numericMessage || "Must be a number");
  }

  // Check date
  if (rules.date) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      errors.push(rules.dateMessage || "Invalid date");
    } else if (rules.minDate && date < new Date(rules.minDate)) {
      errors.push(`Date must be after ${rules.minDate}`);
    } else if (rules.maxDate && date > new Date(rules.maxDate)) {
      errors.push(`Date must be before ${rules.maxDate}`);
    }
  }

  // Check custom validator
  if (rules.custom && typeof rules.custom === "function") {
    const customError = rules.custom(value);
    if (customError) {
      errors.push(customError);
    }
  }

  return errors;
};

/**
 * Validate form with field definitions
 * @param {Object} formData - Form data object
 * @param {Object} fieldDefinitions - Field validation definitions
 * @returns {Object} Validation result
 */
export const validateForm = (formData, fieldDefinitions = {}) => {
  const errors = {};
  const warnings = {};
  const touched = {};
  let isValid = true;

  Object.keys(fieldDefinitions).forEach((fieldName) => {
    const field = fieldDefinitions[fieldName];
    const value = formData[fieldName];

    if (field.validate) {
      const fieldErrors = validateField(value, field.rules);

      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors[0]; // Take first error
        isValid = false;
      }

      // Check for warnings
      if (field.warningRules) {
        const warning = validateField(value, field.warningRules);
        if (warning.length > 0) {
          warnings[fieldName] = warning[0];
        }
      }

      // Mark as touched if validation was performed
      touched[fieldName] = true;
    }
  });

  return {
    isValid,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : null,
    touched,
    hasErrors: !isValid,
    hasWarnings: Object.keys(warnings).length > 0,
  };
};

/**
 * Validate image metadata
 * @param {Object} metadata - Image metadata
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateImageMetadata = (metadata, options = {}) => {
  const {
    requireTimestamp = true,
    requireLocation = false,
    requireResolution = true,
    minResolution = { width: 640, height: 480 },
    maxResolution = { width: 8192, height: 8192 },
    maxFileSize = 10 * 1024 * 1024, // 10MB
  } = options;

  const errors = [];
  const warnings = [];

  // Validate timestamp
  if (requireTimestamp && !metadata.timestamp) {
    errors.push("Timestamp is required");
  } else if (metadata.timestamp) {
    const timestamp = new Date(metadata.timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push("Invalid timestamp format");
    } else if (timestamp > new Date()) {
      warnings.push("Timestamp is in the future");
    }
  }

  // Validate location
  if (requireLocation && !metadata.location) {
    errors.push("Location data is required");
  } else if (metadata.location) {
    const { latitude, longitude } = metadata.location;
    if (latitude === undefined || longitude === undefined) {
      errors.push("Both latitude and longitude are required");
    } else if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      errors.push("Invalid location coordinates");
    }
  }

  // Validate resolution
  if (requireResolution && metadata.resolution) {
    const [width, height] = metadata.resolution.split("x").map(Number);

    if (isNaN(width) || isNaN(height)) {
      errors.push("Invalid resolution format");
    } else {
      if (width < minResolution.width || height < minResolution.height) {
        errors.push(
          `Image resolution too low (minimum ${minResolution.width}x${minResolution.height})`
        );
      }

      if (width > maxResolution.width || height > maxResolution.height) {
        warnings.push(`Image resolution very high (${width}x${height})`);
      }

      // Check aspect ratio
      const aspectRatio = width / height;
      if (aspectRatio < 0.5 || aspectRatio > 2) {
        warnings.push("Unusual aspect ratio detected");
      }
    }
  }

  // Validate file size
  if (metadata.fileSize) {
    if (metadata.fileSize > maxFileSize) {
      errors.push(`File size exceeds ${maxFileSize / (1024 * 1024)}MB limit`);
    } else if (metadata.fileSize < 1024) {
      warnings.push("File size is very small");
    }
  }

  // Validate file type
  if (metadata.fileType) {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(metadata.fileType.toLowerCase())) {
      errors.push(`Unsupported file type: ${metadata.fileType}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : null,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
  };
};

/**
 * Sanitize input with comprehensive security measures
 * @param {*} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {*} Sanitized input
 */
export const sanitizeInput = (input, options = {}) => {
  const {
    trim = true,
    removeHtml = true,
    removeScript = true,
    maxLength = 1000,
    escapeHtml = true,
    normalizeWhitespace = true,
    convertToLowercase = false,
    allowedTags = [],
    allowedAttributes = {},
  } = options;

  if (input === null || input === undefined) {
    return input;
  }

  let sanitized = String(input);

  // Trim whitespace
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Convert to lowercase
  if (convertToLowercase) {
    sanitized = sanitized.toLowerCase();
  }

  // Normalize whitespace
  if (normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, " ");
  }

  // Remove HTML tags (with optional allowed tags)
  if (removeHtml) {
    if (allowedTags.length > 0) {
      // Allow specific tags
      const tagPattern = new RegExp(
        `</?(?!${allowedTags.join("|")})\\b[^>]*>`,
        "gi"
      );
      sanitized = sanitized.replace(tagPattern, "");
    } else {
      // Remove all tags
      sanitized = sanitized.replace(/<[^>]*>/g, "");
    }
  }

  // Remove script tags and event handlers
  if (removeScript) {
    sanitized = sanitized
      .replace(/javascript:/gi, "")
      .replace(/on\w+="[^"]*"/gi, "")
      .replace(/on\w+='[^']*'/gi, "")
      .replace(/on\w+=\w+/gi, "");
  }

  // Escape HTML entities
  if (escapeHtml) {
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  // Apply length limit
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

/**
 * Sanitize object recursively
 * @param {Object|Array} data - Data to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object|Array} Sanitized data
 */
export const sanitizeObject = (data, options = {}) => {
  if (!data || typeof data !== "object") {
    return sanitizeInput(data, options);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeObject(item, options));
  }

  const sanitized = {};

  Object.keys(data).forEach((key) => {
    const value = data[key];

    if (typeof value === "string") {
      sanitized[key] = sanitizeInput(value, options);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @param {Object} options - Validation options
 * @returns {string|null} Error message or null if valid
 */
export const validatePhone = (phone, options = {}) => {
  const {
    required = false,
    countryCode = "US",
    message = "Please enter a valid phone number",
  } = options;

  if (!phone || phone.trim() === "") {
    return required ? "Phone number is required" : null;
  }

  // Basic phone validation
  if (!PATTERNS.PHONE.test(phone)) {
    return message;
  }

  // Country-specific validation
  if (countryCode === "US" && phone.replace(/\D/g, "").length !== 10) {
    return "US phone numbers must be 10 digits";
  }

  return null;
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @param {Object} options - Validation options
 * @returns {string|null} Error message or null if valid
 */
export const validateUrl = (url, options = {}) => {
  const {
    required = false,
    requireProtocol = false,
    allowedProtocols = ["http", "https"],
    message = "Please enter a valid URL",
  } = options;

  if (!url || url.trim() === "") {
    return required ? "URL is required" : null;
  }

  // Add protocol if missing and required
  let urlToValidate = url;
  if (!url.includes("://") && requireProtocol) {
    urlToValidate = `https://${url}`;
  }

  // Validate URL pattern
  if (!PATTERNS.URL.test(urlToValidate)) {
    return message;
  }

  // Validate protocol
  if (requireProtocol) {
    const protocol = urlToValidate.split("://")[0];
    if (!allowedProtocols.includes(protocol)) {
      return `URL must start with ${allowedProtocols.join(" or ")}`;
    }
  }

  return null;
};

/**
 * Validate date
 * @param {string} dateString - Date string to validate
 * @param {Object} options - Validation options
 * @returns {string|null} Error message or null if valid
 */
export const validateDate = (dateString, options = {}) => {
  const {
    required = false,
    format = "YYYY-MM-DD",
    minDate = null,
    maxDate = null,
    message = "Please enter a valid date",
  } = options;

  if (!dateString || dateString.trim() === "") {
    return required ? "Date is required" : null;
  }

  const date = new Date(dateString);

  // Check if valid date
  if (isNaN(date.getTime())) {
    return message;
  }

  // Check format
  if (format === "YYYY-MM-DD" && !PATTERNS.DATE_YYYY_MM_DD.test(dateString)) {
    return "Date must be in YYYY-MM-DD format";
  }

  // Check minimum date
  if (minDate && date < new Date(minDate)) {
    return `Date must be after ${minDate}`;
  }

  // Check maximum date
  if (maxDate && date > new Date(maxDate)) {
    return `Date must be before ${maxDate}`;
  }

  return null;
};

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Array<string>} Array of error messages
 */
export const validateFile = (file, options = {}) => {
  const errors = [];
  const {
    allowedTypes = [],
    maxSize = 10 * 1024 * 1024, // 10MB
    minSize = 0,
    maxFiles = 1,
    currentCount = 0,
  } = options;

  // Check file existence
  if (!file) {
    errors.push("File is required");
    return errors;
  }

  // Check file count
  if (currentCount >= maxFiles) {
    errors.push(`Maximum ${maxFiles} file(s) allowed`);
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push(
      `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`
    );
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    errors.push(`File size exceeds ${maxSizeMB}MB limit`);
  }

  if (file.size < minSize) {
    const minSizeKB = (minSize / 1024).toFixed(1);
    errors.push(`File size must be at least ${minSizeKB}KB`);
  }

  // Check file name
  if (
    options.maxFileNameLength &&
    file.name.length > options.maxFileNameLength
  ) {
    errors.push(
      `File name too long (max ${options.maxFileNameLength} characters)`
    );
  }

  return errors;
};

/**
 * Validate numeric range
 * @param {number} value - Number to validate
 * @param {Object} options - Validation options
 * @returns {string|null} Error message or null if valid
 */
export const validateNumber = (value, options = {}) => {
  const {
    required = false,
    min = null,
    max = null,
    integer = false,
    positive = false,
    message = "Please enter a valid number",
  } = options;

  if (value === null || value === undefined || value === "") {
    return required ? "This field is required" : null;
  }

  const num = Number(value);

  if (isNaN(num)) {
    return message;
  }

  if (integer && !Number.isInteger(num)) {
    return "Must be an integer";
  }

  if (positive && num <= 0) {
    return "Must be a positive number";
  }

  if (min !== null && num < min) {
    return `Must be at least ${min}`;
  }

  if (max !== null && num > max) {
    return `Must be at most ${max}`;
  }

  return null;
};

/**
 * Create validation schema for forms
 * @param {Object} schema - Validation schema
 * @returns {Function} Validation function
 */
export const createValidator = (schema) => {
  return (values) => {
    const errors = {};

    Object.keys(schema).forEach((fieldName) => {
      const fieldSchema = schema[fieldName];
      const value = values[fieldName];
      let error = null;

      // Apply each validation rule
      if (
        fieldSchema.required &&
        (!value || (typeof value === "string" && value.trim() === ""))
      ) {
        error = fieldSchema.message || "This field is required";
      } else if (
        value &&
        fieldSchema.pattern &&
        !fieldSchema.pattern.test(value)
      ) {
        error = fieldSchema.message || "Invalid format";
      } else if (
        value &&
        fieldSchema.validate &&
        typeof fieldSchema.validate === "function"
      ) {
        error = fieldSchema.validate(value);
      }

      if (error) {
        errors[fieldName] = error;
      }
    });

    return errors;
  };
};

export default {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateField,
  validateForm,
  validateImageMetadata,
  sanitizeInput,
  sanitizeObject,
  validatePhone,
  validateUrl,
  validateDate,
  validateFile,
  validateNumber,
  createValidator,
  PATTERNS,
  VALIDATION_RULES,
};
