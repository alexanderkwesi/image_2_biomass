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
from pydantic import BaseModel, EmailStr, validator
from passlib.context import CryptContext
import uvicorn
import sys
sys.path.insert(0, r"C:\Users\user\Documents\image_2_biomass_ml_project_version_1\backend-services")

from database_connection.db_connection import DatabaseConnection as db

app = FastAPI(title="PastureScan API Gateway", version="1.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081"],  # Specific to your frontend
    allow_origin_regex=r"http://localhost:\d+",  # Allows any localhost port
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600  # Cache preflight requests for 10 minutes
)


app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure for production
)

# Service URLs
SERVICE_URLS = {
    "auth": "http://localhost:5001",  # Updated for local development
    "image_processing": "http://localhost:5002",
    "ml_prediction": "http://localhost:5003",
    "data": "http://localhost:5004",
}

# Redis for caching and rate limiting
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()  # Test connection
    print("✅ Connected to Redis successfully")
except Exception as e:
    print(f"❌ Redis connection failed: {e}")
    redis_client = None

# JWT Configuration
SECRET_KEY = "your-secret-key-here"  # Must match auth service
ALGORITHM = "HS256"

# Password context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic models for database authentication
class UserRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    confirm_password: str

    @validator('first_name', 'last_name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

    @validator('password')
    def password_must_be_strong(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
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

# Utility functions
def hash_password(password: str) -> str:
    """Hash password using bcrypt via passlib"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash"""
    return pwd_context.verify(plain_password, hashed_password)

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
        db.connection.cursor().execute("SELECT 1")
        health_status["database"]["status"] = "healthy"
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
                "error": str(e)
            }
    
    return health_status

# Database Authentication Endpoints
@app.post("/api/v1/db/register", response_model=AuthResponse)
async def db_register_user(user_data: UserRegister):
    """Register user directly through database"""
    try:
        # Rate limiting by IP for registration
        client_ip = "unknown"
        if await rate_limiter.is_rate_limited(f"register:{client_ip}"):
            raise HTTPException(status_code=429, detail="Too many registration attempts")
        
        # Check if user exists
        if db.check_user_exists(user_data.email):
            raise HTTPException(
                status_code=400,
                detail="User with this email already exists"
            )
        
        # Create user object
        user_id = str(uuid.uuid4())
        hashed_password = hash_password(user_data.password)
        
        user_db_data = {
            "id": user_id,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "email": user_data.email,
            "password_hash": hashed_password,
            "is_verified": False,
            "created_at": datetime.utcnow()
        }
        
        # Store user in database
        result = db.register_user(user_db_data)
        
        # Create access token
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": user_data.email, "user_id": user_id},
            expires_delta=access_token_expires
        )
        
        return AuthResponse(
            success=True,
            message="Account created successfully!",
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user_id,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                email=user_data.email,
                is_verified=False,
                created_at=user_db_data['created_at']
            )
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Registration error: {str(e)}"
        )

@app.post("/api/v1/db/login", response_model=AuthResponse)
async def db_login_user(login_data: UserLogin):
    """Login user directly through database"""
    try:
        # Rate limiting by IP for login
        client_ip = "unknown"
        if await rate_limiter.is_rate_limited(f"login:{client_ip}"):
            raise HTTPException(status_code=429, detail="Too many login attempts")
        
        # Check if user exists in database
        user = db.get_user_by_email(login_data.email)
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": user["email"], "user_id": user["id"]},
            expires_delta=access_token_expires
        )
        
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
        raise HTTPException(
            status_code=500,
            detail=f"Login error: {str(e)}"
        )

# Microservice Proxy Endpoints
@app.post("/api/v1/auth/register")
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
        # Try to get from database first
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
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
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
        # Check cache first
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
                timeout=60.0  # Longer timeout for ML predictions
            )
            
            # Cache successful predictions for 1 hour
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
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

# Public endpoints (no authentication required)
@app.get("/public/services")
async def get_services_status():
    """Get status of all services (public)"""
    return await health_check()

@app.get("/public/db-status")
async def get_database_status():
    """Get database connection status (public)"""
    try:
        db.connection.cursor().execute("SELECT 1")
        return {"status": "connected", "database": "healthy"}
    except Exception as e:
        return {"status": "disconnected", "database": "unhealthy", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000, reload=True)