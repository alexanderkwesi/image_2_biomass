// reducers/imageReducer.ts
import { ImageActionTypes, ImageAction } from "../actions/imageActions";

// Types
export interface ImageData {
  id: string | number;
  name: string;
  url: string;
  size: number; // in bytes
  type: string; // MIME type
  width?: number;
  height?: number;
  uploadedAt: string;
  metadata?: Record<string, any>;
  thumbnailUrl?: string;
  compressedUrl?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues?: string[];
  warnings?: string[];
  imageInfo?: {
    width: number,
    height: number,
    size: number,
    format: string,
    hasExif: boolean,
  };
  constraints?: {
    maxSize?: number,
    allowedFormats?: string[],
    minDimensions?: { width: number, height: number },
    maxDimensions?: { width: number, height: number },
  };
}

export interface PredictionResult {
  id: string | number;
  imageId: string | number;
  model: string;
  modelVersion: string;
  predictions: Array<{
    label: string,
    confidence: number,
    boundingBox?: {
      x: number,
      y: number,
      width: number,
      height: number,
    },
    segmentation?: number[][], // For image segmentation
    keypoints?: Array<{ x: number, y: number, label?: string }>, // For pose estimation
  }>;
  processingTime: number; // in milliseconds
  processedAt: string;
  metadata?: Record<string, any>;
}

export interface ImageProcessingOptions {
  resize?: {
    width: number,
    height: number,
    maintainAspectRatio?: boolean,
  };
  compression?: {
    quality: number, // 0-100
    format: "jpeg" | "png" | "webp",
  };
  filters?: {
    brightness?: number,
    contrast?: number,
    saturation?: number,
    grayscale?: boolean,
  };
  crop?: {
    x: number,
    y: number,
    width: number,
    height: number,
  };
}

export interface BatchProcessingResult {
  batchId: string;
  total: number;
  completed: number;
  failed: number;
  results: Array<{
    imageId: string | number,
    success: boolean,
    prediction?: PredictionResult,
    error?: string,
  }>;
  status: "pending" | "processing" | "completed" | "failed";
}

export interface ImageState {
  // Current image
  currentImage: ImageData | null;
  uploadProgress: number;

  // Processing states
  isUploading: boolean;
  isValidating: boolean;
  isProcessing: boolean;
  isPredicting: boolean;
  isBatchProcessing: boolean;

  // Results
  validationResult: ValidationResult | null;
  prediction: PredictionResult | null;
  processingHistory: PredictionResult[];
  batchProcessingResult: BatchProcessingResult | null;

  // Errors and messages
  error: string | null;
  warning: string | null;

  // Options and configuration
  processingOptions: ImageProcessingOptions;
  allowedFormats: string[];
  maxFileSize: number; // in bytes

  // UI state
  showAdvancedOptions: boolean;
  selectedModel: string;
  models: Array<{
    id: string,
    name: string,
    description: string,
    type: "classification" | "detection" | "segmentation" | "pose",
    accuracy: number,
    latency: number,
  }>;
}

// Initial state
const initialState: ImageState = {
  // Current image
  currentImage: null,
  uploadProgress: 0,

  // Processing states
  isUploading: false,
  isValidating: false,
  isProcessing: false,
  isPredicting: false,
  isBatchProcessing: false,

  // Results
  validationResult: null,
  prediction: null,
  processingHistory: [],
  batchProcessingResult: null,

  // Errors and messages
  error: null,
  warning: null,

  // Options and configuration
  processingOptions: {
    resize: {
      width: 800,
      height: 600,
      maintainAspectRatio: true,
    },
    compression: {
      quality: 85,
      format: "jpeg",
    },
  },
  allowedFormats: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  maxFileSize: 10 * 1024 * 1024, // 10MB

  // UI state
  showAdvancedOptions: false,
  selectedModel: "default",
  models: [
    {
      id: "default",
      name: "Default Classifier",
      description: "General purpose image classification",
      type: "classification",
      accuracy: 0.92,
      latency: 150,
    },
    {
      id: "high-accuracy",
      name: "High Accuracy Model",
      description: "Higher accuracy with slightly slower processing",
      type: "classification",
      accuracy: 0.96,
      latency: 300,
    },
    {
      id: "object-detection",
      name: "Object Detector",
      description: "Detects and localizes multiple objects",
      type: "detection",
      accuracy: 0.89,
      latency: 250,
    },
    {
      id: "segmentation",
      name: "Segmentation Model",
      description: "Pixel-level segmentation",
      type: "segmentation",
      accuracy: 0.91,
      latency: 400,
    },
  ],
};

// Helper functions
const addToHistory = (
  history: PredictionResult[],
  prediction: PredictionResult,
  maxHistory = 10
): PredictionResult[] => {
  const newHistory = [prediction, ...history];
  return newHistory.slice(0, maxHistory);
};

const updateBatchProgress = (
  batchResult: BatchProcessingResult | null,
  progress: Partial<BatchProcessingResult>
): BatchProcessingResult | null => {
  if (!batchResult) return null;
  return { ...batchResult, ...progress };
};

// Main reducer
const imageReducer = (
  state: ImageState = initialState,
  action: ImageAction
): ImageState => {
  switch (action.type) {
    // Upload flow
    case ImageActionTypes.UPLOAD_REQUEST:
      return {
        ...state,
        isUploading: true,
        uploadProgress: 0,
        error: null,
        warning: null,
        currentImage: null,
        validationResult: null,
        prediction: null,
      };

    case ImageActionTypes.UPLOAD_PROGRESS:
      return {
        ...state,
        uploadProgress: action.payload,
      };

    case ImageActionTypes.UPLOAD_SUCCESS:
      return {
        ...state,
        isUploading: false,
        currentImage: action.payload,
        uploadProgress: 100,
        error: null,
      };

    case ImageActionTypes.UPLOAD_FAILURE:
      return {
        ...state,
        isUploading: false,
        error: action.payload,
        uploadProgress: 0,
      };

    // Validation flow
    case ImageActionTypes.VALIDATE_REQUEST:
      return {
        ...state,
        isValidating: true,
        error: null,
        warning: null,
      };

    case ImageActionTypes.VALIDATE_SUCCESS:
      return {
        ...state,
        isValidating: false,
        validationResult: action.payload,
        error: null,
        warning: action.payload.warnings?.length
          ? "Image has some warnings"
          : null,
      };

    case ImageActionTypes.VALIDATE_FAILURE:
      return {
        ...state,
        isValidating: false,
        error: action.payload,
        validationResult: null,
      };

    // Prediction flow
    case ImageActionTypes.PREDICTION_REQUEST:
      return {
        ...state,
        isPredicting: true,
        error: null,
        warning: null,
      };

    case ImageActionTypes.PREDICTION_SUCCESS:
      return {
        ...state,
        isPredicting: false,
        prediction: action.payload,
        processingHistory: addToHistory(
          state.processingHistory,
          action.payload
        ),
        error: null,
      };

    case ImageActionTypes.PREDICTION_FAILURE:
      return {
        ...state,
        isPredicting: false,
        error: action.payload,
      };

    // Processing (resize, compress, etc.)
    case ImageActionTypes.PROCESSING_REQUEST:
      return {
        ...state,
        isProcessing: true,
        error: null,
      };

    case ImageActionTypes.PROCESSING_SUCCESS:
      return {
        ...state,
        isProcessing: false,
        currentImage: action.payload,
        error: null,
      };

    case ImageActionTypes.PROCESSING_FAILURE:
      return {
        ...state,
        isProcessing: false,
        error: action.payload,
      };

    // Batch processing
    case ImageActionTypes.BATCH_PROCESSING_REQUEST:
      return {
        ...state,
        isBatchProcessing: true,
        batchProcessingResult: {
          batchId: action.payload.batchId,
          total: action.payload.imageIds.length,
          completed: 0,
          failed: 0,
          results: [],
          status: "processing",
        },
        error: null,
      };

    case ImageActionTypes.BATCH_PROCESSING_PROGRESS:
      if (!state.batchProcessingResult) return state;

      return {
        ...state,
        batchProcessingResult: updateBatchProgress(
          state.batchProcessingResult,
          {
            completed: action.payload.completed,
            failed: action.payload.failed,
            results:
              action.payload.results || state.batchProcessingResult.results,
          }
        ),
      };

    case ImageActionTypes.BATCH_PROCESSING_SUCCESS:
      return {
        ...state,
        isBatchProcessing: false,
        batchProcessingResult: state.batchProcessingResult
          ? {
              ...state.batchProcessingResult,
              status: "completed",
              results: action.payload,
            }
          : null,
        error: null,
      };

    case ImageActionTypes.BATCH_PROCESSING_FAILURE:
      return {
        ...state,
        isBatchProcessing: false,
        error: action.payload,
        batchProcessingResult: state.batchProcessingResult
          ? {
              ...state.batchProcessingResult,
              status: "failed",
            }
          : null,
      };

    // Configuration and options
    case ImageActionTypes.SET_PROCESSING_OPTIONS:
      return {
        ...state,
        processingOptions: {
          ...state.processingOptions,
          ...action.payload,
        },
      };

    case ImageActionTypes.SET_SELECTED_MODEL:
      return {
        ...state,
        selectedModel: action.payload,
      };

    case ImageActionTypes.UPDATE_MODELS:
      return {
        ...state,
        models: action.payload,
      };

    case ImageActionTypes.SET_ALLOWED_FORMATS:
      return {
        ...state,
        allowedFormats: action.payload,
      };

    case ImageActionTypes.SET_MAX_FILE_SIZE:
      return {
        ...state,
        maxFileSize: action.payload,
      };

    // UI state
    case ImageActionTypes.TOGGLE_ADVANCED_OPTIONS:
      return {
        ...state,
        showAdvancedOptions: !state.showAdvancedOptions,
      };

    // Clear and reset
    case ImageActionTypes.CLEAR_PREDICTION:
      return {
        ...state,
        prediction: null,
        error: null,
        warning: null,
      };

    case ImageActionTypes.CLEAR_IMAGE:
      return {
        ...state,
        currentImage: null,
        validationResult: null,
        prediction: null,
        error: null,
        warning: null,
        uploadProgress: 0,
      };

    case ImageActionTypes.CLEAR_HISTORY:
      return {
        ...state,
        processingHistory: [],
      };

    case ImageActionTypes.CLEAR_BATCH_RESULT:
      return {
        ...state,
        batchProcessingResult: null,
      };

    case ImageActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        warning: null,
      };

    case ImageActionTypes.RESET_IMAGE_STATE:
      return {
        ...initialState,
        models: state.models, // Keep models configuration
      };

    // Image manipulation
    case ImageActionTypes.ROTATE_IMAGE:
      // Note: This would typically be handled by an action creator that processes the image
      return {
        ...state,
        isProcessing: true,
        error: null,
      };

    case ImageActionTypes.CROP_IMAGE:
      return {
        ...state,
        isProcessing: true,
        error: null,
      };

    case ImageActionTypes.ADJUST_IMAGE:
      return {
        ...state,
        isProcessing: true,
        processingOptions: {
          ...state.processingOptions,
          filters: {
            ...state.processingOptions.filters,
            ...action.payload,
          },
        },
        error: null,
      };

    // Save and export
    case ImageActionTypes.SAVE_PROCESSED_IMAGE_REQUEST:
      return {
        ...state,
        isProcessing: true,
        error: null,
      };

    case ImageActionTypes.SAVE_PROCESSED_IMAGE_SUCCESS:
      return {
        ...state,
        isProcessing: false,
        currentImage: action.payload,
        error: null,
      };

    case ImageActionTypes.SAVE_PROCESSED_IMAGE_FAILURE:
      return {
        ...state,
        isProcessing: false,
        error: action.payload,
      };

    // Compare predictions
    case ImageActionTypes.COMPARE_PREDICTIONS_REQUEST:
      return {
        ...state,
        isPredicting: true,
        error: null,
      };

    case ImageActionTypes.COMPARE_PREDICTIONS_SUCCESS:
      return {
        ...state,
        isPredicting: false,
        // Could store comparison results in a separate state
        error: null,
      };

    case ImageActionTypes.COMPARE_PREDICTIONS_FAILURE:
      return {
        ...state,
        isPredicting: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

// Selectors
export const imageSelectors = {
  // Basic selectors
  getCurrentImage: (state: { image: ImageState }) => state.image.currentImage,
  getUploadProgress: (state: { image: ImageState }) =>
    state.image.uploadProgress,
  getIsUploading: (state: { image: ImageState }) => state.image.isUploading,
  getIsValidating: (state: { image: ImageState }) => state.image.isValidating,
  getIsPredicting: (state: { image: ImageState }) => state.image.isPredicting,
  getIsProcessing: (state: { image: ImageState }) => state.image.isProcessing,
  getIsBatchProcessing: (state: { image: ImageState }) =>
    state.image.isBatchProcessing,
  getValidationResult: (state: { image: ImageState }) =>
    state.image.validationResult,
  getPrediction: (state: { image: ImageState }) => state.image.prediction,
  getProcessingHistory: (state: { image: ImageState }) =>
    state.image.processingHistory,
  getBatchProcessingResult: (state: { image: ImageState }) =>
    state.image.batchProcessingResult,
  getError: (state: { image: ImageState }) => state.image.error,
  getWarning: (state: { image: ImageState }) => state.image.warning,
  getProcessingOptions: (state: { image: ImageState }) =>
    state.image.processingOptions,
  getAllowedFormats: (state: { image: ImageState }) =>
    state.image.allowedFormats,
  getMaxFileSize: (state: { image: ImageState }) => state.image.maxFileSize,
  getShowAdvancedOptions: (state: { image: ImageState }) =>
    state.image.showAdvancedOptions,
  getSelectedModel: (state: { image: ImageState }) => state.image.selectedModel,
  getModels: (state: { image: ImageState }) => state.image.models,

  // Derived selectors
  getSelectedModelDetails: (state: { image: ImageState }) => {
    const model = state.image.models.find(
      (m) => m.id === state.image.selectedModel
    );
    return model || state.image.models[0];
  },

  getIsImageUploaded: (state: { image: ImageState }) =>
    !!state.image.currentImage,

  getIsImageValid: (state: { image: ImageState }) =>
    state.image.validationResult?.isValid || false,

  getHasPrediction: (state: { image: ImageState }) => !!state.image.prediction,

  getPredictionConfidence: (state: { image: ImageState }) => {
    if (!state.image.prediction?.predictions?.length) return 0;
    return Math.max(
      ...state.image.prediction.predictions.map((p) => p.confidence)
    );
  },

  getTopPrediction: (state: { image: ImageState }) => {
    if (!state.image.prediction?.predictions?.length) return null;
    return state.image.prediction.predictions.reduce((top, current) =>
      current.confidence > top.confidence ? current : top
    );
  },

  getFormattedAllowedFormats: (state: { image: ImageState }) => {
    return state.image.allowedFormats
      .map((format) => {
        switch (format) {
          case "image/jpeg":
            return ".jpg, .jpeg";
          case "image/png":
            return ".png";
          case "image/webp":
            return ".webp";
          case "image/gif":
            return ".gif";
          default:
            return format.replace("image/", ".");
        }
      })
      .join(", ");
  },

  getFormattedMaxFileSize: (state: { image: ImageState }) => {
    const size = state.image.maxFileSize;
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(size / 1024).toFixed(1)} KB`;
  },

  getBatchProgressPercentage: (state: { image: ImageState }) => {
    if (!state.image.batchProcessingResult) return 0;
    const { completed, total } = state.image.batchProcessingResult;
    return total > 0 ? (completed / total) * 100 : 0;
  },

  getCanProcessImage: (state: { image: ImageState }) => {
    return (
      !!state.image.currentImage &&
      !state.image.isUploading &&
      !state.image.isValidating &&
      !state.image.isProcessing
    );
  },

  getCanPredict: (state: { image: ImageState }) => {
    return (
      !!state.image.currentImage &&
      state.image.validationResult?.isValid &&
      !state.image.isPredicting
    );
  },
};

// Persistence helpers
export const persistImageState = (state: ImageState): void => {
  try {
    // Don't persist large data or temporary states
    const stateToPersist = {
      processingOptions: state.processingOptions,
      allowedFormats: state.allowedFormats,
      maxFileSize: state.maxFileSize,
      selectedModel: state.selectedModel,
      showAdvancedOptions: state.showAdvancedOptions,
      models: state.models,
      processingHistory: state.processingHistory.slice(0, 5), // Keep only last 5
    };
    localStorage.setItem(
      "image_processing_state",
      JSON.stringify(stateToPersist)
    );
  } catch (error) {
    console.error("Failed to persist image state:", error);
  }
};

export const loadImageState = (): Partial<ImageState> => {
  try {
    const savedState = localStorage.getItem("image_processing_state");
    if (!savedState) return {};

    return JSON.parse(savedState);
  } catch (error) {
    console.error("Failed to load image state:", error);
    return {};
  }
};

export const clearPersistedImageState = (): void => {
  try {
    localStorage.removeItem("image_processing_state");
  } catch (error) {
    console.error("Failed to clear image state:", error);
  }
};

export default imageReducer;
