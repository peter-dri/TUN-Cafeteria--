# System Analysis (Current)

Updated: 2026-05-04

## Executive Summary

The running system is currently JSON-first:
- Customer and admin workflows execute through `server.js` against `data.json`.
- SQLite/MySQL assets exist in the repository but are not the primary runtime path.
- Previous docs that referenced `POST /api/order` are outdated for current flow.

## Current Architecture

### Frontend
- `index.html`: customer ordering UI
- `admin.html`: admin operations UI
- `track-order.html`: public order tracking
- `modules/*.js`: client-side logic (cart, menu, payment, auth, admin, ordering hours)

### Backend
- `server.js`: Express app, route handlers, JWT auth middleware, static file hosting
- Uses in-process data read/write helpers against `data.json`

### Data Layer
- Active store: `data.json`
- Optional/legacy assets: `database/*`, `setup-sqlite.js`, `setup-mysql.js`

## Canonical API Surface (Current)

### Public/customer routes
- `GET /api/menu-state`
- `GET /api/menu`
- `GET /api/menu/categories`
- `POST /api/orders`
- `GET /api/orders/:orderNumber`
- `POST /api/reviews/:itemId`
- `GET /api/reviews/:itemId`
- `POST /api/mpesa/stk-push-public`
- `POST /api/mpesa/callback`
- `GET /api/health`

### Authenticated admin routes
- `POST /api/admin/login`
- `GET /api/data`
- `POST /api/data`
- `GET /api/admin/data`
- `GET /api/orders`
- `PUT /api/orders/:orderNumber/status`
- `PUT /api/orders/:orderNumber/payment`
- `POST /api/payment/verify`
- `GET /api/inventory`
- `PUT /api/inventory/:itemId`
- `POST /api/inventory/:itemId/adjust`
- `GET /api/admin/statistics`
- `GET /api/admin/analytics`
- `GET /api/admin/analytics/report`
- `GET /api/admin/roles`
- `GET /api/admin/admins`
- `POST /api/admin/admins`
- `PUT /api/admin/admins/:username/role`
- `POST /api/admin/admins/:username/deactivate`
- `GET /api/admin/activity-log`
- `GET /api/debug/data`
- `POST /api/mpesa/stk-push`
- `GET /api/mpesa/session/:checkoutRequestId`

## Documentation Drift Resolved

### Replaced legacy route naming
- Old (stale in previous docs): `POST /api/order`
- Current (implemented): `POST /api/orders`

### Clarified data storage reality
- Runtime is JSON-first, not database-first.
- Database artifacts are present but not canonical for active request flow.

### Clarified access control
- `GET /api/data` is authenticated and intended for admin context.

## Remaining Architectural Risks

1. Source-of-truth split in repository intent
- Runtime behavior is JSON-first, but repository still includes DB-oriented setup/docs.

2. Full-file JSON writes under growth
- `data.json` read/write model may become fragile with higher concurrency and larger datasets.

3. Role enforcement maturity
- JWT auth is in place, but some role checks remain implementation-dependent and should be audited route-by-route.

## Recommendation

Pick one long-term direction and document it explicitly across all setup and analysis files:

1. JSON-first operational mode (short-term simplicity)
- Keep current implementation.
- Remove or archive DB-first instructions from primary onboarding docs.

2. Database-first mode (production scale)
- Migrate active endpoints from `data.json` to DB-backed models.
- Keep `data.json` only for backup/export if needed.

## Changelog Note

This file is now the canonical analysis baseline for route naming and architecture status.
