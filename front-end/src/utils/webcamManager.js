// utils/webcamManager.js
import { CONFIG } from "../config";

export class WebcamManager {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.constraints = CONFIG.WEBCAM.CONSTRAINTS;
    this.isInitialized = false;
  }

  async initialize(videoElement) {
    this.videoElement = videoElement;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera API not supported in this browser");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      this.videoElement.srcObject = this.stream;
      this.isInitialized = true;

      return true;
    } catch (error) {
      console.error("Failed to initialize camera:", error);

      // Provide user-friendly error messages
      if (error.name === "NotAllowedError") {
        throw new Error(
          "Camera access denied. Please allow camera access in your browser settings."
        );
      } else if (error.name === "NotFoundError") {
        throw new Error(
          "No camera found. Please connect a camera and try again."
        );
      } else if (error.name === "NotReadableError") {
        throw new Error("Camera is already in use by another application.");
      }

      throw error;
    }
  }

  async switchCamera() {
    if (!this.isInitialized) {
      throw new Error("Camera not initialized");
    }

    // Stop current stream
    this.stop();

    // Switch facing mode
    const currentMode = this.constraints.video.facingMode;
    const newMode = currentMode === "user" ? "environment" : "user";

    this.constraints.video.facingMode = newMode;

    // Reinitialize with new camera
    return this.initialize(this.videoElement);
  }

  async capturePhoto(options = {}) {
    if (!this.isInitialized || !this.videoElement) {
      throw new Error("Camera not initialized");
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Set canvas dimensions to match video
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    // Draw current video frame
    ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

    // Apply options
    const {
      quality = CONFIG.IMAGE.QUALITY,
      maxWidth = CONFIG.IMAGE.MAX_WIDTH,
      maxHeight = CONFIG.IMAGE.MAX_HEIGHT,
      type = "image/jpeg",
    } = options;

    // Resize if needed
    if (canvas.width > maxWidth || canvas.height > maxHeight) {
      const resizedCanvas = this.resizeCanvas(canvas, maxWidth, maxHeight);
      return this.canvasToBlob(resizedCanvas, type, quality);
    }

    return this.canvasToBlob(canvas, type, quality);
  }

  resizeCanvas(sourceCanvas, maxWidth, maxHeight) {
    const destCanvas = document.createElement("canvas");
    const destCtx = destCanvas.getContext("2d");

    let width = sourceCanvas.width;
    let height = sourceCanvas.height;

    // Maintain aspect ratio
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    destCanvas.width = width;
    destCanvas.height = height;

    destCtx.drawImage(sourceCanvas, 0, 0, width, height);

    return destCanvas;
  }

  canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          const file = new File(
            [blob],
            `capture_${Date.now()}.${type.split("/")[1]}`,
            {
              type: type,
              lastModified: Date.now(),
            }
          );

          resolve({
            file,
            blob,
            width: canvas.width,
            height: canvas.height,
            timestamp: new Date(),
          });
        },
        type,
        quality
      );
    });
  }

  async takeMultiplePhotos(count, interval = 1000) {
    const photos = [];

    for (let i = 0; i < count; i++) {
      if (i > 0) {
        await this.sleep(interval);
      }

      const photo = await this.capturePhoto();
      photos.push(photo);
    }

    return photos;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getCameraCapabilities() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return null;
    }

    return navigator.mediaDevices.getSupportedConstraints();
  }

  async getAvailableCameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId,
        }));
    } catch (error) {
      console.error("Failed to enumerate devices:", error);
      return [];
    }
  }

  async switchToCamera(deviceId) {
    if (!this.isInitialized) {
      throw new Error("Camera not initialized");
    }

    // Stop current stream
    this.stop();

    // Update constraints with specific device
    this.constraints.video.deviceId = { exact: deviceId };
    delete this.constraints.video.facingMode;

    // Reinitialize with new camera
    return this.initialize(this.videoElement);
  }

  setConstraints(newConstraints) {
    this.constraints = {
      ...this.constraints,
      ...newConstraints,
    };
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.isInitialized = false;
  }

  isCameraAvailable() {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  }

  async requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const webcamManager = new WebcamManager();
