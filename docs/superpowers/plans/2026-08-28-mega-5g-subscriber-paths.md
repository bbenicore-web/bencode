# Mega 5G Subscriber Paths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the tariff block and split “Как подключить” into a preserved current-subscriber carousel plus a brand-aligned new-subscriber card with two accent actions.

**Architecture:** Keep the existing `ConnectSection` carousel logic intact, add a focused presentational `NewSubscriberSection`, and adjust only the support-section layout styles. A source-contract Node test protects section order, button semantics, and tariff removal.

**Tech Stack:** React 19, TypeScript, CSS, Node test runner, Vite

## Global Constraints

- Remove the entire “Тарифы с Мега 5G” block.
- Label the existing connection carousel “Для абонентов МегаФона” without changing its behavior.
- Place “Для новых абонентов” after the existing carousel.
- Render “Купить новую SIM” as a full-width solid bright-green button.
- Render “Перейти со своим номером” as a full-width solid black button.
- Both actions remain semantic demonstration buttons with no navigation.
- Reuse the supplied typography, spacing, radii, green accent, dark surfaces, and mobile content rail.
- Preserve all other copy, interactions, motion, the `767px`/`768px` gate, and nested Pages deployment.

---

### Task 1: Subscriber connection content and visual layout

**Files:**
- Create: `tests/mega-5g/landing-content.test.js`
- Create: `mega-5g/src/components/NewSubscriberSection.tsx`
- Modify: `mega-5g/src/components/MobileExperience.tsx`
- Modify: `mega-5g/src/components/ConnectSection.tsx`
- Modify: `mega-5g/src/styles.css`
- Delete: `mega-5g/src/components/TariffsSection.tsx`

**Interfaces:**
- `NewSubscriberSection(): JSX.Element` renders the new-subscriber card and both accent actions.
- `ConnectSection()` retains its GSAP carousel and renders the new card after it.

- [ ] **Step 1: Write the failing source-contract test**

Create `tests/mega-5g/landing-content.test.js`:

```js
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

test('landing removes tariffs and renders both subscriber paths in order', async () => {
  const mobile = await readFile('mega-5g/src/components/MobileExperience.tsx', 'utf8')
  const connect = await readFile('mega-5g/src/components/ConnectSection.tsx', 'utf8')
  const newcomer = await readFile('mega-5g/src/components/NewSubscriberSection.tsx', 'utf8')

  assert.doesNotMatch(mobile, /TariffsSection/)
  await assert.rejects(access('mega-5g/src/components/TariffsSection.tsx'))
  assert.match(connect, /Для абонентов МегаФона/)
  assert.match(connect, /<NewSubscriberSection \/>/)
  assert.match(newcomer, /Для новых абонентов/)
  assert.match(newcomer, /<button[^>]+new-subscriber-card__action--sim[^>]+type="button"/s)
  assert.match(newcomer, /Купить новую SIM/)
  assert.match(newcomer, /<button[^>]+new-subscriber-card__action--mnp[^>]+type="button"/s)
  assert.match(newcomer, /Перейти со своим номером/)
})

test('new subscriber actions use both approved solid accent treatments', async () => {
  const css = await readFile('mega-5g/src/styles.css', 'utf8')
  assert.match(css, /\.new-subscriber-card__action--sim\s*\{[^}]*background:\s*#00b956/s)
  assert.match(css, /\.new-subscriber-card__action--mnp\s*\{[^}]*background:\s*#0e0e0e/s)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/mega-5g/landing-content.test.js`

Expected: FAIL because `NewSubscriberSection.tsx` does not exist and tariffs are still rendered.

- [ ] **Step 3: Remove the tariff section from the mobile page**

In `mega-5g/src/components/MobileExperience.tsx`, remove the `TariffsSection` import and `<TariffsSection />` render. Delete `mega-5g/src/components/TariffsSection.tsx`.

- [ ] **Step 4: Add the new-subscriber component**

Create `mega-5g/src/components/NewSubscriberSection.tsx`:

```tsx
export function NewSubscriberSection() {
  return (
    <section className="new-subscriber" aria-labelledby="new-subscriber-title">
      <div className="new-subscriber-card">
        <p className="new-subscriber-card__eyebrow">Мега 5G с новым номером</p>
        <h3 id="new-subscriber-title">Для новых абонентов</h3>
        <p className="new-subscriber-card__copy">
          Подключитесь к МегаФону и выберите профиль Мега 5G под свой ритм жизни.
        </p>
        <div className="new-subscriber-card__actions" aria-label="Подключение новых абонентов">
          <button className="new-subscriber-card__action new-subscriber-card__action--sim" type="button">
            Купить новую SIM
          </button>
          <button className="new-subscriber-card__action new-subscriber-card__action--mnp" type="button">
            Перейти со своим номером
          </button>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Integrate both subscriber paths without changing carousel logic**

Import `NewSubscriberSection` into `ConnectSection.tsx`. Immediately after the main `<h2>` add:

```tsx
<h3 className="connect-audience-title">Для абонентов МегаФона</h3>
```

Render `<NewSubscriberSection />` after the closing `</div>` of `.connect-card` and before the FAQ.

- [ ] **Step 6: Apply the approved mobile visual system**

Remove the obsolete `.tariffs*` rules. Extend `.support-section` so the new content fits, move `.connect-card` below the audience label, place `.new-subscriber` after the carousel, and move `.faq` below the new card.

Add:

```css
.connect-audience-title {
  position: absolute;
  top: 92px;
  left: 12px;
  width: calc(100% - 24px);
  margin: 0;
  color: #333;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  text-align: center;
}

.new-subscriber {
  position: absolute;
  top: 555px;
  left: 12px;
  width: calc(100% - 24px);
}

.new-subscriber-card {
  padding: 24px 16px 16px;
  border-radius: 16px;
  background: #f2f4f7;
}

.new-subscriber-card__eyebrow {
  margin: 0 0 8px;
  color: #00a94f;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  text-transform: uppercase;
}

.new-subscriber-card h3 {
  margin: 0;
  color: #0e0e0e;
  font-size: 22px;
  font-weight: 600;
  line-height: 28px;
}

.new-subscriber-card__copy {
  margin: 12px 0 20px;
  color: #333;
  font-size: 15px;
  line-height: 20px;
}

.new-subscriber-card__actions {
  display: grid;
  gap: 8px;
}

.new-subscriber-card__action {
  min-height: 52px;
  padding: 14px 16px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  cursor: pointer;
}

.new-subscriber-card__action--sim {
  background: #00b956;
}

.new-subscriber-card__action--mnp {
  background: #0e0e0e;
}

.new-subscriber-card__action:focus-visible {
  outline: 2px solid #8f43ff;
  outline-offset: 2px;
}
```

Set `.support-section` to `height: 1360px`, `.connect-card` to `top: 130px`, and `.faq` to `top: 850px`. Preserve the existing fixed-size carousel internals.

- [ ] **Step 7: Run focused and complete automated verification**

Run:

```bash
node --test tests/mega-5g/landing-content.test.js
npm test
npm run check --prefix mega-5g
npm run build:pages --prefix mega-5g
```

Expected: all Node tests pass; TypeScript and both Vite builds succeed without errors.

- [ ] **Step 8: Commit the content change**

```bash
git add tests/mega-5g/landing-content.test.js mega-5g/src/components mega-5g/src/styles.css
git commit -m "feat: add separate subscriber connection paths"
```

---

### Task 2: Browser validation and walkthrough

**Files:**
- Create outside repository: `/opt/cursor/artifacts/mega-5g-subscriber-paths-demo.mp4`

**Interfaces:**
- Consumes: the Task 1 production build.
- Produces: visual proof of the approved mobile layout and unchanged desktop gate.

- [ ] **Step 1: Serve the Pages build in a persistent preview process**

Run: `npm run preview --prefix mega-5g -- --host 0.0.0.0`

Expected: the production preview is available locally.

- [ ] **Step 2: Verify the page at `390×844` and `320×700`**

Confirm the tariff block is absent; “Для абонентов МегаФона” precedes the unchanged connection carousel; “Для новых абонентов” follows it; the green and black buttons are fully visible, equal width, and do not navigate; FAQ and footer remain aligned; no horizontal overflow or console errors occur.

- [ ] **Step 3: Verify the responsive gate**

At `767×900`, confirm the mobile content remains visible. At `768×900`, confirm only the desktop notice is visible.

- [ ] **Step 4: Record the walkthrough**

Record the profiles-to-connection scroll, one existing-subscriber carousel interaction, both new-subscriber accent buttons, the FAQ, and the desktop notice. Save `/opt/cursor/artifacts/mega-5g-subscriber-paths-demo.mp4`.

