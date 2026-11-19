# E-Footwear Frontend — Coding Rules (Next.js + TypeScript)

> Read before every task in `e-footwear/`. These rules add to the root `claude.md`
> (`../claude.md`, FootwearPOS Master Prompt). If they conflict, the root file wins.
> If a request conflicts with this file, stop and ask.

## 1. Working method (every prompt)

1. State which phase and which Part of the root `CLAUDE.md` the task belongs to.
2. Read the existing code first. Reuse existing components, hooks, types and utilities before creating new ones.
3. Build only what was asked. No extra screens, props, options, fields or "improvements". Put ideas under `[PROPOSAL — NOT APPROVED]`.
4. Do not add a dependency without proposing it first (name, benefit, alternatives) and getting approval.
5. Never invent business rules (tax, discount stacking, return periods, refund rules). Mark them `[BUSINESS DECISION REQUIRED]` and stop that part.
6. Make small, reviewable changes. Never generate a whole module in one step.
7. After changes, run type-check, lint and tests, and report the real results. Never say "done" if any of them fail or were not run.

## 2. TypeScript strictness

- `tsconfig.json` must have `"strict": true`, plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`.
- **Never** use `any`, `@ts-ignore`, `@ts-nocheck`, or non-null assertions (`!`). `@ts-expect-error` is allowed only with a written reason and a linked follow-up.
- Use `unknown` for untrusted data, then narrow it with a type guard or schema validation.
- Avoid type assertions (`as`). Allowed only when narrowing is impossible, with a comment explaining why.
- Every function has explicit parameter types and an explicit return type (exported functions always).
- Prefer `type` for unions and props, `interface` only for extendable object contracts. Be consistent within a file.
- Model states with discriminated unions, not loose booleans (for example `{ status: 'loading' } | { status: 'error'; error: AppError } | { status: 'success'; data: T }`).
- Use `as const` objects or string-literal unions instead of `enum`.
- Handle every union case. Use an exhaustive `never` check in `switch` statements.
- No implicit `undefined`/`null` leaks. Return types state clearly whether a value can be missing.
- Use `import type` for type-only imports.
- Types shared with the backend come from one source (generated from the OpenAPI spec once approved). Do not hand-copy API types in several places.

## 3. Money, quantities, dates (Part 25.2)

- **Never** use `number` floating-point arithmetic for money. Represent money as a string or integer minor units, always with a currency code, and use one shared helper module for all calculations.
- Quantities and percentages have defined precision and shared types. Do not mix representations across modules.
- Backend is authoritative for totals. The frontend may show previews but must not be the only place a financial rule is enforced.
- Store and transmit dates as UTC ISO strings. Format using the company's configured time zone and locale only at the display layer.

## 4. Next.js structure and rendering

- Use the App Router (`app/`) unless an approved decision says otherwise. `[ARCHITECTURE DECISION REQUIRED]` if unsure.
- **Server Components by default.** Add `'use client'` only when state, effects, browser APIs or event handlers are needed, and keep client components small and at the leaves.
- Never import server-only code (secrets, DB, server env) into client components. Use `server-only` boundaries.
- Data fetching: server-side where possible. Do not fetch inside `useEffect` when a server fetch or the approved data layer can do it.
- Every route segment needs `loading` and `error` handling, and `not-found` where relevant.
- No business logic in page files. Pages compose; logic lives in `features/*/services` and `hooks`.
- Use `next/image`, `next/link` and `next/font`. No raw `<img>` or `<a>` for internal navigation.
- Environment variables: validate at startup in one file. Only public values use the `NEXT_PUBLIC_` prefix. Never put secrets in client code.

### Suggested folder layout (technical suggestion, not an approved requirement)

```
e-footwear/
  src/
    app/                 routes only (compose, no business logic)
    features/<module>/   components, hooks, services, types, schemas, tests
    components/ui/       reusable, generic UI (grid, dropdown, date picker…)
    lib/                 api client, money, date, auth, permissions helpers
    types/               shared types
    i18n/                English + Urdu messages
```

## 5. Components and code quality

- One component per file. PascalCase component files, camelCase hooks (`useX`), kebab-case or consistent folder names.
- Components are small and single-purpose. Extract when a file passes about 200 lines or mixes concerns.
- Props are typed explicitly. No spreading unknown props onto DOM elements.
- No inline magic numbers or strings. Use named constants.
- No duplicated logic. Search for an existing helper before writing one.
- No dead code, commented-out code, `console.log`, or leftover TODOs without an issue reference.
- Prefer pure functions. Keep side effects in hooks/services.
- Always provide stable, unique `key`s (never array index for dynamic lists).
- Effects: correct dependency arrays, cleanup on unmount, no effect for derived state.
- Use early returns instead of deep nesting. Keep functions short and focused.
- Names describe intent (`calculateInvoiceTotal`, not `calc`). Booleans read as `isX`, `hasX`, `canX`.

## 6. Conditions, validation and error handling

- Validate **all** external data at the boundary (API responses, form input, URL params, storage, `postMessage`) with a schema validator, then use the typed result. Library choice needs approval (rule 1.4).
- Forms: validate before submit, show the error next to the field, disable duplicate submission, keep user input on failure.
- Handle every async state: loading, empty, error, success. Never leave a blank screen or an infinite spinner.
- Never swallow errors (`catch {}`). Catch, map to a typed `AppError`, show a safe message, and log without sensitive data.
- Use consistent API error handling with one shared client. No ad-hoc `fetch` calls scattered in components.
- Guard against `null`/`undefined` explicitly. Check array bounds when using indexed access.
- Use strict equality (`===`). No truthiness checks on numbers or strings where `0` or `''` are valid values.
- Destructive actions (delete, reverse, cancel) require confirmation and permission checks.

## 7. Security and multi-tenancy (Parts 5.3, 6, 31)

- **Never trust or send client-chosen `company_id` / `store_id` as authority.** Tenant and store context comes from the authenticated session; the backend validates it.
- Hiding a button is not security. Permission checks in the UI are for UX only; the backend enforces them.
- Permission-aware screens use one central permission helper/hook. No scattered role-name string checks.
- No tokens, passwords, API keys or personal data in `localStorage`, URLs, logs or error messages unless an approved auth design says so.
- Never use `dangerouslySetInnerHTML` without sanitization and approval.
- Never render unescaped user content. Treat all API data as untrusted.
- Do not expose sensitive fields (passwords, credentials) in any listing or type.

## 8. Offline-first (Part 23)

- Do not build online-only assumptions into screens. Every transaction screen must define its offline behavior (see the Offline Capability Matrix).
- A locally saved transaction must **never** be shown as synchronized or server-approved. Show distinct states: locally saved / pending / synced / failed / conflict.
- Generate transaction UUIDs on the client; never rely on server auto-increment IDs for offline records.
- Mutations that may be retried must be idempotent (send an idempotency key).
- Show online/offline status, last sync, pending/failed/conflict counts, and stale-data warnings in the shell.
- Do not mix Shopify integration code with the offline POS sync code (Parts 24, 34 rule 11).

## 9. UI, accessibility, i18n (Parts 27, 28)

- All user-facing text goes through the i18n layer. No hard-coded strings in components. English and Urdu are both required.
- Support RTL: use logical CSS properties (`margin-inline-start`, `padding-inline-end`), not left/right.
- Keyboard-first: all POS flows are fully operable by keyboard; barcode-scanner input must not lose focus or characters.
- Semantic HTML, labelled inputs, visible focus states, sufficient contrast, ARIA only where native elements are not enough.
- Reusable components for grids, searchable dropdowns, date pickers, and amount inputs. Do not rebuild them per screen.
- Grids support sorting, searching, filtering and pagination, and show totals where amounts appear.
- Calculated fields are read-only. Errors appear next to the relevant field.
- Responsive layout. The desktop POS is the primary target.

## 10. Performance

- Paginate or virtualize large lists. Never load unbounded data.
- Avoid unnecessary client JS. Lazy-load heavy, rarely used components with dynamic import.
- Memoize only with a measured reason. No premature `useMemo`/`useCallback`.
- Avoid request waterfalls. Fetch in parallel where independent.
- Keep bundle impact in mind before adding any import.

## 11. Testing (Part 32.3)

- Every feature ships with tests. A feature is **done** only when database, backend, UI and passing tests exist (root rule A4.16).
- Test: form validation, barcode scanning, keyboard navigation, permission behavior, invoice/money calculations, printing, offline states, sync status, error recovery.
- Test behavior the user sees, not implementation details.
- Money, tax, discount and quantity helpers need thorough unit tests, including rounding and edge cases.
- No fake data or mock behaviour in modules presented as complete (root rule A4.17).
- Test framework choice needs approval (rule 1.4).

## 12. Quality gate (must pass before saying "done")

Run and report the actual output of:

1. Type-check (`tsc --noEmit`)
2. Lint (zero errors, zero warnings)
3. Format check
4. Unit/component tests
5. Production build

If any step was not run or failed, say so plainly. Do not claim completion.

## 13. Output format for each task

End every task with:

- **Phase / Part** it belongs to.
- **Files** created or changed.
- **Requirement trace** (which Part/section it implements).
- **Offline behavior** of the change.
- **Tests** added and their results.
- **Open items**: any `[BUSINESS DECISION REQUIRED]`, `[ARCHITECTURE DECISION REQUIRED]` or `[PROPOSAL — NOT APPROVED]`.
