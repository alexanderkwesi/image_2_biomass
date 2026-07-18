# auth-services/app/main.py
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, validator, root_validator
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
import logging
import secrets
from database_connection.db_connection import db  # Import the database instance from database_connection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Auth Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration (in production, use environment variables)
SECRET_KEY = "your-secret-key-here"  # Change this in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Configuration constants (would typically come from config/settings)
TOKEN_PREFIX = "access_token:"
BLACKLIST_PREFIX = "blacklist:"
SESSION_PREFIX = "session:"
TOKEN_EXPIRY_BUFFER = 300  # 5 minutes buffer for token expiry

# Password context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic models for request/response
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
    
    @root_validator
    def passwords_match(cls, values):
        password = values.get('password')
        confirm_password = values.get('confirm_password')
        
        if password and confirm_password and password != confirm_password:
            raise ValueError('Passwords do not match')
        return values

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

class ErrorResponse(BaseModel):
    success: bool
    detail: str

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
    
    @validator('new_password')
    def password_must_be_strong(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v
    
    @root_validator
    def passwords_match(cls, values):
        new_password = values.get('new_password')
        confirm_new_password = values.get('confirm_new_password')
        
        if new_password and confirm_new_password and new_password != confirm_new_password:
            raise ValueError('New passwords do not match')
        return values

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
    
    @root_validator
    def passwords_match(cls, values):
        new_password = values.get('new_password')
        confirm_new_password = values.get('confirm_new_password')
        
        if new_password and confirm_new_password and new_password != confirm_new_password:
            raise ValueError('Passwords do not match')
        return values

# Farm management models
class FarmBase(BaseModel):
    name: str
    area_hectares: float
    primary_crop: Optional[str] = None
    soil_type: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None

class FarmCreate(FarmBase):
    pass

class FarmUpdate(FarmBase):
    name: Optional[str] = None
    area_hectares: Optional[float] = None
    is_active: Optional[bool] = None

class FarmResponse(FarmBase):
    id: str
    user_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

# Utility functions
def hash_password(password: str) -> str:
    """Hash password using bcrypt via passlib"""
    logger.info(f"Hashing password for new user")
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
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_reset_token() -> str:
    """Generate a secure reset token"""
    return secrets.token_urlsafe(32)

def get_current_user(authorization: str = Depends(lambda x: x.headers.get("Authorization"))):
    """Get current user from token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid")
    
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    
    user = db.get_user_by_email(payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "service": "auth", 
        "timestamp": datetime.utcnow().isoformat()
    }

# Registration endpoint (keep as is)
@app.post("/auth/register", 
          response_model=AuthResponse,
          responses={
              400: {"model": ErrorResponse},
              422: {"model": ErrorResponse},
              500: {"model": ErrorResponse}
          })
async def register_user(user_data: UserRegister):
    """Register a new user with password confirmation"""
    print(f"Registration request for email: {user_data.email}")
    logger.info(f"Registration attempt for email: {user_data.email}")
    
    try:
        # Check if user already exists in DATABASE
        logger.info(f"Checking if user exists: {user_data.email}")
        if db.check_user_exists(user_data.email):
            logger.warning(f"User already exists: {user_data.email}")
            return AuthResponse(
                success=False,
                message="User with this email already exists"
            )
        
        # Create user object
        user_id = str(uuid.uuid4())
        logger.info(f"Generated user ID: {user_id}")
        
        # Hash the password
        try:
            hashed_password = hash_password(user_data.password)
            logger.info("Password hashed successfully")
        except Exception as hash_error:
            logger.error(f"Password hashing failed: {hash_error}")
            return AuthResponse(
                success=False,
                message="Error processing password"
            )
        
        user_db_data = {
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "email": user_data.email,
            "password_hash": hashed_password,
            "is_verified": False
        }
        
        # Store user in DATABASE using the register_user method (not register_new_user)
        logger.info(f"Attempting to store user in database: {user_data.email}")
        try:
            # Call the correct method from db_connection.py
            result = db.register_user(user_db_data)
            logger.info(f"User stored successfully: {user_data.email}")
            
            # The result should contain the database-generated user data
            if not result or 'id' not in result:
                logger.error(f"Failed to retrieve user data after registration")
                return AuthResponse(
                    success=False,
                    message="Failed to retrieve user data after registration"
                )
            
            # Extract the database-generated ID and created_at
            user_id = result['id']
            created_at = result['created_at']
            
        except Exception as db_error:
            logger.error(f"Database error: {db_error}")
            # Check for duplicate email error
            if "already exists" in str(db_error):
                return AuthResponse(
                    success=False,
                    message="User with this email already exists"
                )
            return AuthResponse(
                success=False,
                message="Database error occurred"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_data.email, "user_id": user_id},
            expires_delta=access_token_expires
        )
        
        logger.info(f"Registration successful for: {user_data.email}")
        
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
                created_at=created_at
            )
        )
    
    except Exception as e:
        logger.error(f"Registration failed: {e}", exc_info=True)
        return AuthResponse(
            success=False,
            message=f"Internal server error: {str(e)}"
        )

@app.post("/auth/login", 
          response_model=AuthResponse,
          responses={
              401: {"model": ErrorResponse},
              400: {"model": ErrorResponse}
          })
async def login_user(login_data: UserLogin):
    """
    Authenticate user and return access token
    """
    try:
        # Check if user exists in DATABASE
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
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"], "user_id": user["id"]},
            expires_delta=access_token_expires
        )
        
        # Create session record
        try:
            session_query = """
                INSERT INTO user_sessions (user_id, access_token, expires_at, is_active)
                VALUES (%s, %s, %s, TRUE)
                RETURNING id
            """
            session_params = (user["id"], access_token, datetime.utcnow() + access_token_expires)
            db.execute_query(session_query, session_params)
        except Exception as session_error:
            logger.warning(f"Failed to create session record: {session_error}")
            # Continue without session record
        
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
        logger.error(f"Login failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Request, Response, status
from redis.asyncio import Redis
import logging



@app.post("/auth/logout")
async def logout_user(
    request: Request,
    response: Response,
    current_user: dict = Depends(get_current_user),
    redis_client: Redis = Depends(get_redis_client),
    token_service: TokenService = Depends(get_token_service)):
    """
    Logout user by invalidating token and session.
    
    Security considerations:
    - Invalidates current access token
    - Clears session data
    - Sets secure logout cookies
    - Handles token blacklisting with TTL
    """
    try:
        # 1. Extract token from request
        token = extract_token_from_request(request)
        
        if not token:
            logger.warning(f"Logout attempted without token for user: {current_user['email']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No authentication token provided"
            )
        
        # 2. Decode token to get expiry and jti (JWT ID) if present
        token_payload = token_service.decode_token(token, verify_exp=False)
        token_expiry = token_payload.get("exp")
        jti = token_payload.get("jti")
        
        # 3. Calculate blacklist TTL (token expiry time + buffer)
        blacklist_ttl = calculate_blacklist_ttl(token_expiry)
        
        # 4. Blacklist the token
        await blacklist_token(
            redis_client=redis_client,
            token=token,
            jti=jti,
            user_id=current_user["id"],
            ttl=blacklist_ttl
        )
        
        # 5. Invalidate session data
        await invalidate_session(
            redis_client=redis_client,
            user_id=current_user["id"],
            session_id=token_payload.get("sid")
        )
        
        # 6. Clear authentication cookies if using cookie-based auth
        clear_auth_cookies(response)
        
        # 7. Log the logout with security context
        logger.info(
            f"User logged out successfully",
            extra={
                "user_id": current_user["id"],
                "email": current_user["email"],
                "logout_time": datetime.now(timezone.utc).isoformat(),
                "client_ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent")
            }
        )
        
        # 8. Return success response
        return {
            "success": True,
            "message": "Logged out successfully",
            "logged_out_at": datetime.now(timezone.utc).isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Logout error: {str(e)}",
            exc_info=True,
            extra={"user_email": current_user.get("email") if current_user else None}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout processing failed"
        )


async def blacklist_token(
    redis_client: Redis,
    token: str,
    jti: Optional[str],
    user_id: str,
    ttl: int
) -> None:
    """
    Add token to blacklist with multiple lookup keys for efficiency.
    """
    token_hash = token_service.hash_token(token)
    
    # Store with multiple keys for different lookup scenarios
    pipeline = redis_client.pipeline()
    
    # Key by token hash (primary lookup)
    pipeline.setex(
        f"{BLACKLIST_PREFIX}token:{token_hash}",
        ttl,
        f"user:{user_id}:{datetime.now(timezone.utc).isoformat()}"
    )
    
    # Key by JTI if present (for JWT-specific lookups)
    if jti:
        pipeline.setex(
            f"{BLACKLIST_PREFIX}jti:{jti}",
            ttl,
            f"user:{user_id}"
        )
    
    # Add to user's blacklist set for batch operations
    pipeline.sadd(
        f"{BLACKLIST_PREFIX}user:{user_id}",
        token_hash
    )
    pipeline.expire(
        f"{BLACKLIST_PREFIX}user:{user_id}",
        ttl
    )
    
    await pipeline.execute()


async def invalidate_session(
    redis_client: Redis,
    user_id: str,
    session_id: Optional[str] = None
) -> None:
    """
    Invalidate session data.
    """
    pipeline = redis_client.pipeline()
    
    # Invalidate specific session if ID provided
    if session_id:
        pipeline.delete(f"{SESSION_PREFIX}{session_id}")
    
    # Remove active session from user's sessions set
    if session_id:
        pipeline.srem(f"user:{user_id}:sessions", session_id)
    
    # Update last logout timestamp
    pipeline.hset(
        f"user:{user_id}:metadata",
        "last_logout",
        datetime.now(timezone.utc).isoformat()
    )
    
    await pipeline.execute()


def extract_token_from_request(request: Request) -> Optional[str]:
    """
    Extract token from Authorization header or cookies.
    """
    # Check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]  # Remove "Bearer " prefix
    
    # Check cookies (if using cookie-based auth)
    token_cookie = request.cookies.get("access_token")
    if token_cookie:
        return token_cookie
    
    return None


def calculate_blacklist_ttl(token_expiry: Optional[int]) -> int:
    """
    Calculate TTL for blacklist entry.
    """
    if token_expiry:
        current_time = datetime.now(timezone.utc).timestamp()
        ttl = int(token_expiry - current_time) + TOKEN_EXPIRY_BUFFER
        return max(ttl, 300)  # Minimum 5 minutes
    return 3600  # Default 1 hour if no expiry


def clear_auth_cookies(response: Response) -> None:
    """
    Clear authentication cookies securely.
    """
    response.delete_cookie(
        key="access_token",
        path="/",
        domain=None,  # Set your domain in production
        secure=True,  # HTTPS only
        httponly=True,
        samesite="strict"
    )
    response.delete_cookie(
        key="refresh_token",
        path="/auth/refresh",  # Only clear from refresh endpoint path
        secure=True,
        httponly=True,
        samesite="strict"
    )


# Dependency for Redis client
async def get_redis_client():
    """
    Get Redis client from connection pool.
    """
    # Implementation depends on your Redis setup
    # Example: return await Redis.from_url(settings.REDIS_URL)
    pass


# Dependency for token service
async def get_token_service():
    """
    Get token service instance.
    """
    # Implementation depends on your token management
    pass


@app.post("/auth/verify")
async def verify_token_endpoint(token: str):
    """
    Verify JWT token validity
    """
    try:
        payload = verify_token(token)
        user_email = payload.get("sub")
        
        user = db.get_user_by_email(user_email)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return {
            "success": True,
            "valid": True,
            "user": UserResponse(
                id=user["id"],
                first_name=user["first_name"],
                last_name=user["last_name"],
                email=user["email"],
                is_verified=user["is_verified"],
                created_at=user["created_at"]
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

@app.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    """Initiate password reset process"""
    try:
        user = db.get_user_by_email(request.email)
        if not user:
            # Don't reveal if user exists for security
            return {"success": True, "message": "If the email exists, a reset link will be sent"}
        
        # Generate reset token
        reset_token = generate_reset_token()
        
        # Store reset token in database
        update_query = """
            UPDATE users 
            SET reset_token = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        db.execute_query(update_query, (reset_token, user["id"]))
        
        # In production, send email here
        logger.info(f"Password reset token generated for {user['email']}: {reset_token}")
        
        # Background task to send email
        background_tasks.add_task(send_reset_email, user["email"], reset_token)
        
        return {"success": True, "message": "Password reset instructions sent to your email"}
    
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing request")

@app.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    try:
        # Find user by reset token
        query = "SELECT * FROM users WHERE reset_token = %s"
        result = db.execute_query(query, (request.token,))
        
        if not result:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        user = dict(result[0])
        
        # Hash new password
        hashed_password = hash_password(request.new_password)
        
        # Update password and clear reset token
        update_query = """
            UPDATE users 
            SET password_hash = %s, reset_token = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        db.execute_query(update_query, (hashed_password, user["id"]))
        
        logger.info(f"Password reset for user: {user['email']}")
        
        return {"success": True, "message": "Password has been reset successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error resetting password")

@app.put("/auth/profile")
async def update_profile(request: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    try:
        updates = []
        params = []
        
        if request.first_name is not None:
            updates.append("first_name = %s")
            params.append(request.first_name)
        
        if request.last_name is not None:
            updates.append("last_name = %s")
            params.append(request.last_name)
        
        if request.email is not None:
            # Check if email already exists (for another user)
            if request.email != current_user["email"]:
                check_query = "SELECT EXISTS(SELECT 1 FROM users WHERE email = %s AND id != %s)"
                check_result = db.execute_query(check_query, (request.email, current_user["id"]))
                if check_result and check_result[0]["exists"]:
                    raise HTTPException(status_code=400, detail="Email already in use")
            
            updates.append("email = %s")
            updates.append("is_verified = FALSE")  # Require re-verification for email change
            params.append(request.email)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        # Add user_id for WHERE clause
        params.append(current_user["id"])
        
        # Build and execute query
        query = f"UPDATE users SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *"
        result = db.execute_query(query, tuple(params))
        
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        
        updated_user = dict(result[0])
        
        logger.info(f"Profile updated for user: {current_user['email']}")
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "user": UserResponse(
                id=updated_user["id"],
                first_name=updated_user["first_name"],
                last_name=updated_user["last_name"],
                email=updated_user["email"],
                is_verified=updated_user["is_verified"],
                created_at=updated_user["created_at"]
            )
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update profile error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating profile")

@app.post("/auth/change-password")
async def change_password(request: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    """Change password while logged in"""
    try:
        # Verify current password
        if not verify_password(request.current_password, current_user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Hash new password
        hashed_password = hash_password(request.new_password)
        
        # Update password
        query = """
            UPDATE users 
            SET password_hash = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        db.execute_query(query, (hashed_password, current_user["id"]))
        
        logger.info(f"Password changed for user: {current_user['email']}")
        
        return {"success": True, "message": "Password changed successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error changing password")

# Farm management endpoints
@app.post("/auth/farms", response_model=dict)
async def create_farm(farm_data: FarmCreate, current_user: dict = Depends(get_current_user)):
    """Create a new farm"""
    try:
        farm_id = str(uuid.uuid4())
        
        query = """
            INSERT INTO farms (id, user_id, name, area_hectares, primary_crop, soil_type, location, description, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
            RETURNING *
        """
        
        params = (
            farm_id,
            current_user["id"],
            farm_data.name,
            farm_data.area_hectares,
            farm_data.primary_crop,
            farm_data.soil_type,
            farm_data.location,
            farm_data.description,
            farm_data.is_active
        )
        
        result = db.execute_query(query, params)
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create farm")
        
        farm = dict(result[0])
        
        logger.info(f"Farm created: {farm['name']} for user: {current_user['email']}")
        
        return {
            "success": True,
            "message": "Farm created successfully",
            "farm": farm
        }
    
    except Exception as e:
        logger.error(f"Create farm error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating farm")

# In auth service main.py
@app.get("/auth/internal/farms")
async def get_user_farms_internal(
    user_id: str = Header(..., description="User ID from gateway"),
    x_gateway_token: str = Header(..., description="Gateway service token")
):
    """Internal endpoint for gateway to get farms (bypasses JWT auth)"""
    
    # Verify gateway token (should be a shared secret)
    GATEWAY_SECRET = "your-gateway-secret"
    if x_gateway_token != GATEWAY_SECRET:
        raise HTTPException(status_code=403, detail="Invalid gateway token")
    
    try:
        query = """
            SELECT * FROM farms 
            WHERE user_id = %s AND is_active = TRUE
            ORDER BY created_at DESC
        """
        
        result = db.execute_query(query, (user_id,))
        farms = [dict(row) for row in result] if result else []
        
        return {
            "success": True,
            "farms": farms,
            "count": len(farms)
        }
    
    except Exception as e:
        logger.error(f"Get farms internal error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching farms")
    

@app.get("/auth/farms/{farm_id}", response_model=dict)
async def get_farm(farm_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific farm by ID"""
    try:
        query = """
            SELECT * FROM farms 
            WHERE id = %s AND user_id = %s
        """
        
        result = db.execute_query(query, (farm_id, current_user["id"]))
        
        if not result:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        farm = dict(result[0])
        
        return {
            "success": True,
            "farm": farm
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get farm error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching farm")
    



# Add this endpoint to auth-services/app/main.py after the other farm endpoints
@app.patch("/auth/farms/{farm_id}/status", response_model=dict)
async def update_farm_status(
    farm_id: str,
    status_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update farm status (active/inactive)"""
    try:
        is_active = status_data.get("is_active")
        if is_active is None:
            raise HTTPException(status_code=400, detail="is_active field is required")
        
        # Check if farm exists and belongs to user
        check_query = "SELECT * FROM farms WHERE id = %s AND user_id = %s"
        check_result = db.execute_query(check_query, (farm_id, current_user["id"]))
        
        if not check_result:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # Update status
        update_query = """
            UPDATE farms 
            SET is_active = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
            RETURNING *
        """
        
        result = db.execute_query(update_query, (is_active, farm_id, current_user["id"]))
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to update farm status")
        
        updated_farm = dict(result[0])
        
        logger.info(f"Farm status updated: {farm_id} to {is_active} for user: {current_user['email']}")
        
        return {
            "success": True,
            "message": f"Farm status updated to {'active' if is_active else 'inactive'}",
            "farm": updated_farm
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update farm status error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating farm status")    
    
    
    
    

@app.put("/auth/farms/{farm_id}", response_model=dict)
async def update_farm(farm_id: str, farm_data: FarmUpdate, current_user: dict = Depends(get_current_user)):
    """Update a farm"""
    try:
        # Get current farm to ensure ownership
        check_query = "SELECT * FROM farms WHERE id = %s AND user_id = %s"
        check_result = db.execute_query(check_query, (farm_id, current_user["id"]))
        
        if not check_result:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # Build update query dynamically
        updates = []
        params = []
        
        if farm_data.name is not None:
            updates.append("name = %s")
            params.append(farm_data.name)
        
        if farm_data.area_hectares is not None:
            updates.append("area_hectares = %s")
            params.append(farm_data.area_hectares)
        
        if farm_data.primary_crop is not None:
            updates.append("primary_crop = %s")
            params.append(farm_data.primary_crop)
        
        if farm_data.soil_type is not None:
            updates.append("soil_type = %s")
            params.append(farm_data.soil_type)
        
        if farm_data.description is not None:
            updates.append("description = %s")
            params.append(farm_data.description)
        
        if farm_data.location is not None:
            updates.append("location = %s")
            params.append(farm_data.location)
        
        if farm_data.is_active is not None:
            updates.append("is_active = %s")
            params.append(farm_data.is_active)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        # Add farm_id and user_id for WHERE clause
        params.extend([farm_id, current_user["id"]])
        
        query = f"""
            UPDATE farms 
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
            RETURNING *
        """
        
        result = db.execute_query(query, tuple(params))
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to update farm")
        
        updated_farm = dict(result[0])
        
        logger.info(f"Farm updated: {farm_id} for user: {current_user['email']}")
        
        return {
            "success": True,
            "message": "Farm updated successfully",
            "farm": updated_farm
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update farm error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating farm")

@app.delete("/auth/farms/{farm_id}", response_model=dict)
async def delete_farm(farm_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete a farm (set is_active = FALSE)"""
    try:
        # Check if farm exists and belongs to user
        check_query = "SELECT * FROM farms WHERE id = %s AND user_id = %s"
        check_result = db.execute_query(check_query, (farm_id, current_user["id"]))
        
        if not check_result:
            raise HTTPException(status_code=404, detail="Farm not found")
        
        # Soft delete by setting is_active = FALSE
        delete_query = """
            UPDATE farms 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
            RETURNING id, name
        """
        
        result = db.execute_query(delete_query, (farm_id, current_user["id"]))
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to delete farm")
        
        deleted_farm = dict(result[0])
        
        logger.info(f"Farm deleted: {farm_id} for user: {current_user['email']}")
        
        return {
            "success": True,
            "message": f"Farm '{deleted_farm['name']}' deleted successfully",
            "deleted_id": farm_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete farm error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting farm")

@app.get("/auth/users/{user_id}")
async def get_user(user_id: str):
    """
    Get user profile by ID
    """
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

@app.get("/auth/users")
async def get_all_users():
    """
    Get all users (for admin purposes)
    """
    users = db.get_all_users()
    return {"users": users}

@app.get("/")
async def root():
    return {"message": "Auth Service", "status": "healthy"}

# Helper function for sending reset email (stub for production)
async def send_reset_email(email: str, reset_token: str):
    """Send password reset email"""
    # In production, implement email sending logic here
    logger.info(f"[EMAIL] Password reset link for {email}: /reset-password?token={reset_token}")
    # Example using SMTP:
    # import smtplib
    # from email.mime.text import MIMEText
    # Send actual email...

if __name__ == "__main__":
    import uvicorn
    HOST = "0.0.0.0" or "10.30.179.103" 
    uvicorn.run(app, host=HOST, port=5001)