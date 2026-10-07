INSERT INTO categories (slug, name) VALUES
  ('vietnamese', 'Món Việt'), ('fast-food', 'Fast Food'), ('healthy', 'Healthy'),
  ('dessert', 'Dessert'), ('drink', 'Đồ uống'), ('other', 'Khác')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
