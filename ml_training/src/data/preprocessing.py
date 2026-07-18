import numpy as np
import pandas as pd
import cv2
from typing import Tuple, Dict, List
import os
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib

class BiomassDataPreprocessor:
    def __init__(self, config: Dict):
        self.config = config
        self.feature_scaler = StandardScaler()
        self.target_scaler = StandardScaler()
        
    def load_and_validate_data(self, data_path: str) -> pd.DataFrame:
        """Load and validate the biomass dataset"""
        try:
            data = pd.read_csv(data_path)
            
            # Validate required columns
            required_columns = [
                'image_id', 'Dry_Green_g', 'Dry_Dead_g', 'Dry_Clover_g',
                'GDM_g', 'Dry_Total_g'
            ]
            
            missing_columns = [col for col in required_columns if col not in data.columns]
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            # Validate data types and ranges
            biomass_columns = ['Dry_Green_g', 'Dry_Dead_g', 'Dry_Clover_g', 'GDM_g', 'Dry_Total_g']
            for col in biomass_columns:
                if data[col].min() < 0:
                    raise ValueError(f"Negative values found in {col}")
            
            print(f"Loaded dataset with {len(data)} samples")
            return data
            
        except Exception as e:
            raise ValueError(f"Error loading data: {str(e)}")
    
    def extract_image_features(self, image_path: str) -> np.ndarray:
        """Extract features from pasture images"""
        try:
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            features = []
            
            # Color features
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            
            # Mean and std of each channel
            for channel in [image, hsv, lab]:
                for i in range(3):
                    channel_data = channel[:, :, i].flatten()
                    features.extend([np.mean(channel_data), np.std(channel_data)])
            
            # Vegetation indices (RGB-based approximations)
            r, g, b = cv2.split(image)
            r = r.astype(np.float32) + 1e-6
            g = g.astype(np.float32) + 1e-6
            b = b.astype(np.float32) + 1e-6
            
            # NDVI approximation
            ndvi = np.mean((g - r) / (g + r))
            features.append(ndvi)
            
            # Other vegetation indices
            gli = np.mean((2 * g - r - b) / (2 * g + r + b))
            features.append(gli)
            
            # Texture features
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            features.extend(self._extract_texture_features(gray))
            
            # Morphological features
            features.extend(self._extract_morphological_features(image))
            
            return np.array(features)
            
        except Exception as e:
            print(f"Error extracting features from {image_path}: {str(e)}")
            return np.zeros(50)  # Return zeros for failed extractions
    
    def _extract_texture_features(self, gray_image: np.ndarray) -> List[float]:
        """Extract texture features from grayscale image"""
        features = []
        
        # GLCM-like features (simplified)
        features.append(np.mean(gray_image))
        features.append(np.std(gray_image))
        features.append(np.median(gray_image))
        
        # Entropy
        histogram = cv2.calcHist([gray_image], [0], None, [256], [0, 256])
        histogram = histogram.ravel() / histogram.sum()
        histogram = histogram[histogram > 0]
        entropy = -np.sum(histogram * np.log2(histogram))
        features.append(entropy)
        
        return features
    
    def _extract_morphological_features(self, image: np.ndarray) -> List[float]:
        """Extract morphological features related to pasture structure"""
        features = []
        
        # Edge density
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        features.append(edge_density)
        
        # Green pixel percentage (vegetation coverage)
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        green_mask = cv2.inRange(hsv, (35, 50, 50), (85, 255, 255))
        green_percentage = np.sum(green_mask > 0) / green_mask.size
        features.append(green_percentage)
        
        return features
    
    def prepare_training_data(self, data: pd.DataFrame, images_dir: str) -> Tuple:
        """Prepare features and targets for training"""
        print("Extracting features from images...")
        
        features = []
        targets = []
        valid_indices = []
        
        for idx, row in data.iterrows():
            image_path = os.path.join(images_dir, f"{row['image_id']}.jpg")
            
            if os.path.exists(image_path):
                image_features = self.extract_image_features(image_path)
                features.append(image_features)
                
                # Multiple targets for multi-output regression
                target = [
                    row['Dry_Green_g'],
                    row['Dry_Dead_g'], 
                    row['Dry_Clover_g'],
                    row['GDM_g'],
                    row['Dry_Total_g']
                ]
                targets.append(target)
                valid_indices.append(idx)
            else:
                print(f"Image not found: {image_path}")
        
        features = np.array(features)
        targets = np.array(targets)
        
        print(f"Prepared {len(features)} samples with {features.shape[1]} features")
        
        return features, targets, valid_indices
    
    def split_data(self, features: np.ndarray, targets: np.ndarray, 
                   test_size: float = 0.2, val_size: float = 0.1) -> Tuple:
        """Split data into train, validation, and test sets"""
        
        # First split: separate test set
        X_temp, X_test, y_temp, y_test = train_test_split(
            features, targets, test_size=test_size, random_state=42
        )
        
        # Second split: separate validation set from remaining data
        val_ratio = val_size / (1 - test_size)
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=val_ratio, random_state=42
        )
        
        print(f"Training set: {X_train.shape[0]} samples")
        print(f"Validation set: {X_val.shape[0]} samples") 
        print(f"Test set: {X_test.shape[0]} samples")
        
        return (X_train, X_val, X_test, y_train, y_val, y_test)
    
    def scale_features(self, X_train: np.ndarray, X_val: np.ndarray = None, 
                       X_test: np.ndarray = None) -> Tuple:
        """Scale features using StandardScaler"""
        
        # Fit scaler on training data
        X_train_scaled = self.feature_scaler.fit_transform(X_train)
        
        # Transform validation and test data if provided
        X_val_scaled = self.feature_scaler.transform(X_val) if X_val is not None else None
        X_test_scaled = self.feature_scaler.transform(X_test) if X_test is not None else None
        
        return X_train_scaled, X_val_scaled, X_test_scaled
    
    def scale_targets(self, y_train: np.ndarray, y_val: np.ndarray = None,
                      y_test: np.ndarray = None) -> Tuple:
        """Scale targets using StandardScaler"""
        
        # Fit scaler on training targets
        y_train_scaled = self.target_scaler.fit_transform(y_train)
        
        # Transform validation and test targets if provided
        y_val_scaled = self.target_scaler.transform(y_val) if y_val is not None else None
        y_test_scaled = self.target_scaler.transform(y_test) if y_test is not None else None
        
        return y_train_scaled, y_val_scaled, y_test_scaled
    
    def save_preprocessors(self, save_path: str):
        """Save fitted preprocessors for later use"""
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        
        joblib.dump(self.feature_scaler, f"{save_path}_feature_scaler.pkl")
        joblib.dump(self.target_scaler, f"{save_path}_target_scaler.pkl")
        
        print(f"Preprocessors saved to {save_path}")
    
    def load_preprocessors(self, load_path: str):
        """Load fitted preprocessors"""
        self.feature_scaler = joblib.load(f"{load_path}_feature_scaler.pkl")
        self.target_scaler = joblib.load(f"{load_path}_target_scaler.pkl")
        
        print("Preprocessors loaded successfully")