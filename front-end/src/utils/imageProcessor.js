// utils/imageProcessor.js
import { CONFIG } from "../config";

export class ImageProcessor {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
  }

  validateImage(file) {
    // Check file size
    if (file.size > CONFIG.IMAGE.MAX_SIZE) {
      throw new Error(
        `Image size must be less than ${
          CONFIG.IMAGE.MAX_SIZE / (1024 * 1024)
        }MB`
      );
    }

    // Check file type
    if (!CONFIG.IMAGE.SUPPORTED_FORMATS.includes(file.type)) {
      throw new Error(
        `Unsupported image format. Supported: ${CONFIG.IMAGE.SUPPORTED_FORMATS.join(
          ", "
        )}`
      );
    }

    return true;
  }

  async compressImage(file, options = {}) {
    const {
      maxWidth = CONFIG.IMAGE.MAX_WIDTH,
      maxHeight = CONFIG.IMAGE.MAX_HEIGHT,
      quality = CONFIG.IMAGE.QUALITY,
      type = "image/jpeg",
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;

        img.onload = () => {
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // Set canvas dimensions
          this.canvas.width = width;
          this.canvas.height = height;

          // Draw and compress
          this.ctx.drawImage(img, 0, 0, width, height);

          this.canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Canvas to Blob conversion failed"));
                return;
              }

              const compressedFile = new File([blob], file.name, {
                type: type,
                lastModified: Date.now(),
              });

              resolve({
                file: compressedFile,
                originalSize: file.size,
                compressedSize: blob.size,
                reduction: (
                  ((file.size - blob.size) / file.size) *
                  100
                ).toFixed(1),
              });
            },
            type,
            quality
          );
        };

        img.onerror = () => reject(new Error("Failed to load image"));
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async getImageData(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;

        img.onload = () => {
          // Analyze image
          this.canvas.width = img.width;
          this.canvas.height = img.height;
          this.ctx.drawImage(img, 0, 0);

          const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
          const brightness = this.calculateBrightness(imageData);
          const blur = this.estimateBlur(imageData);

          resolve({
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height,
            brightness,
            blur,
            isValid: this.validateImageQuality(
              img.width,
              img.height,
              brightness,
              blur
            ),
          });
        };

        img.onerror = () => reject(new Error("Failed to load image"));
      };

      reader.readAsDataURL(file);
    });
  }

  calculateBrightness(imageData) {
    let total = 0;
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate perceived brightness
      total += 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const avg = total / (data.length / 4);
    return avg / 255; // Normalize to 0-1
  }

  estimateBlur(imageData) {
    // Simple blur estimation using edge detection
    // This is a simplified version - in production you'd use a more sophisticated algorithm
    const data = imageData.data;
    let edgeCount = 0;

    for (let y = 1; y < imageData.height - 1; y++) {
      for (let x = 1; x < imageData.width - 1; x++) {
        const idx = (y * imageData.width + x) * 4;

        // Simple edge detection (Sobel operator simplified)
        const gx = this.getGradientX(data, idx, imageData.width);
        const gy = this.getGradientY(data, idx, imageData.width);
        const gradient = Math.sqrt(gx * gx + gy * gy);

        if (gradient > 50) {
          // Threshold for edge
          edgeCount++;
        }
      }
    }

    const totalPixels = (imageData.width - 2) * (imageData.height - 2);
    const edgeRatio = edgeCount / totalPixels;

    // Lower edge ratio suggests more blur
    return Math.max(0, Math.min(100, 100 - edgeRatio * 1000));
  }

  getGradientX(data, idx, width) {
    // Simplified horizontal gradient
    const left = this.getLuminance(data, idx - 4);
    const right = this.getLuminance(data, idx + 4);
    return right - left;
  }

  getGradientY(data, idx, width) {
    // Simplified vertical gradient
    const up = this.getLuminance(data, idx - width * 4);
    const down = this.getLuminance(data, idx + width * 4);
    return down - up;
  }

  getLuminance(data, idx) {
    const r = data[idx] || 0;
    const g = data[idx + 1] || 0;
    const b = data[idx + 2] || 0;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  validateImageQuality(width, height, brightness, blur) {
    const minRes = CONFIG.VALIDATION.MIN_RESOLUTION;

    return (
      width >= minRes.width &&
      height >= minRes.height &&
      brightness >= CONFIG.VALIDATION.MIN_LIGHTING &&
      brightness <= CONFIG.VALIDATION.MAX_LIGHTING &&
      blur <= CONFIG.VALIDATION.MAX_BLUR_THRESHOLD
    );
  }

  async createThumbnail(file, size = 200) {
    return this.compressImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.7,
      type: "image/jpeg",
    });
  }

  async getDominantColor(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;

        img.onload = () => {
          this.canvas.width = img.width;
          this.canvas.height = img.height;
          this.ctx.drawImage(img, 0, 0);

          // Sample colors
          const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
          const colorCounts = {};
          let maxCount = 0;
          let dominantColor = null;

          for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];

            // Quantize colors
            const quantized = `${Math.round(r / 32) * 32},${
              Math.round(g / 32) * 32
            },${Math.round(b / 32) * 32}`;

            colorCounts[quantized] = (colorCounts[quantized] || 0) + 1;

            if (colorCounts[quantized] > maxCount) {
              maxCount = colorCounts[quantized];
              dominantColor = quantized;
            }
          }

          resolve(
            dominantColor ? dominantColor.split(",").map(Number) : [0, 0, 0]
          );
        };
      };

      reader.readAsDataURL(file);
    });
  }

  async cropImage(file, cropArea) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;

        img.onload = () => {
          this.canvas.width = cropArea.width;
          this.canvas.height = cropArea.height;

          this.ctx.drawImage(
            img,
            cropArea.x,
            cropArea.y,
            cropArea.width,
            cropArea.height,
            0,
            0,
            cropArea.width,
            cropArea.height
          );

          this.canvas.toBlob(
            (blob) => {
              const croppedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });

              resolve(croppedFile);
            },
            file.type,
            CONFIG.IMAGE.QUALITY
          );
        };
      };

      reader.readAsDataURL(file);
    });
  }
}

// Singleton instance
export const imageProcessor = new ImageProcessor();
