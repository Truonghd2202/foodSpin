# Database setup

Fresh database:

1. Run `001_schema.sql`.
2. Run `002_seed_categories.sql`.
3. Run `003_seed_default_foods.sql`. It references the 38 project-controlled images in `web/public/foods` using same-origin paths.

Existing database:

1. Back up the database.
2. Review and run `004_history_snapshots_and_image_ids.sql` once.
3. Run `005_remove_legacy_updated_at_triggers.sql` if the introspected database contains those legacy triggers. The API writes affected timestamps explicitly.
4. Run `npx prisma generate`.

The migration is additive. It backfills history snapshots before making snapshot fields required and changes the food foreign key to `ON DELETE SET NULL`.

The default library contains 38 items from `text.md`; every item has a project-controlled image asset. Default foods use `owner_id = NULL` and the seed is idempotent.
