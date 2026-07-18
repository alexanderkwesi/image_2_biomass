// utils/calculations.js - Enhanced for React Web

// Import strings from a separate file or define inline
import { STRINGS } from "../strings";

// Constants
export const BIOMASS_THRESHOLDS = {
  HIGH: 2000, // grams per square meter
  MEDIUM: 1000,
  LOW: 0,
};

export const CONSUMPTION_RATES = {
  DAILY_PER_ANIMAL: 2.5, // kg per day
  METRIC_TO_IMPERIAL: {
    HECTARES_TO_ACRES: 2.47105,
    GRAMS_TO_POUNDS: 0.00220462,
  },
};

export const GROWTH_RATE_CATEGORIES = {
  EXCELLENT: { min: 10, color: "#4CAF50", label: "Excellent" },
  GOOD: { min: 5, color: "#8BC34A", label: "Good" },
  AVERAGE: { min: 2, color: "#FFC107", label: "Average" },
  SLOW: { min: 0, color: "#FF9800", label: "Slow" },
  STAGNANT: { min: -Infinity, color: "#F44336", label: "Declining" },
};

export const BIOMASS_UNITS = {
  METRIC: {
    SMALL: { threshold: 1000, unit: "g", divisor: 1 },
    MEDIUM: { threshold: 1000000, unit: "kg", divisor: 1000 },
    LARGE: { threshold: Infinity, unit: "tonnes", divisor: 1000000 },
  },
  IMPERIAL: {
    SMALL: { threshold: 1, unit: "oz", divisor: 28.3495 },
    MEDIUM: { threshold: 2000, unit: "lbs", divisor: 453.592 },
    LARGE: { threshold: Infinity, unit: "tons", divisor: 907185 },
  },
};

/**
 * Calculate biomass status with enhanced categorization
 * @param {number} totalBiomass - Total biomass in grams
 * @param {string} [unit="metric"] - Measurement unit system
 * @returns {Object} Status object with color, recommendation, and category
 */
export const calculateBiomassStatus = (totalBiomass, unit = "metric") => {
  let thresholds = BIOMASS_THRESHOLDS;

  // Adjust thresholds for imperial units if needed
  if (unit === "imperial") {
    thresholds = {
      HIGH:
        thresholds.HIGH * CONSUMPTION_RATES.METRIC_TO_IMPERIAL.GRAMS_TO_POUNDS,
      MEDIUM:
        thresholds.MEDIUM *
        CONSUMPTION_RATES.METRIC_TO_IMPERIAL.GRAMS_TO_POUNDS,
      LOW: thresholds.LOW,
    };
  }

  if (totalBiomass > thresholds.HIGH) {
    return {
      status: "High",
      color: "#4CAF50",
      category: "excellent",
      recommendation:
        STRINGS?.predictions?.recommendations?.high ||
        "Biomass levels are excellent. Consider rotational grazing to optimize pasture health.",
      icon: "🌿",
      score: 90,
    };
  } else if (totalBiomass > thresholds.MEDIUM) {
    return {
      status: "Medium",
      color: "#FFC107",
      category: "good",
      recommendation:
        STRINGS?.predictions?.recommendations?.medium ||
        "Biomass levels are adequate. Monitor growth and consider light grazing.",
      icon: "🌱",
      score: 60,
    };
  } else {
    return {
      status: "Low",
      color: "#F44336",
      category: "poor",
      recommendation:
        STRINGS?.predictions?.recommendations?.low ||
        "Biomass levels are low. Consider resting pasture and applying fertilizer if needed.",
      icon: "🍂",
      score: 30,
    };
  }
};

/**
 * Calculate estimated grazing days with enhanced parameters
 * @param {number} totalBiomass - Total biomass in grams
 * @param {number} herdSize - Number of animals
 * @param {number} [dailyConsumption=2.5] - Daily consumption per animal in kg
 * @param {Object} [options] - Additional options
 * @param {number} options.safetyFactor - Safety factor (default: 0.7)
 * @param {number} options.reservePercentage - Reserve biomass percentage (default: 20)
 * @returns {number} Estimated grazing days
 */
export const calculateGrazingDays = (
  totalBiomass,
  herdSize,
  dailyConsumption = CONSUMPTION_RATES.DAILY_PER_ANIMAL,
  options = {}
) => {
  const {
    safetyFactor = 0.7,
    reservePercentage = 20,
    biomassUtilization = 50, // Percentage of biomass that can be safely consumed
  } = options;

  // Convert biomass from grams to kg
  const totalBiomassKg = totalBiomass / 1000;

  // Calculate available biomass (minus reserve)
  const availableBiomass = totalBiomassKg * ((100 - reservePercentage) / 100);

  // Calculate daily consumption for the herd
  const dailyHerdConsumption = herdSize * dailyConsumption;

  if (dailyHerdConsumption <= 0) {
    return 0;
  }

  // Calculate grazing days with safety factor
  const grazingDays =
    (availableBiomass * (biomassUtilization / 100) * safetyFactor) /
    dailyHerdConsumption;

  return Math.max(0, Math.round(grazingDays * 10) / 10); // Round to 1 decimal
};

/**
 * Calculate grazing pressure (animals per hectare)
 * @param {number} herdSize - Number of animals
 * @param {number} areaHectares - Area in hectares
 * @returns {number} Grazing pressure (animals per hectare)
 */
export const calculateGrazingPressure = (herdSize, areaHectares) => {
  if (areaHectares <= 0) return 0;
  return herdSize / areaHectares;
};

/**
 * Format area with localization support
 * @param {number} hectares - Area in hectares
 * @param {string} [unit="metric"] - Unit system
 * @param {Object} [options] - Formatting options
 * @param {boolean} options.abbreviate - Use abbreviated units
 * @param {number} options.decimals - Number of decimal places
 * @param {string} options.locale - Locale for number formatting
 * @returns {string} Formatted area string
 */
export const formatArea = (hectares, unit = "metric", options = {}) => {
  const { abbreviate = false, decimals = 1, locale = "en-US" } = options;

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (unit === "imperial") {
    const acres =
      hectares * CONSUMPTION_RATES.METRIC_TO_IMPERIAL.HECTARES_TO_ACRES;
    const unitLabel = abbreviate ? "ac" : acres === 1 ? "acre" : "acres";
    return `${formatter.format(acres)} ${unitLabel}`;
  }

  const unitLabel = abbreviate ? "ha" : hectares === 1 ? "hectare" : "hectares";
  return `${formatter.format(hectares)} ${unitLabel}`;
};

/**
 * Format biomass with intelligent unit scaling
 * @param {number} grams - Biomass in grams
 * @param {string} [unit="metric"] - Unit system
 * @param {Object} [options] - Formatting options
 * @param {boolean} options.abbreviate - Use abbreviated units
 * @param {number} options.decimals - Number of decimal places
 * @param {boolean} options.compact - Use compact notation (1.2k, 1.5M)
 * @returns {string} Formatted biomass string
 */
export const formatBiomass = (grams, unit = "metric", options = {}) => {
  const { abbreviate = false, decimals = 1, compact = false } = options;

  const units = BIOMASS_UNITS[unit.toUpperCase()] || BIOMASS_UNITS.METRIC;

  if (compact && grams >= 1000000) {
    const value = grams / 1000000;
    const unitLabel = abbreviate ? "t" : unit === "metric" ? "tonnes" : "tons";
    return `${value.toFixed(decimals)} ${unitLabel}`;
  }

  if (compact && grams >= 1000) {
    const value = grams / 1000;
    const unitLabel = abbreviate ? "k" : unit === "metric" ? "kg" : "lbs";
    return `${value.toFixed(decimals)} ${unitLabel}`;
  }

  // Find appropriate unit
  let selectedUnit;
  for (const [key, unitConfig] of Object.entries(units)) {
    if (grams < unitConfig.threshold) {
      selectedUnit = unitConfig;
      break;
    }
  }

  if (!selectedUnit) {
    selectedUnit = units.LARGE;
  }

  const value = grams / selectedUnit.divisor;
  const formattedValue = value.toFixed(decimals);
  const unitLabel = abbreviate
    ? selectedUnit.unit
    : getFullUnitName(selectedUnit.unit, value, unit);

  return `${formattedValue} ${unitLabel}`;
};

/**
 * Get full unit name
 */
const getFullUnitName = (unitAbbr, value, system) => {
  const unitMap = {
    metric: {
      g: value === 1 ? "gram" : "grams",
      kg: value === 1 ? "kilogram" : "kilograms",
      t: value === 1 ? "tonne" : "tonnes",
    },
    imperial: {
      oz: value === 1 ? "ounce" : "ounces",
      lbs: value === 1 ? "pound" : "pounds",
      tons: value === 1 ? "ton" : "tons",
    },
  };

  return unitMap[system]?.[unitAbbr] || unitAbbr;
};

/**
 * Calculate growth rate with categorization
 * @param {number} currentBiomass - Current biomass in grams
 * @param {number} previousBiomass - Previous biomass in grams
 * @param {number} daysBetween - Number of days between measurements
 * @returns {Object} Growth rate object with percentage and category
 */
export const calculateGrowthRate = (
  currentBiomass,
  previousBiomass,
  daysBetween
) => {
  if (!previousBiomass || daysBetween === 0 || previousBiomass <= 0) {
    return {
      percentage: 0,
      dailyRate: 0,
      category: GROWTH_RATE_CATEGORIES.STAGNANT,
      description: "No growth data available",
    };
  }

  const absoluteGrowth = currentBiomass - previousBiomass;
  const dailyRate = absoluteGrowth / daysBetween;
  const percentageRate = (absoluteGrowth / previousBiomass) * 100;
  const dailyPercentageRate = percentageRate / daysBetween;

  // Determine growth category
  let category = GROWTH_RATE_CATEGORIES.STAGNANT;

  for (const [key, cat] of Object.entries(GROWTH_RATE_CATEGORIES)) {
    if (dailyPercentageRate >= cat.min) {
      category = cat;
      break;
    }
  }

  const description = getGrowthDescription(dailyPercentageRate);

  return {
    percentage: Math.round(percentageRate * 10) / 10,
    dailyRate: Math.round(dailyRate * 10) / 10,
    dailyPercentage: Math.round(dailyPercentageRate * 10) / 10,
    absoluteGrowth,
    category,
    description,
    trend:
      absoluteGrowth > 0
        ? "increasing"
        : absoluteGrowth < 0
        ? "decreasing"
        : "stable",
  };
};

/**
 * Get growth description based on rate
 */
const getGrowthDescription = (dailyPercentageRate) => {
  if (dailyPercentageRate >= 10) return "Exceptional growth rate";
  if (dailyPercentageRate >= 5) return "Strong growth";
  if (dailyPercentageRate >= 2) return "Moderate growth";
  if (dailyPercentageRate > 0) return "Slow but steady growth";
  if (dailyPercentageRate === 0) return "No growth detected";
  return "Biomass is declining";
};

/**
 * Estimate harvest time with enhanced forecasting
 * @param {number} currentBiomass - Current biomass in grams
 * @param {number} targetBiomass - Target biomass in grams
 * @param {number} growthRatePercentage - Growth rate as percentage
 * @param {Object} [options] - Additional options
 * @param {Array<number>} options.weatherFactors - Array of weather factors for each day
 * @param {number} options.confidenceLevel - Confidence level for prediction (0-100)
 * @returns {Object} Harvest time estimation with confidence intervals
 */
export const estimateHarvestTime = (
  currentBiomass,
  targetBiomass,
  growthRatePercentage,
  options = {}
) => {
  const {
    weatherFactors = [],
    confidenceLevel = 75,
    minGrowthRate = 0.1,
    maxDays = 365,
  } = options;

  if (currentBiomass >= targetBiomass) {
    return {
      days: 0,
      date: new Date(),
      status: "ready",
      confidence: 100,
      message: "Target biomass already reached",
    };
  }

  if (growthRatePercentage <= 0) {
    return {
      days: null,
      date: null,
      status: "stagnant",
      confidence: 0,
      message: "Growth rate is too low for reliable prediction",
    };
  }

  // Calculate base growth
  const dailyGrowthRate = growthRatePercentage / 100;
  let daysNeeded = 0;
  let projectedBiomass = currentBiomass;
  const today = new Date();

  // Simulate growth with weather factors if provided
  if (weatherFactors.length > 0) {
    for (let i = 0; i < Math.min(weatherFactors.length, maxDays); i++) {
      const weatherFactor = weatherFactors[i] || 1;
      projectedBiomass *= 1 + dailyGrowthRate * weatherFactor;
      daysNeeded++;

      if (projectedBiomass >= targetBiomass) {
        break;
      }
    }
  } else {
    // Simple exponential growth calculation
    daysNeeded =
      Math.log(targetBiomass / currentBiomass) / Math.log(1 + dailyGrowthRate);
  }

  if (daysNeeded > maxDays) {
    return {
      days: null,
      date: null,
      status: "too_long",
      confidence: 0,
      message: `Harvest would take more than ${maxDays} days at current growth rate`,
    };
  }

  daysNeeded = Math.ceil(daysNeeded);
  const harvestDate = new Date(today);
  harvestDate.setDate(today.getDate() + daysNeeded);

  // Calculate confidence based on growth rate stability
  const confidence = Math.min(
    100,
    Math.max(0, confidenceLevel * (growthRatePercentage / 10))
  );

  return {
    days: daysNeeded,
    date: harvestDate,
    status: "estimated",
    confidence: Math.round(confidence),
    message: `Estimated harvest in ${daysNeeded} days`,
    projectedBiomass: Math.round(projectedBiomass),
  };
};

/**
 * Validate farm data with comprehensive checks
 * @param {Object} farmData - Farm data object
 * @param {Object} [options] - Validation options
 * @returns {Object} Validation result with errors and warnings
 */
export const validateFarmData = (farmData, options = {}) => {
  const { strict = false, validateLocation = true } = options;

  const errors = {};
  const warnings = {};

  // Name validation
  if (!farmData.name || farmData.name.trim().length === 0) {
    errors.name = "Farm name is required";
  } else if (farmData.name.trim().length < 2) {
    errors.name = "Farm name must be at least 2 characters";
  } else if (farmData.name.trim().length > 100) {
    errors.name = "Farm name must be less than 100 characters";
  }

  // Area validation
  if (farmData.area_hectares === undefined || farmData.area_hectares === null) {
    errors.area_hectares = "Area is required";
  } else if (
    typeof farmData.area_hectares !== "number" ||
    isNaN(farmData.area_hectares)
  ) {
    errors.area_hectares = "Area must be a valid number";
  } else if (farmData.area_hectares <= 0) {
    errors.area_hectares = "Area must be greater than 0";
  } else if (farmData.area_hectares > 100000) {
    errors.area_hectares = "Area seems too large (maximum 100,000 hectares)";
    warnings.area_hectares = "Very large farm area detected";
  } else if (farmData.area_hectares < 0.1) {
    warnings.area_hectares = "Very small farm area detected";
  }

  // Location validation (if enabled)
  if (validateLocation && farmData.location) {
    const { latitude, longitude } = farmData.location;

    if (latitude !== undefined && longitude !== undefined) {
      if (latitude < -90 || latitude > 90) {
        errors.latitude = "Latitude must be between -90 and 90";
      }

      if (longitude < -180 || longitude > 180) {
        errors.longitude = "Longitude must be between -180 and 180";
      }

      // Check if location is in the ocean (very basic check)
      if (Math.abs(latitude) > 60) {
        warnings.location = "Farm location is in polar region";
      }
    }
  }

  // Soil type validation
  if (farmData.soil_type && farmData.soil_type.length > 50) {
    errors.soil_type = "Soil type description too long";
  }

  // Pasture type validation
  if (farmData.pasture_type && farmData.pasture_type.length > 50) {
    errors.pasture_type = "Pasture type description too long";
  }

  // Date validation
  if (farmData.established_date) {
    const establishedDate = new Date(farmData.established_date);
    const today = new Date();

    if (establishedDate > today) {
      errors.established_date = "Establishment date cannot be in the future";
    } else if (establishedDate.getFullYear() < 1900) {
      warnings.established_date = "Very old establishment date";
    }
  }

  // Herd size validation
  if (farmData.herd_size !== undefined) {
    if (farmData.herd_size < 0) {
      errors.herd_size = "Herd size cannot be negative";
    } else if (farmData.herd_size > 1000000) {
      errors.herd_size = "Herd size seems too large";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : null,
    hasWarnings: Object.keys(warnings).length > 0,
  };
};

/**
 * Calculate carrying capacity of a farm
 * @param {number} areaHectares - Area in hectares
 * @param {number} biomassPerHectare - Average biomass per hectare in kg
 * @param {number} [consumptionPerAnimal=2.5] - Daily consumption per animal in kg
 * @param {number} [grazingPeriod=365] - Grazing period in days
 * @returns {number} Maximum herd size the farm can support
 */
export const calculateCarryingCapacity = (
  areaHectares,
  biomassPerHectare,
  consumptionPerAnimal = CONSUMPTION_RATES.DAILY_PER_ANIMAL,
  grazingPeriod = 365
) => {
  if (
    areaHectares <= 0 ||
    biomassPerHectare <= 0 ||
    consumptionPerAnimal <= 0
  ) {
    return 0;
  }

  const totalBiomass = areaHectares * biomassPerHectare;
  const annualConsumptionPerAnimal = consumptionPerAnimal * grazingPeriod;

  return Math.floor(totalBiomass / annualConsumptionPerAnimal);
};

/**
 * Convert between metric and imperial units
 * @param {number} value - Value to convert
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 * @returns {number} Converted value
 */
export const convertUnits = (value, fromUnit, toUnit) => {
  const conversionTable = {
    // Area conversions
    "hectares-acres": CONSUMPTION_RATES.METRIC_TO_IMPERIAL.HECTARES_TO_ACRES,
    "acres-hectares":
      1 / CONSUMPTION_RATES.METRIC_TO_IMPERIAL.HECTARES_TO_ACRES,

    // Biomass conversions
    "grams-pounds": CONSUMPTION_RATES.METRIC_TO_IMPERIAL.GRAMS_TO_POUNDS,
    "pounds-grams": 1 / CONSUMPTION_RATES.METRIC_TO_IMPERIAL.GRAMS_TO_POUNDS,
    "kilograms-pounds": 2.20462,
    "pounds-kilograms": 1 / 2.20462,

    // Distance conversions
    "meters-feet": 3.28084,
    "feet-meters": 1 / 3.28084,
    "kilometers-miles": 0.621371,
    "miles-kilometers": 1 / 0.621371,
  };

  const key = `${fromUnit}-${toUnit}`;
  const conversionFactor = conversionTable[key];

  if (conversionFactor === undefined) {
    throw new Error(`Conversion from ${fromUnit} to ${toUnit} not supported`);
  }

  return value * conversionFactor;
};

/**
 * Calculate pasture utilization percentage
 * @param {number} consumedBiomass - Biomass consumed in grams
 * @param {number} availableBiomass - Total available biomass in grams
 * @returns {number} Utilization percentage
 */
export const calculateUtilizationPercentage = (
  consumedBiomass,
  availableBiomass
) => {
  if (availableBiomass <= 0) return 0;
  return Math.min(100, (consumedBiomass / availableBiomass) * 100);
};

/**
 * Calculate rainfall impact on growth
 * @param {number} rainfallMM - Rainfall in millimeters
 * @returns {number} Growth factor (0-2)
 */
export const calculateRainfallImpact = (rainfallMM) => {
  // Simple model: optimal growth at 25-75mm per week
  const weeklyRainfall = rainfallMM;

  if (weeklyRainfall < 10) return 0.3; // Drought conditions
  if (weeklyRainfall < 25) return 0.7; // Below optimal
  if (weeklyRainfall <= 75) return 1.0; // Optimal
  if (weeklyRainfall <= 150) return 0.8; // Saturated
  return 0.5; // Flood conditions
};

export default {
  calculateBiomassStatus,
  calculateGrazingDays,
  calculateGrazingPressure,
  formatArea,
  formatBiomass,
  calculateGrowthRate,
  estimateHarvestTime,
  validateFarmData,
  calculateCarryingCapacity,
  convertUnits,
  calculateUtilizationPercentage,
  calculateRainfallImpact,
  BIOMASS_THRESHOLDS,
  CONSUMPTION_RATES,
  GROWTH_RATE_CATEGORIES,
};
