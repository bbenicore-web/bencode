import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('presentation index lists published Bento decks', async () => {
  const index = await readFile('presentations/index.html', 'utf8')

  assert.match(index, /viewport/)
  assert.match(index, /Q3_2025\.bento\.html/)
  assert.match(index, /Bento_brief\.bento\.html/)
})

test('site entry points advertise the Pages presentations URL', async () => {
  const [readme, home] = await Promise.all([
    readFile('README.md', 'utf8'),
    readFile('index.html', 'utf8'),
  ])

  assert.match(readme, /https:\/\/bbenicore-web\.github\.io\/bencode\/presentations\//)
  assert.match(readme, /https:\/\/bbenicore-web\.github\.io\/bencode\/presentations\/Q3_2025\.bento\.html/)
  assert.match(home, /href="presentations\/"/)
})
