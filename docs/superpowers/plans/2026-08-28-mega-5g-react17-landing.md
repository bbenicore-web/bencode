# Mega 5G React 17 Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a faithful, self-contained React 17 copy of the provided Mega 5G mobile demo at `/bencode/mega-5g/` without changing the existing root pages.

**Architecture:** Build an isolated Vite/TypeScript application in `mega-5g/`, port the supplied component and asset structure, and adapt only the React entry point and nested deployment base. Keep GSAP motion local to the new app and extend the existing GitHub Pages artifact with `mega-5g/dist`.

**Tech Stack:** React 17.0.2, React DOM 17.0.2, TypeScript, Vite, GSAP, Vitest, jsdom, GitHub Actions

## Global Constraints

- The complete landing is visible at viewport widths up to and including `767px`.
- At `768px` and above, show the reference desktop notice instead of the landing.
- Preserve the supplied Russian copy, assets, section order, interactions, and motion.
- Use `/bencode/mega-5g/` as the production base URL.
- Keep the root site, resume, and electricity tracker unchanged.
- Do not load assets or code from the reference site at runtime.
- Respect `prefers-reduced-motion` and retain keyboard-accessible controls.

---

### Task 1: Isolated React 17 project and asset URL contract

**Files:**
- Create: `mega-5g/package.json`
- Create: `mega-5g/package-lock.json`
- Create: `mega-5g/tsconfig.json`
- Create: `mega-5g/vite.config.ts`
- Create: `mega-5g/src/vite-env.d.ts`
- Create: `mega-5g/src/publicAsset.test.ts`
- Create: `mega-5g/src/publicAsset.ts`

**Interfaces:**
- Produces: `publicAsset(path: string, base?: string): string`
- Produces: `npm run test`, `npm run typecheck`, `npm run build:pages` inside `mega-5g/`

- [ ] **Step 1: Create the package and test configuration**

Run:

```bash
mkdir mega-5g
cd mega-5g
npm init -y
npm install react@17.0.2 react-dom@17.0.2 @gsap/react gsap
npm install --save-dev vite typescript vitest jsdom @types/react@17 @types/react-dom@17 @types/node @vitejs/plugin-react
npm pkg set private=true --json
npm pkg set type=module
npm pkg set scripts.dev="vite" scripts.test="vitest run" scripts.typecheck="tsc --noEmit" scripts.build="npm run typecheck && vite build" scripts.build:pages="npm run typecheck && vite build --mode github-pages"
```

Create `mega-5g/vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? '/bencode/mega-5g/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
}))
```

Create `mega-5g/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals"]
  },
  "include": ["src", "vite.config.ts"]
}
```

Create `mega-5g/src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 2: Write the failing asset-path test**

Create `mega-5g/src/publicAsset.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { publicAsset } from './publicAsset'

describe('publicAsset', () => {
  it('joins nested GitHub Pages base and strips leading slashes', () => {
    expect(publicAsset('/assets/promo/hero-orbit.png', '/bencode/mega-5g/'))
      .toBe('/bencode/mega-5g/assets/promo/hero-orbit.png')
  })
})
```

- [ ] **Step 3: Run the test and verify RED**

Run: `npm run test --prefix mega-5g -- src/publicAsset.test.ts`

Expected: FAIL because `./publicAsset` does not exist.

- [ ] **Step 4: Implement the base-aware helper**

Create `mega-5g/src/publicAsset.ts`:

```ts
export function publicAsset(path: string, base = import.meta.env.BASE_URL) {
  return `${base.replace(/\/?$/, '/')}${path.replace(/^\/+/, '')}`
}
```

- [ ] **Step 5: Run the test and verify GREEN**

Run: `npm run test --prefix mega-5g -- src/publicAsset.test.ts`

Expected: one passing test.

- [ ] **Step 6: Commit the project contract**

```bash
git add mega-5g/package.json mega-5g/package-lock.json mega-5g/tsconfig.json mega-5g/vite.config.ts mega-5g/src/vite-env.d.ts mega-5g/src/publicAsset.ts mega-5g/src/publicAsset.test.ts
git commit -m "build: scaffold Mega 5G React 17 app"
```

---

### Task 2: Page hierarchy, React 17 entry point, and navigation rules

**Files:**
- Create: `mega-5g/index.html`
- Create: `mega-5g/src/main.tsx`
- Create: `mega-5g/src/App.tsx`
- Create: `mega-5g/src/components/MobileExperience.tsx`
- Create: `mega-5g/src/components/PromoSection.tsx`
- Create: `mega-5g/src/components/DetailsSection.tsx`
- Create: `mega-5g/src/components/ExperienceCarousel.tsx`
- Create: `mega-5g/src/components/ProductsSection.tsx`
- Create: `mega-5g/src/components/TariffsSection.tsx`
- Create: `mega-5g/src/components/ConnectSection.tsx`
- Create: `mega-5g/src/components/FooterSection.tsx`
- Create: `mega-5g/src/navigation.ts`
- Create: `mega-5g/src/App.test.tsx`
- Create: `mega-5g/src/navigation.test.ts`

**Interfaces:**
- Consumes: `publicAsset(path, base?)`
- Produces: `App`, `MobileExperience`, and the seven named section components
- Produces: `boundedPageForKey(current, key, max): number` and `wrappedPage(index, count): number`

- [ ] **Step 1: Write failing structure and navigation tests**

Create `mega-5g/src/App.test.tsx`:

```tsx
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@gsap/react', () => ({ useGSAP: () => undefined }))
vi.mock('gsap', () => ({ default: { registerPlugin: () => undefined } }))
vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { config: () => undefined, refresh: () => undefined },
}))

let App: typeof import('./App').default

beforeAll(async () => {
  App = (await import('./App')).default
})

describe('Mega 5G landing', () => {
  it('renders the complete mobile section order and exact lead copy', () => {
    const html = renderToStaticMarkup(<App />)
    const expectedOrder = [
      'class="promo',
      'id="details"',
      'id="profiles"',
      'id="tariffs"',
      'Как подключить',
      'class="site-footer"',
    ]
    let previous = -1
    for (const marker of expectedOrder) {
      const next = html.indexOf(marker)
      expect(next).toBeGreaterThan(previous)
      previous = next
    }
    expect(html).toContain('Скоростной интернет, который настроен под вашу жизнь')
    expect(html).toContain('Выберите свой Мега 5G')
  })

  it('includes the desktop-only notice and accessible carousel controls', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Откройте страницу на смартфоне')
    expect(html).toContain('Преимущества Мега 5G')
    expect(html).toContain('Как подключить: шаг 1 из 3')
  })
})
```

Create `mega-5g/src/navigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { boundedPageForKey, wrappedPage } from './navigation'

describe('carousel navigation', () => {
  it('bounds experience keyboard navigation', () => {
    expect(boundedPageForKey(0, 'ArrowLeft', 2)).toBe(0)
    expect(boundedPageForKey(0, 'End', 2)).toBe(2)
    expect(boundedPageForKey(2, 'ArrowRight', 2)).toBe(2)
  })

  it('wraps connection steps in either direction', () => {
    expect(wrappedPage(-1, 3)).toBe(2)
    expect(wrappedPage(3, 3)).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm run test --prefix mega-5g -- src/App.test.tsx src/navigation.test.ts`

Expected: FAIL because `App.tsx` and `navigation.ts` do not exist.

- [ ] **Step 3: Port the supplied components and implement React 17 mounting**

Clone the user-provided source outside the repository and copy only source component files:

```bash
git clone --depth 1 https://github.com/zhenchur/mega-5g-mobile-demo.git /tmp/mega-5g-mobile-demo
cp /tmp/mega-5g-mobile-demo/src/App.tsx mega-5g/src/App.tsx
mkdir -p mega-5g/src/components
cp /tmp/mega-5g-mobile-demo/src/components/*.tsx mega-5g/src/components/
```

Create `mega-5g/src/main.tsx` with the React 17 API:

```tsx
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import './styles.css'

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
)
```

Create `mega-5g/src/navigation.ts`:

```ts
export function boundedPageForKey(current: number, key: string, max: number) {
  if (key === 'Home') return 0
  if (key === 'End') return max
  if (key === 'ArrowLeft') return Math.max(0, current - 1)
  if (key === 'ArrowRight') return Math.min(max, current + 1)
  return current
}

export function wrappedPage(index: number, count: number) {
  return ((index % count) + count) % count
}
```

Replace the local clamping and wrapping expressions in `ExperienceCarousel.tsx` and `ConnectSection.tsx` with these helpers while preserving the original gesture and GSAP behavior.

Remove the `fetchPriority="high"` JSX property from `PromoSection.tsx`; React 17's DOM types do not expose it, and the equivalent high-priority preload remains in `index.html`.

Create `mega-5g/index.html`:

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#eff0f4" />
    <meta name="description" content="Мега 5G — скоростной интернет, настроенный под вашу жизнь" />
    <link rel="preload" as="font" href="%BASE_URL%fonts/MegaFonGraphikLC-Bold.woff2" type="font/woff2" crossorigin />
    <link rel="preload" as="font" href="%BASE_URL%fonts/MegaFonGraphikLC-Medium.woff2" type="font/woff2" crossorigin />
    <link rel="preload" as="image" href="%BASE_URL%assets/promo/hero-orbit.png" />
    <title>Мега 5G</title>
  </head>
  <body>
    <div id="root">
      <noscript>Для просмотра демо Мега 5G включите JavaScript.</noscript>
    </div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Run structure and navigation tests and verify GREEN**

Run: `npm run test --prefix mega-5g -- src/App.test.tsx src/navigation.test.ts`

Expected: all four tests pass.

- [ ] **Step 5: Commit the component implementation**

```bash
git add mega-5g/index.html mega-5g/src
git commit -m "feat: port Mega 5G landing to React 17"
```

---

### Task 3: Visual assets, responsive styles, and production fidelity

**Files:**
- Create: `mega-5g/public/assets/**`
- Create: `mega-5g/public/fonts/**`
- Create: `mega-5g/src/styles.css`
- Create: `mega-5g/src/assets.test.ts`
- Modify: `mega-5g/src/styles.css`

**Interfaces:**
- Consumes: component class names and `publicAsset`
- Produces: self-contained visual output with the `767px`/`768px` breakpoint

- [ ] **Step 1: Write the failing asset and responsive-CSS test**

Create `mega-5g/src/assets.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('visual bundle', () => {
  it.each([
    'public/fonts/MegaFonGraphikLC-Bold.woff2',
    'public/assets/promo/hero-orbit.png',
    'public/assets/features/priority-3d.webp',
    'public/assets/products/profile-kino.webp',
    'public/assets/connect/phone-bezel.webp',
    'public/assets/footer/qr.png',
  ])('contains %s', (path) => {
    expect(existsSync(resolve(root, path))).toBe(true)
  })

  it('uses the exact mobile/desktop boundary and reduced-motion fallback', () => {
    const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8')
    expect(css).toContain('@media (min-width: 768px)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toMatch(/\.mobile-experience\s*\{[\s\S]*overflow-x:\s*clip/)
  })
})
```

- [ ] **Step 2: Run the visual bundle test and verify RED**

Run: `npm run test --prefix mega-5g -- src/assets.test.ts`

Expected: FAIL because the assets and stylesheet do not exist.

- [ ] **Step 3: Copy the supplied local assets and stylesheet**

Run:

```bash
mkdir -p mega-5g/public
cp -R /tmp/mega-5g-mobile-demo/public/assets mega-5g/public/assets
cp -R /tmp/mega-5g-mobile-demo/public/fonts mega-5g/public/fonts
cp /tmp/mega-5g-mobile-demo/src/styles.css mega-5g/src/styles.css
```

Retain the supplied `@font-face`, mobile layout, root-absolute public asset URLs, `@media (max-width: 340px)`, `@media (prefers-reduced-motion: reduce)`, and `@media (min-width: 768px)` blocks. Vite rewrites root-absolute public URLs against the configured production base; confirm this in the built CSS before committing.

- [ ] **Step 4: Verify assets, tests, type checking, and production build**

Run:

```bash
npm run test --prefix mega-5g
npm run typecheck --prefix mega-5g
npm run build:pages --prefix mega-5g
```

Expected: tests and type checking pass; `mega-5g/dist/index.html` references `/bencode/mega-5g/assets/...`; no build warnings or missing assets.

- [ ] **Step 5: Commit visual fidelity**

```bash
git add mega-5g/public mega-5g/src/styles.css mega-5g/src/assets.test.ts
git commit -m "feat: add Mega 5G visuals and responsive motion"
```

---

### Task 4: Preserve the multi-site deployment and publish the nested app

**Files:**
- Create: `tests/mega-5g/deployment-config.test.js`
- Modify: `package.json`
- Modify: `.github/workflows/pages.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: `mega-5g` scripts and `mega-5g/dist`
- Produces: `_site/mega-5g/index.html` in the Pages artifact

- [ ] **Step 1: Write the failing deployment contract test**

Create `tests/mega-5g/deployment-config.test.js`:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Pages workflow builds and publishes Mega 5G under its nested route', async () => {
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8')
  assert.match(workflow, /npm ci --prefix mega-5g/)
  assert.match(workflow, /npm run test --prefix mega-5g/)
  assert.match(workflow, /npm run build:pages --prefix mega-5g/)
  assert.match(workflow, /cp -R mega-5g\/dist _site\/mega-5g/)
})
```

Extend the root test script in `package.json`:

```json
"test": "node --test tests/*/*.test.js"
```

- [ ] **Step 2: Run the deployment test and verify RED**

Run: `node --test tests/mega-5g/deployment-config.test.js`

Expected: FAIL because the workflow does not contain the Mega 5G build.

- [ ] **Step 3: Add the nested app to the existing Pages workflow**

Add after the root dependency installation:

```yaml
      - name: Install Mega 5G dependencies
        run: npm ci --prefix mega-5g
```

Add after the existing test step:

```yaml
      - name: Test Mega 5G landing
        run: npm run test --prefix mega-5g
```

Add after the electricity build:

```yaml
      - name: Build Mega 5G landing
        run: npm run build:pages --prefix mega-5g
```

Add to `Prepare site files`:

```yaml
          cp -R mega-5g/dist _site/mega-5g
```

Append to the online links in `README.md`:

```md
**Мега 5G:** https://bbenicore-web.github.io/bencode/mega-5g/
```

- [ ] **Step 4: Verify the full repository**

Run:

```bash
npm test
npm run build:electricity
npm run test --prefix mega-5g
npm run build:pages --prefix mega-5g
rm -rf /tmp/mega-5g-site-check
mkdir -p /tmp/mega-5g-site-check
cp -R mega-5g/dist /tmp/mega-5g-site-check/mega-5g
test -f /tmp/mega-5g-site-check/mega-5g/index.html
```

Expected: all root and nested tests pass, both production builds succeed, and the nested index assertion exits `0`.

- [ ] **Step 5: Commit deployment support**

```bash
git add package.json .github/workflows/pages.yml README.md tests/mega-5g/deployment-config.test.js
git commit -m "ci: publish Mega 5G landing on GitHub Pages"
```

---

### Task 5: Browser verification and walkthrough evidence

**Files:**
- Modify only if browser verification reveals a reproducible defect: relevant file under `mega-5g/`
- Create outside repository: `/opt/cursor/artifacts/mega-5g-react17-demo.mp4`

**Interfaces:**
- Consumes: production build and deployment base
- Produces: verified mobile and desktop behavior plus walkthrough evidence

- [ ] **Step 1: Start the production preview with the nested base**

Run in a persistent terminal:

```bash
npm run preview --prefix mega-5g -- --host 0.0.0.0
```

Expected: Vite serves the production build and prints the local preview URL.

- [ ] **Step 2: Verify mobile layouts and interactions**

Using browser automation, inspect at `320×700`, `390×844`, and `430×932`:

- header, hero, details, profiles, tariffs, connection instructions, FAQ, and footer all render;
- hero CTA scrolls to `#profiles`;
- benefits and connection carousels respond to swipe and keyboard controls;
- profile stack and scroll motion match the supplied demo;
- no horizontal page overflow exists;
- browser console and network panel contain no errors or 404 responses.

- [ ] **Step 3: Verify the breakpoint boundary**

Inspect at `767×900`: the complete landing is visible and the desktop notice is hidden.

Inspect at `768×900` and `1440×900`: the mobile landing is hidden and the desktop notice reads `Откройте страницу на смартфоне`.

- [ ] **Step 4: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce`, reload at `390×844`, and confirm all content and carousel controls remain usable without entrance or scroll-linked motion.

- [ ] **Step 5: Record the walkthrough**

Follow the walkthrough-artifact rubric and record a concise mobile scroll-through with one carousel interaction, followed by the desktop notice. Save it as:

`/opt/cursor/artifacts/mega-5g-react17-demo.mp4`

- [ ] **Step 6: Fix and reverify any observed defect**

For each defect, first add a focused failing Vitest or Node test, run it to confirm RED, apply the minimal fix, rerun the focused test, then rerun all commands from Task 4 Step 4.

- [ ] **Step 7: Commit any verification fixes**

If files changed:

```bash
git add mega-5g tests package.json .github/workflows/pages.yml README.md
git commit -m "fix: polish Mega 5G landing verification"
```

