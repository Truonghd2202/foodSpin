# FoodSpin API

## Environment

Copy `.env.example` to `.env`. `WEB_ORIGIN` must exactly match the deployed frontend origin. Credentialed CORS is enabled only for that origin.

Authentication uses a short-lived access token in browser memory and a rotating refresh token in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). Login, registration, and refresh are limited to 20 requests per IP per 15 minutes.

## Database

See [database/README.md](database/README.md). Never run `prisma migrate reset` against an existing environment. The existing-database migration is additive and preserves spin history.

## Commands

```powershell
npm install
npx prisma generate
npm run typecheck
npm test
npm run build
```

The backend accepts food images only as JPEG, PNG, or WebP up to 5 MB. Cloudinary public IDs are stored so replaced/deleted custom images can be cleaned up after a successful database operation.
