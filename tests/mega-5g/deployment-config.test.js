import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Pages workflow checks, builds, and publishes Mega 5G at its nested route', async () => {
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8')

  assert.match(
    workflow,
    /cache-dependency-path:\s*\|\s*\n\s*package-lock\.json\s*\n\s*mega-5g\/package-lock\.json/,
  )
  assert.match(workflow, /npm ci --prefix mega-5g/)
  assert.match(workflow, /npm run check --prefix mega-5g/)
  assert.match(workflow, /npm run build:pages --prefix mega-5g/)
  assert.match(workflow, /cp -R mega-5g\/dist _site\/mega-5g/)

  assert.match(workflow, /npm test/)
  assert.match(workflow, /npm run build:electricity/)
  assert.match(workflow, /cp -R dist\/electricity _site\/electricity/)
})

test('Mega 5G uses the repository nested base for builds and preloads', async () => {
  const [viteConfig, indexHtml, appPackageJson, appPackageLockJson] = await Promise.all([
    readFile('mega-5g/vite.config.ts', 'utf8'),
    readFile('mega-5g/index.html', 'utf8'),
    readFile('mega-5g/package.json', 'utf8'),
    readFile('mega-5g/package-lock.json', 'utf8'),
  ])
  const appPackage = JSON.parse(appPackageJson)
  const appPackageLock = JSON.parse(appPackageLockJson)

  assert.match(viteConfig, /github-pages'\s*\?\s*'\/bencode\/mega-5g\/'/)
  assert.match(indexHtml, /href="%BASE_URL%fonts\/MegaFonGraphikLC-Bold\.woff2"/)
  assert.match(indexHtml, /href="%BASE_URL%fonts\/MegaFonGraphikLC-Medium\.woff2"/)
  assert.match(indexHtml, /href="%BASE_URL%assets\/promo\/hero-orbit\.png"/)
  assert.match(
    indexHtml,
    /<div id="root">\s*<noscript>Для просмотра страницы включите JavaScript\.<\/noscript>\s*<\/div>/,
  )
  assert.match(appPackage.dependencies.react, /^\^19\./)
  assert.match(appPackage.dependencies['react-dom'], /^\^19\./)
  assert.ok(appPackage.dependencies.gsap)
  assert.equal(appPackage.scripts.check, 'npm run typecheck')
  assert.equal(appPackage.scripts['deploy:pages'], undefined)
  assert.equal(appPackage.devDependencies['gh-pages'], undefined)
  assert.equal(appPackageLock.packages[''].devDependencies?.['gh-pages'], undefined)
  assert.equal(appPackageLock.packages['node_modules/gh-pages'], undefined)
})

test('root test command includes Mega 5G without excluding electricity tests', async () => {
  const rootPackage = JSON.parse(await readFile('package.json', 'utf8'))

  assert.equal(rootPackage.scripts.test, 'node --test tests/*/*.test.js')
})

test('landing specification accurately identifies source-contract coverage', async () => {
  const specification = await readFile(
    'docs/superpowers/specs/2026-08-28-mega-5g-react17-landing-design.md',
    'utf8',
  )

  assert.doesNotMatch(specification, /Automated component coverage/)
  assert.match(specification, /Automated source-contract coverage/)
})
