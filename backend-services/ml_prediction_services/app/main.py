from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, List, Optional
import numpy as np
import cv2
import redis
import json
import asyncio
from datetime import datetime
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ML Prediction Service",
    description="Machine learning service for pasture biomass prediction",
    version="1.0.0"
)

# Redis connection
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'redis'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)

class PredictionRequest(BaseModel):
    image_id: str
    features: Dict
    metadata: Dict
    model_type: str = "biomass_v1"

class PredictionResponse(BaseModel):
    prediction_id: str
    image_id: str
    predictions: Dict
    confidence: float
    processing_time: float
    model_version: str
    created_at: str

class HealthResponse(BaseModel):
    status: str
    service: str
    model_loaded: bool
    timestamp: str

class BiomassModel:
    def __init__(self):
        self.model = None
        self.model_version = "v1.0.0"
        self.is_loaded = False
        self.load_model()
    
    def load_model(self):
        """Load the trained biomass prediction model"""
        try:
            # In production, this would load your actual trained model
            # For now, we'll use a mock model
            logger.info("Loading biomass prediction model...")
            
            # Simulate model loading
            # self.model = tf.keras.models.load_model('/app/trained_models/biomass_model.h5')
            
            self.is_loaded = True
            logger.info(f"Model {self.model_version} loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self.is_loaded = False
    
    def preprocess_features(self, features: Dict) -> np.ndarray:
        """Preprocess features for model prediction"""
        try:
            # Extract and normalize features
            feature_list = []
            
            # Color features
            color_features = [
                features.get('B_mean', 0),
                features.get('G_mean', 0),
                features.get('R_mean', 0),
                features.get('hue_mean', 0),
                features.get('green_red_ratio', 0)
            ]
            feature_list.extend(color_features)
            
            # Vegetation indices
            vegetation_features = [
                features.get('rgb_ndvi', 0),
                features.get('gli', 0),
                features.get('veg', 0)
            ]
            feature_list.extend(vegetation_features)
            
            # Texture features
            texture_features = [
                features.get('entropy', 0),
                features.get('contrast', 0),
                features.get('homogeneity', 0)
            ]
            feature_list.extend(texture_features)
            
            # Morphological features
            morphological_features = [
                features.get('edge_density', 0),
                features.get('vegetation_coverage', 0),
                features.get('vegetation_patches', 0)
            ]
            feature_list.extend(morphological_features)
            
            # Convert to numpy array and normalize
            feature_array = np.array(feature_list, dtype=np.float32)
            
            # Simple normalization (in production, use trained scaler)
            feature_array = (feature_array - np.mean(feature_array)) / (np.std(feature_array) + 1e-8)
            
            return feature_array.reshape(1, -1)
            
        except Exception as e:
            logger.error(f"Error preprocessing features: {str(e)}")
            raise
    
    def predict_biomass(self, features: Dict) -> Dict:
        """Predict biomass components from features"""
        try:
            if not self.is_loaded:
                raise ValueError("Model not loaded")
            
            # Preprocess features
            processed_features = self.preprocess_features(features)
            
            # Mock prediction - replace with actual model prediction
            # predictions = self.model.predict(processed_features)
            
            # Generate realistic mock predictions based on features
            base_biomass = 1000 + (features.get('vegetation_coverage', 0) * 2000)
            green_ratio = features.get('green_red_ratio', 1.0)
            
            predictions = {
                'Dry_Green_g': base_biomass * green_ratio * np.random.uniform(0.8, 1.2),
                'Dry_Dead_g': base_biomass * (1 - green_ratio) * 0.3 * np.random.uniform(0.8, 1.2),
                'Dry_Clover_g': base_biomass * 0.1 * np.random.uniform(0.5, 1.5),
                'GDM_g': base_biomass * 0.8 * np.random.uniform(0.9, 1.1),
                'Dry_Total_g': 0  # Will be calculated
            }
            
            # Calculate total biomass
            predictions['Dry_Total_g'] = (
                predictions['Dry_Green_g'] + 
                predictions['Dry_Dead_g'] + 
                predictions['Dry_Clover_g']
            )
            
            # Calculate confidence based on feature quality
            confidence = self.calculate_confidence(features)
            
            return {
                'predictions': predictions,
                'confidence': confidence,
                'model_version': self.model_version
            }
            
        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}")
            raise
    
    def calculate_confidence(self, features: Dict) -> float:
        """Calculate prediction confidence based on feature quality"""
        try:
            confidence_factors = []
            
            # Vegetation coverage confidence
            vegetation_coverage = features.get('vegetation_coverage', 0)
            if vegetation_coverage > 0.1:
                confidence_factors.append(min(vegetation_coverage * 2, 1.0))
            
            # Image quality confidence
            edge_density = features.get('edge_density', 0)
            if edge_density > 0.01:
                confidence_factors.append(min(edge_density * 50, 1.0))
            
            # Color consistency confidence
            green_ratio = features.get('green_red_ratio', 1.0)
            if 0.5 <= green_ratio <= 2.0:
                confidence_factors.append(0.8)
            
            # Average confidence factors
            if confidence_factors:
                avg_confidence = np.mean(confidence_factors)
                return min(avg_confidence * 0.9 + 0.1, 0.95)  # Ensure minimum 10% confidence
            else:
                return 0.5  # Default confidence
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {str(e)}")
            return 0.5

# Initialize model
biomass_model = BiomassModel()

@app.post("/predict", response_model=PredictionResponse)
async def predict_biomass(
    request: PredictionRequest,
    background_tasks: BackgroundTasks
):
    """Predict biomass from image features"""
    start_time = datetime.utcnow()
    
    try:
        # Check cache first
        cache_key = f"prediction:{request.image_id}"
        cached_result = redis_client.get(cache_key)
        
        if cached_result:
            logger.info(f"Returning cached prediction for {request.image_id}")
            result = json.loads(cached_result)
            return PredictionResponse(**result)
        
        # Perform prediction
        prediction_result = biomass_model.predict_biomass(request.features)
        
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Create response
        response_data = {
            "prediction_id": f"pred_{request.image_id}_{int(start_time.timestamp())}",
            "image_id": request.image_id,
            "predictions": prediction_result['predictions'],
            "confidence": prediction_result['confidence'],
            "processing_time": processing_time,
            "model_version": prediction_result['model_version'],
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Cache the result for 1 hour
        background_tasks.add_task(
            cache_prediction,
            cache_key,
            response_data
        )
        
        logger.info(f"Prediction completed for {request.image_id} in {processing_time:.2f}s")
        
        return PredictionResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Prediction failed for {request.image_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )

async def cache_prediction(cache_key: str, prediction_data: Dict):
    """Cache prediction result in background"""
    try:
        redis_client.setex(
            cache_key,
            3600,  # 1 hour
            json.dumps(prediction_data)
        )
        logger.info(f"Cached prediction: {cache_key}")
    except Exception as e:
        logger.error(f"Failed to cache prediction: {str(e)}")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="ml_prediction",
        model_loaded=biomass_model.is_loaded,
        timestamp=datetime.utcnow().isoformat()
    )

@app.get("/models")
async def get_models():
    """Get available models information"""
    return {
        "models": [
            {
                "name": "biomass_v1",
                "version": biomass_model.model_version,
                "status": "loaded" if biomass_model.is_loaded else "error",
                "description": "Pasture biomass prediction model",
                "inputs": ["image_features", "metadata"],
                "outputs": ["Dry_Green_g", "Dry_Dead_g", "Dry_Clover_g", "GDM_g", "Dry_Total_g"]
            }
        ]
    }

@app.post("/models/reload")
async def reload_model():
    """Reload the ML model"""
    try:
        biomass_model.load_model()
        return {
            "status": "success",
            "message": f"Model {biomass_model.model_version} reloaded",
            "loaded": biomass_model.is_loaded
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reload model: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8003,
        workers=int(os.getenv("WORKERS", 2))
    )