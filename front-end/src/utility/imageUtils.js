// utils/imageUtils.js - Enhanced for React Web

// Constants
export const IMAGE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1080,
  DEFAULT_QUALITY: 0.8,
  SUPPORTED_FORMATS: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ],
  SUPPORTED_EXTENSIONS: [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
    ".svg",
  ],
  THUMBNAIL_SIZE: 320,
  ASPECT_RATIOS: {
    "1:1": { width: 1, height: 1 },
    "4:3": { width: 4, height: 3 },
    "16:9": { width: 16, height: 9 },
    "3:2": { width: 3, height: 2 },
  },
};

// Utility Functions

/**
 * Compress and resize image for web use
 * @param {string|File|Blob} imageSource - Image source (URL, File, or Blob)
 * @param {Object} options - Compression options
 * @returns {Promise<Blob>} Compressed image blob
 */
export const compressImage = async (imageSource, options = {}) => {
  const {
    quality = IMAGE_CONFIG.DEFAULT_QUALITY,
    maxWidth = IMAGE_CONFIG.MAX_WIDTH,
    maxHeight = IMAGE_CONFIG.MAX_HEIGHT,
    outputFormat = "image/jpeg",
    maintainAspectRatio = true,
  } = options;

  try {
    // Convert various input types to image element
    const img = await loadImage(imageSource);

    // Calculate new dimensions
    let { width, height } = calculateDimensions(
      img,
      maxWidth,
      maxHeight,
      maintainAspectRatio
    );

    // Create canvas for processing
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    // Apply image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw and compress image
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas to Blob conversion failed"));
            return;
          }

          resolve({
            blob,
            width,
            height,
            originalWidth: img.width,
            originalHeight: img.height,
            compressionRatio: calculateCompressionRatio(img, blob),
            mimeType: outputFormat,
          });
        },
        outputFormat,
        quality
      );
    });
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
};

/**
 * Load image from various sources
 * @param {string|File|Blob} source - Image source
 * @returns {Promise<HTMLImageElement>} Loaded image element
 */
const loadImage = (source) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);
    img.onerror = reject;

    // Handle different source types
    if (typeof source === "string") {
      img.src = source;
    } else if (source instanceof File || source instanceof Blob) {
      const url = URL.createObjectURL(source);
      img.src = url;
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
    } else {
      reject(new Error("Unsupported image source type"));
    }
  });
};

/**
 * Calculate dimensions for resizing
 */
const calculateDimensions = (img, maxWidth, maxHeight, maintainAspectRatio) => {
  let width = img.width;
  let height = img.height;

  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  if (maintainAspectRatio) {
    const aspectRatio = width / height;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
  } else {
    width = Math.min(width, maxWidth);
    height = Math.min(height, maxHeight);
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

/**
 * Calculate compression ratio
 */
const calculateCompressionRatio = (img, compressedBlob) => {
  // Estimate original size (rough approximation)
  const estimatedOriginalSize = img.width * img.height * 4; // RGBA bytes
  const compressionRatio = (compressedBlob.size / estimatedOriginalSize) * 100;

  return {
    percentage: Math.round(compressionRatio),
    originalSize: compressedBlob.size,
    estimatedOriginalSize,
  };
};

/**
 * Get image size and dimensions
 * @param {string|File|Blob} imageSource - Image source
 * @returns {Promise<Object>} Image metadata
 */
export const getImageMetadata = async (imageSource) => {
  try {
    const img = await loadImage(imageSource);

    let fileSize = 0;

    // Try to get actual file size for File/Blob
    if (imageSource instanceof File) {
      fileSize = imageSource.size;
    } else if (imageSource instanceof Blob) {
      fileSize = imageSource.size;
    } else if (typeof imageSource === "string") {
      // For URLs, try to fetch and get size
      try {
        const response = await fetch(imageSource, { method: "HEAD" });
        const contentLength = response.headers.get("content-length");
        if (contentLength) {
          fileSize = parseInt(contentLength, 10);
        }
      } catch (fetchError) {
        // Fallback to estimated size
        fileSize = img.width * img.height * 4;
      }
    }

    return {
      width: img.width,
      height: img.height,
      fileSize,
      aspectRatio: calculateAspectRatio(img.width, img.height),
      mimeType: getMimeType(imageSource),
      isPortrait: img.height > img.width,
      isLandscape: img.width > img.height,
      isSquare: img.width === img.height,
    };
  } catch (error) {
    console.error("Error getting image metadata:", error);
    throw error;
  }
};

/**
 * Calculate aspect ratio
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} Aspect ratio (e.g., "16:9")
 */
export const calculateAspectRatio = (width, height) => {
  if (width === 0 || height === 0) return "0:0";

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);

  return `${width / divisor}:${height / divisor}`;
};

/**
 * Get closest standard aspect ratio
 * @param {string} aspectRatio - Aspect ratio (e.g., "16:9")
 * @returns {string} Closest standard aspect ratio
 */
export const getClosestAspectRatio = (aspectRatio) => {
  const [w, h] = aspectRatio.split(":").map(Number);
  const ratio = w / h;

  const ratios = Object.entries(IMAGE_CONFIG.ASPECT_RATIOS).map(
    ([name, dims]) => ({
      name,
      ratio: dims.width / dims.height,
      diff: Math.abs(ratio - dims.width / dims.height),
    })
  );

  ratios.sort((a, b) => a.diff - b.diff);
  return ratios[0]?.name || aspectRatio;
};

/**
 * Get MIME type from source
 */
const getMimeType = (source) => {
  if (source instanceof File || source instanceof Blob) {
    return source.type;
  }

  if (typeof source === "string") {
    const extension = source.split(".").pop().toLowerCase();
    const mimeMap = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
      svg: "image/svg+xml",
    };

    return mimeMap[extension] || "image/jpeg";
  }

  return "image/jpeg";
};

/**
 * Convert image to Base64
 * @param {string|File|Blob} imageSource - Image source
 * @param {Object} options - Conversion options
 * @returns {Promise<string>} Base64 string
 */
export const convertToBase64 = async (imageSource, options = {}) => {
  const {
    includeMimePrefix = true,
    compress = false,
    compressOptions = {},
  } = options;

  try {
    let blob;

    if (compress) {
      const result = await compressImage(imageSource, compressOptions);
      blob = result.blob;
    } else if (imageSource instanceof File || imageSource instanceof Blob) {
      blob = imageSource;
    } else if (typeof imageSource === "string") {
      const response = await fetch(imageSource);
      blob = await response.blob();
    } else {
      throw new Error("Unsupported image source type");
    }

    return await blobToBase64(blob, includeMimePrefix);
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw error;
  }
};

/**
 * Convert blob to base64
 */
export const blobToBase64 = (blob, includeMimePrefix = true) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (includeMimePrefix) {
        resolve(reader.result);
      } else {
        // Remove data URL prefix
        const base64 = reader.result.split(",")[1] || reader.result;
        resolve(base64);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert base64 to blob
 * @param {string} base64 - Base64 string
 * @returns {Blob} Image blob
 */
export const base64ToBlob = (base64) => {
  // Remove data URL prefix if present
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;

  // Decode base64
  const byteCharacters = atob(base64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  // Get mime type from base64 string
  let mimeType = "image/jpeg";
  if (base64.startsWith("data:")) {
    mimeType = base64.substring(5, base64.indexOf(";"));
  }

  return new Blob(byteArrays, { type: mimeType });
};

/**
 * Create thumbnail from image
 * @param {string|File|Blob} imageSource - Image source
 * @param {Object} options - Thumbnail options
 * @returns {Promise<Blob>} Thumbnail blob
 */
export const createThumbnail = async (imageSource, options = {}) => {
  const {
    size = IMAGE_CONFIG.THUMBNAIL_SIZE,
    quality = 0.7,
    crop = false,
    cropOptions = {},
  } = options;

  const img = await loadImage(imageSource);

  let width,
    height,
    sx = 0,
    sy = 0;

  if (crop) {
    // Calculate crop area
    const cropWidth = cropOptions.width || Math.min(img.width, img.height);
    const cropHeight = cropOptions.height || cropWidth;
    sx = cropOptions.x || (img.width - cropWidth) / 2;
    sy = cropOptions.y || (img.height - cropHeight) / 2;

    width = size;
    height = size;
  } else {
    // Scale to fit
    const aspectRatio = img.width / img.height;
    if (img.width > img.height) {
      width = size;
      height = size / aspectRatio;
    } else {
      height = size;
      width = size * aspectRatio;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (crop) {
    ctx.drawImage(
      img,
      sx,
      sy,
      cropOptions.width || Math.min(img.width, img.height),
      cropOptions.height || Math.min(img.width, img.height),
      0,
      0,
      width,
      height
    );
  } else {
    ctx.drawImage(img, 0, 0, width, height);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
};

/**
 * Validate image format and size
 * @param {File} file - Image file
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateImage = (file, options = {}) => {
  const {
    maxSize = IMAGE_CONFIG.MAX_SIZE,
    allowedFormats = IMAGE_CONFIG.SUPPORTED_FORMATS,
    checkDimensions = true,
    minWidth = 100,
    minHeight = 100,
  } = options;

  const errors = [];

  // Check file type
  if (!allowedFormats.includes(file.type)) {
    errors.push(
      `Unsupported file format. Allowed: ${allowedFormats.join(", ")}`
    );
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    errors.push(`File size exceeds ${maxSizeMB}MB limit`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    file,
    size: file.size,
    type: file.type,
  };
};

/**
 * Process multiple images
 * @param {FileList|Array<File>} files - Image files
 * @param {Object} options - Processing options
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} Processed images
 */
export const processImagesBatch = async (
  files,
  options = {},
  onProgress = null
) => {
  const fileArray = Array.from(files);
  const results = [];

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];

    try {
      // Validate
      const validation = validateImage(file, options);
      if (!validation.isValid) {
        results.push({
          file,
          success: false,
          error: validation.errors.join(", "),
          index: i,
        });
        continue;
      }

      // Compress
      const compressed = await compressImage(file, options);

      // Generate thumbnail
      const thumbnail = await createThumbnail(file, {
        size: IMAGE_CONFIG.THUMBNAIL_SIZE,
        quality: 0.6,
      });

      // Get metadata
      const metadata = await getImageMetadata(file);

      results.push({
        file,
        success: true,
        compressed,
        thumbnail,
        metadata,
        index: i,
        name: file.name,
        size: file.size,
        compressedSize: compressed.blob.size,
      });
    } catch (error) {
      results.push({
        file,
        success: false,
        error: error.message,
        index: i,
      });
    }

    // Report progress
    if (onProgress) {
      const progress = Math.round(((i + 1) / fileArray.length) * 100);
      onProgress(progress, i + 1, fileArray.length);
    }
  }

  return results;
};

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @param {string} prefix - Prefix for filename
 * @returns {string} Unique filename
 */
export const generateUniqueFilename = (originalName, prefix = "image") => {
  const extension = originalName.split(".").pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  return `${prefix}_${timestamp}_${random}.${extension}`;
};

/**
 * Download image
 * @param {Blob|string} image - Image blob or base64
 * @param {string} filename - Download filename
 */
export const downloadImage = (image, filename = "image.jpg") => {
  let blob;

  if (typeof image === "string") {
    // Base64 string
    blob = base64ToBlob(image);
  } else if (image instanceof Blob) {
    blob = image;
  } else {
    throw new Error("Unsupported image type for download");
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Get dominant color from image
 * @param {string|File|Blob} imageSource - Image source
 * @returns {Promise<string>} Dominant color in hex
 */
export const getDominantColor = async (imageSource) => {
  const img = await loadImage(imageSource);

  const canvas = document.createElement("canvas");
  canvas.width = 100; // Resize for faster processing
  canvas.height = 100;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, 100, 100);

  const imageData = ctx.getImageData(0, 0, 100, 100).data;
  const colorCounts = {};
  let maxCount = 0;
  let dominantColor = "#000000";

  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];

    // Quantize colors to reduce noise
    const quantized = `${Math.floor(r / 32) * 32},${Math.floor(g / 32) * 32},${
      Math.floor(b / 32) * 32
    }`;

    colorCounts[quantized] = (colorCounts[quantized] || 0) + 1;

    if (colorCounts[quantized] > maxCount) {
      maxCount = colorCounts[quantized];
      const [qr, qg, qb] = quantized.split(",").map(Number);
      dominantColor = rgbToHex(qr, qg, qb);
    }
  }

  return dominantColor;
};

/**
 * Convert RGB to hex
 */
const rgbToHex = (r, g, b) => {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
};

/**
 * Get image orientation (EXIF)
 * @param {ArrayBuffer} arrayBuffer - Image array buffer
 * @returns {Promise<number>} Orientation (1-8)
 */
export const getImageOrientation = async (arrayBuffer) => {
  try {
    const view = new DataView(arrayBuffer);

    // Check for JPEG EXIF
    if (view.getUint16(0, false) !== 0xffd8) {
      return 1; // Default orientation
    }

    const length = view.byteLength;
    let offset = 2;

    while (offset < length) {
      if (view.getUint16(offset + 2, false) <= 8) break;

      const marker = view.getUint16(offset, false);
      offset += 2;

      if (marker === 0xffe1) {
        // APP1 marker (EXIF)
        if (view.getUint32((offset += 2), false) !== 0x45786966) {
          return 1;
        }

        const little = view.getUint16((offset += 6), false) === 0x4949;
        offset += view.getUint32(offset + 4, little);
        const tags = view.getUint16(offset, little);
        offset += 2;

        for (let i = 0; i < tags; i++) {
          if (view.getUint16(offset + i * 12, little) === 0x0112) {
            // Orientation tag
            return view.getUint16(offset + i * 12 + 8, little);
          }
        }
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else {
        offset += view.getUint16(offset, false);
      }
    }

    return 1; // Default orientation
  } catch (error) {
    console.error("Error reading image orientation:", error);
    return 1;
  }
};

/**
 * Apply orientation to image
 * @param {HTMLImageElement} img - Image element
 * @param {number} orientation - EXIF orientation
 * @returns {HTMLCanvasElement} Oriented canvas
 */
export const applyOrientation = (img, orientation) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = img.width;
  canvas.height = img.height;

  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, img.width, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, img.width, img.height);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, img.height);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      canvas.width = img.height;
      canvas.height = img.width;
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, img.height, 0);
      canvas.width = img.height;
      canvas.height = img.width;
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, img.height, img.width);
      canvas.width = img.height;
      canvas.height = img.width;
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, img.width);
      canvas.width = img.height;
      canvas.height = img.width;
      break;
  }

  ctx.drawImage(img, 0, 0);
  return canvas;
};

export default {
  compressImage,
  getImageMetadata,
  calculateAspectRatio,
  convertToBase64,
  base64ToBlob,
  createThumbnail,
  validateImage,
  processImagesBatch,
  generateUniqueFilename,
  downloadImage,
  getDominantColor,
  getImageOrientation,
  applyOrientation,
  IMAGE_CONFIG,
};
