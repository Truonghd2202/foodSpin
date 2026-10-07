-- The introspected development database used PL/pgSQL timestamp triggers.
-- Application code now writes updated_at explicitly, so these legacy triggers are unnecessary.
-- Removing them also keeps the schema reproducible from 001_schema.sql.
DROP TRIGGER IF EXISTS trigger_foods_updated_at ON foods;
DROP TRIGGER IF EXISTS trigger_preferences_updated_at ON user_food_preferences;
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
