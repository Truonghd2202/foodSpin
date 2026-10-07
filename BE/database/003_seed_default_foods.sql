-- Idempotent product-library seed. Images are project-controlled assets in web/public/foods.
BEGIN;
CREATE TEMP TABLE seed_default_foods (category_slug text, name text, image_slug text) ON COMMIT DROP;
INSERT INTO seed_default_foods VALUES
 ('vietnamese','Phở bò','pho-bo'), ('vietnamese','Phở gà','pho-ga'), ('vietnamese','Bún bò Huế','bun-bo-hue'),
 ('vietnamese','Bún chả','bun-cha'), ('vietnamese','Bún thịt nướng','bun-thit-nuong'), ('vietnamese','Cơm tấm','com-tam'),
 ('vietnamese','Cơm gà','com-ga'), ('vietnamese','Cơm chiên','com-chien'), ('vietnamese','Bánh mì','banh-mi'),
 ('vietnamese','Hủ tiếu','hu-tieu'), ('vietnamese','Mì Quảng','mi-quang'), ('vietnamese','Bánh xèo','banh-xeo'),
 ('vietnamese','Bánh canh','banh-canh'), ('vietnamese','Bún riêu','bun-rieu'), ('vietnamese','Bún đậu mắm tôm','bun-dau-mam-tom'),
 ('vietnamese','Gỏi cuốn','goi-cuon'), ('fast-food','Burger bò','burger-bo'), ('fast-food','Burger gà','burger-ga'),
 ('fast-food','Gà rán','ga-ran'), ('fast-food','Hot dog','hot-dog'), ('fast-food','Khoai tây chiên','khoai-tay-chien'),
 ('fast-food','Nuggets','nuggets'), ('healthy','Salad ức gà','salad-uc-ga'), ('healthy','Salad cá ngừ','salad-ca-ngu'),
 ('healthy','Poke bowl','poke-bowl'), ('healthy','Cơm gạo lứt ức gà','com-gao-lut-uc-ga'), ('healthy','Granola yogurt','granola-yogurt'),
 ('dessert','Bánh flan','banh-flan'), ('dessert','Tiramisu','tiramisu'), ('dessert','Cheesecake','cheesecake'),
 ('dessert','Donut','donut'), ('dessert','Kem','kem'), ('dessert','Chè','che'), ('drink','Trà sữa','tra-sua'),
 ('drink','Cà phê sữa đá','ca-phe-sua-da'), ('drink','Matcha latte','matcha-latte'), ('drink','Sinh tố','sinh-to'),
 ('drink','Nước ép','nuoc-ep');

UPDATE foods f SET image_url = '/foods/' || seed.image_slug || '.png', updated_at = now()
FROM seed_default_foods seed
WHERE f.owner_id IS NULL AND lower(f.name) = lower(seed.name);

INSERT INTO foods (owner_id, category_id, name, image_url)
SELECT NULL, c.id, seed.name, '/foods/' || seed.image_slug || '.png'
FROM seed_default_foods seed JOIN categories c ON c.slug = seed.category_slug
WHERE NOT EXISTS (SELECT 1 FROM foods f WHERE f.owner_id IS NULL AND lower(f.name) = lower(seed.name));

INSERT INTO food_meal_times (food_id, meal_time)
SELECT f.id, meal.meal_time
FROM seed_default_foods seed
JOIN foods f ON f.owner_id IS NULL AND lower(f.name) = lower(seed.name)
CROSS JOIN (VALUES ('lunch'), ('dinner')) AS meal(meal_time)
ON CONFLICT DO NOTHING;

INSERT INTO food_meal_times (food_id, meal_time)
SELECT f.id, 'breakfast'
FROM foods f
WHERE f.owner_id IS NULL AND f.name IN ('Phở bò','Phở gà','Bánh mì','Hủ tiếu','Granola yogurt','Cà phê sữa đá','Matcha latte','Sinh tố','Nước ép')
ON CONFLICT DO NOTHING;

INSERT INTO food_meal_times (food_id, meal_time)
SELECT f.id, 'late-night'
FROM foods f JOIN categories c ON c.id = f.category_id
WHERE f.owner_id IS NULL AND (c.slug IN ('fast-food','drink') OR f.name IN ('Phở bò','Phở gà','Bún bò Huế','Hủ tiếu','Mì Quảng'))
ON CONFLICT DO NOTHING;
COMMIT;
