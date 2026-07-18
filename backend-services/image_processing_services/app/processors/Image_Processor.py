import cv2
import numpy as np
from typing import Dict, List, Any
import skimage
from skimage import feature, filters, measure
from scipy import ndimage

class ImageProcessor:
    def __init__(self):
        self.target_size = (224, 224)  # Standard size for ML models
        
    def preprocess_for_ml(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for machine learning model"""
        # Resize image
        resized = cv2.resize(image, self.target_size)
        
        # Normalize pixel values
        normalized = resized.astype(np.float32) / 255.0
        
        # Enhance contrast (CLAHE)
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
        lab_planes = list(cv2.split(lab))
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        lab_planes[0] = clahe.apply(lab_planes[0])
        lab = cv2.merge(lab_planes)
        contrast_enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        
        return contrast_enhanced
    
    def extract_features(self, image: np.ndarray) -> Dict[str, Any]:
        """Extract basic features from image for biomass estimation"""
        features = {}
        
        # Color features
        features.update(self._extract_color_features(image))
        
        # Texture features
        features.update(self._extract_texture_features(image))
        
        # Vegetation indices
        features.update(self._calculate_vegetation_indices(image))
        
        # Shape and size features
        features.update(self._extract_morphological_features(image))
        
        return features
    
    def extract_advanced_features(self, image: np.ndarray) -> Dict[str, Any]:
        """Extract advanced features for improved biomass prediction"""
        advanced_features = {}
        
        # Segment vegetation
        vegetation_mask = self._segment_vegetation(image)
        
        # Advanced vegetation analysis
        advanced_features.update(self._analyze_vegetation_coverage(image, vegetation_mask))
        
        # Texture analysis using GLCM
        advanced_features.update(self._calculate_glcm_features(image))
        
        # Edge density and patterns
        advanced_features.update(self._analyze_edge_patterns(image))
        
        # Color distribution in vegetation areas
        advanced_features.update(self._analyze_vegetation_colors(image, vegetation_mask))
        
        return advanced_features
    
    def _extract_color_features(self, image: np.ndarray) -> Dict[str, float]:
        """Extract color-based features"""
        # Convert to different color spaces
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        
        # Calculate color statistics
        color_features = {}
        
        for i, channel_name in enumerate(['B', 'G', 'R']):
            channel = image[:, :, i]
            color_features[f'{channel_name}_mean'] = float(np.mean(channel))
            color_features[f'{channel_name}_std'] = float(np.std(channel))
            color_features[f'{channel_name}_median'] = float(np.median(channel))
        
        # HSV statistics (focus on hue for vegetation)
        hue_channel = hsv[:, :, 0]
        color_features['hue_mean'] = float(np.mean(hue_channel))
        color_features['hue_std'] = float(np.std(hue_channel))
        
        # Green dominance (important for biomass)
        green_channel = image[:, :, 1]  # G channel in BGR
        red_channel = image[:, :, 2]    # R channel in BGR
        green_red_ratio = np.mean(green_channel) / (np.mean(red_channel) + 1e-6)
        color_features['green_red_ratio'] = float(green_red_ratio)
        
        return color_features
    
    def _extract_texture_features(self, image: np.ndarray) -> Dict[str, float]:
        """Extract texture features using various methods"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        texture_features = {}
        
        # GLCM-like features (simplified)
        texture_features['entropy'] = float(self._calculate_entropy(gray))
        texture_features['contrast'] = float(self._calculate_contrast(gray))
        texture_features['homogeneity'] = float(self._calculate_homogeneity(gray))
        
        # Gabor filter responses
        gabor_responses = self._apply_gabor_filters(gray)
        for i, response in enumerate(gabor_responses):
            texture_features[f'gabor_{i}_mean'] = float(np.mean(response))
            texture_features[f'gabor_{i}_std'] = float(np.std(response))
        
        return texture_features
    
    def _calculate_vegetation_indices(self, image: np.ndarray) -> Dict[str, float]:
        """Calculate vegetation indices from image"""
        b, g, r = cv2.split(image)
        
        # Convert to float for calculations
        r = r.astype(np.float32)
        g = g.astype(np.float32)
        b = b.astype(np.float32)
        
        # Avoid division by zero
        r += 1e-6
        g += 1e-6
        b += 1e-6
        
        indices = {}
        
        # Simplified NDVI (using RGB approximation)
        indices['rgb_ndvi'] = float(np.mean((g - r) / (g + r)))
        
        # Green Leaf Index (GLI)
        indices['gli'] = float(np.mean((2 * g - r - b) / (2 * g + r + b)))
        
        # Vegetative Index (VEG)
        indices['veg'] = float(np.mean(g / (r ** 0.667 * b ** 0.333)))
        
        # Red Green Ratio
        indices['red_green_ratio'] = float(np.mean(r / g))
        
        return indices
    
    def _extract_morphological_features(self, image: np.ndarray) -> Dict[str, float]:
        """Extract morphological features from vegetation areas"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        features = {}
        
        # Edge detection
        edges = cv2.Canny(gray, 50, 150)
        features['edge_density'] = float(np.sum(edges > 0) / edges.size)
        
        # Blob detection
        blobs = self._detect_blobs(gray)
        features['blob_count'] = float(len(blobs))
        if blobs:
            features['avg_blob_size'] = float(np.mean([blob.size for blob in blobs]))
        
        return features
    
    def _segment_vegetation(self, image: np.ndarray) -> np.ndarray:
        """Segment vegetation from background"""
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Define green color range in HSV
        lower_green = np.array([35, 50, 50])
        upper_green = np.array([85, 255, 255])
        
        # Create mask for green vegetation
        mask = cv2.inRange(hsv, lower_green, upper_green)
        
        # Morphological operations to clean up the mask
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        
        return mask
    
    def _analyze_vegetation_coverage(self, image: np.ndarray, vegetation_mask: np.ndarray) -> Dict[str, float]:
        """Analyze vegetation coverage and distribution"""
        coverage = np.sum(vegetation_mask > 0) / vegetation_mask.size
        
        # Connected components analysis
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(vegetation_mask)
        
        features = {
            'vegetation_coverage': float(coverage),
            'vegetation_patches': float(num_labels - 1)  # Subtract background
        }
        
        if num_labels > 1:
            # Analyze patch sizes (excluding background)
            patch_sizes = stats[1:, cv2.CC_STAT_AREA]
            features['max_patch_size'] = float(np.max(patch_sizes))
            features['mean_patch_size'] = float(np.mean(patch_sizes))
            features['patch_size_std'] = float(np.std(patch_sizes))
        
        return features
    
    def _calculate_glcm_features(self, image: np.ndarray) -> Dict[str, float]:
        """Calculate Gray Level Co-occurrence Matrix features"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Simplified GLCM calculation
        # In production, use skimage.feature.greycomatrix and greycoprops
        features = {}
        
        # Calculate local binary patterns for texture
        lbp = feature.local_binary_pattern(gray, 8, 1, method='uniform')
        features['lbp_entropy'] = float(self._calculate_entropy(lbp.astype(np.uint8)))
        
        return features
    
    def _analyze_edge_patterns(self, image: np.ndarray) -> Dict[str, float]:
        """Analyze edge patterns and orientations"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Sobel edge detection
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=5)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=5)
        
        # Calculate gradient magnitude and orientation
        magnitude = np.sqrt(sobelx**2 + sobely**2)
        orientation = np.arctan2(sobely, sobelx)
        
        features = {
            'edge_magnitude_mean': float(np.mean(magnitude)),
            'edge_magnitude_std': float(np.std(magnitude)),
            'edge_orientation_entropy': float(self._calculate_entropy(orientation))
        }
        
        return features
    
    def _analyze_vegetation_colors(self, image: np.ndarray, vegetation_mask: np.ndarray) -> Dict[str, float]:
        """Analyze color distribution in vegetation areas"""
        if np.sum(vegetation_mask) == 0:
            return {f'vegetation_{key}': 0.0 for key in ['hue_mean', 'saturation_mean', 'value_mean']}
        
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Extract vegetation pixels
        vegetation_pixels = hsv[vegetation_mask > 0]
        
        if len(vegetation_pixels) == 0:
            return {f'vegetation_{key}': 0.0 for key in ['hue_mean', 'saturation_mean', 'value_mean']}
        
        features = {
            'vegetation_hue_mean': float(np.mean(vegetation_pixels[:, 0])),
            'vegetation_saturation_mean': float(np.mean(vegetation_pixels[:, 1])),
            'vegetation_value_mean': float(np.mean(vegetation_pixels[:, 2])),
            'vegetation_color_std': float(np.std(vegetation_pixels))
        }
        
        return features
    
    # Helper methods for texture analysis
    def _calculate_entropy(self, image: np.ndarray) -> float:
        """Calculate image entropy"""
        histogram = cv2.calcHist([image], [0], None, [256], [0, 256])
        histogram = histogram.ravel() / histogram.sum()
        histogram = histogram[histogram > 0]
        return -np.sum(histogram * np.log2(histogram))
    
    def _calculate_contrast(self, image: np.ndarray) -> float:
        """Calculate image contrast"""
        return float(np.std(image))
    
    def _calculate_homogeneity(self, image: np.ndarray) -> float:
        """Calculate image homogeneity"""
        return float(1.0 / (1.0 + np.std(image)))
    
    def _apply_gabor_filters(self, image: np.ndarray, num_filters: int = 4) -> List[np.ndarray]:
        """Apply Gabor filters for texture analysis"""
        responses = []
        for theta in range(num_filters):
            theta = theta / num_filters * np.pi
            kernel = cv2.getGaborKernel((21, 21), 5.0, theta, 10.0, 0.5, 0, ktype=cv2.CV_32F)
            response = cv2.filter2D(image, cv2.CV_32F, kernel)
            responses.append(response)
        return responses
    
    def _detect_blobs(self, image: np.ndarray) -> List[Any]:
        """Detect blobs in image using Laplacian of Gaussian"""
        blobs = []
        # Simple blob detection - in production, use cv2.SimpleBlobDetector
        return blobs