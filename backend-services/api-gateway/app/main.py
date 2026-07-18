from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi import FastAPI, HTTPException, Depends, Header, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from grpc import Status
import httpx
from pydantic import field_validator, model_validator
from typing import Dict, Any, Optional, List
import json
import redis
from datetime import datetime, timedelta
import jwt
import uuid
from pydantic import BaseModel, EmailStr, field_validator, validator
import hashlib
import sys
import logging
import traceback

sys.path.insert(0, r"C:\Users\user\Documents\image_2_biomass_ml_project_version_1\backend-services")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import your actual database connection
try:
    from database_connection.db_connection import db
    logger.info("Database connection loaded successfully")
    # Check if you have something like this at the top of your file:
    from data_services.main import (
        PastureImageUpdate, 
        PastureImageCreate, 
        PastureImageData as DataServicePastureImageData,  # Renamed to avoid conflict
        PastureImageResponse, 
        PastureImageBase, 
        PastureImageUploadRequest
    )
except ImportError as e:
    logger.error(f"Database module not found: {e}")
    logger.error("Failed to import database connection. Please check the database_connection module.")
    
    # Create a fallback mock that matches the real database interface
    class MockDB:
        def __init__(self):
            self.connection = None
        
        def check_user_exists(self, email):
            logger.warning(f"Mock: Checking if user exists: {email}")
            return False
        
        def register_user(self, user_data):
            logger.warning(f"Mock: Would register {user_data['email']}")
            # Return structure matching real database
            return {
                'id': str(uuid.uuid4()),
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'email': user_data['email'],
                'password_hash': user_data['password_hash'],
                'is_verified': False,
                'created_at': datetime.utcnow()
            }
        
        def get_user_by_email(self, email):
            logger.warning(f"Mock: Getting user by email: {email}")
            # For testing login
            if email == "test@example.com":
                return {
                    'id': 'test-user-id-123',
                    'first_name': 'Test',
                    'last_name': 'User',
                    'email': email,
                    'password_hash': hashlib.sha256('password123'.encode()).hexdigest(),
                    'is_verified': True,
                    'created_at': datetime.utcnow()
                }
            return None
        
        def get_user_by_id(self, user_id):
            logger.warning(f"Mock: Getting user by ID: {user_id}")
            return None
        
        def get_all_users(self):
            logger.warning("Mock: Getting all users")
            return []
        
        def is_connected(self):
            return True
        
        def execute_query(self, query, params=None):
            logger.warning(f"Mock: Executing query: {query}")
            return []
    
    db = MockDB()
    logger.warning("Using mock database - this is for development only!")

app = FastAPI(title="PastureScan API Gateway", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:3000", "http://localhost:5173", "http://localhost:19006", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]
)

# Service URLs
SERVICE_URLS = {
    "auth": "http://localhost:5001" or "http://10.30.179.103:5001",
    "image_processing": "http://localhost:5002" or "http://10.30.179.103:5002",
    "ml_prediction": "http://localhost:5003" or "http://10.30.179.103:5003",
    "data": "http://localhost:5004" or "http://10.30.179.103:5004",
}

# Redis for caching and rate limiting (optional)
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
    logger.info("Connected to Redis successfully")
except redis.exceptions.ConnectionError:
    logger.warning("Redis not running locally - caching disabled")
    redis_client = None
except ImportError:
    logger.warning("Redis package not installed - caching disabled")
    redis_client = None
except Exception as e:
    logger.error(f"Redis connection failed: {e}")
    redis_client = None

# JWT Configuration
SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"

# Password hashing functions
def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    logger.info(f"Hashing password")
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against SHA256 hash"""
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

# Pydantic models
class UserRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    confirm_password: str

    @field_validator('first_name', 'last_name')
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

    @field_validator('password')
    @classmethod
    def password_must_be_strong(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Passwords do not match')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    is_verified: bool
    created_at: datetime

class AuthResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    user: Optional[UserResponse] = None

class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    
    @validator('first_name', 'last_name', always=True)
    def name_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip() if v else v

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str
    
# OLD Pydantic V1
from pydantic import BaseModel, validator

class UserUpdate(BaseModel):
    first_name: str
    last_name: str
    new_password: Optional[str] = None
    confirm_new_password: Optional[str] = None
    
    @validator('first_name', 'last_name', always=True)
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()
    
    @validator('confirm_new_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v
    
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_new_password: str
    
    @validator('new_password')
    def password_must_be_strong(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v
    
    @validator('confirm_new_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

# Farm management models
class FarmData(BaseModel):
    name: str
    area_hectares: float
    primary_crop: Optional[str] = None
    soil_type: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = True
    
    # Remove id and user_id from required fields since they'll be set by the server
    id: Optional[str] = None
    user_id: Optional[str] = None
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Farm name cannot be empty')
        return v.strip()
    
    @validator('area_hectares')
    def area_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Area must be greater than 0')
        return v

class FarmUpdateRequest(BaseModel):
    name: Optional[str] = None
    area_hectares: Optional[float] = None
    primary_crop: Optional[str] = None
    soil_type: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Farm name cannot be empty')
        return v.strip() if v else v
    
    @validator('area_hectares')
    def area_must_be_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Area must be greater than 0')
        return v

class RateLimiter:
    def __init__(self, redis_client, max_requests=100, window_seconds=3600):
        self.redis = redis_client
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    async def is_rate_limited(self, user_id: str) -> bool:
        if not self.redis:
            return False
            
        key = f"rate_limit:{user_id}"
        current = self.redis.get(key)
        
        if current and int(current) >= self.max_requests:
            return True
        
        pipeline = self.redis.pipeline()
        pipeline.incr(key, 1)
        pipeline.expire(key, self.window_seconds)
        pipeline.execute()
        
        return False

rate_limiter = RateLimiter(redis_client)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def verify_token(authorization: str = Header(...)) -> Dict[str, Any]:
    """Verify JWT token and return payload"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: str = Header(...)) -> Dict[str, Any]:
    """Get current user from token"""
    payload = await verify_token(authorization)
    return payload

@app.get("/")
async def root():
    return {"message": "PastureScan API Gateway", "status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/health")
async def health_check():
    """Health check for all services"""
    health_status = {
        "gateway": {"status": "healthy", "timestamp": datetime.utcnow().isoformat()},
        "database": {"status": "checking", "timestamp": datetime.utcnow().isoformat()},
        "redis": {"status": "checking", "timestamp": datetime.utcnow().isoformat()}
    }
    
    # Check database connection
    try:
        if hasattr(db, 'is_connected'):
            if db.is_connected():
                health_status["database"]["status"] = "healthy"
            else:
                health_status["database"]["status"] = "disconnected"
                health_status["database"]["error"] = "Database connection is not active"
        else:
            # For mock database
            health_status["database"]["status"] = "mock"
    except Exception as e:
        health_status["database"]["status"] = "unhealthy"
        health_status["database"]["error"] = str(e)
    
    # Check Redis connection
    if redis_client:
        try:
            redis_client.ping()
            health_status["redis"]["status"] = "healthy"
        except Exception as e:
            health_status["redis"]["status"] = "unhealthy"
            health_status["redis"]["error"] = str(e)
    else:
        health_status["redis"]["status"] = "not_configured"
    
    # Check microservices health
    for service_name, service_url in SERVICE_URLS.items():
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{service_url}/health", timeout=5.0)
                health_status[service_name] = {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "response_time": response.elapsed.total_seconds()
                }
        except Exception as e:
            health_status[service_name] = {
                "status": "unreachable",
                "error": str(e),
                "note": "Microservice might not be running"
            }
    
    return health_status

# Database Authentication Endpoints
@app.post("/api/v1/db/register", response_model=AuthResponse)
async def db_register_user(user_data: UserRegister):
    """Register user directly through database"""
    logger.info(f"Registration attempt for: {user_data.email}")
    
    try:
        # Check if user exists
        logger.info(f"Checking if user exists: {user_data.email}")
        if db.check_user_exists(user_data.email):
            logger.warning(f"User already exists: {user_data.email}")
            raise HTTPException(
                status_code=400,
                detail="User with this email already exists"
            )
        
        # Create user object
        hashed_password = hash_password(user_data.password)
        logger.info(f"Password hashed for {user_data.email}")
        
        user_db_data = {
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "email": user_data.email,
            "password_hash": hashed_password,
            "is_verified": False
        }
        
        # Store user in database
        logger.info(f"Storing user in database: {user_data.email}")
        result = db.register_user(user_db_data)
        logger.info(f"Database result: {result}")
        
        if not result:
            logger.error("Database returned None")
            raise HTTPException(
                status_code=500,
                detail="Failed to register user - database returned no result"
            )
        
        if 'id' not in result:
            logger.error(f"Database result missing 'id' field: {result}")
            raise HTTPException(
                status_code=500,
                detail="Failed to register user - no user ID returned from database"
            )
        
        # Ensure created_at exists
        if 'created_at' not in result:
            result['created_at'] = datetime.utcnow()
            logger.warning("Added missing created_at timestamp")
        
        logger.info(f"User registered successfully: {result['id']}")
        
        # Create access token
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": user_data.email, "user_id": result['id']},
            expires_delta=access_token_expires
        )
        
        return AuthResponse(
            success=True,
            message="Account created successfully!",
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=result['id'],
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                email=user_data.email,
                is_verified=False,
                created_at=result['created_at']
            )
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration failed for {user_data.email}: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Check for specific error messages
        error_msg = str(e)
        if "already exists" in error_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="User with this email already exists"
            )
        raise HTTPException(
            status_code=500,
            detail=f"Registration error: {error_msg}"
        )

@app.post("/api/v1/db/login", response_model=AuthResponse)
async def db_login_user(login_data: UserLogin):
    """Login user directly through database"""
    logger.info(f"Login attempt for: {login_data.email}")
    
    try:
        # Check if user exists in database
        logger.info(f"Looking up user: {login_data.email}")
        user = db.get_user_by_email(login_data.email)
        if not user:
            logger.warning(f"User not found: {login_data.email}")
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        logger.info(f"User found: {user['id']}")
        
        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            logger.warning(f"Invalid password for: {login_data.email}")
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        logger.info(f"Password verified for: {login_data.email}")
        
        # Create access token
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": user["email"], "user_id": user["id"]},
            expires_delta=access_token_expires
        )
        
        logger.info(f"Login successful for: {login_data.email}")
        
        return AuthResponse(
            success=True,
            message="Login successful",
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user["id"],
                first_name=user["first_name"],
                last_name=user["last_name"],
                email=user["email"],
                is_verified=user["is_verified"],
                created_at=user["created_at"]
            )
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error for {login_data.email}: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Login error: {str(e)}"
        )

# Profile Management Endpoints
@app.put("/api/v1/profile", response_model=dict)
async def update_user_profile(
    profile_data: UpdateProfileRequest, 
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update user profile"""
    try:
        # Forward to auth service
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {current_user.get('token')}"}
            response = await client.put(
                f"{SERVICE_URLS['auth']}/auth/profile",
                json=profile_data.dict(exclude_none=True),
                headers=headers,
                timeout=10.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile update error: {str(e)}")

@app.post("/api/v1/profile/change-password", response_model=dict)
async def change_user_password(
    password_data: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Change user password"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {current_user.get('token')}"}
            response = await client.post(
                f"{SERVICE_URLS['auth']}/auth/change-password",
                json=password_data.dict(),
                headers=headers,
                timeout=10.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password change error: {str(e)}")

@app.post("/api/v1/auth/forgot-password", response_model=dict)
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SERVICE_URLS['auth']}/auth/forgot-password",
                json=request.dict(),
                timeout=10.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password reset request error: {str(e)}")

@app.post("/api/v1/auth/reset-password", response_model=dict)
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SERVICE_URLS['auth']}/auth/reset-password",
                json=request.dict(),
                timeout=10.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password reset error: {str(e)}")



# Farm Management Endpoints
@app.post("/api/v1/farms", response_model=dict)
async def create_farm(
    farm_data: FarmData,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new farm"""
    try:
        # Get the user ID from the JWT token
        user_id = current_user.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in token")
        
        # Prepare the farm data for the auth service
        # Remove the user_id from the Pydantic model data
        farm_dict = farm_data.dict(exclude={'user_id', 'id'})
        
        # Generate a farm ID
        farm_id = str(uuid.uuid4())
        
        # Create the complete farm data for the database
        farm_data_for_db = {
            'id': farm_id,
            'user_id': user_id,
            **farm_dict
        }
        
        # Use the database directly instead of forwarding to auth service
        # This avoids the extra network hop and potential issues
        logger.info(f"Creating farm for user {user_id}")
        
        # Check if database has create_farm method
        if hasattr(db, 'create_farm'):
            result = db.create_farm(farm_data_for_db)
            if not result:
                raise HTTPException(status_code=500, detail="Failed to create farm in database")
            
            return {
                "success": True,
                "message": "Farm created successfully",
                "farm": result
            }
        else:
            # Fallback to direct query if create_farm method doesn't exist
            query = """
                INSERT INTO farms (id, user_id, name, area_hectares, primary_crop, soil_type, description, location, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """
            
            params = (
                farm_id,
                user_id,
                farm_data.name,
                farm_data.area_hectares,
                farm_data.primary_crop,
                farm_data.soil_type,
                farm_data.description,
                farm_data.location,
                farm_data.is_active if farm_data.is_active is not None else True
            )
            
            result = db.execute_query(query, params)
            if not result:
                raise HTTPException(status_code=500, detail="Failed to create farm")
            
            farm = dict(result[0])
            return {
                "success": True,
                "message": "Farm created successfully",
                "farm": farm
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create farm error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Create farm error: {str(e)}")
    
    

@app.get("/api/v1/farms/not_use", response_model=dict)
async def get_user_farms_do_not_use(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get all farms for current user"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {current_user.get('token')}"}
            response = await client.get(
                f"{SERVICE_URLS['auth']}/auth/farms",
                headers=headers,
                timeout=10.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get farms error: {str(e)}")

@app.get("/api/v1/farms/{farm_id}", response_model=dict)
async def get_farm(
    farm_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get specific farm by ID"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {current_user.get('token')}"}
            response = await client.get(
                f"{SERVICE_URLS['auth']}/auth/farms/{farm_id}",
                headers=headers,
                timeout=10.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get farm error: {str(e)}")

@app.put("/api/v1/farms/{farm_id}", response_model=dict)
async def update_farm(
    farm_id: str,
    farm_data: FarmUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update a farm"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {current_user.get('token')}"}
            response = await client.put(
                f"{SERVICE_URLS['auth']}/auth/farms/{farm_id}",
                json=farm_data.dict(exclude_none=True),
                headers=headers,
                timeout=10.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update farm error: {str(e)}")

@app.delete("/api/v1/farms/{farm_id}", response_model=dict)
async def delete_farm(
    farm_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a farm"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {current_user.get('token')}"}
            response = await client.delete(
                f"{SERVICE_URLS['auth']}/auth/farms/{farm_id}",
                headers=headers,
                timeout=10.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete farm error: {str(e)}")

# Session Management Endpoints
@app.post("/api/v1/auth/logout", response_model=dict)
async def logout_user(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logout user"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {current_user.get('token')}"}
            response = await client.post(
                f"{SERVICE_URLS['auth']}/auth/logout",
                headers=headers,
                timeout=10.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logout error: {str(e)}")

# Microservice Proxy Endpoints (Keep existing)
@app.post("/api/v1/auth/login")
async def login_user(request: Dict[Any, Any]):
    """Authenticate user through auth service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SERVICE_URLS['auth']}/auth/login",
                json=request,
                timeout=10.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@app.post("/api/v1/auth/verify-token")
async def verify_token_endpoint(request: Dict[Any, Any]):
    """Verify token validity through auth service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SERVICE_URLS['auth']}/auth/verify",
                json=request,
                timeout=5.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token verification error: {str(e)}")

@app.get("/api/v1/auth/profile")
async def get_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get user profile (protected route)"""
    try:
        user_id = current_user.get("user_id")
        logger.info(f"Fetching profile for user_id: {user_id}")
        
        user = db.get_user_by_id(user_id)
        if user:
            return UserResponse(
                id=user["id"],
                first_name=user["first_name"],
                last_name=user["last_name"],
                email=user["email"],
                is_verified=user["is_verified"],
                created_at=user["created_at"]
            )
        else:
            logger.warning(f"User not found: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        logger.error(f"Profile fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Profile fetch error: {str(e)}")

# Image Processing Endpoints (Keep existing)
@app.post("/api/v1/images/upload")
async def upload_image(request: Dict[Any, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    """Upload image through image processing service (protected)"""
    try:
        # Add user context to the request
        request_with_user = request.copy()
        request_with_user["user_id"] = current_user.get("user_id")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SERVICE_URLS['image_processing']}/images/upload",
                json=request_with_user,
                timeout=30.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Image processing timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing error: {str(e)}")

# ML Prediction Endpoints (Keep existing)
@app.post("/api/v1/predictions/create")
async def create_prediction(request: Dict[Any, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    """Create prediction through ML service (protected)"""
    try:
        # Check cache first (skip if Redis not available)
        cache_key = f"prediction:{request.get('image_id')}"
        if redis_client:
            cached_result = redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        
        request_with_user = request.copy()
        request_with_user["user_id"] = current_user.get("user_id")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SERVICE_URLS['ml_prediction']}/predict",
                json=request_with_user,
                timeout=60.0
            )
            
            # Cache successful predictions for 1 hour (if Redis available)
            if redis_client and response.status_code == 200:
                redis_client.setex(cache_key, 3600, response.text)
            
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Prediction timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
    
    
    
    
    
    
    
    
 # Prediction Models (Add to your Pydantic models section)
class PredictionRequest(BaseModel):
    image_id: str
    farm_id: str
    coordinates: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    
    @field_validator('image_id', 'farm_id')
    @classmethod
    def ids_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('ID cannot be empty')
        return v.strip()

class PredictionResponse(BaseModel):
    success: bool
    message: str
    prediction_id: Optional[str] = None
    biomass: Optional[float] = None
    confidence: Optional[float] = None
    timestamp: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

# Prediction Endpoints (Add after your existing endpoints)

@app.post("/api/v1/predictions", response_model=PredictionResponse)
async def create_prediction(
    prediction_data: PredictionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new biomass prediction"""
    logger.info(f"Prediction request from user: {current_user.get('user_id')}")
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Rate limiting
        if await rate_limiter.is_rate_limited(user_id):
            raise HTTPException(
                status_code=429, 
                detail="Rate limit exceeded. Please try again later."
            )
        
        # Check cache first (if Redis available)
        cache_key = f"prediction:{user_id}:{prediction_data.image_id}"
        if redis_client:
            cached_result = redis_client.get(cache_key)
            if cached_result:
                logger.info(f"Cache hit for prediction: {cache_key}")
                cached_data = json.loads(cached_result)
                return PredictionResponse(**cached_data)
        
        # Verify farm ownership
        if hasattr(db, 'verify_farm_ownership'):
            is_owner = db.verify_farm_ownership(user_id, prediction_data.farm_id)
            if not is_owner:
                raise HTTPException(
                    status_code=403, 
                    detail="You don't have permission to add predictions to this farm"
                )
        
        # Forward to ML service
        request_data = {
            "image_id": prediction_data.image_id,
            "farm_id": prediction_data.farm_id,
            "user_id": user_id,
            "coordinates": prediction_data.coordinates,
            "metadata": prediction_data.metadata
        }
        
        logger.info(f"Sending prediction request to ML service: {request_data}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SERVICE_URLS['ml_prediction']}/predict",
                json=request_data,
                timeout=60.0
            )
            
            if response.status_code != 200:
                error_msg = f"ML service error: {response.text}"
                logger.error(error_msg)
                raise HTTPException(status_code=500, detail=error_msg)
            
            result = response.json()
            
            # Store prediction in database if there's a method
            if result.get("success") and hasattr(db, 'store_prediction'):
                prediction_id = str(uuid.uuid4())
                
                db_prediction = {
                    "id": prediction_id,
                    "user_id": user_id,
                    "farm_id": prediction_data.farm_id,
                    "image_id": prediction_data.image_id,
                    "biomass_kg_per_hectare": result.get("biomass"),
                    "confidence": result.get("confidence"),
                    "coordinates": json.dumps(prediction_data.coordinates) if prediction_data.coordinates else None,
                    "metadata": json.dumps(prediction_data.metadata) if prediction_data.metadata else None,
                    "created_at": datetime.utcnow()
                }
                
                db.store_prediction(db_prediction)
                result["prediction_id"] = prediction_id
            
            # Cache successful predictions for 1 hour
            if redis_client and result.get("success"):
                redis_client.setex(cache_key, 3600, json.dumps(result))
            
            return PredictionResponse(**result)
            
    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.error("ML service timeout")
        raise HTTPException(status_code=504, detail="Prediction service timeout")
    except httpx.HTTPStatusError as e:
        logger.error(f"ML service error: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        logger.error(f"Prediction creation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction creation error: {str(e)}")


@app.get("/api/v1/predictions", response_model=dict)
async def get_predictions(
    farm_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    page: int = 1,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get predictions for current user with optional filtering"""
    logger.info(f"Fetching predictions for user: {current_user.get('user_id')}")
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Build query parameters
        params = {"user_id": user_id}
        
        # Add filters if provided
        if farm_id:
            # Verify farm ownership
            if hasattr(db, 'verify_farm_ownership'):
                is_owner = db.verify_farm_ownership(user_id, farm_id)
                if not is_owner:
                    raise HTTPException(
                        status_code=403, 
                        detail="You don't have permission to view predictions for this farm"
                    )
            params["farm_id"] = farm_id
        
        if start_date:
            try:
                datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                params["start_date"] = start_date
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO format.")
        
        if end_date:
            try:
                datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                params["end_date"] = end_date
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO format.")
        
        # Calculate offset for pagination
        offset = (page - 1) * limit
        
        # Get predictions from database
        if hasattr(db, 'get_predictions'):
            predictions = db.get_predictions(
                user_id=user_id,
                farm_id=farm_id,
                start_date=start_date,
                end_date=end_date,
                limit=limit,
                offset=offset
            )
            total = db.get_predictions_count(
                user_id=user_id,
                farm_id=farm_id,
                start_date=start_date,
                end_date=end_date
            )
        else:
            # Fallback to direct query
            query_conditions = ["user_id = %s"]
            query_params = [user_id]
            
            if farm_id:
                query_conditions.append("farm_id = %s")
                query_params.append(farm_id)
            
            if start_date:
                query_conditions.append("created_at >= %s")
                query_params.append(start_date)
            
            if end_date:
                query_conditions.append("created_at <= %s")
                query_params.append(end_date)
            
            where_clause = " AND ".join(query_conditions)
            
            # Get total count
            count_query = f"SELECT COUNT(*) as total FROM predictions WHERE {where_clause}"
            count_result = db.execute_query(count_query, tuple(query_params))
            total = count_result[0]['total'] if count_result else 0
            
            # Get paginated results
            query = f"""
                SELECT * FROM predictions 
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            query_params.extend([limit, offset])
            
            result = db.execute_query(query, tuple(query_params))
            predictions = [dict(row) for row in result] if result else []
        
        # Calculate pagination metadata
        total_pages = (total + limit - 1) // limit if total > 0 else 1
        
        return {
            "success": True,
            "predictions": predictions,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_items": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            },
            "filters": {
                "farm_id": farm_id,
                "start_date": start_date,
                "end_date": end_date
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get predictions error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching predictions: {str(e)}")


@app.get("/api/v1/predictions/{prediction_id}", response_model=dict)
async def get_prediction(
    prediction_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a specific prediction by ID"""
    logger.info(f"Fetching prediction: {prediction_id}")
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Get prediction from database
        if hasattr(db, 'get_prediction_by_id'):
            prediction = db.get_prediction_by_id(prediction_id, user_id)
        else:
            # Fallback to direct query with ownership check
            query = "SELECT * FROM predictions WHERE id = %s AND user_id = %s"
            result = db.execute_query(query, (prediction_id, user_id))
            prediction = dict(result[0]) if result else None
        
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found or access denied")
        
        return {
            "success": True,
            "prediction": prediction
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching prediction: {str(e)}")


@app.delete("/api/v1/predictions/{prediction_id}", response_model=dict)
async def delete_prediction(
    prediction_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a prediction"""
    logger.info(f"Deleting prediction: {prediction_id}")
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Verify prediction ownership
        if hasattr(db, 'get_prediction_by_id'):
            prediction = db.get_prediction_by_id(prediction_id, user_id)
        else:
            query = "SELECT * FROM predictions WHERE id = %s AND user_id = %s"
            result = db.execute_query(query, (prediction_id, user_id))
            prediction = dict(result[0]) if result else None
        
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found or access denied")
        
        # Delete from database
        if hasattr(db, 'delete_prediction'):
            success = db.delete_prediction(prediction_id, user_id)
        else:
            query = "DELETE FROM predictions WHERE id = %s AND user_id = %s RETURNING id"
            result = db.execute_query(query, (prediction_id, user_id))
            success = bool(result)
        
        if success:
            # Clear cache if Redis is available
            if redis_client:
                # Find and delete cache keys for this prediction
                cache_key_pattern = f"prediction:{user_id}:*"
                for key in redis_client.scan_iter(match=cache_key_pattern):
                    cached_data = redis_client.get(key)
                    if cached_data:
                        cached_prediction = json.loads(cached_data)
                        if cached_prediction.get("prediction_id") == prediction_id:
                            redis_client.delete(key)
            
            return {
                "success": True,
                "message": "Prediction deleted successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete prediction")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting prediction: {str(e)}")


@app.get("/api/v1/farms/{farm_id}/predictions/summary", response_model=dict)
async def get_farm_predictions_summary(
    farm_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get summary statistics for predictions on a farm"""
    logger.info(f"Getting predictions summary for farm: {farm_id}")
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Verify farm ownership
        if hasattr(db, 'verify_farm_ownership'):
            is_owner = db.verify_farm_ownership(user_id, farm_id)
            if not is_owner:
                raise HTTPException(
                    status_code=403, 
                    detail="You don't have permission to view predictions for this farm"
                )
        
        # Get predictions summary from database
        if hasattr(db, 'get_farm_predictions_summary'):
            summary = db.get_farm_predictions_summary(farm_id)
        else:
            # Fallback to multiple queries
            query = """
                SELECT 
                    COUNT(*) as total_predictions,
                    AVG(biomass_kg_per_hectare) as average_biomass,
                    MIN(biomass_kg_per_hectare) as min_biomass,
                    MAX(biomass_kg_per_hectare) as max_biomass,
                    AVG(confidence) as average_confidence,
                    MIN(created_at) as first_prediction,
                    MAX(created_at) as last_prediction
                FROM predictions 
                WHERE farm_id = %s AND user_id = %s
            """
            result = db.execute_query(query, (farm_id, user_id))
            summary = dict(result[0]) if result else {}
            
            # Get biomass trend (last 7 predictions)
            trend_query = """
                SELECT biomass_kg_per_hectare, created_at 
                FROM predictions 
                WHERE farm_id = %s AND user_id = %s 
                ORDER BY created_at DESC 
                LIMIT 7
            """
            trend_result = db.execute_query(trend_query, (farm_id, user_id))
            summary["recent_trend"] = [dict(row) for row in trend_result] if trend_result else []
        
        return {
            "success": True,
            "farm_id": farm_id,
            "summary": summary,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get predictions summary error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching predictions summary: {str(e)}")   
    
    
    
    
    
    
    
    
    
    
 # Add this endpoint to main.py after the other farm endpoints
@app.patch("/api/v1/farms/{farm_id}/status", response_model=dict)
async def update_farm_status(
    farm_id: str,
    status_data: Dict[str, bool],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update farm status (active/inactive)"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {current_user.get('token')}"}
            response = await client.patch(
                f"{SERVICE_URLS['auth']}/auth/farms/{farm_id}/status",
                json=status_data,
                headers=headers,
                timeout=10.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update farm status error: {str(e)}")  
    
     
    
@app.get("/api/v1/farms", response_model=dict)
async def get_user_farms(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get all farms for current user"""
    try:
        user_id = current_user.get("user_id")
        logger.info(f"Getting farms for user: {user_id}")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Use the database directly
        if hasattr(db, 'get_user_farms'):
            farms = db.get_user_farms(user_id)
        else:
            # Fallback to direct query
            query = """
                SELECT * FROM farms 
                WHERE user_id = %s AND is_active = TRUE
                ORDER BY created_at DESC
            """
            result = db.execute_query(query, (user_id,))
            farms = [dict(row) for row in result] if result else []
        
        logger.info(f"Found {len(farms)} farms for user {user_id}")
        
        return {
            "success": True,
            "farms": farms,
            "count": len(farms)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get farms error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching farms: {str(e)}")
    

# Database Management Endpoints (Keep existing)
@app.get("/api/v1/db/users")
async def get_all_users(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get all users (admin only)"""
    try:
        users = db.get_all_users()
        return {"users": users}
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

# Public endpoints (no authentication required)
@app.get("/api/v1/public/services")
async def get_services_status():
    """Get status of all services (public)"""
    return await health_check()

@app.get("/api/v1/public/db-status")
async def get_database_status():
    """Get database connection status (public)"""
    try:
        if hasattr(db, 'is_connected'):
            if db.is_connected():
                return {"status": "connected", "database": "healthy"}
            else:
                return {"status": "disconnected", "database": "unhealthy", "error": "Database connection not active"}
        else:
            return {"status": "mock", "database": "using mock database"}
    except Exception as e:
        return {"status": "error", "database": "unhealthy", "error": str(e)}

# Test endpoint
@app.get("/api/v1/test")
async def test_endpoint():
    """Test endpoint to verify server is working"""
    return {
        "status": "ok",
        "message": "Gateway server is running",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected" if hasattr(db, 'is_connected') and db.is_connected() else "mock"
    }




import os
import shutil
from fastapi import UploadFile, File, Form
from fastapi.responses import FileResponse
from PIL import Image
import io

# 3. Configuration for image uploads (add after your other configurations)
# Image upload settings
IMAGE_UPLOAD_DIR = "uploads/pasture_images"
THUMBNAIL_DIR = "uploads/thumbnails"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Create upload directories if they don't exist
os.makedirs(IMAGE_UPLOAD_DIR, exist_ok=True)
os.makedirs(THUMBNAIL_DIR, exist_ok=True)

# 4. Helper functions for image processing
def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

def generate_unique_filename(filename: str) -> str:
    """Generate unique filename to avoid collisions"""
    ext = os.path.splitext(filename)[1]
    unique_id = uuid.uuid4().hex
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"pasture_{timestamp}_{unique_id}{ext}"

def create_thumbnail(image_path: str, filename: str, size: tuple = (300, 300)) -> str:
    """Create thumbnail from image"""
    try:
        with Image.open(image_path) as img:
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else img)
                img = background
            
            thumbnail_filename = f"thumb_{filename}"
            thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_filename)
            
            # Save as JPEG for smaller size
            img.save(thumbnail_path, "JPEG", quality=85, optimize=True)
            
            return thumbnail_filename
    except Exception as e:
        logger.error(f"Error creating thumbnail: {str(e)}")
        return None

def get_image_metadata(image_path: str) -> Dict[str, Any]:
    """Extract metadata from image"""
    try:
        with Image.open(image_path) as img:
            return {
                "width": img.width,
                "height": img.height,
                "format": img.format,
                "mode": img.mode,
                "size": os.path.getsize(image_path)
            }
    except Exception as e:
        logger.error(f"Error getting image metadata: {str(e)}")
        return {}


   

@app.post("/api/v1/pasture-images/upload", response_model=Dict[str, Any])
async def upload_pasture_image(
    file: UploadFile = File(...),
    farm_id: str = Form(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    capture_date: Optional[str] = Form(None),
    coordinates: Optional[str] = Form(None),
    altitude: Optional[float] = Form(None),
    weather_conditions: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upload a pasture image with metadata
    """
    logger.info(f"Image upload request from user: {current_user.get('user_id')}")
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Verify farm ownership
        if hasattr(db, 'verify_farm_ownership'):
            is_owner = db.verify_farm_ownership(user_id, farm_id)
            if not is_owner:
                raise HTTPException(
                    status_code=403, 
                    detail="You don't have permission to upload images to this farm"
                )
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file selected")
        
        if not allowed_file(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        contents = await file.read()
        
        # Check file size
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Generate unique filename
        original_filename = file.filename
        unique_filename = generate_unique_filename(original_filename)
        file_path = os.path.join(IMAGE_UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
        
        # Get image metadata
        metadata = get_image_metadata(file_path)
        
        # Create thumbnail
        thumbnail_filename = create_thumbnail(file_path, unique_filename)
        thumbnail_url = f"/api/v1/pasture-images/thumbnails/{thumbnail_filename}" if thumbnail_filename else None
        
        # Parse optional fields
        parsed_coordinates = None
        if coordinates:
            try:
                parsed_coordinates = json.loads(coordinates)
            except json.JSONDecodeError:
                parsed_coordinates = None
        
        parsed_tags = None
        if tags:
            try:
                parsed_tags = json.loads(tags)
            except json.JSONDecodeError:
                parsed_tags = tags.split(",") if tags else None
        
        # Parse capture date
        parsed_capture_date = None
        if capture_date:
            try:
                parsed_capture_date = datetime.fromisoformat(capture_date.replace('Z', '+00:00'))
            except ValueError:
                parsed_capture_date = None
        
        # Generate image ID
        image_id = str(uuid.uuid4())
        
        # Store image info in database
        if hasattr(db, 'store_pasture_image'):
            image_data = {
                "id": image_id,
                "user_id": user_id,
                "farm_id": farm_id,
                "title": title,
                "description": description,
                "original_filename": original_filename,
                "filename": unique_filename,
                "image_url": f"/api/v1/pasture-images/{image_id}/file",
                "thumbnail_url": thumbnail_url,
                "capture_date": parsed_capture_date,
                "coordinates": parsed_coordinates,
                "altitude": altitude,
                "weather_conditions": weather_conditions,
                "tags": parsed_tags,
                "file_size": len(contents),
                "file_type": file.content_type,
                "width": metadata.get("width"),
                "height": metadata.get("height"),
                "is_processed": False,
                "processing_status": "pending",
                "created_at": datetime.utcnow()
            }
            
            result = db.store_pasture_image(image_data)
            
            if not result:
                # Clean up uploaded files if database storage fails
                if os.path.exists(file_path):
                    os.remove(file_path)
                if thumbnail_filename and os.path.exists(os.path.join(THUMBNAIL_DIR, thumbnail_filename)):
                    os.remove(os.path.join(THUMBNAIL_DIR, thumbnail_filename))
                
                raise HTTPException(status_code=500, detail="Failed to store image information")
            
            # Trigger async processing if needed
            # (You can add background task for ML processing here)
            
            return {
                "success": True,
                "message": "Image uploaded successfully",
                "image_id": image_id,
                "filename": unique_filename,
                "thumbnail_url": thumbnail_url,
                "image_url": f"/api/v1/pasture-images/{image_id}/file",
                "metadata": {
                    "size": len(contents),
                    "width": metadata.get("width"),
                    "height": metadata.get("height"),
                    "type": file.content_type
                }
            }
        else:
            raise HTTPException(status_code=501, detail="Image storage not implemented")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image upload error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Image upload error: {str(e)}")

@app.get("/api/v1/pasture-images", response_model=Dict[str, Any])
async def get_pasture_images(
    farm_id: Optional[str] = None,
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    is_processed: Optional[bool] = None,
    limit: int = 100,
    page: int = 1,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get pasture images with filtering and pagination
    """
    logger.info(f"Getting pasture images for user: {current_user.get('user_id')}")
    
    try:
        request_user_id = current_user.get("user_id")
        if not request_user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # If user_id is specified and not admin, check permission
        if user_id and user_id != request_user_id:
            # Check if user is admin (implement your admin check here)
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Use requested user_id or current user's id
        filter_user_id = user_id if user_id else request_user_id
        
        # Build query parameters
        params = {"user_id": filter_user_id}
        
        if farm_id:
            # Verify farm ownership
            if hasattr(db, 'verify_farm_ownership'):
                is_owner = db.verify_farm_ownership(filter_user_id, farm_id)
                if not is_owner:
                    raise HTTPException(
                        status_code=403, 
                        detail="You don't have permission to view images for this farm"
                    )
            params["farm_id"] = farm_id
        
        if start_date:
            try:
                datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                params["start_date"] = start_date
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO format.")
        
        if end_date:
            try:
                datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                params["end_date"] = end_date
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO format.")
        
        if is_processed is not None:
            params["is_processed"] = is_processed
        
        # Calculate offset for pagination
        offset = (page - 1) * limit
        
        # Get images from database
        if hasattr(db, 'get_pasture_images'):
            images = db.get_pasture_images(
                user_id=filter_user_id,
                farm_id=farm_id,
                start_date=start_date,
                end_date=end_date,
                is_processed=is_processed,
                limit=limit,
                offset=offset
            )
            total = db.get_pasture_images_count(
                user_id=filter_user_id,
                farm_id=farm_id,
                start_date=start_date,
                end_date=end_date,
                is_processed=is_processed
            )
        else:
            # Fallback implementation
            query_conditions = ["user_id = %s"]
            query_params = [filter_user_id]
            
            if farm_id:
                query_conditions.append("farm_id = %s")
                query_params.append(farm_id)
            
            if start_date:
                query_conditions.append("capture_date >= %s")
                query_params.append(start_date)
            
            if end_date:
                query_conditions.append("capture_date <= %s")
                query_params.append(end_date)
            
            if is_processed is not None:
                query_conditions.append("is_processed = %s")
                query_params.append(is_processed)
            
            where_clause = " AND ".join(query_conditions)
            
            # Get total count
            count_query = f"SELECT COUNT(*) as total FROM pasture_images WHERE {where_clause}"
            count_result = db.execute_query(count_query, tuple(query_params))
            total = count_result[0]['total'] if count_result else 0
            
            # Get paginated results
            query = f"""
                SELECT * FROM pasture_images 
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            query_params.extend([limit, offset])
            
            result = db.execute_query(query, tuple(query_params))
            images = [dict(row) for row in result] if result else []
        
        # Calculate pagination metadata
        total_pages = (total + limit - 1) // limit if total > 0 else 1
        
        return {
            "success": True,
            "images": images,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_items": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            },
            "filters": {
                "farm_id": farm_id,
                "user_id": filter_user_id,
                "start_date": start_date,
                "end_date": end_date,
                "is_processed": is_processed
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get pasture images error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching pasture images: {str(e)}")
    
    
    
    
    
    
    
    
    
    
    
    

@app.get("/api/v1/pasture-images/{image_id}", response_model=Dict[str, Any])
async def get_pasture_image(
    image_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get specific pasture image by ID
    """
    logger.info(f"Getting pasture image: {image_id}")
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Get image from database
        if hasattr(db, 'get_pasture_image_by_id'):
            image = db.get_pasture_image_by_id(image_id, user_id)
        else:
            # Fallback to direct query with ownership check
            query = "SELECT * FROM pasture_images WHERE id = %s AND user_id = %s"
            result = db.execute_query(query, (image_id, user_id))
            image = dict(result[0]) if result else None
        
        if not image:
            raise HTTPException(status_code=404, detail="Image not found or access denied")
        
        return {
            "success": True,
            "image": image
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get pasture image error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching pasture image: {str(e)}")

@app.get("/api/v1/pasture-images/{image_id}/file")
async def get_pasture_image_file(
    image_id: str,
    thumbnail: bool = False,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Serve the actual image file or thumbnail
    """
    logger.info(f"Serving image file: {image_id}, thumbnail: {thumbnail}")
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Get image info from database
        if hasattr(db, 'get_pasture_image_by_id'):
            image = db.get_pasture_image_by_id(image_id, user_id)
        else:
            query = "SELECT * FROM pasture_images WHERE id = %s AND user_id = %s"
            result = db.execute_query(query, (image_id, user_id))
            image = dict(result[0]) if result else None
        
        if not image:
            raise HTTPException(status_code=404, detail="Image not found or access denied")
        
        # Determine which file to serve
        if thumbnail and image.get("thumbnail_url"):
            # Extract filename from thumbnail_url
            thumbnail_path = image["thumbnail_url"].split("/")[-1]
            file_path = os.path.join(THUMBNAIL_DIR, thumbnail_path)
        else:
            filename = image.get("filename")
            if not filename:
                raise HTTPException(status_code=404, detail="Image file not found")
            file_path = os.path.join(IMAGE_UPLOAD_DIR, filename)
        
        # Check if file exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Image file not found on server")
        
        # Determine content type
        file_extension = os.path.splitext(file_path)[1].lower()
        content_type = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp"
        }.get(file_extension, "application/octet-stream")
        
        # Serve file
        return FileResponse(
            path=file_path,
            media_type=content_type,
            filename=os.path.basename(file_path)
        )
        
    except HTTPException:
        raise
    
    
    except Exception as e:
        logger.error(f"Serve image file error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error serving image file: {str(e)}")
    
    
    
    
    
    
    
    
    
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
    
    
@app.put("/api/v1/pasture-images/{image_id}", response_model=Dict[str, Any])
async def update_pasture_image(
    image_id: str,
    image_data: PastureImageUpdate,  # Changed from PastureImageData to PastureImageUpdate
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update pasture image metadata
    """
    logger.info(f"Updating pasture image: {image_id}")
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Verify image ownership
        if hasattr(db, 'get_pasture_image_by_id'):
            existing_image = db.get_pasture_image_by_id(image_id, user_id)
        else:
            query = "SELECT * FROM pasture_images WHERE id = %s AND user_id = %s"
            result = db.execute_query(query, (image_id, user_id))
            existing_image = dict(result[0]) if result else None
        
        if not existing_image:
            raise HTTPException(status_code=404, detail="Image not found or access denied")
        
        # Prepare update data
        update_data = image_data.dict(exclude_none=True)
        update_data["updated_at"] = datetime.utcnow()
        
        # Update in database
        if hasattr(db, 'update_pasture_image'):
            success = db.update_pasture_image(image_id, user_id, update_data)
        else:
            # Build dynamic update query
            set_clauses = []
            values = []
            
            for key, value in update_data.items():
                if key != "id" and key != "user_id":
                    set_clauses.append(f"{key} = %s")
                    values.append(value)
            
            if not set_clauses:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            set_clause = ", ".join(set_clauses)
            query = f"UPDATE pasture_images SET {set_clause}, updated_at = %s WHERE id = %s AND user_id = %s RETURNING id"
            values.extend([datetime.utcnow(), image_id, user_id])
            
            result = db.execute_query(query, tuple(values))
            success = bool(result)
        
        if success:
            # Get updated image
            if hasattr(db, 'get_pasture_image_by_id'):
                updated_image = db.get_pasture_image_by_id(image_id, user_id)
            else:
                query = "SELECT * FROM pasture_images WHERE id = %s AND user_id = %s"
                result = db.execute_query(query, (image_id, user_id))
                updated_image = dict(result[0]) if result else None
            
            return {
                "success": True,
                "message": "Image updated successfully",
                "image": updated_image
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update image")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update pasture image error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating image: {str(e)}")
    
    
@app.delete("/api/v1/pasture-images/{image_id}", response_model=Dict[str, Any])
async def delete_pasture_image(
    image_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a pasture image and its files
    """
    logger.info(f"Deleting pasture image: {image_id}")
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Get image info first
        if hasattr(db, 'get_pasture_image_by_id'):
            image = db.get_pasture_image_by_id(image_id, user_id)
        else:
            query = "SELECT * FROM pasture_images WHERE id = %s AND user_id = %s"
            result = db.execute_query(query, (image_id, user_id))
            image = dict(result[0]) if result else None
        
        if not image:
            raise HTTPException(status_code=404, detail="Image not found or access denied")
        
        # Delete files from storage
        filename = image.get("filename")
        if filename:
            file_path = os.path.join(IMAGE_UPLOAD_DIR, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        thumbnail_filename = image.get("thumbnail_url", "").split("/")[-1] if image.get("thumbnail_url") else None
        if thumbnail_filename:
            thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_filename)
            if os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)
        
        # Delete from database
        if hasattr(db, 'delete_pasture_image'):
            success = db.delete_pasture_image(image_id, user_id)
        else:
            query = "DELETE FROM pasture_images WHERE id = %s AND user_id = %s RETURNING id"
            result = db.execute_query(query, (image_id, user_id))
            success = bool(result)
        
        if success:
            return {
                "success": True,
                "message": "Image deleted successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete image")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete pasture image error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting image: {str(e)}")

@app.get("/api/v1/pasture-images/farm/{farm_id}/stats", response_model=Dict[str, Any])
async def get_farm_image_stats(
    farm_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get statistics about images for a specific farm
    """
    logger.info(f"Getting image stats for farm: {farm_id}")
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Verify farm ownership
        if hasattr(db, 'verify_farm_ownership'):
            is_owner = db.verify_farm_ownership(user_id, farm_id)
            if not is_owner:
                raise HTTPException(
                    status_code=403, 
                    detail="You don't have permission to view stats for this farm"
                )
        
        # Get stats from database
        if hasattr(db, 'get_farm_image_stats'):
            stats = db.get_farm_image_stats(farm_id)
        else:
            # Calculate stats using multiple queries
            stats = {}
            
            # Total images
            total_query = "SELECT COUNT(*) as total FROM pasture_images WHERE farm_id = %s AND user_id = %s"
            total_result = db.execute_query(total_query, (farm_id, user_id))
            stats["total_images"] = total_result[0]['total'] if total_result else 0
            
            # Processed images
            processed_query = "SELECT COUNT(*) as processed FROM pasture_images WHERE farm_id = %s AND user_id = %s AND is_processed = TRUE"
            processed_result = db.execute_query(processed_query, (farm_id, user_id))
            stats["processed_images"] = processed_result[0]['processed'] if processed_result else 0
            
            # Images by month (last 6 months)
            monthly_query = """
                SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    COUNT(*) as count
                FROM pasture_images 
                WHERE farm_id = %s AND user_id = %s AND created_at >= NOW() - INTERVAL '6 months'
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY month DESC
            """
            monthly_result = db.execute_query(monthly_query, (farm_id, user_id))
            stats["monthly_counts"] = [dict(row) for row in monthly_result] if monthly_result else []
            
            # Total storage used
            storage_query = "SELECT COALESCE(SUM(file_size), 0) as total_size FROM pasture_images WHERE farm_id = %s AND user_id = %s"
            storage_result = db.execute_query(storage_query, (farm_id, user_id))
            stats["total_storage_bytes"] = storage_result[0]['total_size'] if storage_result else 0
        
        return {
            "success": True,
            "farm_id": farm_id,
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get farm image stats error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching image stats: {str(e)}")

@app.post("/api/v1/pasture-images/{image_id}/process", response_model=Dict[str, Any])
async def process_pasture_image(
    image_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Trigger image processing (e.g., ML prediction) for a pasture image
    """
    logger.info(f"Processing pasture image: {image_id}")
    
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Get image info
        if hasattr(db, 'get_pasture_image_by_id'):
            image = db.get_pasture_image_by_id(image_id, user_id)
        else:
            query = "SELECT * FROM pasture_images WHERE id = %s AND user_id = %s"
            result = db.execute_query(query, (image_id, user_id))
            image = dict(result[0]) if result else None
        
        if not image:
            raise HTTPException(status_code=404, detail="Image not found or access denied")
        
        # Check if already processed
        if image.get("is_processed"):
            return {
                "success": True,
                "message": "Image already processed",
                "image_id": image_id
            }
        
        # Update processing status
        update_data = {
            "processing_status": "processing",
            "updated_at": datetime.utcnow()
        }
        
        if hasattr(db, 'update_pasture_image'):
            db.update_pasture_image(image_id, user_id, update_data)
        else:
            query = "UPDATE pasture_images SET processing_status = %s, updated_at = %s WHERE id = %s AND user_id = %s"
            db.execute_query(query, ("processing", datetime.utcnow(), image_id, user_id))
        
        # Forward to ML service for processing
        # This is a simplified example - you might want to use background tasks
        
        try:
            async with httpx.AsyncClient() as client:
                ml_request = {
                    "image_id": image_id,
                    "farm_id": image["farm_id"],
                    "user_id": user_id,
                    "image_url": f"http://localhost:5000/api/v1/pasture-images/{image_id}/file"
                }
                
                response = await client.post(
                    f"{SERVICE_URLS['ml_prediction']}/process-image",
                    json=ml_request,
                    timeout=120.0  # Longer timeout for processing
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Update image with processing results
                    final_update = {
                        "is_processed": True,
                        "processing_status": "completed",
                        "updated_at": datetime.utcnow()
                    }
                    
                    if hasattr(db, 'update_pasture_image'):
                        db.update_pasture_image(image_id, user_id, final_update)
                    else:
                        query = "UPDATE pasture_images SET is_processed = TRUE, processing_status = %s, updated_at = %s WHERE id = %s AND user_id = %s"
                        db.execute_query(query, ("completed", datetime.utcnow(), image_id, user_id))
                    
                    return {
                        "success": True,
                        "message": "Image processing completed",
                        "image_id": image_id,
                        "processing_result": result
                    }
                else:
                    # Update with error status
                    error_update = {
                        "processing_status": "failed",
                        "updated_at": datetime.utcnow()
                    }
                    
                    if hasattr(db, 'update_pasture_image'):
                        db.update_pasture_image(image_id, user_id, error_update)
                    else:
                        query = "UPDATE pasture_images SET processing_status = %s, updated_at = %s WHERE id = %s AND user_id = %s"
                        db.execute_query(query, ("failed", datetime.utcnow(), image_id, user_id))
                    
                    raise HTTPException(
                        status_code=500,
                        detail=f"ML processing failed: {response.text}"
                    )
                    
        except httpx.TimeoutException:
            # Update with timeout status
            timeout_update = {
                "processing_status": "timeout",
                "updated_at": datetime.utcnow()
            }
            
            if hasattr(db, 'update_pasture_image'):
                db.update_pasture_image(image_id, user_id, timeout_update)
            else:
                query = "UPDATE pasture_images SET processing_status = %s, updated_at = %s WHERE id = %s AND user_id = %s"
                db.execute_query(query, ("timeout", datetime.utcnow(), image_id, user_id))
            
            raise HTTPException(status_code=504, detail="Image processing timeout")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Process pasture image error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")









@app.post("/api/v1/pasture-images", 
          response_model=Dict[str, Any],
          status_code=status.HTTP_201_CREATED)

async def create_pasture_image(
    image_data: PastureImageUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new pasture image record.
    """
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Add user_id to image data
        image_dict = image_data.dict()
        image_dict['user_id'] = user_id
        
        # Store in database
        result = db.create_pasture_image(image_dict)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create pasture image"
            )
        
        return {
            "success": True,
            "message": "Pasture image created successfully",
            "image": result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating pasture image: {str(e)}"
        )










from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional, List
import base64
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/store_pasture-images/")
async def upload_pasture_image(
    file: UploadFile = File(...),
    pasture_name: str = Form(...),
    user_id: str = Form(...),
    farm_id: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    capture_date: Optional[str] = Form(None),
    estimated_biomass: Optional[float] = Form(None),
    quality_rating: Optional[int] = Form(None),
    tags: Optional[str] = Form(None)  # JSON string of tags
):
    """API endpoint to upload and store pasture images"""
    try:
        # Read and encode image
        image_bytes = await file.read()
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Prepare image data dictionary
        image_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "farm_id": farm_id,
            "image_data": image_base64,
            "pasture_name": pasture_name,
            "location": location,
            "notes": notes,
            "capture_date": capture_date or datetime.utcnow().isoformat(),
            "estimated_biomass": estimated_biomass,
            "quality_rating": quality_rating,
            "tags": json.loads(tags) if tags else [],
            "metadata": {
                "filename": file.filename,
                "content_type": file.content_type,
                "size": len(image_bytes),
                "upload_timestamp": datetime.utcnow().isoformat()
            }
        }
        
        # Call the store method
        result = db_store.store_pasture_image(image_data)
        
        if result:
            return {
                "message": "Image stored successfully",
                "image_id": result["id"],
                "created_at": result["created_at"]
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to store image")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))












if __name__ == "__main__":
    import uvicorn
    HOST = "0.0.0.0" or "10.30.179.103" 
    uvicorn.run("main:app", host=HOST, port=5000, reload=True)