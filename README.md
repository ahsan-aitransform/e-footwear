# FootwearPOS web app (v6 API)

Next.js 16 (App Router) + React 19 + Tailwind 4, blue/white theme. It talks to the .NET API in `../e-footwear-api` through a same-origin proxy, so the
browser never holds the session token — it lives in an httpOnly cookie.

```
app/api/v1/[...path]   proxy to the API (adds the bearer session and the working store from cookies; a 401 clears the cookie)
app/api/session/*      login · switch-store · logout
proxy.ts               optimistic redirect to /login when there is no session (the API is the real gate)
app/(app)/**           thin route files; screens live in features/
features/<module>      auth · sales · purchases · products · party · voucher · reports · users · settings
components/ui          design system (buttons, forms, tables, modal, toast) · components/shared (pickers, scan entry, receipt, barcode, list page)
lib/                   api client, hooks, formatting, navigation + permission codes
```

## Run

```bash
cp .env.local.example .env.local          # API_BASE_URL=http://localhost:5069
npm install
npm run dev                               # or: npm run build && npm start
BASE=http://localhost:3000 COMPANY="My Shoes" USER_NAME=owner PASSWORD='…' node scripts/smoke.mjs   # end-to-end check, creates data
```

Sign in at `/login` with the **company name or number**, user name and password. The first password of a new user is temporary; the API allows
only "change password" until it is changed. Money is whole rupees.

## What is connected to the v6 API

| Screen | Routes |
|---|---|
| Sign-in, change password, store switcher, permission-aware menu | `/login` `/account/password` |
| Dashboard (today / month sale, profit, stock value, receivable, payable) | `/dashboard` |
| **Point of sale**: scan or search, server prices, offers/deals, manual price/discount (with the right), bill discount, split payments, credit sale, retry-safe save, receipt print | `/sales/new` |
| Invoices: list, view, receipt, **return** (quantities), **void** | `/sales` `/sales/[id]` |
| Purchases: bill with discount/tax, price update, list, view, return, void | `/purchases` … |
| Products: list, new with sizes and barcodes, edit, prices per size, per-store price, price history, remove | `/products` … |
| Stock by store | `/stock` |
| Customers / vendors / staff: list, new/edit, **ledger with running balance**, open bills | `/parties` … |
| Vouchers: payment (with bill settlement), receipt, expense, journal; list, view, void | `/vouchers` … |
| Reports: catalogue + runner for 22 database reports, CSV export, print | `/reports` |
| Users: list, create/edit with a permission matrix and role templates, reset password, block/unblock | `/users` |
| Company profile, stores, master lists (incl. categories and sizes) | `/settings/stores` `/settings/masters` |

## Not connected yet (the API exists, there is no screen)

Stock transfers (scan send/receive, loss cases), adjustments, audits, claims · promotions, deals and conflict resolution · expenses (approval, payment, split) ·
commission plans, payroll and salary payments · cash count and customer promises · bulk price tools and barcode label printing · opening balances ·
vendor payment reminders · price drift review. Orders, offline sync and Shopify are not built in the API either (see `../docs/IMPLEMENTATION-STATUS.md`).

## Verified

`tsc` (via `next build`), `eslint` and `scripts/smoke.mjs` (61 checks through Next → API → PostgreSQL) pass. **No screen has been driven in a real browser**
(there is no browser tooling here): layout, keyboard flow (F2 scan, F10 save) and print preview are checked only through types, server responses and the
API tests. Do a click-through before go-live.
