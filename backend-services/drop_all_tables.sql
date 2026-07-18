-- Drop tables in correct order to handle foreign key constraints
DROP TABLE IF EXISTS farms CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;

DROP TABLE IF EXISTS pasture_image CASCADE;

Drop TABLE IF EXISTS pasture_history CASCADE;

DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS crop_types CASCADE;
DROP TABLE IF EXISTS soil_types CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Or use this comprehensive drop all approach
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Disable triggers temporarily
    SET session_replication_role = 'replica';
    
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Re-enable triggers
    SET session_replication_role = 'origin';
END $$;