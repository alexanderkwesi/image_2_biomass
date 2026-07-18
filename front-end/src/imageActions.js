// imageActions.js
import { API_ENDPOINTS } from "./EndUrls";

export const IMAGE_ACTION_TYPES = {
  UPLOAD_REQUEST: "IMAGE/UPLOAD_REQUEST",
  UPLOAD_SUCCESS: "IMAGE/UPLOAD_SUCCESS",
  UPLOAD_FAILURE: "IMAGE/UPLOAD_FAILURE",
  VALIDATE_REQUEST: "IMAGE/VALIDATE_REQUEST",
  VALIDATE_SUCCESS: "IMAGE/VALIDATE_SUCCESS",
  VALIDATE_FAILURE: "IMAGE/VALIDATE_FAILURE",
  PREDICTION_REQUEST: "IMAGE/PREDICTION_REQUEST",
  PREDICTION_SUCCESS: "IMAGE/PREDICTION_SUCCESS",
  PREDICTION_FAILURE: "IMAGE/PREDICTION_FAILURE",
  CLEAR_PREDICTION: "IMAGE/CLEAR_PREDICTION",
  SET_UPLOAD_PROGRESS: "IMAGE/SET_UPLOAD_PROGRESS",
  SELECT_IMAGE: "IMAGE/SELECT_IMAGE",
  CLEAR_IMAGE: "IMAGE/CLEAR_IMAGE",
};

// Helper function for making API calls with fetch
const apiRequest = async (url, options = {}) => {
  const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Get auth token from localStorage for authenticated requests
  const token = localStorage.getItem("access_token");
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
        errorData.detail ||
        `HTTP error! status: ${response.status}`
    );
  }

  return await response.json();
};

// Helper for file upload with progress tracking
const uploadWithProgress = async (url, formData, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          resolve(xhr.responseText);
        }
      } else {
        let errorMessage = `Upload failed with status: ${xhr.status}`;
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData.message || errorData.detail || errorMessage;
        } catch (e) {
          // If response is not JSON, use default message
        }
        reject(new Error(errorMessage));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload was cancelled"));
    });

    xhr.open("POST", url);

    // Set auth header if token exists
    const token = localStorage.getItem("access_token");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.setRequestHeader("Accept", "application/json");

    xhr.send(formData);
  });
};

// Helper function to convert File/Blob to Base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Helper function to convert Base64 to Blob
const base64ToBlob = (base64) => {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
};

// Select an image from file input
export const selectImage = (file) => (dispatch) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      dispatch({
        type: IMAGE_ACTION_TYPES.CLEAR_IMAGE,
      });
      resolve(null);
      return;
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      reject(
        new Error(
          "Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP)."
        )
      );
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      reject(new Error("File size too large. Maximum size is 10MB."));
      return;
    }

    // Read file as data URL for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = {
        file: file,
        previewUrl: e.target.result,
        name: file.name,
        type: file.type,
        size: file.size,
      };

      dispatch({
        type: IMAGE_ACTION_TYPES.SELECT_IMAGE,
        payload: imageData,
      });

      resolve(imageData);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read image file"));
    };

    reader.readAsDataURL(file);
  });
};

// Clear selected image
export const clearImage = () => (dispatch) => {
  dispatch({
    type: IMAGE_ACTION_TYPES.CLEAR_IMAGE,
  });
};

// Upload image to server
export const uploadImage =
  (imageData, metadata = {}, onProgress) =>
  async (dispatch) => {
    dispatch({ type: IMAGE_ACTION_TYPES.UPLOAD_REQUEST });

    try {
      const formData = new FormData();

      // Append image file
      if (imageData.file) {
        formData.append("image", imageData.file);
      } else if (imageData.base64) {
        // Convert base64 to blob if needed
        const blob = base64ToBlob(imageData.base64);
        formData.append(
          "image",
          blob,
          imageData.name || `image_${Date.now()}.jpg`
        );
      } else {
        throw new Error("No image data provided");
      }

      // Append metadata
      if (metadata) {
        formData.append("metadata", JSON.stringify(metadata));
      }

      const response = await uploadWithProgress(
        API_ENDPOINTS.IMAGES.UPLOAD,
        formData,
        onProgress
      );

      dispatch({
        type: IMAGE_ACTION_TYPES.UPLOAD_SUCCESS,
        payload: response,
      });

      return {
        success: true,
        imageId: response.image_id,
        imageUrl: response.image_url,
        data: response,
      };
    } catch (error) {
      dispatch({
        type: IMAGE_ACTION_TYPES.UPLOAD_FAILURE,
        payload: error.message || "Upload failed",
      });

      return {
        success: false,
        error: error.message,
      };
    }
  };

// Validate image (optional - could check dimensions, quality, etc.)
export const validateImage = (imageData) => async (dispatch) => {
  dispatch({ type: IMAGE_ACTION_TYPES.VALIDATE_REQUEST });

  try {
    // For web, we can validate client-side first
    const validations = {
      isValid: true,
      messages: [],
      dimensions: null,
      fileSize: imageData.size,
      fileType: imageData.type,
    };

    // Check image dimensions if it's already loaded
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        validations.dimensions = {
          width: img.width,
          height: img.height,
        };

        // Add dimension validation logic if needed
        if (img.width < 100 || img.height < 100) {
          validations.isValid = false;
          validations.messages.push(
            "Image dimensions too small. Minimum 100x100 pixels."
          );
        }

        // If we want to validate with server as well
        // we could make an API call here

        dispatch({
          type: IMAGE_ACTION_TYPES.VALIDATE_SUCCESS,
          payload: validations,
        });

        resolve(validations);
      };

      img.onerror = () => {
        validations.isValid = false;
        validations.messages.push("Failed to load image for validation");

        dispatch({
          type: IMAGE_ACTION_TYPES.VALIDATE_FAILURE,
          payload: "Failed to validate image",
        });

        resolve(validations);
      };

      img.src = imageData.previewUrl || imageData.base64 || imageData.url;
    });
  } catch (error) {
    dispatch({
      type: IMAGE_ACTION_TYPES.VALIDATE_FAILURE,
      payload: error.message || "Validation failed",
    });

    return {
      valid: false,
      error: error.message,
    };
  }
};

// Get prediction for an image
export const getPrediction = (imageId) => async (dispatch) => {
  dispatch({ type: IMAGE_ACTION_TYPES.PREDICTION_REQUEST });

  try {
    const response = await apiRequest(
      `${API_ENDPOINTS.IMAGES.PREDICTION}/${imageId}`
    );

    dispatch({
      type: IMAGE_ACTION_TYPES.PREDICTION_SUCCESS,
      payload: response,
    });

    return {
      success: true,
      prediction: response,
    };
  } catch (error) {
    dispatch({
      type: IMAGE_ACTION_TYPES.PREDICTION_FAILURE,
      payload: error.message || "Prediction failed",
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

// Alternative: Get prediction directly from uploaded image
export const getPredictionFromImage =
  (imageData, metadata = {}) =>
  async (dispatch) => {
    dispatch({ type: IMAGE_ACTION_TYPES.PREDICTION_REQUEST });

    try {
      // First upload the image
      const uploadResult = await dispatch(uploadImage(imageData, metadata));

      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Then get prediction
      const predictionResult = await dispatch(
        getPrediction(uploadResult.imageId)
      );

      if (!predictionResult.success) {
        throw new Error(predictionResult.error);
      }

      return predictionResult;
    } catch (error) {
      dispatch({
        type: IMAGE_ACTION_TYPES.PREDICTION_FAILURE,
        payload: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  };

// Clear prediction data
export const clearPrediction = () => (dispatch) => {
  dispatch({ type: IMAGE_ACTION_TYPES.CLEAR_PREDICTION });
};

// Set upload progress (can be called externally if needed)
export const setUploadProgress = (progress) => (dispatch) => {
  dispatch({
    type: IMAGE_ACTION_TYPES.SET_UPLOAD_PROGRESS,
    payload: progress,
  });
};

// Batch upload multiple images
export const uploadMultipleImages =
  (files, metadata = {}, onProgress) =>
  async (dispatch) => {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const individualMetadata = {
        ...metadata,
        batch_index: i,
        batch_total: files.length,
      };

      try {
        // Select the image first
        const imageData = {
          file: file,
          name: file.name,
          type: file.type,
          size: file.size,
        };

        // Create a progress callback for this specific file
        const fileProgressCallback = (progress) => {
          if (onProgress) {
            // Calculate overall progress
            const overallProgress = Math.round(
              (i * 100 + progress) / files.length
            );
            onProgress(overallProgress, i, file.name);
          }
        };

        // Upload the image
        const result = await dispatch(
          uploadImage(imageData, individualMetadata, fileProgressCallback)
        );
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          fileName: file.name,
        });
      }
    }

    return results;
  };
