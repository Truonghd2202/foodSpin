-- Fresh-database baseline. Safe for an empty PostgreSQL database.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar(255) NOT NULL UNIQUE,
  password_hash text NOT NULL, display_name varchar(100), avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug varchar(50) NOT NULL UNIQUE,
  name varchar(100) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id), name varchar(150) NOT NULL, image_url text NOT NULL,
  image_public_id text, description text, spicy boolean NOT NULL DEFAULT false,
  vegetarian boolean NOT NULL DEFAULT false, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS food_meal_times (
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE, meal_time varchar(30) NOT NULL,
  PRIMARY KEY (food_id, meal_time),
  CONSTRAINT food_meal_times_value_check CHECK (meal_time IN ('breakfast','lunch','dinner','late-night'))
);
CREATE TABLE IF NOT EXISTS user_food_preferences (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true, is_favorite boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, food_id)
);
CREATE TABLE IF NOT EXISTS spin_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id uuid REFERENCES foods(id) ON DELETE SET NULL, food_name varchar(150) NOT NULL,
  food_image_url text NOT NULL, food_category_name varchar(100), filters jsonb,
  spun_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category_id);
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_owner ON foods(owner_id);
CREATE INDEX IF NOT EXISTS idx_preferences_food ON user_food_preferences(food_id);
CREATE INDEX IF NOT EXISTS idx_preferences_user ON user_food_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_spin_history_food ON spin_history(food_id);
CREATE INDEX IF NOT EXISTS idx_spin_history_user ON spin_history(user_id);
CREATE INDEX IF NOT EXISTS idx_spin_history_date ON spin_history(spun_at DESC);
