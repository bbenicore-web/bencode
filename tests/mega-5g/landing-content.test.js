import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

function relativeLuminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    ))

  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2])
}

function contrastRatio(foreground, background) {
  const luminances = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((a, b) => b - a)

  return (luminances[0] + 0.05) / (luminances[1] + 0.05)
}

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

test('support section flows subscriber content and FAQ below the preserved carousel', async () => {
  const css = await readFile('mega-5g/src/styles.css', 'utf8')
  const support = css.match(/\.support-section\s*\{([^}]*)\}/s)?.[1]
  const connectTitle = css.match(/\.connect-title\s*\{([^}]*)\}/s)?.[1]
  const audienceTitle = css.match(/\.connect-audience-title\s*\{([^}]*)\}/s)?.[1]
  const connectCard = css.match(/\.connect-card\s*\{([^}]*)\}/s)?.[1]
  const newcomer = css.match(/\.new-subscriber\s*\{([^}]*)\}/s)?.[1]
  const faq = css.match(/\.faq\s*\{([^}]*)\}/s)?.[1]

  assert.ok(support)
  assert.match(support, /height:\s*auto/)
  assert.match(support, /padding:\s*555px 12px 48px/)
  assert.match(connectTitle, /position:\s*absolute/)
  assert.match(connectTitle, /top:\s*48px/)
  assert.match(audienceTitle, /position:\s*absolute/)
  assert.match(audienceTitle, /top:\s*92px/)
  assert.match(connectCard, /position:\s*absolute/)
  assert.match(connectCard, /top:\s*130px/)
  assert.match(newcomer, /position:\s*static/)
  assert.match(newcomer, /width:\s*100%/)
  assert.doesNotMatch(newcomer, /(?:^|\n)\s*(?:top|left):/)
  assert.match(faq, /position:\s*static/)
  assert.match(faq, /width:\s*100%/)
  assert.match(faq, /margin-top:\s*19px/)
  assert.doesNotMatch(faq, /(?:^|\n)\s*(?:top|left):/)
  assert.doesNotMatch(css, /\.support-section\s*\{[^}]*height:\s*(?:1360|1380)px/s)
  assert.doesNotMatch(css, /\.faq\s*\{[^}]*top:\s*(?:850|870)px/s)
})

test('new subscriber actions expose their accessible group label', async () => {
  const newcomer = await readFile('mega-5g/src/components/NewSubscriberSection.tsx', 'utf8')
  const actions = newcomer.match(/<div className="new-subscriber-card__actions"[^>]*>/)?.[0]

  assert.ok(actions)
  assert.match(actions, /role="group"/)
  assert.match(actions, /aria-label="Подключение новых абонентов"/)
})

test('new subscriber accent colors use accessible foregrounds', async () => {
  const css = await readFile('mega-5g/src/styles.css', 'utf8')
  const eyebrowColor = css.match(
    /\.new-subscriber-card__eyebrow\s*\{[^}]*color:\s*(#[0-9a-f]{6})/s,
  )?.[1]

  assert.ok(eyebrowColor)
  assert.ok(contrastRatio(eyebrowColor, '#f2f4f7') >= 4.5)
  assert.match(
    css,
    /\.new-subscriber-card__action--sim\s*\{[^}]*background:\s*#00b956;[^}]*color:\s*#0e0e0e/s,
  )
  assert.match(
    css,
    /\.new-subscriber-card__action--mnp\s*\{[^}]*background:\s*#0e0e0e;[^}]*color:\s*#fff/s,
  )
})
