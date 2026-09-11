const fs = require("fs");

const W = 1536;
const H = 1024;
const SCALE = 8;

const colors = {
  ink: "#111827",
  muted: "#4b5563",
  line: "#d9e2ef",
  green: "#18855a",
  greenDark: "#0f6d45",
  greenSoft: "#eef9f4",
  blue: "#245be8",
  blueSoft: "#f1f6ff",
  red: "#ef543f",
  redSoft: "#fff2ee",
  purple: "#5422d5",
  purpleSoft: "#f4f0ff",
  orange: "#d69612",
  orangeSoft: "#fff8e6",
  slate: "#273244",
};

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const svg = [];
function out(value) {
  svg.push(value);
}

function rect(x, y, w, h, opts = {}) {
  const {
    fill = "#fff",
    stroke = colors.line,
    strokeWidth = 1,
    rx = 8,
    opacity = 1,
    dash = "",
  } = opts;
  out(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`
  );
}

function line(x1, y1, x2, y2, opts = {}) {
  const { stroke = colors.line, strokeWidth = 1.2, dash = "", arrow = false } = opts;
  out(
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash ? ` stroke-dasharray="${dash}"` : ""}${arrow ? ` marker-end="url(#arrow-${opts.arrowColor || "default"})"` : ""}/>`
  );
}

function text(x, y, value, opts = {}) {
  const {
    size = 12,
    weight = 600,
    fill = colors.ink,
    anchor = "start",
    family = "Inter, Arial, Helvetica, sans-serif",
    letterSpacing = 0,
  } = opts;
  out(
    `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${letterSpacing}">${escapeXml(value)}</text>`
  );
}

function multiText(x, y, lines, opts = {}) {
  const { size = 10, lineHeight = Math.round(size * 1.28), fill = colors.ink, weight = 600, anchor = "start" } = opts;
  lines.forEach((lineValue, index) => text(x, y + index * lineHeight, lineValue, { size, fill, weight, anchor }));
}

function sectionTitle(x, y, w, title, color) {
  text(x + w / 2, y, title, { size: 9.2, weight: 800, fill: color, anchor: "middle" });
}

function pillItem(x, y, w, h, label, color, opts = {}) {
  rect(x, y, w, h, { rx: 6, fill: "#fff", stroke: "#d7deea", strokeWidth: 1 });
  const iconX = x + 14;
  const iconY = y + h / 2;
  out(`<circle cx="${iconX}" cy="${iconY}" r="3.2" fill="${color}"/>`);
  const maxChars = opts.maxChars || Math.max(8, Math.floor((w - 24) / 5.2));
  const lines = wrapText(label, maxChars).slice(0, 2);
  multiText(x + 23, y + (lines.length === 1 ? h / 2 + 3.2 : h / 2 - 2), lines, {
    size: opts.size || 7.2,
    lineHeight: opts.lineHeight || 8.2,
    weight: 700,
    fill: colors.ink,
  });
}

function bulletList(x, y, items, opts = {}) {
  const { color = colors.green, size = 8.8, maxChars = 28, lineGap = 21, bullet = true } = opts;
  let cy = y;
  for (const item of items) {
    if (bullet) out(`<circle cx="${x}" cy="${cy - 3}" r="2.8" fill="${color}"/>`);
    const lines = wrapText(item, maxChars);
    multiText(x + (bullet ? 10 : 0), cy, lines, { size, lineHeight: size + 2, weight: 700, fill: colors.ink });
    cy += Math.max(lineGap, lines.length * (size + 2) + 5);
  }
}

function sidePanel(x, y, w, h, title, color) {
  rect(x, y, w, h, { rx: 11, fill: "#fff", stroke: color, strokeWidth: 1.2 });
  text(x + w / 2, y + 22, title, { size: 12, weight: 900, fill: color, anchor: "middle" });
}

function domainBox(x, y, w, title, subtitle, color) {
  rect(x, y, w, 44, { rx: 7, fill: "#fff", stroke: color, strokeWidth: 1.2 });
  text(x + w / 2, y + 19, title, { size: 13, weight: 900, fill: color, anchor: "middle" });
  text(x + w / 2, y + 34, subtitle, { size: 7.4, weight: 800, fill: colors.ink, anchor: "middle" });
}

function platformCard(x, y, w, h, color, fill, title, subtitle, owner, sections) {
  rect(x, y, w, h, { rx: 10, fill, stroke: color, strokeWidth: 1.35 });
  text(x + w / 2, y + 24, title, { size: 16, weight: 950, fill: color, anchor: "middle" });
  text(x + w / 2, y + 40, subtitle, { size: 8.4, weight: 900, fill: color, anchor: "middle" });
  text(x + w / 2, y + 55, owner, { size: 7.6, weight: 800, fill: colors.ink, anchor: "middle" });

  let cy = y + 83;
  for (const section of sections) {
    sectionTitle(x + 12, cy, w - 24, section.title, color);
    cy += section.titleGap || 14;
    const cols = section.cols || 3;
    const gap = section.gap ?? 9;
    const rowGap = section.rowGap ?? 9;
    const itemW = (w - 30 - gap * (cols - 1)) / cols;
    const itemH = section.itemH || 28;
    section.items.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      pillItem(x + 15 + col * (itemW + gap), cy + row * (itemH + rowGap), itemW, itemH, item, color, {
        size: section.size || 7.1,
        lineHeight: section.lineHeight,
        maxChars: section.maxChars || Math.floor((itemW - 22) / 5.1),
      });
    });
    cy += Math.ceil(section.items.length / cols) * itemH + Math.max(0, Math.ceil(section.items.length / cols) - 1) * rowGap + (section.afterGap ?? 30);
  }
}

function simplePanel(x, y, w, h, title, color, items) {
  rect(x, y, w, h, { rx: 9, fill: "#fff", stroke: color, strokeWidth: 1.2 });
  text(x + 16, y + 23, title, { size: 13, weight: 900, fill: color });
  bulletList(x + 18, y + 50, items, { color, size: 8, maxChars: 26, lineGap: 25 });
}

function bottomBox(x, y, w, h, label, sub, color) {
  rect(x, y, w, h, { rx: 7, fill: "#fff", stroke: "#ead6a4", strokeWidth: 1 });
  text(x + w / 2, y + 20, label, { size: 8.2, weight: 850, fill: colors.ink, anchor: "middle" });
  if (sub) text(x + w / 2, y + 34, sub, { size: 6.8, weight: 800, fill: colors.ink, anchor: "middle" });
}

function teamPill(x, y, w, color, label, sub) {
  rect(x, y, w, 42, { rx: 20, fill: color, stroke: color, strokeWidth: 0 });
  out(`<circle cx="${x + 21}" cy="${y + 21}" r="12" fill="rgba(255,255,255,0.18)"/>`);
  text(x + 42, y + 18, label, { size: 8, weight: 900, fill: "#fff" });
  text(x + 42, y + 31, sub, { size: 6.6, weight: 750, fill: "#fff" });
}

out(`<?xml version="1.0" encoding="UTF-8"?>`);
out(`<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="0 0 ${W} ${H}" role="img" aria-label="CPO platform model scheme redrawn as vector">`);
out(`<defs>
  <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1f2937" flood-opacity="0.08"/>
  </filter>
  <marker id="arrow-default" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="#7c3aed"/>
  </marker>
  <marker id="arrow-green" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="${colors.green}"/>
  </marker>
</defs>`);
out(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);

// Header
rect(520, 7, 510, 55, { rx: 7, fill: "url(#cpo-grad)", stroke: "none" });
out(`<defs><linearGradient id="cpo-grad" x1="0" x2="1"><stop offset="0" stop-color="#31118f"/><stop offset="1" stop-color="#6428dc"/></linearGradient></defs>`);
text(775, 31, "CPO", { size: 21, weight: 950, fill: "#fff", anchor: "middle" });
text(775, 49, "Цифровой продукт МегаФон (Личный кабинет)", { size: 10, weight: 850, fill: "#fff", anchor: "middle" });

// Left panels
sidePanel(16, 15, 190, 320, "СВЯЗЬ С БИЗНЕСОМ", colors.green);
out(`<path d="M39 67 L39 55 M53 67 L53 47 M67 67 L67 39" stroke="${colors.green}" stroke-width="3" stroke-linecap="round"/><path d="M34 67 H74" stroke="${colors.green}" stroke-width="2"/><path d="M35 52 L48 43 L59 47 L73 31" fill="none" stroke="${colors.green}" stroke-width="2"/>`);
rect(26, 78, 170, 178, { rx: 8, fill: "#fff", stroke: "#d5e7dc" });
text(111, 98, "ЦЕЛИ БИЗНЕСА ТЕЛЕКОМ", { size: 8.2, weight: 900, fill: colors.ink, anchor: "middle" });
bulletList(45, 124, [
  "Рост выручки",
  "Рост ARPU",
  "Рост цифровых продаж и удержания",
  "Удержание и лояльность клиентов",
  "Переход в цифровые каналы",
  "Снижение оттока (Churn)",
  "NPS и клиентский опыт",
], { color: colors.green, size: 8.2, maxChars: 26, lineGap: 20 });
rect(26, 270, 170, 58, { rx: 8, fill: "#fff", stroke: "#d5e7dc" });
text(111, 289, "КЛЮЧЕВЫЕ БИЗНЕС-МЕТРИКИ", { size: 7.8, weight: 900, fill: colors.ink, anchor: "middle" });
multiText(40, 305, ["• Выручка с цифровых продаж", "• ARPU / ARPPU", "• Конверсия в покупку", "• Отток (Churn)", "• NPS / MAU / DAU", "• Доля цифровых продаж"], { size: 7.2, lineHeight: 11, weight: 750 });

sidePanel(16, 535, 190, 205, "КТО ТАКОЙ КАПРАНОВ БОГДАН", colors.green);
rect(28, 560, 165, 43, { rx: 7, fill: "#fff5f2", stroke: "#f0c2b8" });
multiText(38, 575, ["Руководитель платформы Telecom", "(Platform Lead Telecom)"], { size: 8.2, lineHeight: 12, weight: 900, fill: colors.red });
multiText(34, 625, wrapText("Отвечает за платформу телеком-опыта: платформенные возможности телекома, общие телеком-сценарии, стандарты и UX-паттерны телекома, баланс интересов продуктовых команд телекома", 31), {
  size: 7.6,
  lineHeight: 13,
  weight: 720,
});

// Domain boxes and arrows.
domainBox(265, 71, 315, "CPO TELECOM CORE (БИЗНЕС)", "Владелец телеком-продуктов и P&L", colors.green);
domainBox(615, 71, 320, "CPO CX (КРОСС-ДОМЕН)", "Владелец клиентских возможностей и опыта", colors.blue);
domainBox(980, 71, 315, "CPO VAS / PARTNERS (БИЗНЕС)", "Владелец VAS-направлений и партнерских сервисов", colors.red);
line(422, 115, 422, 135, { stroke: colors.green, strokeWidth: 1.3, arrow: true, arrowColor: "green" });
line(775, 62, 775, 71, { stroke: colors.blue, strokeWidth: 1.2, arrow: true });
line(775, 115, 775, 135, { stroke: colors.blue, strokeWidth: 1.3, arrow: true });
line(1137, 115, 1137, 135, { stroke: colors.red, strokeWidth: 1.3, arrow: true });
line(206, 210, 250, 210, { stroke: colors.green, strokeWidth: 1.2, arrow: true, arrowColor: "green" });
line(206, 632, 250, 632, { stroke: colors.green, strokeWidth: 1.1, dash: "4 4", arrow: true, arrowColor: "green" });

platformCard(250, 135, 345, 515, colors.green, colors.greenSoft, "TELECOM ПЛАТФОРМА", "(ПЛАТФОРМА TELECOM ONBITAL)", "Ответственность Богдан (Platform Lead Telecom)", [
  { title: "ВИТРИНЫ И НАВИГАЦИЯ TELECOM", cols: 6, itemH: 39, gap: 7, rowGap: 7, titleGap: 13, afterGap: 24, maxChars: 10, size: 6.15, lineHeight: 7.2, items: ["Сквозная витрина", "Каталог тарифов", "Карточки тарифов", "Корзина услуг", "Поиск", "Корзина Telecom"] },
  { title: "СКВОЗНЫЕ TELECOM-СЦЕНАРИИ", cols: 6, itemH: 39, gap: 7, rowGap: 7, titleGap: 13, afterGap: 24, maxChars: 11, size: 6.05, lineHeight: 7.1, items: ["Купить SIM / eSIM", "Перенос номера (MNP)", "Консьерж", "Подключение услуг", "Домашний интернет", "МегаСемья", "Счётчики ГБ и минут", "Расходы", "Абонентская плата", "Контроль расходов", "Монетизация маржи", "МегаСилы"] },
  { title: "СЕРВИСЫ ПЛАТФОРМЫ TELECOM", cols: 5, itemH: 38, gap: 8, rowGap: 7, titleGap: 13, afterGap: 24, maxChars: 12, size: 6.05, lineHeight: 7.1, items: ["Авторизация и профиль", "Уведомления (push, in-App)", "API Gateway", "Биллинг и платежи", "Настройка безопасности"] },
  { title: "ЕДИНЫЙ ОПЫТ ТЕЛЕКОМА", cols: 3, itemH: 30, gap: 8, rowGap: 7, titleGap: 13, afterGap: 0, maxChars: 18, size: 6.05, lineHeight: 7.1, items: ["Единая навигация и сценарии", "Единый профиль клиента", "Семейные сценарии (Семья, Консьерж)", "Единые продукты и монетизация", "Единые сообщения и коммуникации", "Качество и персонализация"] },
]);

platformCard(610, 135, 335, 515, colors.blue, colors.blueSoft, "CX ПЛАТФОРМА", "(КРОСС-ДОМЕННАЯ ПЛАТФОРМА КЛИЕНТСКОГО ОПЫТА)", "Ответственность CPO CX", [
  { title: "КЛИЕНТСКИЙ ОПЫТ И ВЗАИМОДЕЙСТВИЕ", cols: 3, itemH: 42, maxChars: 16, size: 6.7, items: ["Главная и навигация", "Профиль клиента", "Поиск", "Пуши и уведомления", "Контент", "Онбординг", "Персонализация", "Обратная связь", "UI-компоненты"] },
  { title: "СЕРВИСЫ CX ПЛАТФОРМЫ", cols: 4, itemH: 43, maxChars: 12, size: 6.2, items: ["Авторизация и профиль", "Уведомления (Push, In-App)", "Коммуникации и сообщения", "Аналитика и события", "Эксперименты A/B тесты", "Feature Flags и персонализация", "Контент и модерация"] },
  { title: "ЕДИНЫЕ ПРИНЦИПЫ CX", cols: 3, itemH: 39, maxChars: 17, size: 6.3, items: ["Единая система взаимодействия", "Единый визуальный язык и дизайн-система", "Доступность и удобство", "Кросс-канальность и омниканальность", "Персонализированный опыт", "Измерение опыта и удовлетворенности"] },
]);

platformCard(965, 135, 330, 515, colors.red, colors.redSoft, "VAS ПЛАТФОРМА", "(ПЛАТФОРМА VAS И ПАРТНЕРСКИХ СЕРВИСОВ)", "Ответственность CPO VAS / Partners", [
  { title: "КАТЕГОРИИ VAS И ПАРТНЕРСКИХ СЕРВИСОВ", cols: 3, itemH: 40, maxChars: 14, size: 6.7, items: ["Роуминг", "EVA", "Кино / Игры", "Финансы", "Кэшбэк", "Партнерские сервисы", "Другие сервисы и будущие продукты"] },
  { title: "СЕРВИСЫ VAS ПЛАТФОРМЫ", cols: 4, itemH: 42, maxChars: 12, size: 6.2, items: ["Каталог сервисов", "Карточки партнеров", "Подписки VAS", "Управление подписками", "Витрины и интеграции", "Баланс и пополнение", "Партнерские интеграции", "Оферы и истории"] },
  { title: "ЕДИНЫЙ ОПЫТ VAS", cols: 3, itemH: 39, maxChars: 17, size: 6.3, items: ["Единая навигация и сценарии", "Единый профиль и настройки", "Персонализация предложений", "Единые сообщения и коммуникации", "Прозрачность условий и цены", "Измерение эффективности"] },
]);

// Right panels
simplePanel(1328, 135, 190, 210, "ПРИНЦИПЫ МОДЕЛИ", colors.purple, [
  "Доменная ответственность за бизнес-результат",
  "Платформа предоставляет общие возможности",
  "Единый клиентский опыт во всех доменах",
  "Повторное использование и скорость доставки",
  "Масштабируемость и гибкость",
]);
simplePanel(1328, 390, 190, 150, "КАК ПРИНИМАЕМ РЕШЕНИЯ", colors.purple, [
  "Доменные команды принимают решения в рамках своего P&L",
  "Платформенные решения — через Platform Council",
  "Глобальные вопросы — на уровне CPO и бизнеса",
]);
simplePanel(1328, 568, 190, 170, "УПРАВЛЕНИЕ ПЛАТФОРМОЙ", colors.purple, [
  "Platform Council",
  "Архитектурный комитет",
  "Продуктовый комитет",
  "Комитет по данным и аналитике",
]);

// Integration, units, teams
rect(240, 668, 1060, 80, { rx: 8, fill: colors.purpleSoft, stroke: colors.purple, strokeWidth: 1.1 });
text(770, 695, "ИНТЕГРАЦИЯ И ВЗАИМОДЕЙСТВИЕ ПЛАТФОРМ", { size: 13, weight: 950, fill: colors.purple, anchor: "middle" });
["Единая авторизация и профиль", "Единые уведомления и коммуникации", "Единый биллинг и платежная модель", "Сквозная аналитика и события", "Обмен данными между платформами", "Единые стандарты и API", "Согласование сценариев клиентского пути"].forEach((item, i) => {
  pillItem(260 + i * 146, 712, 132, 25, item, colors.purple, { size: 6.2, maxChars: 18 });
});
line(422, 650, 422, 668, { stroke: colors.purple, strokeWidth: 1.1, dash: "4 4", arrow: true });
line(775, 650, 775, 668, { stroke: colors.purple, strokeWidth: 1.1, dash: "4 4", arrow: true });
line(1137, 650, 1137, 668, { stroke: colors.purple, strokeWidth: 1.1, dash: "4 4", arrow: true });

rect(240, 770, 1060, 78, { rx: 8, fill: colors.orangeSoft, stroke: colors.orange, strokeWidth: 1.1 });
text(770, 796, "БИЗНЕС-ЮНИТЫ TELECOM (ВЛАДЕЛЬЦЫ ПРОДУКТОВ И P&L)", { size: 12.5, weight: 950, fill: colors.orange, anchor: "middle" });
[
  ["Тарифы и мобильная связь", "(CPO Тарифов)"],
  ["Домашний интернет", "(CPO Домашнего интернета)"],
  ["Конвергенция", "(CPO Конвергенции)"],
  ["МегаСемья", "(CPO МегаСемья)"],
  ["Роуминг", "(CPO Роуминга)"],
  ["VAS и партнерские продукты", "(CPO соответствующих направлений)"],
  ["Другие продукты и сервисы", ""],
].forEach((pair, i) => bottomBox(260 + i * 146, 815, 132, 35, pair[0], pair[1], colors.orange));

rect(240, 866, 1060, 78, { rx: 8, fill: "#fff", stroke: colors.slate, strokeWidth: 1.6 });
text(770, 894, "КОМАНДЫ И ЗОНЫ ОТВЕТСТВЕННОСТИ", { size: 14, weight: 950, fill: colors.slate, anchor: "middle" });
teamPill(265, 918, 205, colors.green, "Команды Telecom Platform", "(зона ответственности Богдана)");
teamPill(480, 918, 205, colors.blue, "Команды CX Platform", "(зона ответственности CPO CX)");
teamPill(695, 918, 205, colors.red, "Команды VAS Platform", "(зона ответственности CPO VAS)");
teamPill(910, 918, 190, colors.purple, "Платформенные команды", "(общие сервисы и компоненты)");
teamPill(1110, 918, 175, colors.slate, "Продуктовые команды", "(бизнес-юниты P&L)");

// Bottom RACI legend
rect(18, 955, 1500, 55, { rx: 8, fill: "#fff", stroke: "#dbe4ef" });
text(36, 980, "ЛЕГЕНДА RACI", { size: 9, weight: 950, fill: colors.blue });
[
  ["R", "Responsible (делает)", colors.green],
  ["A", "Accountable (отвечает)", "#ff5a2e"],
  ["C", "Consulted (консультируется)", "#4b5563"],
  ["I", "Informed (информируется)", colors.blue],
].forEach(([letter, label, color], i) => {
  const x = 145 + i * 205;
  out(`<circle cx="${x}" cy="986" r="10" fill="${color}"/>`);
  text(x, 990, letter, { size: 8, weight: 950, fill: "#fff", anchor: "middle" });
  text(x + 18, 990, label, { size: 7.5, weight: 750, fill: colors.ink });
});
[
  ["Head of Telecom Platform", "(Богдан)", "R / A", colors.green],
  ["Head of CX Platform", "(CPO CX)", "R / A", colors.blue],
  ["Head of VAS / Partners Platform", "(CPO VAS)", "R / A", colors.red],
  ["Платформенные команды", "", "R / A", colors.purple],
  ["Бизнес-юниты /", "Продуктовые команды", "R", colors.slate],
].forEach((item, i) => {
  const x = 720 + i * 155;
  rect(x, 965, 138, 38, { rx: 6, fill: "#fff", stroke: item[3], strokeWidth: 1 });
  text(x + 69, 978, item[0], { size: 6.6, weight: 850, fill: item[3], anchor: "middle" });
  if (item[1]) text(x + 69, 988, item[1], { size: 6.2, weight: 800, fill: item[3], anchor: "middle" });
  text(x + 69, 999, item[2], { size: 7.5, weight: 900, fill: item[3], anchor: "middle" });
});

out(`</svg>`);

fs.writeFileSync("canva/cpo-scheme-vector-crisp.svg", svg.join("\n"));
console.log("Wrote canva/cpo-scheme-vector-crisp.svg");
