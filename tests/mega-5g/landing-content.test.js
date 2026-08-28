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
