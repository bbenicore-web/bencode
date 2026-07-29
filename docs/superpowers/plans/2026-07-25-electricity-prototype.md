# Electricity Tracker Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web prototype at `/electricity/` that authenticates users, synchronizes two-tariff meter readings through Supabase, calculates charges, tracks payment status, and preserves the existing site.

**Architecture:** A Vite-built vanilla JavaScript client keeps domain calculations independent from Supabase and the DOM. Supabase Auth and PostgreSQL provide email/password sessions and per-user synchronized records; an injected repository boundary makes the client testable without a live cloud project. GitHub Pages publishes the built `/electricity/` bundle alongside the existing static pages.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, Vite, Node test runner, jsdom, `@supabase/supabase-js`, Supabase Auth/PostgreSQL/RLS, GitHub Pages.

## Global Constraints

- Keep the existing CPO and resume pages unchanged; publish the new app only at `/electricity/`.
- Use separate positive tariffs for Т1 and Т2.
- Treat the first chronological reading as a zero-charge baseline.
- Derive consumption and charges from adjacent readings; never persist derived totals.
- Recalculate all later periods after editing, deleting, or reordering a reading.
- Store one reading per user per date and reject readings that break chronological monotonicity.
- Display money in Russian rubles with two fractional digits.
- Authenticate with email and password and restore the Supabase session on reopen.
- Enforce per-user access with Row Level Security; never expose a Supabase service-role key.
- Preserve entered form values after network failures.
- Implement production behavior through failing tests first.

---

## Planned File Structure

- `package.json`, `package-lock.json` — reproducible test and build tooling.
- `.gitignore` — ignore generated output while tracking the lockfile.
- `electricity/index.html` — application shell and accessible page landmarks.
- `electricity/styles.css` — mobile-first visual system and responsive states.
- `electricity/vite.config.js` — isolated `/electricity/` build.
- `electricity/js/domain.js` — sorting, validation, period calculation, debt total, formatting.
- `electricity/js/config.js` — validated Vite/Supabase public configuration.
- `electricity/js/supabase.js` — Supabase client creation and Russian error mapping.
- `electricity/js/auth-service.js` — session, registration, login, logout.
- `electricity/js/readings-repository.js` — CRUD boundary for `electricity_readings`.
- `electricity/js/app.js` — application state and event orchestration.
- `electricity/js/view.js` — DOM rendering for auth, form, history, loading, and errors.
- `electricity/js/main.js` — production composition root.
- `electricity/supabase/20260725000000_create_electricity_readings.sql` — table, indexes, trigger, and RLS policies.
- `tests/electricity/domain.test.js` — calculation and validation tests.
- `tests/electricity/readings-repository.test.js` — Supabase adapter contract tests.
- `tests/electricity/auth-service.test.js` — authentication boundary tests.
- `tests/electricity/app.test.js` — jsdom user-flow tests.
- `README.md` — local run, Supabase setup, SQL migration, and deployment secrets.
- `.github/workflows/pages.yml` — test, build, and publish the new route without deleting design docs.

### Shared interfaces

```js
// Persisted reading
{
  id: "uuid",
  user_id: "uuid",
  reading_date: "2026-07-25",
  t1_reading: 7425,
  t2_reading: 3376,
  t1_rate: 6.43,
  t2_rate: 2.71,
  is_paid: false,
  created_at: "2026-07-25T10:00:00.000Z",
  updated_at: "2026-07-25T10:00:00.000Z"
}

// Calculated period returned by calculatePeriods()
{
  ...reading,
  isBaseline: false,
  t1Usage: 436,
  t2Usage: 240,
  t1Cost: 2803.48,
  t2Cost: 650.40,
  totalCost: 3453.88
}
```

---

### Task 1: Domain calculations and validation

**Files:**
- Modify: `.gitignore`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `electricity/js/domain.js`
- Test: `tests/electricity/domain.test.js`

**Interfaces:**
- Produces: `calculatePeriods(readings)`, `calculateUnpaidTotal(periods)`, `validateReading(candidate, readings, editingId)`, `formatRubles(value)`.
- Consumes: persisted reading shape from “Shared interfaces”.

- [ ] **Step 1: Install reproducible tooling**

Run:

```bash
npm init -y
npm install @supabase/supabase-js
npm install --save-dev vite jsdom
```

Update `package.json` scripts to:

```json
{
  "type": "module",
  "scripts": {
    "test": "node --test tests/electricity/*.test.js",
    "build:electricity": "vite build --config electricity/vite.config.js",
    "dev:electricity": "vite --config electricity/vite.config.js"
  }
}
```

Remove `package-lock.json` from `.gitignore` and add `dist/`.

- [ ] **Step 2: Write failing calculation tests**

Create tests proving that the first sorted record has zero usage, the sample deltas are `436` and `240`, separate rates produce separate costs, unpaid totals exclude paid periods, and input order does not affect results:

```js
const periods = calculatePeriods([
  reading({ id: "new", reading_date: "2025-09-15", t1_reading: 7425, t2_reading: 3376, t1_rate: 6.43, t2_rate: 2.71 }),
  reading({ id: "old", reading_date: "2025-08-15", t1_reading: 6989, t2_reading: 3136 })
]);

assert.equal(periods[0].isBaseline, true);
assert.deepEqual(
  pick(periods[1], ["t1Usage", "t2Usage", "t1Cost", "t2Cost", "totalCost"]),
  { t1Usage: 436, t2Usage: 240, t1Cost: 2803.48, t2Cost: 650.4, totalCost: 3453.88 }
);
```

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test tests/electricity/domain.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `electricity/js/domain.js`.

- [ ] **Step 4: Implement minimal calculation functions**

Implement stable date sorting, two-decimal monetary rounding, zeroed baseline values, adjacent usage, paid filtering, and `Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" })`.

- [ ] **Step 5: Add failing validation tests**

Cover missing date, negative readings, zero/negative rates, duplicate dates, a value below the previous record, a value above the next record during editing, and a valid insertion between two records. Assert an object keyed by `reading_date`, `t1_reading`, `t2_reading`, `t1_rate`, and `t2_rate`.

- [ ] **Step 6: Run validation tests and verify RED**

Run: `node --test tests/electricity/domain.test.js`

Expected: FAIL because `validateReading` does not yet return the required field errors.

- [ ] **Step 7: Implement neighbor-aware validation**

Filter out `editingId`, sort candidate plus remaining records by date, locate immediate neighbors, and return `{}` only when date uniqueness, nonnegative readings, positive rates, and both monotonic bounds hold.

- [ ] **Step 8: Run domain tests and commit**

Run: `node --test tests/electricity/domain.test.js`

Expected: all domain tests PASS with no warnings.

```bash
git add .gitignore package.json package-lock.json electricity/js/domain.js tests/electricity/domain.test.js
git commit -m "Add electricity calculation domain"
```

---

### Task 2: Secure Supabase schema and readings repository

**Files:**
- Create: `electricity/supabase/20260725000000_create_electricity_readings.sql`
- Create: `electricity/js/readings-repository.js`
- Test: `tests/electricity/readings-repository.test.js`

**Interfaces:**
- Produces: `createReadingsRepository(client)` with `list(userId)`, `create(userId, input)`, `update(userId, id, input)`, `remove(userId, id)`, and `setPaid(userId, id, isPaid)`.
- Returns: persisted reading objects; throws the Supabase error unchanged for the application error mapper.

- [ ] **Step 1: Write failing repository tests**

Use a purpose-built fluent test client and assert exact table/operation behavior:

```js
const repository = createReadingsRepository(fakeClient);
await repository.create("user-1", {
  reading_date: "2025-09-15",
  t1_reading: 7425,
  t2_reading: 3376,
  t1_rate: 6.43,
  t2_rate: 2.71
});

assert.deepEqual(fakeClient.lastInsert, {
  user_id: "user-1",
  reading_date: "2025-09-15",
  t1_reading: 7425,
  t2_reading: 3376,
  t1_rate: 6.43,
  t2_rate: 2.71,
  is_paid: false
});
```

Also assert date-ascending `list`, ID-scoped `update`/`remove`, status-only `setPaid`, and error propagation.

- [ ] **Step 2: Run repository tests and verify RED**

Run: `node --test tests/electricity/readings-repository.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `readings-repository.js`.

- [ ] **Step 3: Implement the repository adapter**

Use `client.from("electricity_readings")`, require both `.eq("user_id", userId)` and `.eq("id", id)` for mutations, select the changed row with `.select().single()`, and order list results by `reading_date` ascending.

- [ ] **Step 4: Run repository tests and verify GREEN**

Run: `node --test tests/electricity/readings-repository.test.js`

Expected: all repository tests PASS.

- [ ] **Step 5: Add the database migration**

Create SQL that:

```sql
create table public.electricity_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_date date not null,
  t1_reading numeric(14,3) not null check (t1_reading >= 0),
  t2_reading numeric(14,3) not null check (t2_reading >= 0),
  t1_rate numeric(10,4) not null check (t1_rate > 0),
  t2_rate numeric(10,4) not null check (t2_rate > 0),
  is_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reading_date)
);

alter table public.electricity_readings enable row level security;
```

Add four policies using `(select auth.uid()) = user_id`, plus a `before update` trigger that refreshes `updated_at`.

- [ ] **Step 6: Commit**

```bash
git add electricity/js/readings-repository.js electricity/supabase tests/electricity/readings-repository.test.js
git commit -m "Add secure readings persistence"
```

---

### Task 3: Supabase configuration and email/password authentication

**Files:**
- Create: `electricity/js/config.js`
- Create: `electricity/js/supabase.js`
- Create: `electricity/js/auth-service.js`
- Test: `tests/electricity/auth-service.test.js`

**Interfaces:**
- Produces: `getSupabaseConfig(env)`, `createSupabaseClient(config)`, `toUserMessage(error)`.
- Produces: `createAuthService(client)` with `getSession()`, `signUp(email, password)`, `signIn(email, password)`, `signOut()`, and `onAuthStateChange(callback)`.

- [ ] **Step 1: Write failing configuration and auth tests**

Assert that missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` yields the Russian setup message, malformed email/password requests are passed to Supabase unchanged, sessions are returned from `auth.getSession()`, subscriptions are returned for cleanup, and common invalid-credentials/network errors map to Russian copy.

- [ ] **Step 2: Run auth tests and verify RED**

Run: `node --test tests/electricity/auth-service.test.js`

Expected: FAIL because the auth/config modules do not exist.

- [ ] **Step 3: Implement configuration, client, and auth service**

Read only `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`; reject missing values before creating the client. Wrap Supabase auth methods without swallowing errors. Map `Invalid login credentials`, duplicate-user, weak-password, and fetch/network failures while retaining a safe generic fallback.

- [ ] **Step 4: Run auth tests and commit**

Run: `node --test tests/electricity/auth-service.test.js`

Expected: all auth tests PASS.

```bash
git add electricity/js/config.js electricity/js/supabase.js electricity/js/auth-service.js tests/electricity/auth-service.test.js
git commit -m "Add Supabase authentication boundary"
```

---

### Task 4: Accessible authentication shell and application state

**Files:**
- Create: `electricity/index.html`
- Create: `electricity/js/app.js`
- Create: `electricity/js/view.js`
- Test: `tests/electricity/app.test.js`

**Interfaces:**
- Consumes: auth service and readings repository from Tasks 2–3.
- Produces: `createApp({ auth, readings, root, confirm, today })` with `start()` and `destroy()`.
- Produces: `createView(root)` with render and field-error methods used only by `app.js`.

- [ ] **Step 1: Write failing jsdom auth-flow tests**

Create a root fixture and injected fake services. Assert initial loading, signed-out login/register controls, disabled submit while pending, retained email after an error, a Russian error alert, signed-in navigation, restored sessions, logout, and auth-listener cleanup.

- [ ] **Step 2: Run app tests and verify RED**

Run: `node --test tests/electricity/app.test.js`

Expected: FAIL because `createApp` and the application shell do not exist.

- [ ] **Step 3: Add semantic HTML and minimal auth rendering**

Create an app root with a skip link, `aria-live="polite"` notifications, proper email/password labels, separate “Войти” and “Зарегистрироваться” actions, and a loading state. Implement the smallest controller/view code that passes the auth-flow tests.

- [ ] **Step 4: Run auth-flow tests and verify GREEN**

Run: `node --test tests/electricity/app.test.js`

Expected: auth-flow tests PASS.

- [ ] **Step 5: Commit**

```bash
git add electricity/index.html electricity/js/app.js electricity/js/view.js tests/electricity/app.test.js
git commit -m "Add electricity app authentication shell"
```

---

### Task 5: Reading form, live calculation, history, and CRUD flows

**Files:**
- Modify: `electricity/js/app.js`
- Modify: `electricity/js/view.js`
- Modify: `tests/electricity/app.test.js`

**Interfaces:**
- Consumes: all Task 1 domain exports and Task 2 repository methods.
- Produces: two-tab signed-in UI with create, edit, delete, paid-toggle, debt summary, and retryable failures.

- [ ] **Step 1: Write failing baseline and preview tests**

Assert that an empty history explains the baseline rule; the form defaults to `today()`; the first valid record previews `0,00 ₽`; a second record previews the exact Т1/Т2 usage and costs; invalid values create field-level messages and do not call the repository.

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `node --test tests/electricity/app.test.js`

Expected: FAIL because the signed-in reading UI is not rendered.

- [ ] **Step 3: Implement form and live preview**

Render numeric inputs with `inputmode="decimal"`, preserve raw form strings, normalize comma decimals before validation, call `validateReading`, and render calculated preview values from `calculatePeriods`.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `node --test tests/electricity/app.test.js`

Expected: baseline, preview, and validation tests PASS.

- [ ] **Step 5: Write failing history and mutation tests**

Assert newest-first cards, debt excluding paid periods, separate Т1/Т2 lines, create success/reset, create failure/value retention, edit/recalculation, confirmed deletion, cancelled deletion, paid toggle, loading controls, and expired-session return to auth.

- [ ] **Step 6: Run mutation tests and verify RED**

Run: `node --test tests/electricity/app.test.js`

Expected: FAIL on the first unimplemented history mutation.

- [ ] **Step 7: Implement history and mutations**

Keep canonical readings in app state, derive periods on every render, update state only after successful repository responses, preserve form state on failures, require `confirm("Удалить эту запись?")`, and refetch after ambiguous session/network responses.

- [ ] **Step 8: Run all app tests and commit**

Run: `node --test tests/electricity/app.test.js`

Expected: all app tests PASS with no warnings.

```bash
git add electricity/js/app.js electricity/js/view.js tests/electricity/app.test.js
git commit -m "Add electricity readings workflow"
```

---

### Task 6: Mobile styling and production composition

**Files:**
- Create: `electricity/styles.css`
- Create: `electricity/js/main.js`
- Create: `electricity/vite.config.js`
- Modify: `electricity/index.html`
- Modify: `tests/electricity/app.test.js`

**Interfaces:**
- Consumes: validated config, Supabase client, auth service, readings repository, and application controller.
- Produces: runnable mobile UI and production entry point.

- [ ] **Step 1: Add failing composition smoke test**

Extract `bootstrap({ env, root })` from `main.js` and assert it rejects missing configuration with the setup screen instead of an uncaught exception.

- [ ] **Step 2: Run the smoke test and verify RED**

Run: `node --test tests/electricity/app.test.js`

Expected: FAIL because `main.js` does not exist.

- [ ] **Step 3: Implement composition and Vite config**

Set Vite `root` to `electricity`, `base` to `"./"`, and `build.outDir` to `../dist/electricity`. Compose the real Supabase services in `main.js` and render a Russian setup message when public environment values are absent.

- [ ] **Step 4: Implement mobile-first styles**

Define a light palette, 44px minimum controls, safe-area padding, sticky bottom navigation, two-column tariff/reading groups where width permits, one-column cards on narrow screens, visible focus rings, error/success colors with text labels, skeleton/loading states, and a centered desktop phone-width layout.

- [ ] **Step 5: Run tests and production build**

Run:

```bash
npm test
VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_ANON_KEY=test-public-anon-key npm run build:electricity
```

Expected: all tests PASS; Vite writes `dist/electricity/index.html` and hashed assets without warnings.

- [ ] **Step 6: Commit**

```bash
git add electricity/index.html electricity/styles.css electricity/vite.config.js electricity/js/main.js tests/electricity/app.test.js
git commit -m "Style and bundle electricity prototype"
```

---

### Task 7: Deployment, setup documentation, and end-to-end verification

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: `npm test`, `npm run build:electricity`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.
- Produces: published `/electricity/` route and reproducible Supabase setup instructions.

- [ ] **Step 1: Update deployment workflow**

Add `actions/setup-node@v4`, `npm ci`, `npm test`, and the electricity build. Pass repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the matching Vite variables, then copy `dist/electricity` to `_site/electricity`.

Remove the “Sync docs folder on main” step because it deletes `docs/superpowers`; publication already uses the `gh-pages` branch.

- [ ] **Step 2: Document exact Supabase setup**

Add commands and dashboard steps to:

1. create a Supabase project;
2. run `electricity/supabase/20260725000000_create_electricity_readings.sql` in SQL Editor;
3. enable email/password authentication;
4. set local `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`;
5. add GitHub Actions secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY`;
6. run `npm ci`, `npm test`, `npm run dev:electricity`, and `npm run build:electricity`.

- [ ] **Step 3: Run final automated verification**

Run:

```bash
npm ci
npm test
VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_ANON_KEY=test-public-anon-key npm run build:electricity
git diff --check
```

Expected: clean install succeeds, every test passes, production build succeeds, and `git diff --check` prints nothing.

- [ ] **Step 4: Commit and push the pre-manual-test revision**

```bash
git add .github/workflows/pages.yml README.md
git commit -m "Deploy electricity tracker to GitHub Pages"
git push -u origin cursor/electricity-prototype-10c4
```

- [ ] **Step 5: Perform mobile manual verification**

With a configured test Supabase project, use a 412×915 viewport and verify:

1. register a test account and sign in;
2. save the first baseline reading;
3. save a second reading using `7425 / 3376` after a prior `6989 / 3136`;
4. confirm usage `436 / 240` and the tariff-specific total;
5. mark the second period paid and confirm debt becomes `0,00 ₽`;
6. edit a prior reading and confirm later periods recalculate;
7. cancel deletion once, then confirm deletion;
8. sign out, sign in again, and confirm cloud history reloads;
9. sign in on a second browser context and confirm the same data appears.

Record only the successful end-to-end walkthrough and save one final mobile screenshot.

- [ ] **Step 6: Run verification-before-completion and commit any test fixes**

Re-run `npm test`, `npm run build:electricity`, and `git diff --check`. If manual testing required code changes, commit each logical fix and push again before updating the pull request.
