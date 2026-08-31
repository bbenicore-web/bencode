import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('result slide shows a simple barrier breakdown and A/B tests', async () => {
  const inventory = JSON.parse(await readFile('docs/slides/barriers.json', 'utf8'))
  const html = await readFile('docs/slides/result-before-after.html', 'utf8')

  assert.equal(inventory.audit_total, 68)
  assert.equal(inventory.critical_total, 38)
  assert.equal(inventory.total_solved, 48)
  assert.equal(inventory.critical_solved, 26)
  assert.equal(inventory.total_unsolved, 20)
  assert.equal(inventory.unsolved_marked_no + inventory.unmarked, 20)
  assert.equal(inventory.total_solved + inventory.total_unsolved, inventory.audit_total)
  assert.match(inventory.ab_tests, /A\/B-тест до 30\.08/)

  assert.match(html, />68</)
  assert.match(html, />38</)
  assert.match(html, />48</)
  assert.match(html, />26</)
  assert.match(html, />20</)
  assert.match(html, /всего барьеров/)
  assert.match(html, /критических будет решено/)
  assert.match(html, /не будет решено/)
  assert.match(html, /A\/B-тест до 30\.08/)
  assert.match(html, /Как сейчас/)
  assert.match(html, /Как станет/)
  assert.match(html, /assets\/as-was\.png/)
  assert.match(html, /assets\/as-will\.png/)
})
