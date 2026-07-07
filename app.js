const curatedNodes = {
  "telecom-core": {
    type: "Владелец домена",
    owner: "CPO Telecom Core",
    raci: "A",
    description:
      "Отвечает за телеком-продукты, их P&L, цифровые продажи и качество сквозных сценариев.",
    related: ["telecom-core", "team-telecom", "tariffs-unit", "revenue", "arpu"],
  },
  "cx-core": {
    type: "Владелец платформы",
    owner: "CPO CX",
    raci: "A",
    description:
      "Формирует единый клиентский опыт, общие UX-паттерны, дизайн-систему и клиентские возможности.",
    related: ["team-cx", "design-system", "analytics", "personalization", "single-experience"],
  },
  "vas-core": {
    type: "Владелец домена",
    owner: "CPO VAS / Partners",
    raci: "A",
    description:
      "Отвечает за VAS-направления, партнерские сервисы, монетизацию и интеграции с поставщиками.",
    related: ["team-vas", "partner-services", "partner-integration", "vas-unit", "recommendations"],
  },
  revenue: {
    type: "Бизнес-цель",
    owner: "CPO / бизнес-юниты",
    raci: "A/R",
    description:
      "Рост выручки поддерживается за счет цифровых витрин, персональных офферов и повышения конверсии.",
    related: ["tariff-buy", "telecom-offers", "vas-catalog", "digital-sales", "arpu"],
  },
  arpu: {
    type: "Бизнес-метрика",
    owner: "CPO Telecom Core",
    raci: "R",
    description:
      "ARPU растет через допродажи, VAS-предложения, конвергентные продукты и удержание активных клиентов.",
    related: ["upsell", "subscriptions", "recommendations", "retention", "telecom-offers"],
  },
  "digital-sales": {
    type: "Бизнес-цель",
    owner: "Telecom Platform + продуктовые команды",
    raci: "R",
    description:
      "Фокус на цифровых покупках, снижении трения в воронке и измерении конверсии по всем шагам.",
    related: ["catalog", "cards", "cart", "tariff-buy", "analytics", "ab-testing"],
  },
  retention: {
    type: "Бизнес-цель",
    owner: "CX + Telecom",
    raci: "R/C",
    description:
      "Удержание строится на релевантных коммуникациях, удобном управлении услугами и едином профиле клиента.",
    related: ["notifications", "profile", "vas-management", "feedback", "churn"],
  },
  churn: {
    type: "Бизнес-метрика",
    owner: "CPO / аналитика",
    raci: "I/R",
    description:
      "Отток отслеживается через продуктовые события, негативные сценарии и обратную связь клиентов.",
    related: ["analytics", "feedback", "measurement", "retention", "notification-hub"],
  },
  catalog: {
    type: "Витрина",
    owner: "Telecom Platform",
    raci: "R",
    description:
      "Каталог тарифов агрегирует доступные предложения и ведет клиента к карточке тарифа или покупке.",
    related: ["cards", "tariff-buy", "telecom-offers", "digital-sales", "api-gateway"],
  },
  cart: {
    type: "Покупка",
    owner: "Telecom Platform",
    raci: "R",
    description:
      "Корзина объединяет выбранные услуги, промоусловия, платежи и финальное подтверждение заказа.",
    related: ["tariff-buy", "payments", "billing", "api-gateway", "digital-sales"],
  },
  "api-gateway": {
    type: "Платформенный сервис",
    owner: "Telecom Platform",
    raci: "R",
    description:
      "Единый шлюз для интеграции телеком-сценариев с биллингом, каталогами, профилем и внешними сервисами.",
    related: ["billing", "data-model", "api-standards", "event-bus", "partner-integration"],
  },
  billing: {
    type: "Платформенный сервис",
    owner: "Telecom Platform",
    raci: "C/R",
    description:
      "Биллинг поддерживает расчеты, статусы платежей, тарификацию и синхронизацию с клиентскими сценариями.",
    related: ["payments", "cart", "commission", "api-gateway", "event-bus"],
  },
  "design-system": {
    type: "CX принцип",
    owner: "CX Platform",
    raci: "A/R",
    description:
      "Единая дизайн-система снижает расхождения между доменами и ускоряет сборку новых экранов.",
    related: ["ui-components", "patterns", "accessibility", "team-cx", "single-experience"],
  },
  analytics: {
    type: "Платформенный сервис",
    owner: "CX Platform + Data",
    raci: "R/C",
    description:
      "События и аналитика помогают измерять воронки, качество опыта, эффективность офферов и продуктовые гипотезы.",
    related: ["event-bus", "measurement", "ab-testing", "feature-flags", "vas-metrics"],
  },
  personalization: {
    type: "Клиентский опыт",
    owner: "CX Platform",
    raci: "R",
    description:
      "Персонализация адаптирует контент, офферы и коммуникации под профиль, контекст и поведение клиента.",
    related: ["content", "recommendations", "profile", "notification-hub", "telecom-offers"],
  },
  "partner-integration": {
    type: "VAS сервис",
    owner: "VAS Platform",
    raci: "R",
    description:
      "Интеграции с партнерами отвечают за подключение сервисов, обмен статусами, оплату и аналитику.",
    related: ["api-standards", "event-bus", "partner-cards", "commission", "vas-events"],
  },
  recommendations: {
    type: "VAS опыт",
    owner: "VAS Platform + CX",
    raci: "R/C",
    description:
      "Рекомендации помогают подбирать релевантные партнерские продукты и повышать конверсию в подключение.",
    related: ["personalization", "vas-catalog", "vas-profile", "analytics", "arpu"],
  },
  "auth-integration": {
    type: "Интеграционный слой",
    owner: "CX Platform",
    raci: "A/R",
    description:
      "Единая авторизация и профиль связывают телеком, CX и VAS-сценарии в одном клиентском контексте.",
    related: ["auth", "profile", "profile-telecom", "vas-profile", "single-experience"],
  },
  "event-bus": {
    type: "Интеграционный слой",
    owner: "Platform teams + Data",
    raci: "R/C",
    description:
      "Событийная модель синхронизирует изменения между платформами и обеспечивает сквозную аналитику.",
    related: ["analytics", "data-model", "vas-events", "billing", "measurement"],
  },
  "api-standards": {
    type: "Интеграционный слой",
    owner: "Platform Council",
    raci: "A/R",
    description:
      "Единые API-стандарты упрощают повторное использование сервисов и ускоряют подключение новых сценариев.",
    related: ["api-gateway", "partner-integration", "architecture", "reuse", "scale"],
  },
  ownership: {
    type: "Принцип модели",
    owner: "CPO",
    raci: "A",
    description:
      "Каждый домен владеет продуктовым результатом и принимает решения в границах своей ответственности.",
    related: ["telecom-core", "cx-core", "vas-core", "product-committee", "team-product"],
  },
  "platform-first": {
    type: "Принцип модели",
    owner: "Platform Council",
    raci: "A/R",
    description:
      "Общие возможности создаются как платформенные сервисы, а не как разрозненные доменные решения.",
    related: ["reuse", "scale", "api-standards", "team-platform", "platform-council"],
  },
  "single-experience": {
    type: "Принцип модели",
    owner: "CX Platform",
    raci: "A/R",
    description:
      "Клиент должен получать единый и предсказуемый опыт вне зависимости от домена и продуктовой категории.",
    related: ["design-system", "patterns", "auth-integration", "personalization", "team-cx"],
  },
  "platform-council": {
    type: "Орган управления",
    owner: "CPO + Platform Leads",
    raci: "A",
    description:
      "Platform Council согласует платформенные принципы, приоритеты общих сервисов и спорные кросс-доменные решения.",
    related: ["api-standards", "architecture", "product-committee", "data-committee", "platform-first"],
  },
  "team-telecom": {
    type: "Команда",
    owner: "Platform Lead Telecom",
    raci: "R",
    description:
      "Команда отвечает за телеком-витрины, сценарии покупки, переходы, сервисы активации и интеграции.",
    related: ["telecom-core", "catalog", "tariff-buy", "api-gateway", "billing"],
  },
  "team-cx": {
    type: "Команда",
    owner: "CPO CX",
    raci: "R",
    description:
      "Команда поддерживает единый клиентский опыт, дизайн-систему, профиль, коммуникации и аналитику опыта.",
    related: ["cx-core", "design-system", "analytics", "auth-integration", "personalization"],
  },
  "team-vas": {
    type: "Команда",
    owner: "CPO VAS / Partners",
    raci: "R",
    description:
      "Команда отвечает за VAS-каталог, партнерские карточки, подписки, рекомендации и партнерские интеграции.",
    related: ["vas-core", "vas-catalog", "partner-integration", "recommendations", "vas-metrics"],
  },
};

const defaultRelations = {
  telecom: ["telecom-core", "team-telecom", "api-gateway", "analytics", "digital-sales"],
  cx: ["cx-core", "team-cx", "design-system", "analytics", "single-experience"],
  vas: ["vas-core", "team-vas", "partner-integration", "recommendations", "arpu"],
  metric: ["analytics", "measurement", "product-committee"],
  principle: ["platform-council", "architecture", "product-committee"],
  unit: ["team-product", "telecom-core", "analytics"],
};

const detailsPanel = document.querySelector("#details-panel");
const detailsType = document.querySelector("#details-type");
const detailsTitle = document.querySelector("#details-title");
const detailsDescription = document.querySelector("#details-description");
const detailsOwner = document.querySelector("#details-owner");
const detailsRaci = document.querySelector("#details-raci");
const detailsRelated = document.querySelector("#details-related");
const closeDetails = document.querySelector("#close-details");
const resetView = document.querySelector("#reset-view");
const searchInput = document.querySelector("#scheme-search");
const nodes = Array.from(document.querySelectorAll(".node"));

const getNodeTone = (node) => {
  if (node.closest(".telecom") || node.classList.contains("team-green")) return "telecom";
  if (node.closest(".cx") || node.classList.contains("team-blue")) return "cx";
  if (node.closest(".vas") || node.classList.contains("team-red")) return "vas";
  if (node.classList.contains("metric")) return "metric";
  if (node.classList.contains("principle")) return "principle";
  if (node.classList.contains("unit")) return "unit";
  return "principle";
};

const getNodeLabel = (node) => node.textContent.replace(/\s+/g, " ").trim();

const nodeById = new Map(nodes.map((node) => [node.dataset.node, node]));

const inferNode = (node) => {
  const tone = getNodeTone(node);
  const label = getNodeLabel(node);
  return {
    type: tone === "metric" ? "Метрика / бизнес-цель" : "Элемент схемы",
    owner: node.closest(".platform-card")?.querySelector("header h2")?.textContent || "Кросс-функционально",
    raci: tone === "principle" ? "A/C" : "R/C",
    description: `${label} — кликабельная точка схемы. Используйте ее для обсуждения ответственности, зависимостей и влияния на клиентский путь.`,
    related: defaultRelations[tone] || [],
  };
};

const getNodeData = (node) => {
  const id = node.dataset.node;
  return { ...inferNode(node), ...curatedNodes[id], id, title: getNodeLabel(node) };
};

const clearState = () => {
  nodes.forEach((node) => {
    node.classList.remove("is-active", "is-related", "is-dimmed", "is-match");
    node.removeAttribute("aria-current");
  });
};

const setRelatedChips = (relatedIds) => {
  detailsRelated.innerHTML = "";

  if (!relatedIds.length) {
    const empty = document.createElement("span");
    empty.className = "related-chip";
    empty.textContent = "Связи не заданы";
    detailsRelated.append(empty);
    return;
  }

  relatedIds.forEach((id) => {
    const relatedNode = nodeById.get(id);
    if (!relatedNode) return;

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "related-chip";
    chip.textContent = getNodeLabel(relatedNode);
    chip.addEventListener("click", () => selectNode(relatedNode));
    detailsRelated.append(chip);
  });
};

function selectNode(node) {
  const data = getNodeData(node);
  const relatedIds = data.related.filter((id) => id !== data.id);

  clearState();
  node.classList.add("is-active");
  node.setAttribute("aria-current", "true");

  relatedIds.forEach((id) => {
    const relatedNode = nodeById.get(id);
    if (relatedNode) relatedNode.classList.add("is-related");
  });

  nodes.forEach((candidate) => {
    if (
      candidate !== node &&
      !candidate.classList.contains("is-related") &&
      !relatedIds.includes(candidate.dataset.node)
    ) {
      candidate.classList.add("is-dimmed");
    }
  });

  detailsType.textContent = data.type;
  detailsTitle.textContent = data.title;
  detailsDescription.textContent = data.description;
  detailsOwner.textContent = data.owner;
  detailsRaci.textContent = data.raci;
  setRelatedChips(relatedIds);
  detailsPanel.classList.add("is-open");
}

const applySearch = (query) => {
  const normalized = query.trim().toLocaleLowerCase("ru");
  clearState();

  if (!normalized) {
    return;
  }

  nodes.forEach((node) => {
    const data = getNodeData(node);
    const haystack = [
      data.title,
      data.type,
      data.owner,
      data.description,
      ...data.related.map((id) => getNodeLabel(nodeById.get(id) || { textContent: "" })),
    ]
      .join(" ")
      .toLocaleLowerCase("ru");

    if (haystack.includes(normalized)) {
      node.classList.add("is-match");
    } else {
      node.classList.add("is-dimmed");
    }
  });
};

nodes.forEach((node) => {
  node.addEventListener("click", () => selectNode(node));
});

searchInput.addEventListener("input", (event) => {
  applySearch(event.target.value);
});

resetView.addEventListener("click", () => {
  searchInput.value = "";
  clearState();
  detailsPanel.classList.remove("is-open");
});

closeDetails.addEventListener("click", () => {
  detailsPanel.classList.remove("is-open");
  nodes.forEach((node) => {
    node.classList.remove("is-active", "is-related", "is-dimmed");
    node.removeAttribute("aria-current");
  });
  applySearch(searchInput.value);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    detailsPanel.classList.remove("is-open");
    clearState();
    applySearch(searchInput.value);
  }
});
