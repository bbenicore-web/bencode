import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { inflateRawSync } from 'node:zlib'
import test from 'node:test'

const deckPath = 'presentations/Квартальное_демо_Мега5G_19.10.2026.pptx'

function readZipEntry(buf, name) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  assert.ok(eocd >= 0, 'pptx zip directory is present')
  const count = buf.readUInt16LE(eocd + 10)
  let offset = buf.readUInt32LE(eocd + 16)
  for (let i = 0; i < count; i += 1) {
    assert.equal(buf.readUInt32LE(offset), 0x02014b50)
    const method = buf.readUInt16LE(offset + 10)
    const compSize = buf.readUInt32LE(offset + 20)
    const nameLen = buf.readUInt16LE(offset + 28)
    const extraLen = buf.readUInt16LE(offset + 30)
    const commentLen = buf.readUInt16LE(offset + 32)
    const localOffset = buf.readUInt32LE(offset + 42)
    const entryName = buf.subarray(offset + 46, offset + 46 + nameLen).toString('utf8')
    if (entryName === name) {
      const localNameLen = buf.readUInt16LE(localOffset + 26)
      const localExtraLen = buf.readUInt16LE(localOffset + 28)
      const start = localOffset + 30 + localNameLen + localExtraLen
      const data = buf.subarray(start, start + compSize)
      if (method === 0) return data
      assert.equal(method, 8)
      return inflateRawSync(data)
    }
    offset += 46 + nameLen + extraLen + commentLen
  }
  throw new Error(`missing ${name}`)
}

function slideText(buf, slide) {
  const xml = readZipEntry(buf, `ppt/slides/slide${slide}.xml`).toString('utf8')
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

test('quarterly Mega5G deck keeps slide 1 facts and the template backup', async () => {
  const buf = await readFile(deckPath)
  const direction = slideText(buf, 3)
  const metrics = slideText(buf, 4)
  const results = slideText(buf, 5)
  const plans = slideText(buf, 6)
  const dependencies = slideText(buf, 7)
  const example = slideText(buf, 9)
  const filled = [direction, metrics, results, plans].join('\n')

  assert.match(
    direction,
    /Растить сценарии активации в продукты МегаИнтернета, и улучшать клиентский опыт/,
  )
  assert.match(direction, /Подключения — 10\. Конверсия — план не задан\. GM — 4 млн/)
  assert.match(direction, /Разовое ускорение/)
  assert.match(direction, /Мега5G Город/)

  assert.match(metrics, /Подключения/)
  assert.match(metrics, /2,45%/)
  assert.match(metrics, /4 млн/)
  assert.match(metrics, /8 млн/)

  assert.match(results, /Точки входа: виджет на главной и блок в «Услугах»/)
  assert.match(results, /Поставлено/)
  assert.match(results, /РК 21\.09/)

  assert.match(plans, /Улучшение опции за счёт новых партнёрств/)
  assert.doesNotMatch(plans, /\d{2}\.\d{2}\.\d{4}/)

  assert.match(dependencies, /\[Конкретная зависимость или конфликт\]/)
  assert.match(example, /Цифровое самообслуживание/)

  assert.doesNotMatch(filled, /6,35/)
  assert.doesNotMatch(filled, /9 049/)
  assert.doesNotMatch(filled, /9049917/)
  assert.doesNotMatch(filled, /выходы/)
  assert.doesNotMatch(filled, /Мега5G Кино/)
  assert.doesNotMatch(filled, /Гипотеза/)

  const rels = readZipEntry(buf, 'ppt/slides/_rels/slide5.xml.rels').toString('utf8')
  const images = rels.match(/relationships\/image/g) ?? []
  assert.equal(images.length, 2)
})
