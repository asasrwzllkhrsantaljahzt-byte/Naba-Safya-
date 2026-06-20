---
name: Accounts & UI Patterns
description: Chart of accounts DB/API setup, autocomplete combobox pattern, and notification bell pattern used in مصنع نبع صافيا
---

## Chart of Accounts (دليل الحسابات)
- DB table: `accountsTable` in `lib/db/src/schema/accounts.ts`
- Enum: `account_type` = asset | liability | equity | revenue | expense
- API routes at `/api/accounts` (GET/POST/PATCH/DELETE + /summary)
- Frontend page: `artifacts/water-factory/src/pages/accounts.tsx`
- Route registered: `/accounts` in App.tsx, nav entry "دليل الحسابات" with BookOpen icon

**Why:** Opening balances entered here affect treasury, balance sheet, and financial reports.

## Autocomplete Combobox Pattern
- Inline `AutocompleteCombobox` / `SupplierCombobox` components in sales.tsx and purchases.tsx
- Uses `useRef` + `document.addEventListener("mousedown")` for click-outside dismissal
- "Create new" option appears at bottom when search text has no exact match
- Inline create dialogs (`CreateCustomerDialog`, `CreateSupplierDialog`, `CreateProductDialog`) open without closing the invoice form

**Why:** Replace static dropdowns for customers/suppliers and product button grids with searchable comboboxes that support inline creation.

## Notification Bell
- Layout header now has a Bell icon with a red badge showing count of today's events
- `NotificationPanel` component fetches sales/purchases/expenses/obligations for today and renders them
- Count auto-fetches on route change (keyed to `location`)

## Products Navigation
- Products list moved from Settings tab to `artifacts/water-factory/src/pages/inventory-products.tsx`
- Route: `/inventory/products`, nav under المخزن sub-menu
- Settings products tab now shows a redirect card with a link to `/inventory/products`

## TypeScript Gotcha
- `return toast({...})` causes TS7030 in async functions — always use `{ toast({...}); return; }` pattern instead.
