const canvas = document.querySelector("#cpo-canvas");
const ctx = canvas.getContext("2d");
const exportScale = window.__EXPORT_SCALE__ || 1;

const CANVAS_W = 1920;
const CANVAS_H = 1680;

if (exportScale !== 1) {
  canvas.width = CANVAS_W * exportScale;
  canvas.height = CANVAS_H * exportScale;
  ctx.scale(exportScale, exportScale);
} else if (canvas.width !== CANVAS_W || canvas.height !== CANVAS_H) {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
}

const searchInput = document.querySelector("#scheme-search");
const resetView = document.querySelector("#reset-view");
const canvasStatus = document.querySelector("#canvas-status");
const detailsPanel = document.querySelector("#details-panel");
const detailsType = document.querySelector("#details-type");
const detailsTitle = document.querySelector("#details-title");
const detailsDescription = document.querySelector("#details-description");
const detailsOwner = document.querySelector("#details-owner");
const detailsRaci = document.querySelector("#details-raci");
const detailsRelated = document.querySelector("#details-related");
const closeDetails = document.querySelector("#close-details");
const nodeList = document.querySelector("#node-list");

const palette = {
  ink: "#172033",
  muted: "#647084",
  line: "#dfe4ef",
  green: "#1d8f64",
  greenSoft: "#eaf7f1",
  blue: "#285eea",
  blueSoft: "#edf3ff",
  red: "#e05b43",
  redSoft: "#fff0ec",
  purple: "#4a1fc7",
  purpleSoft: "#f1edff",
  yellow: "#f2a900",
  yellowSoft: "#fff9e6",
  orange: "#e8870a",
  orangeSoft: "#fff4e0",
  panel: "#ffffff",
};

const state = {
  activeId: null,
  hoverId: null,
  query: "",
};

const nodes = [
  {
    id: "biz-leader-telecom",
    title: "Бизнес лидер — Телеком Core",
    type: "Бизнес-лидер",
    owner: "Бизнес",
    raci: "A",
    x: 300,
    y: 24,
    w: 280,
    h: 44,
    color: palette.blue,
    fill: palette.blueSoft,
    description: "Бизнес-лидер телеком-направления Core: задаёт приоритеты и KPI для телеком-платформы.",
    related: ["telecom-platform", "cpo-main-line"],
  },
  {
    id: "biz-leader-showcases",
    title: "Бизнес лидер — Витрины",
    type: "Бизнес-лидер",
    owner: "Бизнес",
    raci: "A",
    x: 600,
    y: 24,
    w: 280,
    h: 44,
    color: palette.blue,
    fill: palette.blueSoft,
    description: "Бизнес-лидер витрин: отвечает за конверсию, воронки и монетизацию витрин.",
    related: ["telecom-platform", "team-tariffs"],
  },
  {
    id: "cpo-main-line",
    title: "CPO — основная линейка",
    type: "CPO домена",
    owner: "CPO",
    raci: "A",
    x: 270,
    y: 88,
    w: 200,
    h: 52,
    color: palette.yellow,
    fill: palette.yellowSoft,
    description: "CPO основной продуктовой линейки телекома.",
    related: ["telecom-platform", "team-tariffs"],
  },
  {
    id: "cpo-persona",
    title: "CPO — Персона",
    type: "CPO домена",
    owner: "CPO",
    raci: "A",
    x: 480,
    y: 88,
    w: 200,
    h: 52,
    color: palette.yellow,
    fill: palette.yellowSoft,
    description: "CPO направления Персона и ДГП.",
    related: ["telecom-platform", "team-persona"],
  },
  {
    id: "cpo-mnp",
    title: "CPO — MNP, клоны, SIM",
    type: "CPO домена",
    owner: "CPO",
    raci: "A",
    x: 690,
    y: 88,
    w: 200,
    h: 52,
    color: palette.yellow,
    fill: palette.yellowSoft,
    description: "CPO сценариев MNP, клонов и покупки SIM.",
    related: ["telecom-platform", "team-subscriber"],
  },
  {
    id: "cpo-megainternet",
    title: "CPO — МегаИнтернет",
    type: "CPO домена",
    owner: "CPO",
    raci: "A",
    x: 900,
    y: 88,
    w: 200,
    h: 52,
    color: palette.yellow,
    fill: palette.yellowSoft,
    description: "CPO мобильного интернета и контроля расходов.",
    related: ["telecom-platform", "team-mega-internet"],
  },
  {
    id: "cpo-home-internet",
    title: "CPO — ДомИнтернет",
    type: "CPO домена",
    owner: "CPO",
    raci: "A",
    x: 1110,
    y: 88,
    w: 200,
    h: 52,
    color: palette.yellow,
    fill: palette.yellowSoft,
    description: "CPO домашнего интернета.",
    related: ["telecom-platform", "team-home-internet"],
  },
  {
    id: "cpo-monetization",
    title: "CPO — Монетизация",
    type: "CPO домена",
    owner: "CPO",
    raci: "A",
    x: 1320,
    y: 88,
    w: 200,
    h: 52,
    color: palette.yellow,
    fill: palette.yellowSoft,
    description: "CPO монетизации в личном кабинете и самообслуживании.",
    related: ["telecom-platform", "team-monetization"],
  },
  {
    id: "cpo-header",
    title: "CPO Цифровой продукт МегаФона (Личный кабинет)",
    type: "Роль CPO",
    owner: "CPO цифрового продукта",
    raci: "A",
    x: 520,
    y: 158,
    w: 880,
    h: 58,
    color: palette.purple,
    fill: palette.purpleSoft,
    description:
      "Роль обеспечивает, чтобы три домена — Telecom, CX и VAS — развивались как единый цифровой продукт личного кабинета МегаФона.",
    related: ["telecom-platform", "cx-platform", "vas-platform", "cpo-responsibilities"],
  },
  {
    id: "platform-note-left",
    title: "Общие возможности платформы",
    type: "Пояснение",
    owner: "CPO платформы",
    raci: "I",
    x: 24,
    y: 240,
    w: 228,
    h: 320,
    color: palette.muted,
    fill: "#f8f9fc",
    description:
      "Платформа даёт общие возможности — каталоги, поиск, профиль и др. — всем доменам, чтобы новые продукты запускались быстрее и выглядели как единое приложение.",
    lines: [
      "Каталоги и витрины",
      "Поиск и навигация",
      "Профиль клиента",
      "Единый UX",
      "Быстрый запуск продуктов",
    ],
    related: ["telecom-platform", "cx-platform", "vas-platform"],
  },
  {
    id: "telecom-platform",
    title: "ТЕЛЕКОМ ПЛАТФОРМА",
    type: "Платформа",
    owner: "CPO Telecom Platform",
    raci: "R/A",
    x: 270,
    y: 240,
    w: 380,
    h: 860,
    color: palette.green,
    fill: palette.greenSoft,
    description: "Телеком-платформа: витрины, сквозные сценарии и сервисы для телеком-продуктов личного кабинета.",
    sections: [
      {
        title: "Витрины и навигация",
        items: [
          "Сквозные элементы",
          "Каталоги тарифов",
          "Карточки тарифов",
          "Карточки услуг",
          "Полки",
          "Корзина Telecom",
        ],
      },
      {
        title: "Сквозные телеком-сценарии",
        items: [
          "Покупка SIM",
          "MNP",
          "Консьерж",
          "Подключение услуг",
          "Домашний интернет",
          "МегаСемья",
          "Счётчики ГБ/минут",
          "Расходы",
          "Абонентская плата",
          "Контроль расходов",
          "Минимальная корзина",
          "МегаСилы",
        ],
      },
      {
        title: "Сервисы телеком-платформы",
        items: [
          "Подключение/отключение услуг",
          "Импортер",
          "Домашний интернет монолит",
          "Скидки",
          "Проверка адреса (dadata)",
          "Проверка баланса",
          "Мои номера",
          "Тарифы",
          "Клоны",
          "Семья",
        ],
      },
    ],
    related: ["cx-platform", "cpo-header", "team-telecom"],
  },
  {
    id: "cx-platform",
    title: "CX ПЛАТФОРМА",
    subtitle: "Кросс-доменная платформа клиентского опыта",
    type: "Платформа",
    owner: "CPO CX",
    raci: "R/A",
    x: 670,
    y: 240,
    w: 380,
    h: 860,
    color: palette.blue,
    fill: palette.blueSoft,
    description: "Кросс-доменная CX-платформа: единый клиентский опыт, профиль, коммуникации и UI-компоненты.",
    sections: [
      {
        title: "Клиентский опыт и взаимодействие",
        items: [
          "Главная и навигация",
          "Профиль клиента",
          "Поиск",
          "Пуши и уведомления",
          "Сторис и контент",
          "Онбординг",
          "Персонализация",
          "Обратная связь",
          "UI-компоненты",
        ],
      },
      {
        title: "Сервисы CX-платформы",
        items: [
          "Авторизация и профиль",
          "Уведомления (Push, In-App)",
          "Коммуникации и сообщения",
        ],
      },
    ],
    related: ["telecom-platform", "vas-platform", "cpo-header"],
  },
  {
    id: "vas-platform",
    title: "VAS ПЛАТФОРМА",
    subtitle: "Платформа VAS и партнёрских сервисов",
    type: "Платформа",
    owner: "CPO VAS",
    raci: "R/A",
    x: 1070,
    y: 240,
    w: 380,
    h: 860,
    color: palette.red,
    fill: palette.redSoft,
    description: "Платформа VAS и партнёрских сервисов: категории, подключение, подписки и интеграции.",
    sections: [
      {
        title: "Категории VAS и партнёров",
        items: ["Роуминг", "EVA", "Кино/Игры", "Финансы", "Кэшбэк", "Партнёрские сервисы"],
      },
      {
        title: "Сервисы VAS-платформы",
        items: [
          "Каталог сервисов",
          "Карточка сервиса",
          "Подключение VAS",
          "Управление подписками",
          "Баланс и пополнение",
          "Партнёрские интеграции",
        ],
      },
    ],
    related: ["telecom-platform", "cx-platform", "cpo-header"],
  },
  {
    id: "cpo-platform-duties",
    title: "Зона ответственности CPO платформы",
    type: "Пояснение",
    owner: "CPO платформы",
    raci: "A",
    x: 1470,
    y: 240,
    w: 210,
    h: 320,
    color: palette.purple,
    fill: palette.purpleSoft,
    description: "Ответственность CPO платформы за развитие общих возможностей и координацию команд.",
    lines: [
      "Управление 6–10 командами",
      "Владение роадмапом платформы",
      "Продуктовые решения в рамках платформы",
      "Ответственность за KPI домена",
    ],
    related: ["cpo-header", "team-telecom"],
  },
  {
    id: "cpo-responsibilities",
    title: "Ответственность CPO цифрового продукта",
    type: "Пояснение",
    owner: "CPO цифрового продукта",
    raci: "A",
    x: 1700,
    y: 240,
    w: 196,
    h: 520,
    color: palette.purple,
    fill: "#ffffff",
    description: "Пять ключевых зон ответственности CPO цифрового продукта МегаФона.",
    lines: [
      "1. Формирование продуктовой стратегии",
      "2. Управление инвестиционным портфелем",
      "3. Баланс интересов между доменами",
      "4. Организационное развитие",
      "5. Единые стандарты качества и процессов",
    ],
    related: ["cpo-header", "telecom-platform", "cx-platform", "vas-platform"],
  },
  {
    id: "team-telecom",
    title: "Команда Телеком платформы",
    type: "Команды",
    owner: "CPO Telecom Platform",
    raci: "R/A",
    x: 270,
    y: 1140,
    w: 1180,
    h: 200,
    color: palette.green,
    fill: palette.greenSoft,
    description: "Структура продуктовых команд телеком-платформы по направлениям роста.",
    teamTable: {
      title: "Команда Телеком платформы",
      directions: [
        { label: "Лид генераторы", span: 3, color: palette.orange },
        { label: "Профит генераторы", span: 1, color: palette.orange },
        { label: "Удержание", span: 2, color: palette.orange },
      ],
      teams: [
        "Витрины Тарифов",
        "Стать абонентом",
        "Домашний интернет",
        "Монетизация в ЛК и самообслуживание",
        "Персона — ДГП",
        "Мега Интернет и контроль расходов",
      ],
    },
    related: ["telecom-platform", "team-tariffs", "team-subscriber", "team-home-internet", "team-monetization", "team-persona", "team-mega-internet"],
  },
  {
    id: "team-tariffs",
    title: "Витрины Тарифов",
    type: "Продуктовая команда",
    owner: "CPO — основная линейка",
    raci: "R",
    x: 270,
    y: 1260,
    w: 0,
    h: 0,
    virtual: true,
    description: "Команда витрин тарифов — лид-генератор.",
    related: ["team-telecom", "cpo-main-line"],
  },
  {
    id: "team-subscriber",
    title: "Стать абонентом",
    type: "Продуктовая команда",
    owner: "CPO — MNP, клоны, SIM",
    raci: "R",
    x: 470,
    y: 1260,
    w: 0,
    h: 0,
    virtual: true,
    description: "Команда сценария «Стать абонентом» — лид-генератор.",
    related: ["team-telecom", "cpo-mnp"],
  },
  {
    id: "team-home-internet",
    title: "Домашний интернет",
    type: "Продуктовая команда",
    owner: "CPO — ДомИнтернет",
    raci: "R",
    x: 670,
    y: 1260,
    w: 0,
    h: 0,
    virtual: true,
    description: "Команда домашнего интернета — лид-генератор.",
    related: ["team-telecom", "cpo-home-internet"],
  },
  {
    id: "team-monetization",
    title: "Монетизация в ЛК и самообслуживание",
    type: "Продуктовая команда",
    owner: "CPO — Монетизация",
    raci: "R",
    x: 870,
    y: 1260,
    w: 0,
    h: 0,
    virtual: true,
    description: "Команда монетизации — профит-генератор.",
    related: ["team-telecom", "cpo-monetization"],
  },
  {
    id: "team-persona",
    title: "Персона — ДГП",
    type: "Продуктовая команда",
    owner: "CPO — Персона",
    raci: "R",
    x: 1070,
    y: 1260,
    w: 0,
    h: 0,
    virtual: true,
    description: "Команда Персона — удержание.",
    related: ["team-telecom", "cpo-persona"],
  },
  {
    id: "team-mega-internet",
    title: "Мега Интернет и контроль расходов",
    type: "Продуктовая команда",
    owner: "CPO — МегаИнтернет",
    raci: "R",
    x: 1270,
    y: 1260,
    w: 0,
    h: 0,
    virtual: true,
    description: "Команда мобильного интернета и контроля расходов — удержание.",
    related: ["team-telecom", "cpo-megainternet"],
  },
];

const visibleNodes = nodes.filter((node) => !node.virtual);
const nodeById = new Map(nodes.map((node) => [node.id, node]));

const roundRect = (x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const wrapText = (text, maxWidth, font) => {
  ctx.font = font;
  const words = text.split(" ");
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      line = testLine;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  });

  if (line) lines.push(line);
  return lines;
};

const drawText = (text, x, y, maxWidth, font, color, lineHeight = 18, align = "left") => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const lines = wrapText(text, maxWidth, font);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  return lines.length * lineHeight;
};

const drawMiniGrid = (items, x, y, width, color, cols = 3) => {
  const gap = 8;
  const cellW = (width - gap * (cols - 1)) / cols;
  items.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cellX = x + col * (cellW + gap);
    const cellY = y + row * 44;
    roundRect(cellX, cellY, cellW, 34, 9);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(100, 112, 132, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cellX + 11, cellY + 17, 3.5, 0, Math.PI * 2);
    ctx.fill();
    drawText(item, cellX + 20, cellY + 8, cellW - 26, "700 11px Inter, sans-serif", palette.ink, 13);
  });
  return Math.ceil(items.length / cols) * 44;
};

const drawPillLine = (text, x, y, width, color) => {
  roundRect(x, y, width, 28, 9);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "rgba(100, 112, 132, 0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + 13, y + 14, 4, 0, Math.PI * 2);
  ctx.fill();
  drawText(text, x + 24, y + 6, width - 30, "700 12px Inter, sans-serif", palette.ink, 16);
  return 34;
};

const drawTeamTable = (table, x, y, width) => {
  const pad = 16;
  const teamCount = table.teams.length;
  const cellW = (width - pad * 2 - 10 * (teamCount - 1)) / teamCount;

  drawText(table.title, x + width / 2, y + 14, width - pad * 2, "900 18px Inter, sans-serif", palette.green, 22, "center");

  const dirY = y + 52;
  let dirX = x + pad;
  table.directions.forEach((dir) => {
    const dirW = cellW * dir.span + 10 * (dir.span - 1);
    roundRect(dirX, dirY, dirW, 38, 10);
    ctx.fillStyle = dir.color;
    ctx.fill();
    drawText(dir.label, dirX + dirW / 2, dirY + 10, dirW - 12, "800 12px Inter, sans-serif", "#ffffff", 14, "center");
    dirX += dirW + 10;
  });

  const teamY = dirY + 50;
  table.teams.forEach((team, index) => {
    const cellX = x + pad + index * (cellW + 10);
    roundRect(cellX, teamY, cellW, 52, 12);
    ctx.fillStyle = palette.green;
    ctx.fill();
    drawText(team, cellX + cellW / 2, teamY + 10, cellW - 14, "800 11px Inter, sans-serif", "#ffffff", 13, "center");
  });
};

const drawDownArrow = (fromX, fromY, toX, toY, color = palette.ink) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - 7, toY - 10);
  ctx.lineTo(toX + 7, toY - 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawCard = (node) => {
  const isActive = state.activeId === node.id;
  const isRelated = state.activeId && (nodeById.get(state.activeId)?.related || []).includes(node.id);
  const isHovered = state.hoverId === node.id;
  const isMatch = matchesQuery(node);
  const hasQuery = Boolean(state.query);
  const isDimmed = (state.activeId && !isActive && !isRelated) || (hasQuery && !isMatch);

  ctx.save();
  ctx.globalAlpha = isDimmed ? 0.22 : 1;

  roundRect(node.x, node.y, node.w, node.h, node.teamTable ? 16 : 14);
  ctx.fillStyle = isMatch ? palette.yellowSoft : node.fill;
  ctx.fill();
  ctx.lineWidth = isActive ? 4 : isRelated || isHovered || isMatch ? 3 : 2;
  ctx.strokeStyle = isActive ? palette.purple : isMatch ? palette.yellow : isRelated ? palette.purple : node.color;
  ctx.stroke();

  if (!node.teamTable) {
    ctx.fillStyle = node.color;
    ctx.fillRect(node.x, node.y, node.w, 6);
  }

  const pad = 14;
  let cursorY = node.y + (node.teamTable ? 0 : 16);

  if (node.teamTable) {
    drawTeamTable(node.teamTable, node.x, node.y, node.w);
    ctx.restore();
    return;
  }

  const titleFont =
    node.w > 300 ? "900 20px Inter, sans-serif" : node.h < 60 ? "800 13px Inter, sans-serif" : "800 15px Inter, sans-serif";
  const titleAlign = node.w > 300 && !node.lines ? "center" : "left";
  const titleX = titleAlign === "center" ? node.x + node.w / 2 : node.x + pad;
  drawText(node.title, titleX, cursorY, node.w - pad * 2, titleFont, node.color, node.h < 60 ? 16 : 22, titleAlign);
  cursorY += node.h < 60 ? 34 : node.subtitle ? 28 : 30;

  if (node.subtitle) {
    cursorY += drawText(
      node.subtitle,
      node.x + node.w / 2,
      cursorY,
      node.w - pad * 2,
      "700 11px Inter, sans-serif",
      palette.muted,
      14,
      "center",
    );
    cursorY += 8;
  }

  if (node.lines) {
    node.lines.forEach((line) => {
      cursorY += drawPillLine(line, node.x + pad, cursorY, node.w - pad * 2, node.color) + 4;
    });
  }

  if (node.sections) {
    node.sections.forEach((section) => {
      cursorY += 6;
      drawText(
        section.title,
        node.x + node.w / 2,
        cursorY,
        node.w - pad * 2,
        "800 14px Inter, sans-serif",
        node.color,
        17,
        "center",
      );
      cursorY += 24;
      const cols = section.items.length <= 6 ? 2 : 3;
      cursorY += drawMiniGrid(section.items, node.x + pad, cursorY, node.w - pad * 2, node.color, cols) + 10;
    });
  }

  ctx.restore();
};

const drawCpoArrows = () => {
  const telecom = nodeById.get("telecom-platform");
  const cpoNodes = nodes.filter((n) => n.id.startsWith("cpo-") && n.id !== "cpo-header" && !n.virtual);
  cpoNodes.forEach((cpo) => {
    drawDownArrow(cpo.x + cpo.w / 2, cpo.y + cpo.h, telecom.x + telecom.w / 2, telecom.y, palette.ink);
  });
};

const drawPlatformLabel = () => {
  roundRect(24, 158, 180, 36, 10);
  ctx.fillStyle = palette.purpleSoft;
  ctx.fill();
  ctx.strokeStyle = palette.purple;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawText("Платформа", 24 + 90, 167, 160, "900 14px Inter, sans-serif", palette.purple, 16, "center");
};

function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  drawPlatformLabel();
  drawCpoArrows();

  visibleNodes.forEach(drawCard);
}

const getCanvasPoint = (event) => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * CANVAS_W,
    y: ((event.clientY - rect.top) / rect.height) * CANVAS_H,
  };
};

const hitTest = (point) =>
  [...visibleNodes].reverse().find(
    (node) => point.x >= node.x && point.x <= node.x + node.w && point.y >= node.y && point.y <= node.y + node.h,
  );

const matchesQuery = (node) => {
  if (!state.query) return false;
  const haystack = [
    node.title,
    node.subtitle || "",
    node.type,
    node.owner,
    node.description,
    ...(node.lines || []),
    ...(node.sections || []).flatMap((section) => [section.title, ...section.items]),
    ...(node.teamTable?.teams || []),
    ...(node.teamTable?.directions || []).map((d) => d.label),
  ]
    .join(" ")
    .toLocaleLowerCase("ru");
  return haystack.includes(state.query);
};

const relatedLabel = (id) => nodeById.get(id)?.title || id;

const setRelatedChips = (node) => {
  detailsRelated.innerHTML = "";
  const related = node.related || [];

  if (!related.length) {
    const empty = document.createElement("span");
    empty.className = "related-chip";
    empty.textContent = "Связи не заданы";
    detailsRelated.append(empty);
    return;
  }

  related.forEach((id) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "related-chip";
    chip.textContent = relatedLabel(id);
    chip.addEventListener("click", () => selectNode(id));
    detailsRelated.append(chip);
  });
};

function selectNode(id) {
  const node = nodeById.get(id);
  if (!node) return;

  state.activeId = id;
  canvasStatus.textContent = `Выбрано: ${node.title}`;
  detailsType.textContent = node.type;
  detailsTitle.textContent = node.title;
  detailsDescription.textContent = node.description;
  detailsOwner.textContent = node.owner;
  detailsRaci.textContent = node.raci;
  setRelatedChips(node);
  detailsPanel.classList.add("is-open");

  document.querySelectorAll(".node-list-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.node === id);
  });

  render();
}

const resetState = () => {
  state.activeId = null;
  state.hoverId = null;
  state.query = "";
  searchInput.value = "";
  canvasStatus.textContent = "Наведите или нажмите на блок схемы";
  detailsPanel.classList.remove("is-open");
  document.querySelectorAll(".node-list-button").forEach((button) => button.classList.remove("is-active"));
  render();
};

const buildNodeList = () => {
  visibleNodes.forEach((node) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "node-list-button";
    button.dataset.node = node.id;
    button.textContent = node.title;
    button.addEventListener("click", () => selectNode(node.id));
    nodeList.append(button);
  });
};

canvas.addEventListener("mousemove", (event) => {
  const node = hitTest(getCanvasPoint(event));
  const nextHoverId = node?.id || null;
  canvas.classList.toggle("is-clickable", Boolean(node));

  if (nextHoverId !== state.hoverId) {
    state.hoverId = nextHoverId;
    canvasStatus.textContent = node ? `Можно открыть: ${node.title}` : "Наведите или нажмите на блок схемы";
    render();
  }
});

canvas.addEventListener("mouseleave", () => {
  state.hoverId = null;
  canvas.classList.remove("is-clickable");
  canvasStatus.textContent = state.activeId ? `Выбрано: ${nodeById.get(state.activeId).title}` : "Наведите или нажмите на блок схемы";
  render();
});

canvas.addEventListener("click", (event) => {
  const node = hitTest(getCanvasPoint(event));
  if (node) selectNode(node.id);
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLocaleLowerCase("ru");
  state.activeId = null;
  detailsPanel.classList.remove("is-open");
  canvasStatus.textContent = state.query ? "Показаны совпадения на Canvas" : "Наведите или нажмите на блок схемы";
  render();
});

resetView.addEventListener("click", resetState);

closeDetails.addEventListener("click", () => {
  state.activeId = null;
  detailsPanel.classList.remove("is-open");
  document.querySelectorAll(".node-list-button").forEach((button) => button.classList.remove("is-active"));
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    resetState();
  }
});

buildNodeList();
render();
