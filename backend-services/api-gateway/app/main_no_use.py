from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import httpx
from typing import Dict, Any, Optional
import json
import redis
from datetime import datetime, timedelta
import jwt
import uuid
import hashlib
import sys
import logging
try:
    # Pydantic v2
    from pydantic import field_validator, model_validator
except ImportError:
    # Pydantic v1 fallback
    from pydantic import validator as field_validator, root_validator as model_validator
import traceback

sys.path.insert(0, r"C:\Users\user\Documents\image_2_biomass_ml_project_version_1\backend-services")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import your actual database connection
try:
    from database_connection.db_connection import db
    logger.info("Database connection loaded successfully")
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
    
    db = MockDB()
    logger.warning("Using mock database - this is for development only!")

app = FastAPI(title="PastureScan API Gateway", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:3000", "http://localhost:5173", "http://localhost:19006"],
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
    "auth": "http://localhost:5001",
    "image_processing": "http://localhost:5002",
    "ml_prediction": "http://localhost:5003",
    "data": "http://localhost:5004",
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
    return await verify_token(authorization)

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

# Microservice Proxy Endpoints
##@app.post("/api/v1/auth/register")
async def register_user(request: Dict[Any, Any]):
    """Register new user through auth service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SERVICE_URLS['auth']}/auth/register",
                json=request,
                timeout=10.0
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Auth service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

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

# Image Processing Endpoints
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

@app.post("/api/v1/images/validate")
async def validate_image(request: Dict[Any, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    """Validate image through image processing service (protected)"""
    try:
        request_with_user = request.copy()
        request_with_user["user_id"] = current_user.get("user_id")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SERVICE_URLS['image_processing']}/images/validate",
                json=request_with_user,
                timeout=15.0
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image validation error: {str(e)}")

# ML Prediction Endpoints
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

@app.get("/api/v1/predictions/{image_id}")
async def get_prediction(image_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get prediction from data service (protected)"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SERVICE_URLS['data']}/predictions/{image_id}",
                params={"user_id": current_user.get("user_id")}
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data service error: {str(e)}")

@app.get("/api/v1/predictions/history/{user_id}")
async def get_prediction_history(user_id: str, limit: int = 50, offset: int = 0, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get prediction history from data service (protected)"""
    try:
        # Verify the requested user_id matches the authenticated user
        if user_id != current_user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SERVICE_URLS['data']}/predictions/history/{user_id}",
                params={"limit": limit, "offset": offset}
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data service error: {str(e)}")

# Database Management Endpoints
@app.get("/api/v1/db/users")
async def get_all_users(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get all users (admin only)"""
    try:
        users = db.get_all_users()
        return {"users": users}
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@app.get("/api/v1/db/users/{user_id}")
async def get_user_by_id(user_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get user by ID"""
    try:
        user = db.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(
            id=user["id"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            email=user["email"],
            is_verified=user["is_verified"],
            created_at=user["created_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

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
    
    
    
    
    
    
    
    
    

### Farms





# Add these endpoints after the existing database endpoints
@app.post("/api/v1/farms/save")
async def save_farm(farm_data: FarmData, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Save farm data to database"""
    try:
        # Verify the user is saving their own farm
        if farm_data.user_id != current_user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        logger.info(f"Saving farm for user: {current_user.get('user_id')}")
        
        # Here you would implement the actual database save
        # For now, we'll return a mock response
        farm_id = str(uuid.uuid4())
        
        return {
            "success": True,
            "message": "Farm saved successfully",
            "id": farm_id,
            "farm": farm_data.dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving farm: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving farm: {str(e)}")

@app.post("/api/v1/farms/update")
async def update_farm(farm_data: FarmData, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Update farm data in database"""
    try:
        # Verify the user is updating their own farm
        if farm_data.user_id != current_user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not farm_data.id:
            raise HTTPException(status_code=400, detail="Farm ID is required for update")
        
        logger.info(f"Updating farm {farm_data.id} for user: {current_user.get('user_id')}")
        
        # Here you would implement the actual database update
        # For now, we'll return a mock response
        
        return {
            "success": True,
            "message": "Farm updated successfully",
            "id": farm_data.id,
            "farm": farm_data.dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating farm: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating farm: {str(e)}")

@app.get("/api/v1/farms/user/{user_id}")
async def get_user_farms(user_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get all farms for a user"""
    try:
        # Verify the user is requesting their own farms
        if user_id != current_user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
            
        logger.info(f"Getting farms for user: {user_id}")
        
        # Here you would implement the actual database query
        # For now, we'll return a mock response
        
        # Example mock data
        mock_farms = [
            {
                "id": str(uuid.uuid4()),
                "name": "Sample Garden 1",
                "area_hectares": 2.5,
                "primary_crop": "Vegetables",
                "soil_type": "Loam",
                "location": "North Field",
                "is_active": True,
                "user_id": user_id,
                "created_at": datetime.utcnow().isoformat()
            }
        ]
        
        return {
            "success": True,
            "farms": mock_farms
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user farms: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting user farms: {str(e)}")





if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)