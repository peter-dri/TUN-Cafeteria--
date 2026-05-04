# Tharaka University Cafeteria

Web-based cafeteria ordering and admin operations system.

## Current Runtime Architecture

- Primary data store: `data.json` (active production flow)
- Backend: `server.js` (Express API + static file hosting)
- Frontend: `index.html` (customer), `admin.html` (admin), `track-order.html` (order tracking)
- Authentication: JWT for protected admin endpoints

Note: SQLite/MySQL scripts and models exist in the repository, but current runtime request flow is JSON-first through `data.json`.

## Quick Start

```bash
node server.js
```

Then open `http://localhost:3000`.

To change the port, create `.env` in project root:

```bash
PORT=8000
```

## Admin Access

Open `http://localhost:3000/admin.html`

- Username: `admin`
- Password: `admin123`

## Core API Routes (Current)

- `GET /api/menu-state` public menu payload for student UI
- `GET /api/data` admin data payload (authenticated)
- `POST /api/data` save full admin data payload (authenticated)
- `POST /api/orders` create customer/admin order
- `GET /api/orders/:orderNumber` public order lookup for tracking
- `GET /api/orders` list/search orders (authenticated)
- `PUT /api/orders/:orderNumber/status` update order status (authenticated)
- `PUT /api/orders/:orderNumber/payment` update payment status (authenticated)

## Project Structure

```text
├── index.html
├── admin.html
├── track-order.html
├── server.js
├── data.json
├── modules/
└── database/
```

## Documentation Note

`SYSTEM_ANALYSIS.md` is the canonical, current analysis document.
`COMPLETE_SYSTEM_ANALYSIS.md` is retained as historical deep-dive context and may contain legacy route references.
