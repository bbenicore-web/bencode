import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('result slide counts 48 solved MNP barriers from CEO slides 9-13 and mentions A/B tests', async () => {
  const inventory = JSON.parse(await readFile('docs/slides/barriers.json', 'utf8'))
  const html = await readFile('docs/slides/result-before-after.html', 'utf8')

  const fromSlides = inventory.sources.slides_9_13.groups.reduce((sum, group) => sum + group.count, 0)

  assert.equal(inventory.audit_total, 68)
  assert.equal(inventory.total_solved, 48)
  assert.equal(inventory.critical_solved, 34)
  assert.equal(fromSlides, 48)
  assert.equal(inventory.sources.slides_9_13.count, 48)
  assert.equal(inventory.yes_barriers.length, 48)
  assert.equal(inventory.no_barriers.length, 15)
  assert.equal(inventory.unmarked_barriers.length, 5)
  assert.match(inventory.ab_tests, /A\/B-тест до 30\.08/)

  assert.match(html, />48</)
  assert.match(html, /68/)
  assert.match(html, /34/)
  assert.match(html, /Как сейчас/)
  assert.match(html, /Как станет/)
  assert.match(html, /A\/B-тест до 30\.08/)
  assert.match(html, /assets\/as-was\.png/)
  assert.match(html, /assets\/as-will\.png/)
  assert.match(html, /Вариант А/)
  assert.match(html, /Вариант B/)
})
