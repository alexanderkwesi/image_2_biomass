from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any
import asyncpg
from datetime import datetime
import hashlib
import secrets
import re

router = APIRouter(prefix="/user", tags=["user"])

# Pydantic models for user registration and profile
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    confirm_password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    farm_name: Optional[str] = None
    phone: Optional[str] = None

    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        return v

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

    @validator('confirm_password')
    def validate_confirm_password(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    farm_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[Dict[str, Any]] = None

class UserProfileResponse(BaseModel):
    id: str
    username: str
    email: str
    first_name: str
    last_name: str
    farm_name: Optional[str]
    phone: Optional[str]
    location: Optional[Dict[str, Any]]
    total_scans: int
    farms_count: int
    active_farms: int
    created_at: datetime

class AuthResponse(BaseModel):
    success: bool
    user: Optional[Dict[str, Any]] = None
    token: Optional[str] = None
    error: Optional[str] = None

class UserService:
    @staticmethod
    def hash_password(password: str) -> tuple[str, str]:
        """Hash password with salt using PBKDF2"""
        salt = secrets.token_hex(16)
        password_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return password_hash, salt

    @staticmethod
    def verify_password(password: str, stored_hash: str, salt: str) -> bool:
        """Verify password against stored hash"""
        password_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return password_hash == stored_hash

    @staticmethod
    async def register_user(user_data: UserRegister, db_pool) -> AuthResponse:
        """Register a new user in the database"""
        try:
            async with db_pool.acquire() as conn:
                # Check if user already exists
                existing_user = await conn.fetchrow(
                    'SELECT id FROM users WHERE email = $1 OR username = $2',
                    user_data.email, user_data.username
                )
                
                if existing_user:
                    return AuthResponse(
                        success=False,
                        error="User with this email or username already exists"
                    )

                # Hash password
                password_hash, salt = UserService.hash_password(user_data.password)
                
                # Insert user into database
                user = await conn.fetchrow('''
                    INSERT INTO users (
                        username, email, password_hash, salt, first_name, last_name, 
                        farm_name, phone, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id, username, email, first_name, last_name, farm_name, phone, created_at
                ''', 
                    user_data.username,
                    user_data.email,
                    password_hash,
                    salt,
                    user_data.first_name,
                    user_data.last_name,
                    user_data.farm_name,
                    user_data.phone
                )

                # Generate simple token (in production, use JWT)
                token = secrets.token_urlsafe(32)

                return AuthResponse(
                    success=True,
                    user={
                        'id': str(user['id']),
                        'username': user['username'],
                        'email': user['email'],
                        'first_name': user['first_name'],
                        'last_name': user['last_name'],
                        'farm_name': user['farm_name'],
                        'phone': user['phone'],
                        'created_at': user['created_at'].isoformat()
                    },
                    token=token
                )

        except Exception as e:
            return AuthResponse(
                success=False,
                error=f"Registration failed: {str(e)}"
            )

    @staticmethod
    async def login_user(login_data: UserLogin, db_pool) -> AuthResponse:
        """Authenticate user login"""
        try:
            async with db_pool.acquire() as conn:
                # Get user with password hash
                user = await conn.fetchrow('''
                    SELECT id, username, email, password_hash, salt, first_name, last_name, 
                           farm_name, phone, created_at
                    FROM users WHERE email = $1
                ''', login_data.email)

                if not user:
                    return AuthResponse(
                        success=False,
                        error="Invalid email or password"
                    )

                # Verify password
                if not UserService.verify_password(login_data.password, user['password_hash'], user['salt']):
                    return AuthResponse(
                        success=False,
                        error="Invalid email or password"
                    )

                # Generate token
                token = secrets.token_urlsafe(32)

                return AuthResponse(
                    success=True,
                    user={
                        'id': str(user['id']),
                        'username': user['username'],
                        'email': user['email'],
                        'first_name': user['first_name'],
                        'last_name': user['last_name'],
                        'farm_name': user['farm_name'],
                        'phone': user['phone'],
                        'created_at': user['created_at'].isoformat()
                    },
                    token=token
                )

        except Exception as e:
            return AuthResponse(
                success=False,
                error=f"Login failed: {str(e)}"
            )

# FastAPI Routes
@router.post("/register", response_model=AuthResponse)
async def register_user(
    user_data: UserRegister, 
    db_pool=Depends(get_db_pool)
):
    """Register a new user"""
    return await UserService.register_user(user_data, db_pool)

@router.post("/login", response_model=AuthResponse)
async def login_user(
    login_data: UserLogin,
    db_pool=Depends(get_db_pool)
):
    """User login"""
    return await UserService.login_user(login_data, db_pool)

@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(user_id: str, db_pool=Depends(get_db_pool)):
    """Get user profile with statistics"""
    try:
        async with db_pool.acquire() as conn:
            # Get user basic info
            user = await conn.fetchrow('''
                SELECT * FROM users WHERE id = $1
            ''', user_id)
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Get user statistics
            stats = await conn.fetchrow('''
                SELECT 
                    COUNT(DISTINCT i.id) as total_scans,
                    COUNT(DISTINCT f.id) as farms_count,
                    COUNT(DISTINCT CASE WHEN f.is_active THEN f.id END) as active_farms
                FROM users u
                LEFT JOIN farms f ON f.user_id = u.id
                LEFT JOIN images i ON i.farm_id = f.id
                WHERE u.id = $1
            ''', user_id)
            
            return UserProfileResponse(
                id=str(user['id']),
                username=user['username'],
                email=user['email'],
                first_name=user['first_name'],
                last_name=user['last_name'],
                farm_name=user['farm_name'],
                phone=user['phone'],
                location=user['location'],
                total_scans=stats['total_scans'] or 0,
                farms_count=stats['farms_count'] or 0,
                active_farms=stats['active_farms'] or 0,
                created_at=user['created_at']
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user profile: {str(e)}")

@router.put("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_data: UserProfileUpdate, 
    user_id: str,
    db_pool=Depends(get_db_pool)
):
    """Update user profile"""
    try:
        async with db_pool.acquire() as conn:
            # Build update query dynamically
            update_fields = []
            update_values = []
            param_count = 1
            
            for field, value in profile_data.dict(exclude_unset=True).items():
                update_fields.append(f"{field} = ${param_count}")
                update_values.append(value)
                param_count += 1
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            update_values.append(user_id)
            
            user = await conn.fetchrow(f'''
                UPDATE users 
                SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ${param_count}
                RETURNING *
            ''', *update_values)
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Get updated statistics
            stats = await conn.fetchrow('''
                SELECT 
                    COUNT(DISTINCT i.id) as total_scans,
                    COUNT(DISTINCT f.id) as farms_count,
                    COUNT(DISTINCT CASE WHEN f.is_active THEN f.id END) as active_farms
                FROM users u
                LEFT JOIN farms f ON f.user_id = u.id
                LEFT JOIN images i ON i.farm_id = f.id
                WHERE u.id = $1
            ''', user_id)
            
            return UserProfileResponse(
                id=str(user['id']),
                username=user['username'],
                email=user['email'],
                first_name=user['first_name'],
                last_name=user['last_name'],
                farm_name=user['farm_name'],
                phone=user['phone'],
                location=user['location'],
                total_scans=stats['total_scans'] or 0,
                farms_count=stats['farms_count'] or 0,
                active_farms=stats['active_farms'] or 0,
                created_at=user['created_at']
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user profile: {str(e)}")

@router.get("/stats")
async def get_user_stats(user_id: str, db_pool=Depends(get_db_pool)):
    """Get detailed user statistics"""
    try:
        async with db_pool.acquire() as conn:
            # Basic counts
            basic_stats = await conn.fetchrow('''
                SELECT 
                    COUNT(DISTINCT f.id) as total_farms,
                    COUNT(DISTINCT CASE WHEN f.is_active THEN f.id END) as active_farms,
                    COUNT(DISTINCT i.id) as total_scans,
                    SUM(f.area_hectares) as total_area
                FROM users u
                LEFT JOIN farms f ON f.user_id = u.id
                LEFT JOIN images i ON i.farm_id = f.id
                WHERE u.id = $1
            ''', user_id)
            
            # Recent activity
            recent_activity = await conn.fetchrow('''
                SELECT COUNT(*) as recent_scans
                FROM predictions p
                JOIN images i ON p.image_id = i.id
                JOIN farms f ON i.farm_id = f.id
                WHERE f.user_id = $1 
                AND p.created_at >= CURRENT_DATE - INTERVAL '7 days'
            ''', user_id)
            
            # Biomass statistics
            biomass_stats = await conn.fetchrow('''
                SELECT 
                    AVG(p.dry_total_g) as avg_biomass,
                    MAX(p.dry_total_g) as max_biomass,
                    MIN(p.dry_total_g) as min_biomass
                FROM predictions p
                JOIN images i ON p.image_id = i.id
                JOIN farms f ON i.farm_id = f.id
                WHERE f.user_id = $1 AND p.dry_total_g IS NOT NULL
            ''', user_id)
            
            # Farm type distribution
            farm_types = await conn.fetch('''
                SELECT 
                    pasture_type,
                    COUNT(*) as count
                FROM farms 
                WHERE user_id = $1 AND pasture_type IS NOT NULL
                GROUP BY pasture_type
            ''', user_id)
            
            return {
                "basic_stats": {
                    "total_farms": basic_stats['total_farms'] or 0,
                    "active_farms": basic_stats['active_farms'] or 0,
                    "total_scans": basic_stats['total_scans'] or 0,
                    "total_area": float(basic_stats['total_area']) if basic_stats['total_area'] else 0,
                },
                "recent_activity": {
                    "scans_last_7_days": recent_activity['recent_scans'] or 0,
                },
                "biomass_stats": {
                    "average": float(biomass_stats['avg_biomass']) if biomass_stats['avg_biomass'] else None,
                    "maximum": float(biomass_stats['max_biomass']) if biomass_stats['max_biomass'] else None,
                    "minimum": float(biomass_stats['min_biomass']) if biomass_stats['min_biomass'] else None,
                },
                "farm_distribution": {
                    farm_type['pasture_type']: farm_type['count'] 
                    for farm_type in farm_types
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user stats: {str(e)}")