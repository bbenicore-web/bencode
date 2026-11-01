import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readDeck() {
  const html = await readFile('presentations/Demo.bento.html', 'utf8')
  const match = html.match(
    /<script type="application\/bento\+json" id="bento-doc">(.*?)<\/script>/s,
  )
  assert.ok(match, 'deck document block is present')
  assert.equal(match[1].includes('<'), false)
  return JSON.parse(match[1])
}

test('Pages workflow publishes the presentations folder', async () => {
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8')
  assert.match(workflow, /cp -R presentations _site\/presentations/)
})

test('presentation index and site entry points link the Demo deck', async () => {
  const [index, readme, home] = await Promise.all([
    readFile('presentations/index.html', 'utf8'),
    readFile('README.md', 'utf8'),
    readFile('index.html', 'utf8'),
  ])

  assert.match(index, /viewport/)
  assert.match(index, /href="Demo\.bento\.html"/)
  assert.match(index, /href="Квартальное_демо_Телеком_19\.10\.2026\.pptx"/)
  assert.match(index, /Цифровая платформа клиентского опыта Телеком/)
  assert.match(readme, /Квартальное_демо_Телеком_19\.10\.2026\.pptx/)
  assert.match(readme, /Цифровая платформа клиентского опыта Телеком/)
  assert.match(readme, /https:\/\/bbenicore-web\.github\.io\/bencode\/presentations\/Demo\.bento\.html/)
  assert.match(home, /href="presentations\/"/)
})

test('Demo deck is a show script for the three live screens', async () => {
  const doc = await readDeck()
  const slides = doc.slides
  const ids = new Set(slides.map((slide) => slide.id))

  assert.equal(doc.format, 'bento/slides')
  assert.equal(doc.title, 'Demo · Живые экраны')
  assert.equal(doc.size.width, 1280)
  assert.equal(doc.size.height, 720)
  assert.ok(doc.theme.fontFamily)
  assert.equal(doc.meta.event, 'Demo')
  assert.ok(slides.length >= 8)

  for (const slide of slides) {
    assert.ok(slide.notes && slide.notes.trim().length > 0, `${slide.id} has speaker notes`)
    for (const element of slide.elements) {
      assert.ok(element.x >= 0 && element.y >= 0)
      assert.ok(element.x + element.w <= doc.size.width)
      assert.ok(element.y + element.h <= doc.size.height)
      if (element.link) assert.ok(ids.has(element.link), element.link)
    }
  }

  const notes = slides.map((slide) => slide.notes).join('\n')
  assert.match(notes, /VAS/)
  assert.match(notes, /767/)
  assert.match(notes, /не обещать|никуда не ведут/)
  assert.match(notes, /Не ищите ARPU/)

  const platforms = slides.find((slide) => slide.id === 's4')
  const links = platforms.elements.map((element) => element.link).filter(Boolean)
  assert.deepEqual(links.sort(), ['state-cx', 'state-telecom', 'state-vas'])
  for (const id of ['state-telecom', 'state-cx', 'state-vas']) {
    assert.equal(slides.find((slide) => slide.id === id).stateOf, 's4')
  }
})
