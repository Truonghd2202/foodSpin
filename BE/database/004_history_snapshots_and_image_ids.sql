-- Safe additive migration for an existing FoodSpin database. Does not delete data.
BEGIN;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS image_public_id text;
ALTER TABLE spin_history ADD COLUMN IF NOT EXISTS food_name varchar(150);
ALTER TABLE spin_history ADD COLUMN IF NOT EXISTS food_image_url text;
ALTER TABLE spin_history ADD COLUMN IF NOT EXISTS food_category_name varchar(100);

UPDATE spin_history h SET
  food_name = COALESCE(h.food_name, f.name),
  food_image_url = COALESCE(h.food_image_url, f.image_url),
  food_category_name = COALESCE(h.food_category_name, c.name)
FROM foods f LEFT JOIN categories c ON c.id = f.category_id
WHERE h.food_id = f.id AND (h.food_name IS NULL OR h.food_image_url IS NULL);

ALTER TABLE spin_history ALTER COLUMN food_name SET NOT NULL;
ALTER TABLE spin_history ALTER COLUMN food_image_url SET NOT NULL;
ALTER TABLE spin_history ALTER COLUMN food_id DROP NOT NULL;
ALTER TABLE spin_history DROP CONSTRAINT IF EXISTS spin_history_food_id_fkey;
ALTER TABLE spin_history ADD CONSTRAINT spin_history_food_id_fkey
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE SET NULL;
COMMIT;
