import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { inflateRawSync } from 'node:zlib'
import test from 'node:test'

const deckPath = 'presentations/Квартальное_демо_Телеком_19.10.2026.pptx'

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
  const demo = slideText(buf, 6)
  const simScreens = slideText(buf, 7)
  const simChart = slideText(buf, 8)
  const plans = slideText(buf, 9)
  const dependencies = slideText(buf, 10)
  const example = slideText(buf, 12)
  const filled = [direction, metrics, results, demo, simScreens, simChart, plans].join('\n')

  assert.match(
    direction,
    /Растить сценарии активации в продукты МегаИнтернета, и улучшать клиентский опыт/,
  )
  assert.match(direction, /Подключения — 10\. Конверсия — план не задан\. GM — 4 млн/)
  assert.match(direction, /Телеком/)
  assert.match(direction, /Мега5G/)
  assert.match(direction, /Дом групповых продуктов/)
  assert.match(
    direction,
    /Создание и внедрение семейных механик на витринах для улучшение клиентского опыта и развитие разметки сегментов/,
  )
  assert.match(direction, /1,6 млн на 2026 год/)
  assert.match(direction, /Единый заказ СИМ/)
  assert.match(
    direction,
    /Растить эффективность воронки привлечения и улучшать клиентский опыт в сценарии стать абонентом/,
  )
  assert.match(direction, /\+22% за 12 месяцев с момента запуска/)
  assert.match(direction, /~194 тыс\. за 12 месяцев с момента/)
  assert.doesNotMatch(direction, /Витрина Мега5G/)
  assert.doesNotMatch(direction, /Разовое ускорение/)
  assert.doesNotMatch(direction, /Мега5G Город/)

  assert.match(metrics, /Подключения/)
  assert.match(metrics, /2,45%/)
  assert.match(metrics, /4 млн/)
  assert.match(metrics, /8 млн/)
  assert.match(metrics, /Конверсия в назначение роли/)
  assert.match(metrics, /25%/)
  assert.match(metrics, /31%/)
  assert.match(metrics, /50%/)
  assert.match(metrics, /Единый заказ СИМ · Конверсия/)
  assert.match(metrics, /4%/)
  assert.match(metrics, /6%/)
  assert.match(metrics, /10%/)

  assert.match(results, /Точки входа: виджет на главной и блок в «Услугах»/)
  assert.match(results, /Поставлено/)
  assert.match(results, /РК 21\.09/)
  assert.match(results, /МегаСемья 2\.0/)
  assert.match(results, /Релиз 23\.07\.2026/)
  assert.match(results, /Единый заказ СИМ/)
  assert.match(results, /Запущены MNP и SIM/)

  assert.match(plans, /Улучшение опции за счёт новых партнёрств/)
  assert.match(plans, /Запуск сценария eSIM/)
  assert.match(plans, /4Q/)
  assert.doesNotMatch(plans, /\d{2}\.\d{2}\.\d{4}/)
  assert.doesNotMatch(plans, /1Q27/)
  assert.doesNotMatch(plans, /Дели тариф/)

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

  assert.match(demo, /Экраны МегаСемьи 2\.0/)
  const demoRels = readZipEntry(buf, 'ppt/slides/_rels/slide6.xml.rels').toString('utf8')
  assert.equal((demoRels.match(/relationships\/image/g) ?? []).length, 3)
  assert.doesNotMatch(demo, /925/)
  assert.doesNotMatch(demo, /03\.04\.1993/)
  assert.doesNotMatch(demo, /Ванечка/)

  assert.match(simScreens, /Экраны единого заказа СИМ/)
  const simRels = readZipEntry(buf, 'ppt/slides/_rels/slide7.xml.rels').toString('utf8')
  assert.equal((simRels.match(/relationships\/image/g) ?? []).length, 3)
  assert.match(simChart, /Цифры с этого слайда в таблицу метрик не перенесены/)
  const chartRels = readZipEntry(buf, 'ppt/slides/_rels/slide8.xml.rels').toString('utf8')
  assert.equal((chartRels.match(/relationships\/image/g) ?? []).length, 1)
  assert.doesNotMatch(simChart, /CR A/)
  assert.doesNotMatch(filled, /25\.05\.25/)
})
