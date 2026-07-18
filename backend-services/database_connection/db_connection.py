import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor
import os
from typing import Dict, Any, Optional, List
import time
import json
from datetime import datetime

class DatabaseConnection:
    def __init__(self):
        self.connection = None
        self.max_retries = 3
        self.retry_delay = 2
        self.connect_with_retry()
    
    def connect_with_retry(self):
        """Establish connection to PostgreSQL database with retries"""
        for attempt in range(self.max_retries):
            try:
                # Use DATABASE_URL from .env.example instead of DB_SERVER
                DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:superpassword@localhost:5432/pasturescan_db')
                
                # Mask password for logging
                if '@' in DATABASE_URL:
                    parts = DATABASE_URL.split('@')
                    if ':' in parts[0]:
                        user_pass = parts[0].split(':')
                        if len(user_pass) == 3:  # postgresql://user:password
                            masked_uri = f"{user_pass[0]}:{user_pass[1]}:****@{parts[1]}"
                        else:
                            masked_uri = f"{parts[0].split(':')[0]}:****@{parts[1]}"
                    else:
                        masked_uri = DATABASE_URL
                else:
                    masked_uri = DATABASE_URL
                
                print(f"[CONN] Attempting connection with URI: {masked_uri}")
                
                # Parse the connection string
                self.connection = psycopg2.connect(DATABASE_URL)
                
                # Test the connection
                with self.connection.cursor() as cursor:
                    cursor.execute("SELECT version()")
                    version = cursor.fetchone()
                    print(f"[OK] Connected to PostgreSQL: {version[0]}")
                
                # Ensure our database exists (database name is extracted from URI)
                db_name = self._extract_db_name_from_uri(DATABASE_URL)
                if db_name:
                    self.ensure_database_exists(db_name)
                else:
                    print("[WARNING] Could not extract database name from URI")
                    
                return
                
            except Exception as e:
                print(f"[ERROR] Connection attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    print(f"[RETRY] Retrying in {self.retry_delay} seconds...")
                    time.sleep(self.retry_delay)
                else:
                    print(f"[FATAL] Max connection attempts reached")
                    print("\n[TROUBLESHOOTING] Steps to fix:")
                    print(f"1. Check DATABASE_URL environment variable: {os.getenv('DATABASE_URL', 'Not set')}")
                    print("2. Make sure PostgreSQL is running")
                    print("3. Verify the connection string format: postgresql://user:password@host:port/database")
                    print("4. Check if the database exists")
    
    def _extract_db_name_from_uri(self, uri: str) -> str:
        """Extract database name from connection URI"""
        try:
            # URI format: postgresql://user:password@host:port/database
            if '/' in uri:
                # Get everything after the last slash
                return uri.split('/')[-1].split('?')[0]  # Remove query parameters if any
            return ""
        except:
            return ""
    
    def ensure_database_exists(self, db_name: str):
        """Ensure the specified database exists"""
        try:
            # Check if our target database exists
            with self.connection.cursor() as cursor:
                cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
                if not cursor.fetchone():
                    print(f"[INFO] Database '{db_name}' doesn't exist, will create it")
                    # Store current connection info
                    from urllib.parse import urlparse
                    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:superpassword@localhost:5432/pasturescan_db')
                    
                    # Parse the URI to get connection parameters
                    parsed = urlparse(DATABASE_URL)
                    
                    # Close current connection
                    self.connection.close()
                    
                    # Connect to default 'postgres' database to create our target DB
                    temp_conn = psycopg2.connect(
                        host=parsed.hostname or 'localhost',
                        database='postgres',  # Connect to default database
                        user=parsed.username or 'postgres',
                        password=parsed.password or 'superpassword',
                        port=parsed.port or 5432
                    )
                    temp_conn.autocommit = True
                    with temp_conn.cursor() as temp_cursor:
                        temp_cursor.execute(f"CREATE DATABASE {db_name}")
                    temp_conn.close()
                    print(f"[OK] Database '{db_name}' created successfully")
                    
                    # Reconnect to our new database
                    self.connection = psycopg2.connect(DATABASE_URL)
                else:
                    print(f"[OK] Database '{db_name}' exists")
            
            # Create tables
            self.create_tables()
            
        except Exception as e:
            print(f"[WARNING] Database setup warning: {e}")
    
    def create_tables(self):
        """Create necessary tables including farms table"""
        try:
            with self.connection.cursor() as cursor:
                # Check if uuid-ossp extension exists
                cursor.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
                
                # Users table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        first_name VARCHAR(100) NOT NULL,
                        last_name VARCHAR(100) NOT NULL,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        is_verified BOOLEAN DEFAULT FALSE,
                        verification_token VARCHAR(255),
                        reset_token VARCHAR(255),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # User sessions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        access_token TEXT NOT NULL,
                        refresh_token TEXT,
                        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        is_active BOOLEAN DEFAULT TRUE,
                        CONSTRAINT valid_expires_at CHECK (expires_at > created_at)
                    )
                """)
                
                # Farms table (based on your schema)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS farms (
                        id VARCHAR(255) PRIMARY KEY,
                        user_id VARCHAR(255) NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        area_hectares DECIMAL(10, 2) NOT NULL,
                        primary_crop VARCHAR(100),
                        soil_type VARCHAR(100),
                        description TEXT,
                        location VARCHAR(255),
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create indexes
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_users_email 
                    ON users(email)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_users_created_at 
                    ON users(created_at)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_users_reset_token 
                    ON users(reset_token)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_farms_user_id 
                    ON farms(user_id)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_farms_is_active 
                    ON farms(is_active)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_farms_created_at 
                    ON farms(created_at)
                """)
                
                # Create function to update updated_at timestamp
                cursor.execute("""
                    CREATE OR REPLACE FUNCTION update_updated_at_column()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        NEW.updated_at = CURRENT_TIMESTAMP;
                        RETURN NEW;
                    END;
                    $$ language 'plpgsql';
                """)
                
                # Create trigger for users table
                cursor.execute("""
                    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
                    CREATE TRIGGER update_users_updated_at 
                    BEFORE UPDATE ON users
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                """)
                
                # Create trigger for farms table
                cursor.execute("""
                    DROP TRIGGER IF EXISTS update_farms_updated_at ON farms;
                    CREATE TRIGGER update_farms_updated_at 
                    BEFORE UPDATE ON farms
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                """)
                
                self.connection.commit()
                print("[OK] Database tables created successfully")
                
        except Exception as e:
            print(f"[ERROR] Error creating tables: {e}")
            self.connection.rollback()
            raise
    
    def is_connected(self):
        """Check if database connection is alive"""
        try:
            if self.connection and not self.connection.closed:
                with self.connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                return True
            return False
        except:
            return False
    
    def execute_query(self, query: str, params: tuple = None) -> Optional[List[Dict]]:
        """Execute a query and return results"""
        if not self.is_connected():
            self.connect_with_retry()
            if not self.is_connected():
                raise Exception("Database connection is not available")
            
        try:
            with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                if query.strip().lower().startswith('select') or 'returning' in query.lower():
                    result = cursor.fetchall()
                    self.connection.commit()
                    return result
                self.connection.commit()
                return None
        except Exception as e:
            self.connection.rollback()
            print(f"[ERROR] Error executing query: {e}")
            print(f"[DEBUG] Query: {query}")
            print(f"[DEBUG] Params: {params}")
            raise
    
    def register_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Register a new user in the database"""
        try:
            query = """
                INSERT INTO users (id, first_name, last_name, email, password_hash, is_verified)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s)
                RETURNING id, first_name, last_name, email, is_verified, created_at
            """
            
            params = (
                user_data['first_name'],
                user_data['last_name'],
                user_data['email'],
                user_data['password_hash'],
                user_data.get('is_verified', False)
            )
            
            result = self.execute_query(query, params)
            if result and len(result) > 0:
                return dict(result[0])
            return None
            
        except Exception as e:
            print(f"[ERROR] Error registering user: {e}")
            # Check for specific PostgreSQL errors
            if "unique constraint" in str(e).lower():
                raise Exception("User with this email already exists")
            raise
    
    def check_user_exists(self, email: str) -> bool:
        """Check if user with given email already exists"""
        try:
            query = "SELECT EXISTS(SELECT 1 FROM users WHERE email = %s) as email_exists"
            result = self.execute_query(query, (email,))
            if result:
                return result[0]['email_exists']
            return False
        except Exception as e:
            print(f"[ERROR] Error checking user existence: {e}")
            return False
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            query = "SELECT * FROM users WHERE email = %s"
            result = self.execute_query(query, (email,))
            if result and len(result) > 0:
                return dict(result[0])
            return None
        except Exception as e:
            print(f"[ERROR] Error getting user by email: {e}")
            return None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            query = "SELECT * FROM users WHERE id = %s"
            result = self.execute_query(query, (user_id,))
            if result and len(result) > 0:
                return dict(result[0])
            return None
        except Exception as e:
            print(f"[ERROR] Error getting user by ID: {e}")
            return None
    
    def get_all_users(self) -> List[Dict[str, Any]]:
        """Get all users"""
        try:
            query = "SELECT id, first_name, last_name, email, is_verified, created_at FROM users ORDER BY created_at DESC"
            result = self.execute_query(query)
            return [dict(row) for row in result] if result else []
        except Exception as e:
            print(f"[ERROR] Error getting all users: {e}")
            return []
    
    def update_user_profile(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user profile"""
        try:
            if not updates:
                return None
            
            set_clauses = []
            params = []
            
            for key, value in updates.items():
                if value is not None:
                    set_clauses.append(f"{key} = %s")
                    params.append(value)
            
            if not set_clauses:
                return None
            
            params.append(user_id)
            query = f"""
                UPDATE users 
                SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, first_name, last_name, email, is_verified, created_at, updated_at
            """
            
            result = self.execute_query(query, tuple(params))
            if result and len(result) > 0:
                return dict(result[0])
            return None
            
        except Exception as e:
            print(f"[ERROR] Error updating user profile: {e}")
            raise
    
    def update_user_password(self, user_id: str, new_password_hash: str) -> bool:
        """Update user password"""
        try:
            query = """
                UPDATE users 
                SET password_hash = %s, reset_token = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            self.execute_query(query, (new_password_hash, user_id))
            return True
        except Exception as e:
            print(f"[ERROR] Error updating user password: {e}")
            return False
    
    def set_reset_token(self, email: str, reset_token: str) -> bool:
        """Set password reset token for user"""
        try:
            query = "UPDATE users SET reset_token = %s, updated_at = CURRENT_TIMESTAMP WHERE email = %s"
            self.execute_query(query, (reset_token, email))
            return True
        except Exception as e:
            print(f"[ERROR] Error setting reset token: {e}")
            return False
    
    def get_user_by_reset_token(self, reset_token: str) -> Optional[Dict[str, Any]]:
        """Get user by reset token"""
        try:
            query = "SELECT * FROM users WHERE reset_token = %s"
            result = self.execute_query(query, (reset_token,))
            if result and len(result) > 0:
                return dict(result[0])
            return None
        except Exception as e:
            print(f"[ERROR] Error getting user by reset token: {e}")
            return None
    
    # Farm Management Methods
    def create_farm(self, farm_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new farm"""
        try:
            query = """
                INSERT INTO farms (id, user_id, name, area_hectares, primary_crop, soil_type, description, location, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """
            
            params = (
                farm_data['id'],
                farm_data['user_id'],
                farm_data['name'],
                farm_data['area_hectares'],
                farm_data.get('primary_crop'),
                farm_data.get('soil_type'),
                farm_data.get('description'),
                farm_data.get('location'),
                farm_data.get('is_active', True)
            )
            
            result = self.execute_query(query, params)
            if result and len(result) > 0:
                return dict(result[0])
            return None
            
        except Exception as e:
            print(f"[ERROR] Error creating farm: {e}")
            raise
    
    def get_user_farms(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all farms for a user"""
        try:
            query = """
                SELECT * FROM farms 
                WHERE user_id = %s AND is_active = TRUE
                ORDER BY created_at DESC
            """
            result = self.execute_query(query, (user_id,))
            return [dict(row) for row in result] if result else []
        except Exception as e:
            print(f"[ERROR] Error getting user farms: {e}")
            return []
    
    def get_farm_by_id(self, farm_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
        """Get farm by ID, optionally checking user ownership"""
        try:
            if user_id:
                query = "SELECT * FROM farms WHERE id = %s AND user_id = %s"
                params = (farm_id, user_id)
            else:
                query = "SELECT * FROM farms WHERE id = %s"
                params = (farm_id,)
            
            result = self.execute_query(query, params)
            if result and len(result) > 0:
                return dict(result[0])
            return None
        except Exception as e:
            print(f"[ERROR] Error getting farm by ID: {e}")
            return None
    
    def update_farm(self, farm_id: str, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update farm information"""
        try:
            if not updates:
                return None
            
            set_clauses = []
            params = []
            
            for key, value in updates.items():
                if value is not None:
                    set_clauses.append(f"{key} = %s")
                    params.append(value)
            
            if not set_clauses:
                return None
            
            params.extend([farm_id, user_id])
            query = f"""
                UPDATE farms 
                SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND user_id = %s
                RETURNING *
            """
            
            result = self.execute_query(query, tuple(params))
            if result and len(result) > 0:
                return dict(result[0])
            return None
            
        except Exception as e:
            print(f"[ERROR] Error updating farm: {e}")
            raise
    
    def delete_farm(self, farm_id: str, user_id: str) -> bool:
        """Soft delete a farm (set is_active = FALSE)"""
        try:
            query = """
                UPDATE farms 
                SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND user_id = %s
            """
            self.execute_query(query, (farm_id, user_id))
            return True
        except Exception as e:
            print(f"[ERROR] Error deleting farm: {e}")
            return False
    
    def hard_delete_farm(self, farm_id: str, user_id: str) -> bool:
        """Permanently delete a farm"""
        try:
            query = "DELETE FROM farms WHERE id = %s AND user_id = %s"
            self.execute_query(query, (farm_id, user_id))
            return True
        except Exception as e:
            print(f"[ERROR] Error hard deleting farm: {e}")
            return False
    
    def search_farms(self, user_id: str, search_term: str = None, 
                    soil_type: str = None, crop_type: str = None) -> List[Dict[str, Any]]:
        """Search farms with filters"""
        try:
            conditions = ["user_id = %s", "is_active = TRUE"]
            params = [user_id]
            
            if search_term:
                conditions.append("(name ILIKE %s OR location ILIKE %s OR description ILIKE %s)")
                params.extend([f"%{search_term}%", f"%{search_term}%", f"%{search_term}%"])
            
            if soil_type:
                conditions.append("soil_type = %s")
                params.append(soil_type)
            
            if crop_type:
                conditions.append("primary_crop = %s")
                params.append(crop_type)
            
            where_clause = " AND ".join(conditions)
            query = f"SELECT * FROM farms WHERE {where_clause} ORDER BY created_at DESC"
            
            result = self.execute_query(query, tuple(params))
            return [dict(row) for row in result] if result else []
        except Exception as e:
            print(f"[ERROR] Error searching farms: {e}")
            return []
    
    def get_farm_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get farm statistics for a user"""
        try:
            query = """
                SELECT 
                    COUNT(*) as total_farms,
                    SUM(area_hectares) as total_area,
                    AVG(area_hectares) as avg_area,
                    MAX(created_at) as latest_farm_date
                FROM farms 
                WHERE user_id = %s AND is_active = TRUE
            """
            result = self.execute_query(query, (user_id,))
            
            if result and len(result) > 0:
                stats = dict(result[0])
                
                # Get crop distribution
                crop_query = """
                    SELECT primary_crop, COUNT(*) as count
                    FROM farms 
                    WHERE user_id = %s AND is_active = TRUE AND primary_crop IS NOT NULL
                    GROUP BY primary_crop
                    ORDER BY count DESC
                """
                crop_result = self.execute_query(crop_query, (user_id,))
                stats['crop_distribution'] = [dict(row) for row in crop_result] if crop_result else []
                
                # Get soil type distribution
                soil_query = """
                    SELECT soil_type, COUNT(*) as count
                    FROM farms 
                    WHERE user_id = %s AND is_active = TRUE AND soil_type IS NOT NULL
                    GROUP BY soil_type
                    ORDER BY count DESC
                """
                soil_result = self.execute_query(soil_query, (user_id,))
                stats['soil_distribution'] = [dict(row) for row in soil_result] if soil_result else []
                
                return stats
            return {}
        except Exception as e:
            print(f"[ERROR] Error getting farm statistics: {e}")
            return {}
    
    def create_user_session(self, session_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new user session"""
        try:
            query = """
                INSERT INTO user_sessions (user_id, access_token, refresh_token, expires_at, is_active)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, created_at
            """
            
            params = (
                session_data['user_id'],
                session_data['access_token'],
                session_data.get('refresh_token'),
                session_data['expires_at'],
                session_data.get('is_active', True)
            )
            
            result = self.execute_query(query, params)
            if result and len(result) > 0:
                return dict(result[0])
            return None
        except Exception as e:
            print(f"[ERROR] Error creating user session: {e}")
            return None
    
    def invalidate_user_sessions(self, user_id: str) -> bool:
        """Invalidate all active sessions for a user"""
        try:
            query = "UPDATE user_sessions SET is_active = FALSE WHERE user_id = %s AND is_active = TRUE"
            self.execute_query(query, (user_id,))
            return True
        except Exception as e:
            print(f"[ERROR] Error invalidating user sessions: {e}")
            return False
    
    def close(self):
        """Close the database connection"""
        if self.connection and not self.connection.closed:
            self.connection.close()
            print("[OK] Database connection closed")
            
            
    def verify_farm_ownership(self, user_id: str, farm_id: str) -> bool:
        """Verify if a user owns a specific farm"""
        try:
            query = "SELECT EXISTS(SELECT 1 FROM farms WHERE id = %s AND user_id = %s) as is_owner"
            result = self.execute_query(query, (farm_id, user_id))
            if result:
                return result[0]['is_owner']
            return False
        except Exception as e:
            print(f"[ERROR] Error verifying farm ownership: {e}")
            return False   
        
        
    def store_prediction(self, prediction_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Store a new prediction in the database"""
        try:
            # First, let's create the predictions table if it doesn't exist
            self._create_predictions_table()
            
            query = """
                INSERT INTO predictions (id, user_id, farm_id, image_id, biomass_kg_per_hectare, 
                                        confidence, coordinates, metadata, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """
            
            params = (
                prediction_data['id'],
                prediction_data['user_id'],
                prediction_data['farm_id'],
                prediction_data['image_id'],
                prediction_data['biomass_kg_per_hectare'],
                prediction_data.get('confidence'),
                prediction_data.get('coordinates'),
                prediction_data.get('metadata'),
                prediction_data.get('created_at', datetime.utcnow())
            )
            
            result = self.execute_query(query, params)
            if result and len(result) > 0:
                return dict(result[0])
            return None
            
        except Exception as e:
            print(f"[ERROR] Error storing prediction: {e}")
            raise
        
        
        
    def create_pasture_image(self, image_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new pasture image record"""
        try:
            # First, ensure the pasture_images table exists
            self._create_pasture_images_table()
            
            # Generate a unique ID if not provided
            image_id = image_data.get('id', str(uuid.uuid4()))
            
            # Prepare tags and metadata as JSON strings
            tags_json = None
            if 'tags' in image_data and image_data['tags']:
                tags_json = json.dumps(image_data['tags'])
            
            metadata_json = None
            if 'metadata' in image_data and image_data['metadata']:
                metadata_json = json.dumps(image_data['metadata'])
            
            # Convert date_taken to string format for PostgreSQL
            date_taken = image_data.get('date_taken')
            if isinstance(date_taken, datetime):
                date_taken = date_taken.isoformat()
            
            # Build query parameters
            query = """
                INSERT INTO pasture_images (
                    id, user_id, farm_id, pasture_name, image_name, 
                    date_taken, quality_rating, latitude, longitude, 
                    notes, tags, metadata, image_path, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """
            
            params = (
                image_id,
                image_data.get('user_id'),
                image_data.get('farm_id'),
                image_data['pasture_name'],
                image_data['image_name'],
                date_taken,
                image_data.get('quality_rating'),
                image_data.get('latitude'),
                image_data.get('longitude'),
                image_data.get('notes'),
                tags_json,
                metadata_json,
                image_data.get('image_path'),  # Path to stored image file
                datetime.utcnow()
            )
            
            result = self.execute_query(query, params)
            if result and len(result) > 0:
                return dict(result[0])
            return None
            
        except Exception as e:
            print(f"[ERROR] Error creating pasture image: {e}")
            raise   
        
        

    def _create_predictions_table(self):
        """Create the predictions table if it doesn't exist"""
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS predictions (
                        id VARCHAR(255) PRIMARY KEY,
                        user_id VARCHAR(255) NOT NULL,
                        farm_id VARCHAR(255) NOT NULL,
                        image_id VARCHAR(255) NOT NULL,
                        biomass_kg_per_hectare DECIMAL(10, 2) NOT NULL,
                        confidence DECIMAL(5, 2),
                        coordinates TEXT,
                        metadata TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        
                        -- Foreign key constraints (commented out until referenced tables exist)
                        -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        -- FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
                        
                        CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
                    )
                """)
                
                # Create indexes for better query performance
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_predictions_user_id 
                    ON predictions(user_id)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_predictions_farm_id 
                    ON predictions(farm_id)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_predictions_created_at 
                    ON predictions(created_at)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_predictions_user_farm 
                    ON predictions(user_id, farm_id)
                """)
                
                self.connection.commit()
                print("[OK] Predictions table created/verified successfully")
                
        except Exception as e:
            print(f"[WARNING] Error creating predictions table: {e}")
            self.connection.rollback()

    def get_predictions(self, user_id: str, farm_id: str = None, start_date: str = None, 
                       end_date: str = None, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get predictions with filtering"""
        try:
            # First ensure table exists
            self._create_predictions_table()
            
            conditions = ["user_id = %s"]
            params = [user_id]
            
            if farm_id:
                conditions.append("farm_id = %s")
                params.append(farm_id)
            
            if start_date:
                conditions.append("created_at >= %s")
                params.append(start_date)
            
            if end_date:
                conditions.append("created_at <= %s")
                params.append(end_date)
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            query = f"""
                SELECT * FROM predictions 
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            
            params.extend([limit, offset])
            
            result = self.execute_query(query, tuple(params))
            return [dict(row) for row in result] if result else []
            
        except Exception as e:
            print(f"[ERROR] Error getting predictions: {e}")
            return []

    def get_predictions_count(self, user_id: str, farm_id: str = None, 
                             start_date: str = None, end_date: str = None) -> int:
        """Get count of predictions with filtering"""
        try:
            conditions = ["user_id = %s"]
            params = [user_id]
            
            if farm_id:
                conditions.append("farm_id = %s")
                params.append(farm_id)
            
            if start_date:
                conditions.append("created_at >= %s")
                params.append(start_date)
            
            if end_date:
                conditions.append("created_at <= %s")
                params.append(end_date)
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            query = f"SELECT COUNT(*) as total FROM predictions WHERE {where_clause}"
            result = self.execute_query(query, tuple(params))
            
            if result and len(result) > 0:
                return result[0]['total']
            return 0
            
        except Exception as e:
            print(f"[ERROR] Error getting predictions count: {e}")
            return 0

    def get_prediction_by_id(self, prediction_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
        """Get prediction by ID, optionally checking user ownership"""
        try:
            if user_id:
                query = "SELECT * FROM predictions WHERE id = %s AND user_id = %s"
                params = (prediction_id, user_id)
            else:
                query = "SELECT * FROM predictions WHERE id = %s"
                params = (prediction_id,)
            
            result = self.execute_query(query, params)
            if result and len(result) > 0:
                return dict(result[0])
            return None
        except Exception as e:
            print(f"[ERROR] Error getting prediction by ID: {e}")
            return None

    def delete_prediction(self, prediction_id: str, user_id: str) -> bool:
        """Delete a prediction"""
        try:
            query = "DELETE FROM predictions WHERE id = %s AND user_id = %s"
            self.execute_query(query, (prediction_id, user_id))
            return True
        except Exception as e:
            print(f"[ERROR] Error deleting prediction: {e}")
            return False

    def get_farm_predictions_summary(self, farm_id: str) -> Dict[str, Any]:
        """Get summary statistics for predictions on a farm"""
        try:
            query = """
                SELECT 
                    COUNT(*) as total_predictions,
                    AVG(biomass_kg_per_hectare) as average_biomass,
                    MIN(biomass_kg_per_hectare) as min_biomass,
                    MAX(biomass_kg_per_hectare) as max_biomass,
                    AVG(confidence) as average_confidence,
                    STDDEV(biomass_kg_per_hectare) as biomass_stddev,
                    MIN(created_at) as first_prediction,
                    MAX(created_at) as last_prediction
                FROM predictions 
                WHERE farm_id = %s
            """
            result = self.execute_query(query, (farm_id,))
            
            summary = {}
            if result and len(result) > 0:
                summary = dict(result[0])
                
                # Handle potential None values
                for key in ['average_biomass', 'min_biomass', 'max_biomass', 
                           'average_confidence', 'biomass_stddev']:
                    if summary.get(key) is None:
                        summary[key] = 0.0
                
                # Get recent trend (last 7 predictions)
                trend_query = """
                    SELECT biomass_kg_per_hectare, created_at 
                    FROM predictions 
                    WHERE farm_id = %s 
                    ORDER BY created_at DESC 
                    LIMIT 7
                """
                trend_result = self.execute_query(trend_query, (farm_id,))
                summary["recent_trend"] = [dict(row) for row in trend_result] if trend_result else []
                
                # Get biomass distribution by confidence
                confidence_query = """
                    SELECT 
                        CASE 
                            WHEN confidence >= 0.8 THEN 'high'
                            WHEN confidence >= 0.6 THEN 'medium'
                            ELSE 'low'
                        END as confidence_level,
                        COUNT(*) as count,
                        AVG(biomass_kg_per_hectare) as avg_biomass
                    FROM predictions 
                    WHERE farm_id = %s
                    GROUP BY confidence_level
                """
                confidence_result = self.execute_query(confidence_query, (farm_id,))
                summary["confidence_distribution"] = [dict(row) for row in confidence_result] if confidence_result else []
            
            return summary
            
        except Exception as e:
            print(f"[ERROR] Error getting farm predictions summary: {e}")
            return {}     
        
        
        
        
    def store_pasture_image(self, image_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Store pasture image in database"""
        try:
            # First, create the pasture_images table if it doesn't exist
            self._create_pasture_images_table()
            
            query = """
                INSERT INTO pasture_images (
                    id, user_id, farm_id, image_data, pasture_name, location,
                    notes, capture_date, estimated_biomass, quality_rating,
                    tags, metadata, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """
            
            # Prepare tags as JSON array
            tags_json = json.dumps(image_data.get('tags', [])) if image_data.get('tags') else None
            
            # Prepare metadata as JSON
            metadata_json = json.dumps(image_data.get('metadata', {})) if image_data.get('metadata') else None
            
            params = (
                image_data['id'],
                image_data['user_id'],
                image_data.get('farm_id'),
                image_data['image_data'],  # Base64 image
                image_data['pasture_name'],
                image_data.get('location'),
                image_data.get('notes'),
                image_data['capture_date'],
                image_data.get('estimated_biomass'),
                image_data.get('quality_rating'),
                tags_json,
                metadata_json,
                datetime.utcnow()
            )
            
            result = self.execute_query(query, params)
            if result and len(result) > 0:
                return dict(result[0])
            return None
            
        except Exception as e:
            print(f"[ERROR] Error storing pasture image: {e}")
            raise
    
    def _create_pasture_images_table(self):
        """Create the pasture_images table if it doesn't exist"""
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS pasture_images (
                        id VARCHAR(255) PRIMARY KEY,
                        user_id VARCHAR(255) NOT NULL,
                        farm_id VARCHAR(255),
                        image_data TEXT NOT NULL,  -- Base64 encoded image
                        pasture_name VARCHAR(255) NOT NULL,
                        location VARCHAR(255),
                        notes TEXT,
                        capture_date DATE NOT NULL,
                        estimated_biomass DECIMAL(10, 2),
                        quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
                        tags JSONB,
                        metadata JSONB,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create indexes
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_pasture_images_user_id 
                    ON pasture_images(user_id)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_pasture_images_farm_id 
                    ON pasture_images(farm_id)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_pasture_images_capture_date 
                    ON pasture_images(capture_date)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_pasture_images_created_at 
                    ON pasture_images(created_at)
                """)
                
                self.connection.commit()
                print("[OK] Pasture images table created/verified successfully")
                
        except Exception as e:
            print(f"[WARNING] Error creating pasture images table: {e}")
            self.connection.rollback()



    def get_pasture_image(self, image_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
        """Get pasture image by ID, optionally checking user ownership"""
        try:
            if user_id:
                query = "SELECT * FROM pasture_images WHERE id = %s AND user_id = %s"
                params = (image_id, user_id)
            else:
                query = "SELECT * FROM pasture_images WHERE id = %s"
                params = (image_id,)
            
            result = self.execute_query(query, params)
            if result and len(result) > 0:
                return dict(result[0])
            return None
        except Exception as e:
            print(f"[ERROR] Error getting pasture image by ID: {e}")
            return None

    def get_user_pasture_images(self, user_id: str, farm_id: str = None, 
                               start_date: str = None, end_date: str = None,
                               limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get pasture images for a user with filtering"""
        try:
            conditions = ["user_id = %s"]
            params = [user_id]
            
            if farm_id:
                conditions.append("farm_id = %s")
                params.append(farm_id)
            
            if start_date:
                conditions.append("date_taken >= %s")
                params.append(start_date)
            
            if end_date:
                conditions.append("date_taken <= %s")
                params.append(end_date)
            
            where_clause = " AND ".join(conditions)
            
            query = f"""
                SELECT * FROM pasture_images 
                WHERE {where_clause}
                ORDER BY date_taken DESC
                LIMIT %s OFFSET %s
            """
            
            params.extend([limit, offset])
            
            result = self.execute_query(query, tuple(params))
            return [dict(row) for row in result] if result else []
            
        except Exception as e:
            print(f"[ERROR] Error getting user pasture images: {e}")
            return []

    def update_pasture_image(self, image_id: str, user_id: str, 
                            updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update pasture image information"""
        try:
            if not updates:
                return None
            
            set_clauses = []
            params = []
            
            for key, value in updates.items():
                if value is not None and key not in ['id', 'user_id']:
                    # Handle JSON fields
                    if key in ['tags', 'metadata']:
                        value = json.dumps(value) if value else None
                    
                    set_clauses.append(f"{key} = %s")
                    params.append(value)
            
            if not set_clauses:
                return None
            
            params.extend([image_id, user_id])
            query = f"""
                UPDATE pasture_images 
                SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND user_id = %s
                RETURNING *
            """
            
            result = self.execute_query(query, tuple(params))
            if result and len(result) > 0:
                return dict(result[0])
            return None
            
        except Exception as e:
            print(f"[ERROR] Error updating pasture image: {e}")
            raise

    def delete_pasture_image(self, image_id: str, user_id: str) -> bool:
        """Delete a pasture image"""
        try:
            query = "DELETE FROM pasture_images WHERE id = %s AND user_id = %s"
            self.execute_query(query, (image_id, user_id))
            return True
        except Exception as e:
            print(f"[ERROR] Error deleting pasture image: {e}")
            return False

    def search_pasture_images(self, user_id: str, search_term: str = None,
                             farm_id: str = None, pasture_name: str = None,
                             start_date: str = None, end_date: str = None) -> List[Dict[str, Any]]:
        """Search pasture images with filters"""
        try:
            conditions = ["user_id = %s"]
            params = [user_id]
            
            if farm_id:
                conditions.append("farm_id = %s")
                params.append(farm_id)
            
            if pasture_name:
                conditions.append("pasture_name ILIKE %s")
                params.append(f"%{pasture_name}%")
            
            if search_term:
                conditions.append("(pasture_name ILIKE %s OR notes ILIKE %s OR image_name ILIKE %s)")
                params.extend([f"%{search_term}%", f"%{search_term}%", f"%{search_term}%"])
            
            if start_date:
                conditions.append("date_taken >= %s")
                params.append(start_date)
            
            if end_date:
                conditions.append("date_taken <= %s")
                params.append(end_date)
            
            where_clause = " AND ".join(conditions)
            query = f"SELECT * FROM pasture_images WHERE {where_clause} ORDER BY date_taken DESC"
            
            result = self.execute_query(query, tuple(params))
            return [dict(row) for row in result] if result else []
            
        except Exception as e:
            print(f"[ERROR] Error searching pasture images: {e}")
            return []

    def get_pasture_image_statistics(self, user_id: str, farm_id: str = None) -> Dict[str, Any]:
        """Get statistics about pasture images"""
        try:
            conditions = ["user_id = %s"]
            params = [user_id]
            
            if farm_id:
                conditions.append("farm_id = %s")
                params.append(farm_id)
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            query = f"""
                SELECT 
                    COUNT(*) as total_images,
                    COUNT(DISTINCT farm_id) as farms_with_images,
                    COUNT(DISTINCT pasture_name) as unique_pastures,
                    MIN(date_taken) as earliest_image,
                    MAX(date_taken) as latest_image,
                    AVG(quality_rating) as avg_quality_rating
                FROM pasture_images 
                WHERE {where_clause}
            """
            
            result = self.execute_query(query, tuple(params))
            
            stats = {}
            if result and len(result) > 0:
                stats = dict(result[0])
                
                # Get images by month
                monthly_query = f"""
                    SELECT 
                        DATE_TRUNC('month', date_taken) as month,
                        COUNT(*) as image_count
                    FROM pasture_images 
                    WHERE {where_clause}
                    GROUP BY DATE_TRUNC('month', date_taken)
                    ORDER BY month DESC
                    LIMIT 12
                """
                monthly_result = self.execute_query(monthly_query, tuple(params))
                stats['monthly_distribution'] = [dict(row) for row in monthly_result] if monthly_result else []
                
                # Get images by quality rating
                quality_query = f"""
                    SELECT 
                        quality_rating,
                        COUNT(*) as count
                    FROM pasture_images 
                    WHERE {where_clause} AND quality_rating IS NOT NULL
                    GROUP BY quality_rating
                    ORDER BY quality_rating
                """
                quality_result = self.execute_query(quality_query, tuple(params))
                stats['quality_distribution'] = [dict(row) for row in quality_result] if quality_result else []
            
            return stats
            
        except Exception as e:
            print(f"[ERROR] Error getting pasture image statistics: {e}")
            return {}
        
        
        
    def check_pasture_image_exists(self, user_id: str, image_name: str, date_taken: str) -> bool:
        """Check if pasture image already exists for the user"""
        try:
            query = """
                SELECT EXISTS(
                    SELECT 1 FROM pasture_images 
                    WHERE user_id = %s AND image_name = %s AND date_taken = %s
                ) as image_exists
            """
            result = self.execute_query(query, (user_id, image_name, date_taken))
            if result:
                return result[0]['image_exists']
            return False
        except Exception as e:
            print(f"[ERROR] Error checking pasture image existence: {e}")
            return False

    
            
    

# Singleton instance
db = DatabaseConnection()