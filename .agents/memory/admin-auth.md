---
name: Admin Auth System
description: Token-based auth for the water factory admin panel — architecture, roles, and integration points
---

## How it works
- HMAC-SHA256 signed tokens stored in `localStorage` as `adminToken` / `adminUser`
- Token format: `base64url(payload).hmac_sig` — verified server-side using `SESSION_SECRET`
- Default admin created automatically if `users` table is empty: `admin / admin123`
- `AuthProvider` in `artifacts/water-factory/src/lib/auth.tsx` exposes `useAuth()` hook
- All API calls to admin endpoints must include `Authorization: Bearer <token>`

## Roles
- `admin` — full access + manage users
- `manager` — edit + delete records (no user management)
- `viewer` — read-only (no edit/delete buttons shown)

## Backend endpoints
- `POST /api/admin/login` — returns `{ token, user }`
- `GET /api/admin/me` — requires `adminAuth` middleware
- `GET/POST /api/admin/users` — requires `adminAuth` / `requireAdmin`
- `PATCH/DELETE /api/admin/users/:id` — requires `requireAdmin`

## Frontend permission checks
- `can("edit")` — returns true for admin and manager
- `can("delete")` — returns true for admin and manager  
- `can("manageUsers")` — returns true for admin only
- Each page wraps action buttons with `{can("edit") && <Button>...}`

**Why:** The app needed role-based access without external auth providers. SESSION_SECRET from env is used to sign tokens to avoid storing session state server-side.

**How to apply:** When adding new pages, import `useAuth` and wrap add/edit/delete buttons with `can("edit")` and `can("delete")` checks. Treasury transactions only allow edit/delete for `source === "manual"` entries.
