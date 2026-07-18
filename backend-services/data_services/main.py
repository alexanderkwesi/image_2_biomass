from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import asyncpg
from pydantic import BaseModel, Field, field_validator, validator, email_predictor;
from typing import Optional
from datetime import datetime
from datetime import datetime, timedelta
import json
import os
from dataclasses import dataclass

app = FastAPI(title="Data Service", version="1.0.0")

# Database configuration
database_url = os.getenv("DATABASE_URL", "postgresql://postgres:superpassword@localhost/pasturescan_db")
pool = None


class PastureImageData_do_not_use(BaseModel):
    image_id: str
    user_id: str
    farm_id: Optional[str] = None
    image_data: str  # Base64 encoded image
    pasture_name: str
    location: Optional[str] = None
    notes: Optional[str] = None
    capture_date: str
    estimated_biomass: Optional[float] = None
    quality_rating: Optional[int] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    


from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum

class QualityRating(int, Enum):
    POOR = 1
    FAIR = 2
    GOOD = 3
    VERY_GOOD = 4
    EXCELLENT = 5

class PastureImageData(BaseModel):
    pasture_name: str = Field(..., min_length=1, max_length=100, description="Name of the pasture")
    image_name: str = Field(..., min_length=1, max_length=255, description="Name of the image file")
    date_taken: datetime = Field(..., description="Date when the image was taken")
    quality_rating: Optional[QualityRating] = Field(None, description="Quality rating from 1 to 5")
    
    # Additional fields if needed
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="Latitude coordinate")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="Longitude coordinate")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")
    
    @field_validator('pasture_name')
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Pasture name cannot be empty')
        return v.strip()
    
    @field_validator('image_name')
    @classmethod
    def image_name_must_be_valid(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Image name cannot be empty')
        # Optional: Add file extension validation
        if not v.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp')):
            raise ValueError('Image must have a valid extension (jpg, jpeg, png, gif, bmp)')
        return v.strip()

class PastureImageResponse(PastureImageData):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
    
    
class PastureImageUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    capture_date: Optional[datetime] = None
    coordinates: Optional[Dict[str, float]] = None
    altitude: Optional[float] = None
    weather_conditions: Optional[str] = None
    tags: Optional[List[str]] = None
    is_processed: Optional[bool] = None
    
    @validator('capture_date')
    def validate_capture_date(cls, v):
        if v and isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('Invalid date format. Use ISO format.')
        return v
    
    
class PastureImageBase(BaseModel):
    farm_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    capture_date: Optional[datetime] = None
    coordinates: Optional[Dict[str, float]] = None
    altitude: Optional[float] = None
    weather_conditions: Optional[str] = None
    tags: Optional[List[str]] = None
    
    @field_validator('farm_id')
    @classmethod
    def validate_farm_id(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Farm ID cannot be empty')
        return v.strip()
    
    @field_validator('capture_date', mode='before')
    @classmethod
    def validate_capture_date(cls, v):
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('Invalid date format. Use ISO format.')
        return v

class PastureImageCreate(PastureImageBase):
    pass

class PastureImageUpdate_do_not_use(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    capture_date: Optional[datetime] = None
    coordinates: Optional[Dict[str, float]] = None
    altitude: Optional[float] = None
    weather_conditions: Optional[str] = None
    tags: Optional[List[str]] = None
    is_processed: Optional[bool] = None
    
    @field_validator('capture_date', mode='before')
    @classmethod
    def validate_capture_date(cls, v):
        if v and isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('Invalid date format. Use ISO format.')
        return v

class PastureImageResponse(BaseModel):
    id: str
    user_id: str
    farm_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: str
    thumbnail_url: Optional[str] = None
    capture_date: Optional[datetime] = None
    coordinates: Optional[Dict[str, float]] = None
    altitude: Optional[float] = None
    weather_conditions: Optional[str] = None
    tags: Optional[List[str]] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    is_processed: bool = False
    processing_status: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class PastureImageUploadRequest(BaseModel):
    farm_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    capture_date: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None
    altitude: Optional[float] = None
    weather_conditions: Optional[str] = None
    tags: Optional[List[str]] = None
    
    @field_validator('farm_id')
    @classmethod
    def validate_farm_id(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Farm ID cannot be empty')
        return v.strip()
        
    
    
    

class PredictionCreate(BaseModel):
    image_id: str
    user_id: str
    dry_green_g: float
    dry_dead_g: float
    dry_clover_g: float
    gdm_g: float
    dry_total_g: float
    confidence_score: float
    model_version: str
    processing_time: float

class PredictionResponse(BaseModel):
    id: str
    image_id: str
    user_id: str
    dry_green_g: float
    dry_dead_g: float
    dry_clover_g: float
    gdm_g: float
    dry_total_g: float
    confidence_score: float
    model_version: str
    processing_time: float
    created_at: datetime

class PredictionHistoryResponse(BaseModel):
    predictions: List[PredictionResponse]
    total_count: int
    page: int
    total_pages: int

@dataclass
class Prediction:
    id: str
    image_id: str
    user_id: str
    dry_green_g: float
    dry_dead_g: float
    dry_clover_g: float
    gdm_g: float
    dry_total_g: float
    confidence_score: float
    model_version: str
    processing_time: float
    created_at: datetime

async def get_db_pool():
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(database_url)
    return pool

async def create_tables():
    """Create necessary tables if they don't exist"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Images table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS images (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                original_filename VARCHAR(255),
                file_path VARCHAR(500),
                file_size INTEGER,
                resolution VARCHAR(50),
                capture_location JSONB,
                capture_timestamp TIMESTAMP,
                camera_metadata JSONB,
                validation_results JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Predictions table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS predictions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                image_id UUID REFERENCES images(id),
                user_id UUID NOT NULL,
                dry_green_g DECIMAL(10,4),
                dry_dead_g DECIMAL(10,4),
                dry_clover_g DECIMAL(10,4),
                gdm_g DECIMAL(10,4),
                dry_total_g DECIMAL(10,4),
                confidence_score DECIMAL(5,4),
                model_version VARCHAR(50),
                processing_time DECIMAL(10,4),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for performance
        await conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_predictions_user_id 
            ON predictions(user_id)
        ''')
        await conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_predictions_created_at 
            ON predictions(created_at)
        ''')
        await conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_predictions_image_id 
            ON predictions(image_id)
        ''')

@app.on_event("startup")
async def startup_event():
    await create_tables()

@app.post("/predictions", response_model=PredictionResponse)
async def create_prediction(prediction_data: PredictionCreate):
    """Create a new prediction record"""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # First, check if image exists
            image_row = await conn.fetchrow(
                "SELECT id FROM images WHERE id = $1", prediction_data.image_id
            )
            if not image_row:
                raise HTTPException(status_code=404, detail="Image not found")
            
            # Insert prediction
            row = await conn.fetchrow('''
                INSERT INTO predictions (
                    image_id, user_id, dry_green_g, dry_dead_g, dry_clover_g,
                    gdm_g, dry_total_g, confidence_score, model_version, processing_time
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            ''', prediction_data.image_id, prediction_data.user_id,
                prediction_data.dry_green_g, prediction_data.dry_dead_g,
                prediction_data.dry_clover_g, prediction_data.gdm_g,
                prediction_data.dry_total_g, prediction_data.confidence_score,
                prediction_data.model_version, prediction_data.processing_time)
            
            prediction = Prediction(
                id=str(row['id']),
                image_id=str(row['image_id']),
                user_id=str(row['user_id']),
                dry_green_g=float(row['dry_green_g']),
                dry_dead_g=float(row['dry_dead_g']),
                dry_clover_g=float(row['dry_clover_g']),
                gdm_g=float(row['gdm_g']),
                dry_total_g=float(row['dry_total_g']),
                confidence_score=float(row['confidence_score']),
                model_version=row['model_version'],
                processing_time=float(row['processing_time']),
                created_at=row['created_at']
            )
            
            return PredictionResponse(**prediction.__dict__)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating prediction: {str(e)}")

@app.get("/predictions/{prediction_id}", response_model=PredictionResponse)
async def get_prediction(prediction_id: str):
    """Get a specific prediction by ID"""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM predictions WHERE id = $1", prediction_id
            )
            if not row:
                raise HTTPException(status_code=404, detail="Prediction not found")
            
            prediction = Prediction(
                id=str(row['id']),
                image_id=str(row['image_id']),
                user_id=str(row['user_id']),
                dry_green_g=float(row['dry_green_g']),
                dry_dead_g=float(row['dry_dead_g']),
                dry_clover_g=float(row['dry_clover_g']),
                gdm_g=float(row['gdm_g']),
                dry_total_g=float(row['dry_total_g']),
                confidence_score=float(row['confidence_score']),
                model_version=row['model_version'],
                processing_time=float(row['processing_time']),
                created_at=row['created_at']
            )
            
            return PredictionResponse(**prediction.__dict__)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving prediction: {str(e)}")

@app.get("/predictions/history/{user_id}", response_model=PredictionHistoryResponse)
async def get_prediction_history(
    user_id: str,
    limit: int = 20,
    offset: int = 0
):
    """Get prediction history for a user"""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Get total count
            total_count_row = await conn.fetchrow(
                "SELECT COUNT(*) as count FROM predictions WHERE user_id = $1",
                user_id
            )
            total_count = total_count_row['count']
            
            # Get predictions with pagination
            rows = await conn.fetch('''
                SELECT * FROM predictions 
                WHERE user_id = $1 
                ORDER BY created_at DESC 
                LIMIT $2 OFFSET $3
            ''', user_id, limit, offset)
            
            predictions = []
            for row in rows:
                prediction = Prediction(
                    id=str(row['id']),
                    image_id=str(row['image_id']),
                    user_id=str(row['user_id']),
                    dry_green_g=float(row['dry_green_g']),
                    dry_dead_g=float(row['dry_dead_g']),
                    dry_clover_g=float(row['dry_clover_g']),
                    gdm_g=float(row['gdm_g']),
                    dry_total_g=float(row['dry_total_g']),
                    confidence_score=float(row['confidence_score']),
                    model_version=row['model_version'],
                    processing_time=float(row['processing_time']),
                    created_at=row['created_at']
                )
                predictions.append(prediction)
            
            total_pages = (total_count + limit - 1) // limit
            current_page = (offset // limit) + 1
            
            return PredictionHistoryResponse(
                predictions=[PredictionResponse(**p.__dict__) for p in predictions],
                total_count=total_count,
                page=current_page,
                total_pages=total_pages
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving history: {str(e)}")

@app.get("/predictions/user/{user_id}/stats")
async def get_user_stats(user_id: str):
    """Get statistics for a user's predictions"""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Basic counts
            total_predictions_row = await conn.fetchrow(
                "SELECT COUNT(*) as count FROM predictions WHERE user_id = $1",
                user_id
            )
            
            # Average biomass values
            avg_biomass_row = await conn.fetchrow('''
                SELECT 
                    AVG(dry_total_g) as avg_total_biomass,
                    AVG(dry_green_g) as avg_green_biomass,
                    AVG(confidence_score) as avg_confidence
                FROM predictions 
                WHERE user_id = $1
            ''', user_id)
            
            # Recent activity
            recent_activity_row = await conn.fetchrow('''
                SELECT COUNT(*) as recent_count 
                FROM predictions 
                WHERE user_id = $1 AND created_at >= $2
            ''', user_id, datetime.utcnow() - timedelta(days=7))
            
            # Biomass distribution
            biomass_distribution = await conn.fetch('''
                SELECT 
                    CASE 
                        WHEN dry_total_g > 2000 THEN 'High'
                        WHEN dry_total_g > 1000 THEN 'Medium'
                        ELSE 'Low'
                    END as biomass_level,
                    COUNT(*) as count
                FROM predictions 
                WHERE user_id = $1
                GROUP BY biomass_level
            ''', user_id)
            
            distribution_dict = {row['biomass_level']: row['count'] for row in biomass_distribution}
            
            return {
                "total_predictions": total_predictions_row['count'],
                "recent_predictions_7d": recent_activity_row['recent_count'],
                "average_biomass": {
                    "total": float(avg_biomass_row['avg_total_biomass'] or 0),
                    "green": float(avg_biomass_row['avg_green_biomass'] or 0)
                },
                "average_confidence": float(avg_biomass_row['avg_confidence'] or 0),
                "biomass_distribution": distribution_dict
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating stats: {str(e)}")

@app.delete("/predictions/{prediction_id}")
async def delete_prediction(prediction_id: str):
    """Delete a prediction record"""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM predictions WHERE id = $1",
                prediction_id
            )
            
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Prediction not found")
            
            return {"success": True, "message": "Prediction deleted successfully"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting prediction: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return {"status": "healthy", "service": "data"}
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Service unhealthy: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    HOST = "0.0.0.0" or "10.30.179.103" 
    uvicorn.run(app, host=HOST, port=5004)