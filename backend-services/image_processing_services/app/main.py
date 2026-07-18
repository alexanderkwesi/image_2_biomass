from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import json
from typing import Dict, Any
import base64
from io import BytesIO
from PIL import Image
import redis
import asyncpg
from datetime import datetime
import os

from validators.image_validator import ImageValidator
from processors.image_processor import ImageProcessor

app = FastAPI(title="Image Processing Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection
redis_client = redis.Redis(host='redis', port=6379, db=0)

# Database connection
database_url = os.getenv("DATABASE_URL", "postgresql://postgres:superpassword@localhost/pasturescan_db")
pool = None

# Initialize validators and processors
image_validator = ImageValidator()
image_processor = ImageProcessor()

async def get_db_pool():
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(database_url)
    return pool

def pil_to_cv2(pil_image):
    """Convert PIL Image to OpenCV format"""
    numpy_image = np.array(pil_image)
    return cv2.cvtColor(numpy_image, cv2.COLOR_RGB2BGR)

def cv2_to_pil(cv2_image):
    """Convert OpenCV image to PIL format"""
    rgb_image = cv2.cvtColor(cv2_image, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb_image)

async def save_image_metadata(image_id: str, metadata: Dict[str, Any]):
    """Save image metadata to database"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute('''
            INSERT INTO images (
                id, user_id, original_filename, file_path, file_size,
                resolution, capture_location, capture_timestamp,
                camera_metadata, validation_results
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ''', image_id, metadata.get('user_id'), metadata.get('filename'),
            metadata.get('file_path'), metadata.get('file_size'),
            metadata.get('resolution'), metadata.get('location'),
            metadata.get('timestamp'), metadata.get('camera_metadata'),
            metadata.get('validation_results'))

@app.post("/images/upload")
async def upload_image(
    file: UploadFile = File(...),
    metadata: str = Form(...)
):
    """Upload and process image for biomass prediction"""
    try:
        # Parse metadata
        metadata_dict = json.loads(metadata)
        image_id = metadata_dict.get('image_id', f"img_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}")
        
        # Read and validate image
        contents = await file.read()
        pil_image = Image.open(BytesIO(contents))
        
        # Convert to OpenCV for processing
        cv2_image = pil_to_cv2(pil_image)
        
        # Validate image quality
        validation_result = image_validator.validate_image_quality(cv2_image)
        
        if not validation_result["valid"]:
            return {
                "success": False,
                "error": "Image validation failed",
                "issues": validation_result["issues"],
                "image_id": image_id
            }
        
        # Process image for ML model
        processed_image = image_processor.preprocess_for_ml(cv2_image)
        
        # Extract features
        features = image_processor.extract_features(cv2_image)
        
        # Store processed image temporarily (in production, use cloud storage)
        processed_image_path = f"/tmp/processed_{image_id}.jpg"
        cv2.imwrite(processed_image_path, processed_image)
        
        # Prepare image data for ML service
        image_data = {
            "image_id": image_id,
            "image_url": processed_image_path,  # In production, use cloud storage URL
            "features": features,
            "metadata": {
                **metadata_dict,
                "validation_results": validation_result,
                "original_size": f"{pil_image.width}x{pil_image.height}",
                "processed_size": f"{processed_image.shape[1]}x{processed_image.shape[0]}"
            }
        }
        
        # Cache image data for ML service
        redis_client.setex(
            f"image_data:{image_id}",
            3600,  # 1 hour expiry
            json.dumps(image_data)
        )
        
        # Save metadata to database
        await save_image_metadata(image_id, {
            **metadata_dict,
            "filename": file.filename,
            "file_path": processed_image_path,
            "file_size": len(contents),
            "resolution": f"{pil_image.width}x{pil_image.height}",
            "validation_results": validation_result
        })
        
        return {
            "success": True,
            "image_id": image_id,
            "validation_result": validation_result,
            "features": features,
            "message": "Image uploaded and processed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing error: {str(e)}")

@app.post("/images/validate")
async def validate_image(image_data: Dict[str, Any]):
    """Validate image quality for biomass prediction"""
    try:
        image_base64 = image_data.get('image_data')
        if not image_base64:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_base64)
        pil_image = Image.open(BytesIO(image_bytes))
        cv2_image = pil_to_cv2(pil_image)
        
        # Validate image
        validation_result = image_validator.validate_image_quality(cv2_image)
        
        return {
            "success": True,
            "validation_result": validation_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image validation error: {str(e)}")

@app.post("/images/process")
async def process_image(image_data: Dict[str, Any]):
    """Process image for feature extraction"""
    try:
        image_id = image_data.get('image_id')
        if not image_id:
            raise HTTPException(status_code=400, detail="Image ID required")
        
        # Get cached image data
        cached_data = redis_client.get(f"image_data:{image_id}")
        if not cached_data:
            raise HTTPException(status_code=404, detail="Image data not found")
        
        image_info = json.loads(cached_data)
        
        # Load and process image
        cv2_image = cv2.imread(image_info['image_url'])
        if cv2_image is None:
            raise HTTPException(status_code=404, detail="Image file not found")
        
        # Extract advanced features
        advanced_features = image_processor.extract_advanced_features(cv2_image)
        
        # Update cached data with advanced features
        image_info['advanced_features'] = advanced_features
        redis_client.setex(
            f"image_data:{image_id}",
            3600,
            json.dumps(image_info)
        )
        
        return {
            "success": True,
            "image_id": image_id,
            "advanced_features": advanced_features,
            "message": "Image processed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing error: {str(e)}")

@app.get("/images/{image_id}/features")
async def get_image_features(image_id: str):
    """Get extracted features for an image"""
    try:
        cached_data = redis_client.get(f"image_data:{image_id}")
        if not cached_data:
            raise HTTPException(status_code=404, detail="Image features not found")
        
        image_info = json.loads(cached_data)
        
        return {
            "success": True,
            "image_id": image_id,
            "basic_features": image_info.get('features', {}),
            "advanced_features": image_info.get('advanced_features', {}),
            "metadata": image_info.get('metadata', {})
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving features: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check Redis connection
        redis_client.ping()
        
        # Check database connection
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.execute("SELECT 1")
        
        return {
            "status": "healthy",
            "service": "image_processing",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Service unhealthy: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5002)