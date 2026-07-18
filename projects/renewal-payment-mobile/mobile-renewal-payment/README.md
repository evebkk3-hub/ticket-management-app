# Renewal Payment Production React Native App

React Native / Expo application for the renewal premium payment flow, optimized for an 11-inch iPad in landscape orientation.

## Production architecture

- React Navigation native stack for Dashboard, Payments, History Detail, Confirmation, and QR screens
- Expo SQLite with ordered, idempotent migrations
- Typed domain models and repository query layer under `src/`
- SQLite seed data only when the database is empty
- Thai typography bundled with Noto Sans Thai
- iOS and Android application identifiers in `app.json`
- Landscape tablet configuration
- Web, iOS, and Android production export scripts

Key modules:

- `src/domain/payment.ts` — payment domain types
- `src/database/database.ts` — connection and migration runner
- `src/database/migrations.ts` — versioned database schema
- `src/database/seed.ts` — development/demo seed transaction
- `src/repositories/paymentRepository.ts` — parameterized search, status, ordering, and pagination queries
- `src/services/bootstrap.ts` — application bootstrap lifecycle

## Screens

- Renewal payment list
- Area filter modal
- Renewal payment confirmation
- Payment history matching the supplied 1194px tablet design
- Search, payment-date sorting, status badges, and pagination controls

## Database

SQLite assets are in `database/`:

- `schema.sql` — idempotent 3-table schema with keys and indexes
- `seed.sql` — representative payment-history records
- `renewal-payment.db` — ready-to-use SQLite database
- `FIELD_MAPPING.md` — UI-to-database field mapping

Rebuild the database with `node database/create-db.js` (Node.js 22.5+).

## UX/UI Matching Notes

- Primary blue: `#008bd2`
- Page background: `#f1f4f7`
- Soft blue panels: `#e2f7ff`, `#eef9fd`
- Main text: `#3a3f44`
- Muted text: `#7b858d`
- Thai UI font: `Noto Sans Thai` (bundled through Expo Google Fonts)

For pixel-identical Figma typography, replace Noto Sans Thai with the exact licensed `.ttf/.otf` used by the source design.

## Run

```powershell
cd mobile-renewal-payment
npm install
npm run web
```

Production verification:

```powershell
npm run typecheck
npm run build:web
npm run build:ios
npm run build:android
npx expo-doctor
```

For mobile preview:

```powershell
npm start
```

Then open with Expo Go or an emulator.
