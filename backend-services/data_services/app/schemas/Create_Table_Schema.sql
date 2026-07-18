-- PastureScan Database Schema
-- Created based on project requirements from last 3 days

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable JSONB for better JSON performance
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the database (run this separately if needed)
-- CREATE DATABASE pasturescan;

-- Users table - stores user authentication and profile data
CREATE TABLE users (
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
);

-- User sessions table - manages user authentication sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT valid_expires_at CHECK (expires_at > created_at)
);

-- Pasture images table - stores uploaded pasture images and metadata
CREATE TABLE pasture_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    image_metadata JSONB,
    upload_status VARCHAR(50) DEFAULT 'pending',
    validation_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_upload_status CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- ML predictions table - stores ML model predictions for images
CREATE TABLE ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID NOT NULL REFERENCES pasture_images(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prediction_type VARCHAR(100) NOT NULL,
    prediction_data JSONB NOT NULL,
    confidence_score DECIMAL(5,4),
    model_version VARCHAR(50),
    processing_time_ms INTEGER,
    status VARCHAR(50) DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_prediction_type CHECK (prediction_type IN ('biomass_estimation', 'plant_health', 'species_detection')),
    CONSTRAINT valid_status CHECK (status IN ('processing', 'completed', 'failed')),
    CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- Prediction history table - audit trail of all predictions
CREATE TABLE prediction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_id UUID REFERENCES pasture_images(id) ON DELETE SET NULL,
    prediction_type VARCHAR(100) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_history_prediction_type CHECK (prediction_type IN ('biomass_estimation', 'plant_health', 'species_detection'))
);

-- Indexes for performance optimization

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_token ON users(reset_token);
CREATE INDEX idx_users_created_at ON users(created_at);

-- User sessions indexes
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_access_token ON user_sessions(access_token);
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_is_active ON user_sessions(is_active);

-- Pasture images indexes
CREATE INDEX idx_images_user_id ON pasture_images(user_id);
CREATE INDEX idx_images_upload_status ON pasture_images(upload_status);
CREATE INDEX idx_images_created_at ON pasture_images(created_at);
CREATE INDEX idx_images_metadata ON pasture_images USING GIN (image_metadata);

-- ML predictions indexes
CREATE INDEX idx_predictions_image_id ON ml_predictions(image_id);
CREATE INDEX idx_predictions_user_id ON ml_predictions(user_id);
CREATE INDEX idx_predictions_status ON ml_predictions(status);
CREATE INDEX idx_predictions_prediction_type ON ml_predictions(prediction_type);
CREATE INDEX idx_predictions_created_at ON ml_predictions(created_at);
CREATE INDEX idx_predictions_confidence_score ON ml_predictions(confidence_score);
CREATE INDEX idx_predictions_data ON ml_predictions USING GIN (prediction_data);

-- Prediction history indexes
CREATE INDEX idx_history_user_id ON prediction_history(user_id);
CREATE INDEX idx_history_image_id ON prediction_history(image_id);
CREATE INDEX idx_history_prediction_type ON prediction_history(prediction_type);
CREATE INDEX idx_history_processed_at ON prediction_history(processed_at);
CREATE INDEX idx_history_input_data ON prediction_history USING GIN (input_data);
CREATE INDEX idx_history_output_data ON prediction_history USING GIN (output_data);

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ language 'plpgsql';

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE(
    total_images BIGINT,
    total_predictions BIGINT,
    last_prediction_date TIMESTAMP WITH TIME ZONE,
    avg_confidence_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT pi.id) as total_images,
        COUNT(DISTINCT mp.id) as total_predictions,
        MAX(mp.created_at) as last_prediction_date,
        AVG(mp.confidence_score) as avg_confidence_score
    FROM users u
    LEFT JOIN pasture_images pi ON u.id = pi.user_id
    LEFT JOIN ml_predictions mp ON u.id = mp.user_id
    WHERE u.id = user_uuid
    GROUP BY u.id;
END;
$$ language 'plpgsql';

-- Views for common queries

-- View for user prediction dashboard
CREATE VIEW user_prediction_dashboard AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    COUNT(DISTINCT pi.id) as total_images,
    COUNT(DISTINCT mp.id) as total_predictions,
    MAX(mp.created_at) as last_prediction_date,
    AVG(mp.confidence_score) as avg_confidence
FROM users u
LEFT JOIN pasture_images pi ON u.id = pi.user_id
LEFT JOIN ml_predictions mp ON u.id = mp.user_id AND mp.status = 'completed'
GROUP BY u.id, u.first_name, u.last_name, u.email;

-- View for recent predictions with image data
CREATE VIEW recent_predictions_view AS
SELECT 
    mp.id as prediction_id,
    mp.user_id,
    mp.image_id,
    pi.file_name,
    pi.image_url,
    mp.prediction_type,
    mp.prediction_data,
    mp.confidence_score,
    mp.model_version,
    mp.created_at,
    mp.completed_at
FROM ml_predictions mp
JOIN pasture_images pi ON mp.image_id = pi.id
WHERE mp.status = 'completed'
ORDER BY mp.created_at DESC;

-- Insert sample data for testing (optional)
INSERT INTO users (first_name, last_name, email, password_hash, is_verified) VALUES
('John', 'Doe', 'john.doe@example.com', crypt('password123', gen_salt('bf')), true),
('Jane', 'Smith', 'jane.smith@example.com', crypt('password123', gen_salt('bf')), true),
('Farm', 'Owner', 'farm.owner@example.com', crypt('password123', gen_salt('bf')), true);

-- Comments on tables and columns
COMMENT ON TABLE users IS 'Stores user authentication and profile information';
COMMENT ON COLUMN users.password_hash IS 'BCrypt hashed password for security';
COMMENT ON COLUMN users.is_verified IS 'Indicates if user email has been verified';
COMMENT ON COLUMN users.verification_token IS 'Token for email verification process';

COMMENT ON TABLE user_sessions IS 'Manages user authentication sessions and JWT tokens';
COMMENT ON COLUMN user_sessions.access_token IS 'JWT access token for API authentication';
COMMENT ON COLUMN user_sessions.refresh_token IS 'JWT refresh token for token renewal';

COMMENT ON TABLE pasture_images IS 'Stores uploaded pasture images with metadata and validation results';
COMMENT ON COLUMN pasture_images.image_metadata IS 'JSON containing image EXIF data, dimensions, etc.';
COMMENT ON COLUMN pasture_images.validation_result IS 'JSON containing image validation results and errors';

COMMENT ON TABLE ml_predictions IS 'Stores ML model predictions including biomass estimation, plant health, and species detection';
COMMENT ON COLUMN ml_predictions.prediction_data IS 'JSON containing full prediction results from ML models';
COMMENT ON COLUMN ml_predictions.confidence_score IS 'Model confidence score from 0 to 1';

COMMENT ON TABLE prediction_history IS 'Audit trail of all prediction requests for analytics and history';

-- Grant permissions (adjust based on your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pasturescan_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pasturescan_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO pasturescan_user;

-- Display table information
SELECT 
    table_name, 
    pg_size_pretty(pg_total_relation_size(table_name)) as size
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;



-- Additional configuration for production setup

-- Set up row level security (optional for multi-tenant)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pasture_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_history ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (example - adjust based on your security model)
CREATE POLICY user_policy ON users FOR ALL USING (id = current_setting('app.current_user_id')::UUID);
CREATE POLICY user_sessions_policy ON user_sessions FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY images_policy ON pasture_images FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY predictions_policy ON ml_predictions FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY history_policy ON prediction_history FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- Create database user (run as superuser)
-- CREATE USER pasturescan_user WITH PASSWORD 'secure_password';
-- GRANT CONNECT ON DATABASE pasturescan TO pasturescan_user;