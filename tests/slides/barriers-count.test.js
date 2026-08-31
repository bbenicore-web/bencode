import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('result slide counts 42 solved barriers and mentions A/B tests', async () => {
  const inventory = JSON.parse(await readFile('docs/slides/barriers.json', 'utf8'))
  const html = await readFile('docs/slides/result-before-after.html', 'utf8')

  const fromSlides = inventory.sources.slides_9_13.groups.reduce((sum, group) => sum + group.count, 0)
  const fromCeo = inventory.sources.ceo_cpo_presentation.groups.reduce((sum, group) => sum + group.count, 0)

  assert.equal(fromSlides, 26)
  assert.equal(fromCeo, 16)
  assert.equal(fromSlides + fromCeo, 42)
  assert.equal(inventory.total_solved, 42)
  assert.match(inventory.ab_tests, /A\/B/)

  assert.match(html, />42</)
  assert.match(html, /16/)
  assert.match(html, /26/)
  assert.match(html, /Как было/)
  assert.match(html, /Как станет/)
  assert.match(html, /A\/B-тестами/)
  assert.match(html, /assets\/as-was\.png/)
  assert.match(html, /assets\/as-will\.png/)
})
