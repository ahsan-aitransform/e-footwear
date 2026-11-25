# Frontend architecture and feature-building guide

This is the guide for adding screens to `e-footwear`. Read it before writing code. It describes the structure that already exists
(guards, session, API client, design system, i18n) and the exact steps to add a feature module on top of it.

Binding decisions (docs/PHASE-0-requirements-verification.md): D-006 UUID v7 ids, D-009 money is whole rupees, D-011 missing screens are
designed by the assistant but no business policy is invented, D-012 route guards and server-side permissions.
Stack: Next.js 16 (App Router, Cache Components), React 19, Tailwind 4, shadcn on base-ui. **Next.js here has breaking changes: read the
relevant page in `node_modules/next/dist/docs/` before using a Next API you do not already know** (see AGENTS.md).

## 1. Folder layout

```
app/                         ONLY routing: layouts, pages, globals.css. Pages are thin wrappers around feature pages.
  (public)/                  sign-in pages            -> audience "public"
  (platform)/platform/...    super-admin area          -> audience "platformAdministrator"  (shell + guard)
  (company)/...              company users' app        -> audience "companyUser"            (shell + guard)
  (company-account)/...      company-user pages without the menu (forced password change)
components/
  ui/                        shadcn primitives (button, input, card, table, alert-dialog ...). Do not put app logic here.
  layout/                    ApplicationShell, ApplicationNavigation, PageHeader, SectionCard, AuthenticationCardLayout ...
  data/                      DataGridTable, ServerPaginatedDataGrid, dataGridTypes
  forms/                     FormField, TextInputField, WholeRupeeAmountField, QuantityField, PercentageField, DateField, SearchableSelect, NativeSelect, SubmitButton
  feedback/                  InlineNotice, ToneBadge, StatusBadge, RoleBadge, LoadingIndicator, EmptyState, Skeletons, ToastProvider, ConfirmDialog, AccessDeniedScreen
  permissions/               AudienceRouteGuard, PermissionGuard, PermissionGate, AccessNoticeAnnouncer
features/<module>/           one folder per module: components/, pages/, hooks/, api/, types/ (as needed), tests next to the code
lib/
  constants/                 SINGLE SOURCE OF TRUTH: routes, API paths, storage keys, headers, roles, languages, paging, money, session timing
  contracts/                 permissionCatalog.snapshot.json + GENERATED permissionCodes.ts (never edit by hand)
  types/                     one file per topic (authentication, session, store, company, user, pagination, apiProblem, permissions)
  design/                    semanticTones.ts, roleTones.ts   (what colour means what)
  api/                       sendApiRequest (low level), apiRequest (adds token + store), hooks/ (useApiQuery, usePaginatedQuery, useApiMutation)
  session/                   sessionStore (external store), selectedStoreStore, hooks
  routing/                   routeRegistry, routeAccessDecision, buildNavigationTree, navigationGroups, resolveRouteDefinition
  permissions/               permissionChecks (pure), usePermissions
  i18n/                      messages/en/<module>.ts, messages/ur/<module>.ts, translateMessage, useTranslation, languageStore
  money/                     wholeRupeeAmount (BigInt), quantityAndPercentage
  storage/ theme/ toast/ validation/
scripts/                     generatePermissionCodes, generateServiceWorkerShell, typecheck (+ their pure builders, tested)
tests/                       setup/, support/ (fetch mock, session fixtures), architecture/ (rules enforced as tests)
```

Feature module folder names: `platform security settings masterData contacts customers vendors staff catalogue inventory sales purchases orders accounting cashManagement
humanResources payroll commissions expenses promotions reporting offlineSync shopify dashboards`.

## 2. Naming rules (the user asked for long, self-explanatory names)

- Never abbreviate: `cancellationToken` not `ct`, `translateMessage` not `t`, `isOnline` not `online`, `accessToken` not `token`, `companyId` not `cid`.
- Components `PascalCase` named by what they are: `ServerPaginatedDataGrid`, `WholeRupeeAmountField`, `CompanyDirectoryTree`.
- Pages: `<Thing>Page` in `features/<module>/pages/`; the route file is `app/.../page.tsx` named `<Thing>RoutePage` and only returns the feature page.
- API function and hook names say the action: `useCreateProductMutation`, `usePaginatedProductListQuery`.
- DTO types end in `Request` / `Response` and mirror the C# record names: `CreateUserRequest`, `UserListItemResponse`.
- Booleans start with `is/has/may/can/should`. Event handlers `handleXxx`. Constants `UPPER_SNAKE_CASE` for scalars, `PascalCase` objects (`ApplicationRoutes`).
- Message keys: `<module>.<screen or area>.<meaning>` (`security.createUser.submit`). Permission codes: `<MODULE>.<SCREEN>.<ACTION>`.
- Files: components and types `PascalCase.tsx`/`camelCase.ts` by their main export; one main export per file; tests `<name>.test.ts(x)` next to the code.
- Comments explain WHY (a rule, a decision number, a trap). Do not narrate the code.

## 3. Single sources of truth (and the tests that enforce them)

| What | Where | Enforced by |
|---|---|---|
| Colours | CSS variables in `app/globals.css` only (light + dark). Meaning-colours: `lib/design/semanticTones.ts` | `tests/architecture/rawPaletteScan.test.ts` fails on `bg-slate-100`, `text-indigo-600`, hex, `rgb()` |
| Routes | `lib/constants/applicationRoutes.ts` (+ patterns), registered in `lib/routing/routeRegistry.ts` | `routeRegistry.test.ts` (every `app/**/page.tsx` must be registered with its route group's audience) |
| API paths | `lib/constants/apiEndpoints.ts` | review (no literal `/api` or `"/auth/..."` in features) |
| Storage names, headers, roles, languages, paging, money formats | `lib/constants/*` | review |
| Permission codes | `lib/contracts/permissionCatalog.snapshot.json` -> generated `permissionCodes.ts` | `permissionCodes.test.ts` (generated file not stale; codes valid) |
| Texts | `lib/i18n/messages/{en,ur}/<module>.ts` | `messageCatalogues.test.ts` (same keys, no empty text, same `{placeholders}`) |
| Service worker precache list | derived from `ServiceWorkerPrecachedRoutes` into `public/sw.js` | `serviceWorkerSource.test.ts` (file not stale) |
| Types of API data | `lib/types/<topic>.ts` mirror the backend records (`GET /auth/me` = `CurrentSessionResponse`) | `parseCurrentSession.ts` validates the shape at runtime |

## 4. The guard model (a normal person cannot reach super-admin routes)

1. `lib/routing/routeRegistry.ts` lists every page with its audience (`public | platformAdministrator | companyUser`), required permissions and menu entry. **Deny by default:** a page missing from the registry is shown as Access denied to everybody.
2. Each route group layout wraps its pages in `AudienceRouteGuard audience="..."`. The rules are one pure function, `decideRouteAccess` (tested for audience x signed-in x permission x temporary password):
   - not signed in -> the sign-in page of the audience; company user on a `/platform` route -> their dashboard + a "not authorised" toast; platform admin on a company route -> `/platform`;
   - temporary password -> only `/change-password`; missing permission -> Access denied screen; route not registered or registered for another audience than the layout -> Access denied.
3. **No content before verification.** A stored session is only a claim. Until `GET /auth/me` has answered (or the device is offline) the guard shows a loading state and renders no page. The session store re-validates when a guarded layout mounts, when the connection returns, and when the tab is shown again. A server refusal (401/403) clears the device. Editing IndexedDB to say "platform administrator" changes nothing: the server's answer replaces it (tests: "TAMPERING").
4. Offline: a network failure or server error keeps the stored session (`verification: "offlineUnverified"`) so the POS keeps working with the permissions it last received.
5. **This is convenience, not security.** The browser only decides what to show. The API checks audience, permission, company and store on every request; every new endpoint your screen calls must be permission-protected on the server.
6. In a page: `PermissionGate` hides a button/card, `PermissionGuard` guards a tab/section, `usePermissions()` gives `hasPermission/hasAnyPermission/hasAllPermissions`. Owners receive all codes in `grantedPermissionCodes`.

## 5. Add a feature, step by step (example: Products -> "New Product")

1. Read the Phase 0 rows for the screen (`docs/phase-0/03-requirements-traceability-matrix.csv`, `01-original-document-feature-inventory.md`) and the backend endpoints.
2. **Route constants:** add `productsNewProduct: "/products/new"` to `ApplicationRoutes` and the pattern to `ApplicationRoutePatterns` (above the `<...:end>` markers).
3. **Page:** `app/(company)/products/new/page.tsx` returning `<NewProductPage />` from `features/catalogue/pages/NewProductPage.tsx`. The route group decides the audience.
4. **Registry entry** in `routeRegistry.ts` (above `// <route-registry:end>`): `audience: "companyUser"`, `requiredPermissions: requireAnyPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW)`, and `navigation: { labelMessageKey, iconName, groupCode: "PRODUCTS", sortOrder }`. A new icon: add its name to `NavigationIconName` and `components/layout/navigationIcons.ts`.
5. **Messages:** create `lib/i18n/messages/en/catalogue.ts` and `ur/catalogue.ts` (same keys; Urdu typed against English), add one import + one spread line in both `index.ts` files, add the menu label key to `en/navigation.ts` and `ur/navigation.ts`.
6. **API:** endpoints in `ApiEndpoints` (new group above the marker); DTO types in `lib/types/<topic>.ts` or `features/<module>/types/`; list screens use `ServerPaginatedDataGrid`, forms use `useApiMutation` or `apiRequest` with the `FormField` family. Show server field errors with `problem.fieldErrorMessages` next to the fields.
7. **Money and quantities:** see section 6. Use `WholeRupeeAmountField`, `QuantityField`, `PercentageField`.
8. **Tests** next to the code: form validation, permission behaviour (gate shown/hidden), the API calls (use `installFetchMock`), keyboard use for POS-style screens. Then run `npm run typecheck`, `npm run lint`, `npm test`.
9. Create or update the status line of the Phase 0 rows you implemented (the project's `docs/implementation-status/` file of your module, if it exists).

## 6. Money, quantity, percentage

- Money = whole rupees (decision D-009): an integer `number` (`Number.isSafeInteger`). Never `toFixed`, never float math. Use `lib/money/wholeRupeeAmount.ts`: `formatWholeRupees`, `parseWholeRupeeInput`, `sumWholeRupees`, `multiplyWholeRupeesByQuantity`, `applyPercentageToWholeRupees` (BigInt arithmetic, rounded like `core.round_money`: FLOOR or NEAREST per company `rounding_mode`; the mode is an explicit argument, never a hidden default).
- Quantity: up to 3 decimals; percentage 0-100 with up to 4 decimals. Parse typed text with `parseQuantityInput` / `parsePercentageInput` (accept Urdu digits).
- Ids are UUID strings (D-006); validate route parameters with `isUuid`. `X-Store-Id` is sent automatically from the store selector; never put company or store ids from the client into a request that the server could take as authority.
- Idempotency: every POST gets an `Idempotency-Key` automatically; pass your own `idempotencyKey` to `execute` when you retry the same submission.

## 7. API client and hooks (no new runtime libraries)

`apiRequest(path, { method, query, body, idempotencyKey, authentication })` never throws: it returns `{ ok: true, data }` or `{ ok: false, kind, problem }`
(`kind`: offline | unauthorized | forbidden | notFound | validation | conflict | rateLimited | serverError | aborted | unknown; status 0 = never reached the server).
A 401 on a signed-in request ends the session. `useApiQuery(path, { query, enabled, offlineCacheName })` loads on mount and keeps the last answer per person on the
device when `offlineCacheName` is given (served with `source: "cache"` when offline). Set React state only in event handlers or promise callbacks: the lint rule
`react-hooks/set-state-in-effect` is on; for shared client state use an external store with `useSyncExternalStore` (see `sessionStore`, `languageStore`).

## 8. Internationalisation and right-to-left

English and Urdu. `useTranslation()` -> `translateMessage(key, params)`, `languageCode`, `textDirection`. Switching to Urdu sets `<html lang="ur" dir="rtl">` (an inline script applies saved
language and theme before first paint). **Use logical Tailwind utilities** so layouts flip: `ms-/me-/ps-/pe-/start-/end-`, `text-start/text-end`, `border-s/border-e`, and `rtl:` variants
for icons that point in a direction. Do not write `ml-/mr-/pl-/pr-/left-/right-/text-left`. Numbers, money and codes inside RTL text stay left-to-right (`dir="ltr"` on those inputs).
All Urdu texts are an assistant draft: **every Urdu text still needs review by a native speaker**. Nothing is left in English; there are no untranslated keys at the moment.

## 9. Parallel work rules (several agents edit this repo at the same time)

- Own your folders: `features/<your module>/`, your `app/(...)/<route>/`, your message files `messages/{en,ur}/<module>.ts`, your tests.
- **Shared files are append-only, edited with the Edit tool at the marker comment, never rewritten with Write:**
  `lib/constants/applicationRoutes.ts` (`<application-routes:end>`, `<application-route-patterns:end>`), `lib/constants/apiEndpoints.ts` (`<api-endpoints:end>`),
  `lib/constants/browserStorageKeys.ts` (`<indexed-database-keys:end>`, `<local-storage-keys:end>`), `lib/routing/routeRegistry.ts` (`<route-registry:end>`),
  `lib/i18n/messages/en/index.ts` and `ur/index.ts` (`<...-messages-imports:end>`, `<...-messages-spread:end>`), `lib/i18n/messages/{en,ur}/navigation.ts` (`<navigation-messages:end>`),
  `components/layout/navigationIcons.ts` and `NavigationIconName` in `routeRegistry.ts`, `lib/contracts/permissionCatalog.snapshot.json` (only via `npm run contracts:generate`).
- Dev servers: ports 3101-3199 (3000/3001 belong to the project owner). Start with `run_in_background` and stop only your own. API: `ASPNETCORE_ENVIRONMENT=Development`, a port of your own (5101+).
- Builds: `NEXT_DIST_DIR=.next-<yourname> npm run build` and `NEXT_DIST_DIR=.next-<yourname> npm run typecheck` so builds and route types never collide (`.next/dev` belongs to a running dev server; the typecheck never reads it). Build sparingly (about 3 minutes); `typecheck`, `lint` and `npm test` are the fast loop.
- If a shared file fails to compile because of someone else's half-finished edit, wait a minute and retry; do not "fix" their lines.

## 10. Commands

`npm test` (vitest, jsdom, fake-indexeddb) · `npm run typecheck` · `npm run lint` · `npm run build` (runs `generate:shell` and `contracts:generate -- --check` first) ·
`npm run generate:shell` (public/sw.js) · `npm run contracts:generate` (permissionCodes.ts from the snapshot).

### Permission catalog sync (when the backend catalog changes)

Start the API (`ASPNETCORE_ENVIRONMENT=Development`), sign in (any user, e.g. the platform administrator), then
`npm run contracts:generate -- --from-api http://localhost:<port> --token <accessToken>` (or set `EFW_API_ACCESS_TOKEN`). Commit the new snapshot and
`permissionCodes.ts`, then fix TypeScript errors in the route registry. The catalog has 18 modules and 739 codes: screen permissions `<MODULE>.<SCREEN>.<ACTION>` plus the
legacy flat "restricted operation" codes of module `RESTRICTED_OPERATIONS` (`SALE_CREATE`, `PRICE_CHANGE`, ...) that the database functions check.

## 11. Dependencies added for this foundation

No runtime library was added. Dev dependencies (approved by the precedent of decision D-004, to be confirmed by the owner): `vitest`, `@vitejs/plugin-react`, `jsdom`,
`@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`, `fake-indexeddb`; `@types/node` raised to ^24 (vitest 5 needs it).
Removed: the unused `cn` package. Env: one variable, `API_BASE_URL` (see `.env.local.example`).

## 12. Known gaps (not built yet, by design of this foundation)

Offline transaction outbox and sync UI (Phase 11), printing and print stylesheets, the screens of every module (each module adds its own), user management screens (edit/block/reset, roles and permission tree),
a native-speaker review of the Urdu texts, a browser-level (end-to-end) test run: the guards and screens are covered by unit and component tests only and were not exercised in a real browser.
