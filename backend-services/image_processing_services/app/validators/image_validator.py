import cv2
import numpy as np
from typing import Dict, Tuple

class ImageValidator:
    def __init__(self):
        self.min_resolution = (640, 480)
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.supported_formats = ['.jpg', '.jpeg', '.png']
    
    def validate_image_quality(self, image_path: str) -> Dict:
        """Comprehensive image validation for biomass prediction"""
        try:
            image = cv2.imread(image_path)
            if image is None:
                return {"valid": False, "error": "Unable to read image"}
            
            validation_results = {
                "valid": True,
                "issues": [],
                "metadata": {}
            }
            
            # Resolution check
            height, width = image.shape[:2]
            if width < self.min_resolution[0] or height < self.min_resolution[1]:
                validation_results["valid"] = False
                validation_results["issues"].append("Resolution too low")
            
            # Blur detection
            blur_score = self._calculate_blur_score(image)
            if blur_score < 100:
                validation_results["valid"] = False
                validation_results["issues"].append("Image too blurry")
            
            # Lighting check
            lighting_score = self._calculate_lighting_score(image)
            if lighting_score < 0.3 or lighting_score > 0.7:
                validation_results["issues"].append("Lighting conditions suboptimal")
            
            # Color distribution
            color_stats = self._analyze_color_distribution(image)
            validation_results["metadata"]["color_stats"] = color_stats
            
            # Perspective check (for drone images)
            perspective_score = self._check_perspective(image)
            if perspective_score > 0.8:
                validation_results["issues"].append("Extreme perspective detected")
            
            validation_results["metadata"].update({
                "resolution": f"{width}x{height}",
                "blur_score": blur_score,
                "lighting_score": lighting_score,
                "perspective_score": perspective_score
            })
            
            return validation_results
            
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    def _calculate_blur_score(self, image) -> float:
        """Calculate image blur using Laplacian variance"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return cv2.Laplacian(gray, cv2.CV_64F).var()
    
    def _calculate_lighting_score(self, image) -> float:
        """Calculate overall image brightness"""
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        return np.mean(hsv[:,:,2]) / 255.0
    
    def _analyze_color_distribution(self, image) -> Dict:
        """Analyze color distribution for vegetation detection"""
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Define green color range for vegetation
        green_lower = np.array([35, 50, 50])
        green_upper = np.array([85, 255, 255])
        
        green_mask = cv2.inRange(hsv, green_lower, green_upper)
        green_percentage = np.sum(green_mask > 0) / (image.shape[0] * image.shape[1])
        
        return {
            "green_percentage": green_percentage,
            "dominant_colors": self._get_dominant_colors(image)
        }
    
    def _get_dominant_colors(self, image, k=3):
        """Extract dominant colors using k-means"""
        pixels = image.reshape(-1, 3)
        pixels = np.float32(pixels)
        
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
        _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
        
        return centers.astype(int).tolist()
    
    def _check_perspective(self, image) -> float:
        """Check for extreme perspective distortion"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        
        lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
        if lines is not None:
            angles = [line[0][1] for line in lines]
            angle_variance = np.var(angles)
            return min(angle_variance, 1.0)
        
        return 0.0