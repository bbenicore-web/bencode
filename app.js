const canvas = document.querySelector("#cpo-canvas");
const ctx = canvas.getContext("2d");
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
  panel: "#ffffff",
};

const state = {
  activeId: null,
  hoverId: null,
  query: "",
};

const nodes = [
  {
    id: "business",
    title: "Связь с бизнесом",
    type: "Бизнес-контекст",
    owner: "CPO / бизнес",
    raci: "I/C",
    x: 30,
    y: 105,
    w: 205,
    h: 250,
    color: palette.green,
    fill: palette.greenSoft,
    description: "Связывает платформенную модель с ростом выручки, ARPU, цифровых продаж и удержанием.",
    lines: ["Рост выручки", "Рост ARPU", "Цифровые продажи", "Удержание", "Снижение оттока", "NPS / MAU / DAU"],
    related: ["telecom-core", "telecom-platform", "cx-platform", "vas-platform"],
  },
  {
    id: "bogdan",
    title: "Капралов Богдан",
    type: "Роль",
    owner: "Platform Lead Telecom",
    raci: "R",
    x: 30,
    y: 380,
    w: 205,
    h: 150,
    color: palette.green,
    fill: "#ffffff",
    description: "Руководитель платформы Telecom: отвечает за телеком-витрины, сценарии, UX-паттерны и воронки.",
    lines: ["Руководитель платформы Telecom", "Platform Lead Telecom", "Единая телеком-платформа"],
    related: ["telecom-platform", "team-telecom", "telecom-core"],
  },
  {
    id: "telecom-core",
    title: "CPO Telecom Core",
    type: "Владелец домена",
    owner: "CPO Telecom Core",
    raci: "A",
    x: 310,
    y: 70,
    w: 330,
    h: 58,
    color: palette.green,
    fill: "#ffffff",
    description: "Владелец телеком-продуктов и P&L, отвечает за цифровые продажи и сквозные телеком-сценарии.",
    lines: ["владелец телеком-продуктов и P&L"],
    related: ["telecom-platform", "business", "team-telecom", "tariffs-unit"],
  },
  {
    id: "cx-core",
    title: "CPO CX",
    type: "Владелец платформы",
    owner: "CPO CX",
    raci: "A",
    x: 725,
    y: 70,
    w: 330,
    h: 58,
    color: palette.blue,
    fill: "#ffffff",
    description: "Владелец клиентских возможностей, единого опыта, дизайн-системы и общих CX-сервисов.",
    lines: ["владелец клиентских возможностей и опыта"],
    related: ["cx-platform", "team-cx", "design-system", "analytics"],
  },
  {
    id: "vas-core",
    title: "CPO VAS / Partners",
    type: "Владелец домена",
    owner: "CPO VAS / Partners",
    raci: "A",
    x: 1140,
    y: 70,
    w: 330,
    h: 58,
    color: palette.red,
    fill: "#ffffff",
    description: "Владелец VAS-направлений, партнерских сервисов, монетизации и внешних интеграций.",
    lines: ["владелец VAS-направлений и партнерских сервисов"],
    related: ["vas-platform", "team-vas", "partner-integration", "vas-unit"],
  },
  {
    id: "telecom-platform",
    title: "Telecom платформа",
    type: "Платформа",
    owner: "Platform Lead Telecom",
    raci: "R/A",
    x: 270,
    y: 160,
    w: 410,
    h: 545,
    color: palette.green,
    fill: palette.greenSoft,
    description: "Платформа Telecom Onbital: витрины, сквозные сценарии и сервисы для телеком-продуктов.",
    sections: [
      {
        title: "Витрины и навигация",
        items: ["Главная / виджеты", "Каталог тарифов", "Карточки тарифов", "Корзина услуг", "Платежи", "Телеком офферы"],
      },
      {
        title: "Сквозные сценарии",
        items: ["Покупка тарифа", "Смена тарифа", "SIM / eSIM", "Доп. услуги", "Номера", "Роуминг", "Подписки", "Домашний интернет", "Миграция"],
      },
      {
        title: "Сервисы платформы",
        items: ["Активация", "Профиль услуг", "API Gateway", "Биллинг", "Настройки"],
      },
    ],
    related: ["business", "telecom-core", "integration", "team-telecom", "data-model"],
  },
  {
    id: "cx-platform",
    title: "CX платформа",
    type: "Платформа",
    owner: "CPO CX",
    raci: "R/A",
    x: 695,
    y: 160,
    w: 410,
    h: 545,
    color: palette.blue,
    fill: palette.blueSoft,
    description: "Кросс-доменная платформа клиентского опыта: профиль, коммуникации, аналитика и единые UX-принципы.",
    sections: [
      {
        title: "Клиентский опыт",
        items: ["Главная навигация", "Профиль клиента", "Поиск", "Пуши", "Контент", "Онбординг", "Персонализация", "Обратная связь", "UI-компоненты"],
      },
      {
        title: "Сервисы CX",
        items: ["Авторизация", "CJM", "Эксперименты", "Аналитика", "A/B тесты", "Feature flags"],
      },
      {
        title: "Единые принципы",
        items: ["Дизайн-система", "UX-паттерны", "Доступность", "Микрокопи", "Производительность", "Измерение опыта"],
      },
    ],
    related: ["cx-core", "integration", "team-cx", "design-system", "analytics"],
  },
  {
    id: "vas-platform",
    title: "VAS платформа",
    type: "Платформа",
    owner: "CPO VAS / Partners",
    raci: "R/A",
    x: 1120,
    y: 160,
    w: 410,
    h: 545,
    color: palette.red,
    fill: palette.redSoft,
    description: "Платформа VAS и партнерских сервисов: категории, подписки, рекомендации и партнерские интеграции.",
    sections: [
      {
        title: "Категории VAS",
        items: ["Роуминг", "EVA", "Книги / Игры", "Финансы", "Кэшбэк", "Партнерские сервисы"],
      },
      {
        title: "Сервисы VAS",
        items: ["Каталог сервисов", "Карточки партнеров", "Подписки VAS", "Витрины", "Платежи", "Интеграции"],
      },
      {
        title: "Единый опыт VAS",
        items: ["Единый каталог", "Единый профиль", "Рекомендации", "Единые события", "Управление услугами", "Метрики"],
      },
    ],
    related: ["vas-core", "integration", "team-vas", "partner-integration", "vas-unit"],
  },
  {
    id: "principles",
    title: "Принципы модели",
    type: "Принципы",
    owner: "CPO / Platform Council",
    raci: "A/C",
    x: 1580,
    y: 120,
    w: 190,
    h: 245,
    color: palette.purple,
    fill: palette.purpleSoft,
    description: "Правила совместной работы доменов и платформ: ответственность, единый опыт, переиспользование и масштабируемость.",
    lines: ["Доменная ответственность", "Платформа дает возможности", "Единый клиентский опыт", "Переиспользование", "Масштабируемость"],
    related: ["cx-platform", "integration", "governance", "teams"],
  },
  {
    id: "governance",
    title: "Управление платформой",
    type: "Governance",
    owner: "CPO + комитеты",
    raci: "A",
    x: 1580,
    y: 390,
    w: 190,
    h: 215,
    color: palette.purple,
    fill: "#ffffff",
    description: "Platform Council, архитектурный, продуктовый и data-комитеты принимают кросс-доменные решения.",
    lines: ["Platform Council", "Архитектурный комитет", "Продуктовый комитет", "Data-комитет"],
    related: ["principles", "integration", "api-standards", "teams"],
  },
  {
    id: "integration",
    title: "Интеграция и взаимодействие платформ",
    type: "Интеграционный слой",
    owner: "Платформенные команды",
    raci: "R/A",
    x: 270,
    y: 740,
    w: 1260,
    h: 120,
    color: palette.purple,
    fill: palette.purpleSoft,
    description: "Связывает Telecom, CX и VAS через единый профиль, события, API-стандарты и обмен данными.",
    chips: ["Авторизация и профиль", "Уведомления", "Единая модель", "События", "Обмен данными", "API", "Согласование CJM"],
    related: ["telecom-platform", "cx-platform", "vas-platform", "api-standards", "data-model"],
  },
  {
    id: "units",
    title: "Бизнес-юниты Telecom",
    type: "Бизнес-юниты",
    owner: "Владельцы продуктов и P&L",
    raci: "A/R",
    x: 270,
    y: 900,
    w: 1260,
    h: 95,
    color: "#b98500",
    fill: "#fff9e6",
    description: "Продуктовые направления, которые используют платформенные возможности для реализации бизнес-целей.",
    chips: ["Тарифы", "Домашний интернет", "Конвергенция", "МегаСемья", "Роуминг", "VAS продукты", "Другие сервисы"],
    related: ["telecom-platform", "vas-platform", "teams", "business"],
  },
  {
    id: "teams",
    title: "Команды и зоны ответственности",
    type: "Команды",
    owner: "CPO + Platform Leads",
    raci: "R/A/C/I",
    x: 270,
    y: 1025,
    w: 1260,
    h: 95,
    color: palette.ink,
    fill: "#ffffff",
    description: "Команды Telecom, CX, VAS, платформенные и продуктовые команды распределяют ответственность по RACI.",
    teams: [
      ["Telecom Platform", palette.green],
      ["CX Platform", palette.blue],
      ["VAS Platform", palette.red],
      ["Платформенные команды", palette.purple],
      ["Продуктовые команды", "#30364a"],
    ],
    related: ["telecom-platform", "cx-platform", "vas-platform", "governance"],
  },
  {
    id: "api-standards",
    title: "API-стандарты",
    type: "Ключевая связь",
    owner: "Platform Council",
    raci: "A/R",
    x: 40,
    y: 620,
    w: 190,
    h: 85,
    color: palette.purple,
    fill: "#ffffff",
    description: "Единые API-стандарты упрощают интеграции между платформами и переиспользование сервисов.",
    lines: ["Единые API", "контракты", "переиспользование"],
    related: ["integration", "telecom-platform", "vas-platform", "governance"],
  },
  {
    id: "data-model",
    title: "Единая модель данных",
    type: "Ключевая связь",
    owner: "CX + Data",
    raci: "R/C",
    x: 1580,
    y: 650,
    w: 190,
    h: 85,
    color: palette.blue,
    fill: "#ffffff",
    description: "Единая модель данных синхронизирует профиль, продукты, события и аналитику между доменами.",
    lines: ["Профиль", "продукты", "события"],
    related: ["integration", "cx-platform", "telecom-platform", "vas-platform"],
  },
  {
    id: "design-system",
    title: "Дизайн-система",
    type: "CX-возможность",
    owner: "CX Platform",
    raci: "R/A",
    x: 1580,
    y: 765,
    w: 190,
    h: 75,
    color: palette.blue,
    fill: "#ffffff",
    description: "Обеспечивает единый визуальный язык, компоненты и UX-паттерны для всех доменов.",
    lines: ["компоненты", "UX-паттерны"],
    related: ["cx-platform", "principles", "teams"],
  },
  {
    id: "analytics",
    title: "Аналитика",
    type: "CX/Data сервис",
    owner: "CX Platform + Data",
    raci: "R/C",
    x: 40,
    y: 735,
    w: 190,
    h: 75,
    color: palette.blue,
    fill: "#ffffff",
    description: "Измеряет воронки, события, клиентский опыт и эффективность продуктовых гипотез.",
    lines: ["события", "воронки", "метрики"],
    related: ["cx-platform", "business", "integration", "units"],
  },
  {
    id: "partner-integration",
    title: "Партнерские интеграции",
    type: "VAS сервис",
    owner: "VAS Platform",
    raci: "R",
    x: 40,
    y: 840,
    w: 190,
    h: 80,
    color: palette.red,
    fill: "#ffffff",
    description: "Подключает внешних партнеров к VAS-каталогу, платежам, статусам и аналитике.",
    lines: ["партнеры", "статусы", "платежи"],
    related: ["vas-platform", "api-standards", "data-model", "units"],
  },
  {
    id: "tariffs-unit",
    title: "Тарифы",
    type: "Бизнес-юнит",
    owner: "CPO Telecom Core",
    raci: "A/R",
    x: 1580,
    y: 870,
    w: 190,
    h: 70,
    color: palette.green,
    fill: "#ffffff",
    description: "Ключевой телеком-продуктовый юнит, связанный с каталогом, покупкой, сменой тарифа и ARPU.",
    lines: ["каталог", "покупка", "ARPU"],
    related: ["telecom-core", "telecom-platform", "business", "units"],
  },
  {
    id: "vas-unit",
    title: "VAS продукты",
    type: "Бизнес-юнит",
    owner: "CPO VAS / Partners",
    raci: "A/R",
    x: 1580,
    y: 970,
    w: 190,
    h: 70,
    color: palette.red,
    fill: "#ffffff",
    description: "Партнерские и VAS-продукты, влияющие на ARPU, монетизацию и цифровые продажи.",
    lines: ["VAS", "партнеры", "монетизация"],
    related: ["vas-core", "vas-platform", "partner-integration", "units"],
  },
  {
    id: "team-telecom",
    title: "Команда Telecom Platform",
    type: "Команда",
    owner: "Platform Lead Telecom",
    raci: "R",
    x: 270,
    y: 1025,
    w: 0,
    h: 0,
    virtual: true,
    description: "Отвечает за телеком-витрины, сценарии покупки, активацию и интеграции.",
    related: ["telecom-platform", "telecom-core", "bogdan", "teams"],
  },
  {
    id: "team-cx",
    title: "Команда CX Platform",
    type: "Команда",
    owner: "CPO CX",
    raci: "R",
    x: 520,
    y: 1025,
    w: 0,
    h: 0,
    virtual: true,
    description: "Отвечает за профиль, UX, дизайн-систему, коммуникации и аналитику клиентского опыта.",
    related: ["cx-platform", "cx-core", "design-system", "teams"],
  },
  {
    id: "team-vas",
    title: "Команда VAS Platform",
    type: "Команда",
    owner: "CPO VAS / Partners",
    raci: "R",
    x: 770,
    y: 1025,
    w: 0,
    h: 0,
    virtual: true,
    description: "Отвечает за VAS-каталог, подписки, рекомендации и партнерские интеграции.",
    related: ["vas-platform", "vas-core", "partner-integration", "teams"],
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

const drawCard = (node) => {
  const isActive = state.activeId === node.id;
  const isRelated = state.activeId && (nodeById.get(state.activeId)?.related || []).includes(node.id);
  const isHovered = state.hoverId === node.id;
  const isMatch = matchesQuery(node);
  const hasQuery = Boolean(state.query);
  const isDimmed = (state.activeId && !isActive && !isRelated) || (hasQuery && !isMatch);

  ctx.save();
  ctx.globalAlpha = isDimmed ? 0.22 : 1;

  roundRect(node.x, node.y, node.w, node.h, 18);
  ctx.fillStyle = isMatch ? palette.yellowSoft : node.fill;
  ctx.fill();
  ctx.lineWidth = isActive ? 5 : isRelated || isHovered || isMatch ? 3 : 1.5;
  ctx.strokeStyle = isActive ? palette.purple : isMatch ? palette.yellow : isRelated ? palette.purple : node.color;
  ctx.stroke();

  ctx.fillStyle = node.color;
  ctx.fillRect(node.x, node.y, node.w, Math.min(8, node.h));

  const pad = 18;
  let cursorY = node.y + 18;
  drawText(node.title, node.x + node.w / 2, cursorY, node.w - pad * 2, "800 24px Inter, sans-serif", node.color, 28, "center");
  cursorY += node.title.length > 24 ? 58 : 34;

  if (node.lines) {
    node.lines.forEach((line) => {
      cursorY += drawPillLine(line, node.x + pad, cursorY, node.w - pad * 2, node.color);
    });
  }

  if (node.sections) {
    node.sections.forEach((section) => {
      cursorY += 8;
      drawText(section.title, node.x + node.w / 2, cursorY, node.w - pad * 2, "800 15px Inter, sans-serif", node.color, 18, "center");
      cursorY += 26;
      drawMiniGrid(section.items, node.x + pad, cursorY, node.w - pad * 2, node.color);
      cursorY += Math.ceil(section.items.length / 3) * 44 + 12;
    });
  }

  if (node.chips) {
    drawChipRow(node.chips, node.x + pad, cursorY + 6, node.w - pad * 2, node.color);
  }

  if (node.teams) {
    drawTeamRow(node.teams, node.x + pad, cursorY + 6, node.w - pad * 2);
  }

  ctx.restore();
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
  drawText(text, x + 24, y + 6, width - 30, "700 13px Inter, sans-serif", palette.ink, 16);
  return 34;
};

const drawMiniGrid = (items, x, y, width, color) => {
  const gap = 8;
  const cellW = (width - gap * 2) / 3;
  items.forEach((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
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
};

const drawChipRow = (items, x, y, width, color) => {
  const gap = 8;
  const cellW = (width - gap * (items.length - 1)) / items.length;
  items.forEach((item, index) => {
    const cellX = x + index * (cellW + gap);
    roundRect(cellX, y, cellW, 44, 10);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(100, 112, 132, 0.22)";
    ctx.stroke();
    drawText(item, cellX + cellW / 2, y + 9, cellW - 12, "800 11px Inter, sans-serif", color, 13, "center");
  });
};

const drawTeamRow = (teams, x, y, width) => {
  const gap = 10;
  const cellW = (width - gap * (teams.length - 1)) / teams.length;
  teams.forEach(([label, color], index) => {
    const cellX = x + index * (cellW + gap);
    roundRect(cellX, y, cellW, 46, 12);
    ctx.fillStyle = color;
    ctx.fill();
    drawText(label, cellX + cellW / 2, y + 12, cellW - 16, "800 12px Inter, sans-serif", "#ffffff", 14, "center");
  });
};

const drawArrow = (from, to, color = palette.purple) => {
  const startX = from.x + from.w;
  const startY = from.y + from.h / 2;
  const endX = to.x;
  const endY = to.y + to.h / 2;
  const midX = (startX + endX) / 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(midX, startY, midX, endY, endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - 10, endY - 6);
  ctx.lineTo(endX - 10, endY + 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawHeader = () => {
  const gradient = ctx.createLinearGradient(620, 20, 1180, 20);
  gradient.addColorStop(0, "#3514a6");
  gradient.addColorStop(1, "#5a2ee8");
  roundRect(585, 20, 630, 54, 12);
  ctx.fillStyle = gradient;
  ctx.fill();
  drawText("CPO", 900, 30, 600, "900 25px Inter, sans-serif", "#ffffff", 28, "center");
  drawText("Цифровой продукт МегаФон: личный кабинет", 900, 56, 600, "700 13px Inter, sans-serif", "#ffffff", 15, "center");
};

const drawRaciLegend = () => {
  const y = 1125;
  const items = [
    ["R", "Responsible", palette.green],
    ["A", "Accountable", palette.red],
    ["C", "Consulted", "#30364a"],
    ["I", "Informed", palette.blue],
  ];

  drawText("Легенда RACI", 40, y, 160, "900 15px Inter, sans-serif", palette.purple, 18);
  items.forEach(([letter, label, color], index) => {
    const x = 190 + index * 190;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y + 10, 13, 0, Math.PI * 2);
    ctx.fill();
    drawText(letter, x, y + 2, 26, "900 13px Inter, sans-serif", "#ffffff", 16, "center");
    drawText(label, x + 24, y + 1, 150, "700 13px Inter, sans-serif", palette.ink, 16);
  });
};

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawHeader();
  drawArrow(nodeById.get("business"), nodeById.get("telecom-platform"), palette.green);
  drawArrow(nodeById.get("telecom-platform"), nodeById.get("cx-platform"), "rgba(74, 31, 199, 0.34)");
  drawArrow(nodeById.get("cx-platform"), nodeById.get("vas-platform"), "rgba(74, 31, 199, 0.34)");

  visibleNodes.forEach(drawCard);
  drawRaciLegend();
}

const getCanvasPoint = (event) => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
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
    node.type,
    node.owner,
    node.description,
    ...(node.lines || []),
    ...(node.chips || []),
    ...(node.sections || []).flatMap((section) => [section.title, ...section.items]),
    ...(node.teams || []).map(([label]) => label),
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
