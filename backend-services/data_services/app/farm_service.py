from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncpg
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/farms", tags=["farms"])

class FarmCreate(BaseModel):
    name: str
    area_hectares: float
    location: Optional[str] = None
    soil_type: Optional[str] = None
    pasture_type: Optional[str] = None
    is_active: bool = True

class FarmUpdate(BaseModel):
    name: Optional[str] = None
    area_hectares: Optional[float] = None
    location: Optional[str] = None
    soil_type: Optional[str] = None
    pasture_type: Optional[str] = None
    is_active: Optional[bool] = None

class FarmResponse(BaseModel):
    id: str
    user_id: str
    name: str
    area_hectares: float
    location: Optional[str]
    soil_type: Optional[str]
    pasture_type: Optional[str]
    is_active: bool
    created_at: datetime
    scan_count: Optional[int] = 0
    avg_biomass: Optional[float] = None

class FarmStatsResponse(BaseModel):
    farm_id: str
    total_scans: int
    avg_biomass: Optional[float]
    last_scan: Optional[datetime]
    soil_health: Optional[str]
    biomass_trend: List[Dict[str, Any]]

@router.get("", response_model=List[FarmResponse])
async def get_user_farms(user_id: str, db_pool=Depends(get_db_pool)):
    """Get all farms for a user"""
    try:
        async with db_pool.acquire() as conn:
            farms = await conn.fetch('''
                SELECT 
                    f.*,
                    COUNT(p.id) as scan_count,
                    AVG(p.dry_total_g) as avg_biomass
                FROM farms f
                LEFT JOIN predictions p ON p.image_id IN (
                    SELECT id FROM images WHERE farm_id = f.id
                )
                WHERE f.user_id = $1
                GROUP BY f.id
                ORDER BY f.created_at DESC
            ''', user_id)
            
            return [
                FarmResponse(
                    id=str(farm['id']),
                    user_id=str(farm['user_id']),
                    name=farm['name'],
                    area_hectares=float(farm['area_hectares']),
                    location=farm['location'],
                    soil_type=farm['soil_type'],
                    pasture_type=farm['pasture_type'],
                    is_active=farm['is_active'],
                    created_at=farm['created_at'],
                    scan_count=farm['scan_count'],
                    avg_biomass=float(farm['avg_biomass']) if farm['avg_biomass'] else None
                )
                for farm in farms
            ]
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching farms: {str(e)}")

@router.post("", response_model=FarmResponse)
async def create_farm(farm_data: FarmCreate, user_id: str, db_pool=Depends(get_db_pool)):
    """Create a new farm"""
    try:
        async with db_pool.acquire() as conn:
            farm = await conn.fetchrow('''
                INSERT INTO farms (
                    user_id, name, area_hectares, location, 
                    soil_type, pasture_type, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            ''', user_id, farm_data.name, farm_data.area_hectares,
                farm_data.location, farm_data.soil_type, 
                farm_data.pasture_type, farm_data.is_active)
            
            return FarmResponse(
                id=str(farm['id']),
                user_id=str(farm['user_id']),
                name=farm['name'],
                area_hectares=float(farm['area_hectares']),
                location=farm['location'],
                soil_type=farm['soil_type'],
                pasture_type=farm['pasture_type'],
                is_active=farm['is_active'],
                created_at=farm['created_at']
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating farm: {str(e)}")

@router.put("/{farm_id}", response_model=FarmResponse)
async def update_farm(
    farm_id: str, 
    farm_data: FarmUpdate, 
    user_id: str,
    db_pool=Depends(get_db_pool)
):
    """Update a farm"""
    try:
        async with db_pool.acquire() as conn:
            # Build update query dynamically
            update_fields = []
            update_values = []
            param_count = 1
            
            for field, value in farm_data.dict(exclude_unset=True).items():
                update_fields.append(f"{field} = ${param_count}")
                update_values.append(value)
                param_count += 1
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            update_values.extend([farm_id, user_id])
            
            farm = await conn.fetchrow(f'''
                UPDATE farms 
                SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ${param_count} AND user_id = ${param_count + 1}
                RETURNING *
            ''', *update_values)
            
            if not farm:
                raise HTTPException(status_code=404, detail="Farm not found")
            
            return FarmResponse(
                id=str(farm['id']),
                user_id=str(farm['user_id']),
                name=farm['name'],
                area_hectares=float(farm['area_hectares']),
                location=farm['location'],
                soil_type=farm['soil_type'],
                pasture_type=farm['pasture_type'],
                is_active=farm['is_active'],
                created_at=farm['created_at']
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating farm: {str(e)}")

@router.delete("/{farm_id}")
async def delete_farm(farm_id: str, user_id: str, db_pool=Depends(get_db_pool)):
    """Delete a farm"""
    try:
        async with db_pool.acquire() as conn:
            result = await conn.execute('''
                DELETE FROM farms 
                WHERE id = $1 AND user_id = $2
            ''', farm_id, user_id)
            
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Farm not found")
            
            return {"success": True, "message": "Farm deleted successfully"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting farm: {str(e)}")

@router.get("/{farm_id}/predictions")
async def get_farm_predictions(
    farm_id: str, 
    user_id: str,
    time_range: str = "30d",
    db_pool=Depends(get_db_pool)
):
    """Get predictions for a specific farm"""
    try:
        # Calculate date range
        if time_range == "7d":
            start_date = datetime.utcnow() - timedelta(days=7)
        elif time_range == "30d":
            start_date = datetime.utcnow() - timedelta(days=30)
        elif time_range == "90d":
            start_date = datetime.utcnow() - timedelta(days=90)
        elif time_range == "1y":
            start_date = datetime.utcnow() - timedelta(days=365)
        else:
            start_date = datetime.utcnow() - timedelta(days=30)
        
        async with db_pool.acquire() as conn:
            predictions = await conn.fetch('''
                SELECT p.* 
                FROM predictions p
                JOIN images i ON p.image_id = i.id
                WHERE i.farm_id = $1 AND i.user_id = $2 
                AND p.created_at >= $3
                ORDER BY p.created_at DESC
            ''', farm_id, user_id, start_date)
            
            return {
                "predictions": [
                    {
                        "id": str(pred['id']),
                        "image_id": str(pred['image_id']),
                        "dry_green_g": float(pred['dry_green_g']),
                        "dry_dead_g": float(pred['dry_dead_g']),
                        "dry_clover_g": float(pred['dry_clover_g']),
                        "gdm_g": float(pred['gdm_g']),
                        "dry_total_g": float(pred['dry_total_g']),
                        "confidence_score": float(pred['confidence_score']),
                        "processing_time": float(pred['processing_time']),
                        "created_at": pred['created_at']
                    }
                    for pred in predictions
                ]
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching farm predictions: {str(e)}")

@router.get("/{farm_id}/stats")
async def get_farm_stats(farm_id: str, user_id: str, db_pool=Depends(get_db_pool)):
    """Get statistics for a farm"""
    try:
        async with db_pool.acquire() as conn:
            stats = await conn.fetchrow('''
                SELECT 
                    COUNT(p.id) as total_scans,
                    AVG(p.dry_total_g) as avg_biomass,
                    MAX(p.created_at) as last_scan,
                    f.soil_type,
                    f.pasture_type
                FROM farms f
                LEFT JOIN images i ON i.farm_id = f.id
                LEFT JOIN predictions p ON p.image_id = i.id
                WHERE f.id = $1 AND f.user_id = $2
                GROUP BY f.id, f.soil_type, f.pasture_type
            ''', farm_id, user_id)
            
            if not stats:
                raise HTTPException(status_code=404, detail="Farm not found")
            
            # Get biomass trend (last 7 scans)
            trend_data = await conn.fetch('''
                SELECT 
                    p.dry_total_g,
                    p.created_at
                FROM predictions p
                JOIN images i ON p.image_id = i.id
                WHERE i.farm_id = $1 AND i.user_id = $2
                ORDER BY p.created_at DESC
                LIMIT 7
            ''', farm_id, user_id)
            
            biomass_trend = [
                {
                    "date": trend['created_at'].isoformat(),
                    "biomass": float(trend['dry_total_g'])
                }
                for trend in reversed(trend_data)
            ]
            
            # Determine soil health (simplified)
            soil_health = "Good"
            if stats['avg_biomass']:
                if stats['avg_biomass'] < 1000:
                    soil_health = "Needs Attention"
                elif stats['avg_biomass'] > 2000:
                    soil_health = "Excellent"
            
            return {
                "stats": {
                    "farm_id": farm_id,
                    "total_scans": stats['total_scans'],
                    "avg_biomass": float(stats['avg_biomass']) if stats['avg_biomass'] else None,
                    "last_scan": stats['last_scan'],
                    "soil_health": soil_health,
                    "biomass_trend": biomass_trend
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching farm stats: {str(e)}")

@router.get("/stats/overview")
async def get_farms_overview(user_id: str, db_pool=Depends(get_db_pool)):
    """Get overview statistics for all user farms"""
    try:
        async with db_pool.acquire() as conn:
            overview = await conn.fetchrow('''
                SELECT 
                    COUNT(*) as total_farms,
                    COUNT(CASE WHEN is_active THEN 1 END) as active_farms,
                    SUM(area_hectares) as total_area,
                    (
                        SELECT COUNT(*) 
                        FROM images i 
                        JOIN farms f ON i.farm_id = f.id 
                        WHERE f.user_id = $1
                    ) as total_scans
                FROM farms 
                WHERE user_id = $1
            ''', user_id)
            
            recent_activity = await conn.fetchrow('''
                SELECT COUNT(*) as recent_scans
                FROM predictions p
                JOIN images i ON p.image_id = i.id
                JOIN farms f ON i.farm_id = f.id
                WHERE f.user_id = $1 
                AND p.created_at >= $2
            ''', user_id, datetime.utcnow() - timedelta(days=7))
            
            return {
                "overview": {
                    "total_farms": overview['total_farms'],
                    "active_farms": overview['active_farms'],
                    "total_area": float(overview['total_area']),
                    "total_scans": overview['total_scans'],
                    "recent_scans": recent_activity['recent_scans']
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching farms overview: {str(e)}")