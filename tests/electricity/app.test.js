import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { JSDOM } from "jsdom";

import { createApp } from "../../electricity/js/app.js";
import {
  bootstrap,
  createProductionServices,
  getAppDirectoryUrl
} from "../../electricity/js/main.js";

function deferred() {
  let reject;
  let resolve;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

function createFakeAuth({ session = null } = {}) {
  let currentSession = session;
  let listener;
  const calls = [];
  const subscription = {
    unsubscribe() {
      calls.push(["unsubscribe"]);
    }
  };

  return {
    calls,
    subscription,
    emit(nextSession, event = "SIGNED_IN") {
      currentSession = nextSession;
      listener(event, nextSession);
    },
    async getSession() {
      calls.push(["getSession"]);
      return currentSession;
    },
    onAuthStateChange(callback) {
      calls.push(["onAuthStateChange"]);
      listener = callback;
      return subscription;
    },
    async signIn(email, password) {
      calls.push(["signIn", email, password]);
      return { session: { user: { id: "signed-in-user", email } } };
    },
    async signOut() {
      calls.push(["signOut"]);
    },
    async signUp(email, password) {
      calls.push(["signUp", email, password]);
      return { session: null, user: { id: "new-user", email } };
    }
  };
}

function reading(overrides = {}) {
  return {
    id: "reading-1",
    reading_date: "2025-08-15",
    t1_reading: 6989,
    t2_reading: 3136,
    t1_rate: 6.25,
    t2_rate: 2.5,
    is_paid: false,
    ...overrides
  };
}

function createFakeReadings(initialReadings = []) {
  const calls = [];
  let storedReadings = initialReadings.map((item) => ({ ...item }));

  return {
    calls,
    async create(userId, input) {
      calls.push(["create", userId, input]);
      const created = {
        id: `reading-${storedReadings.length + 1}`,
        user_id: userId,
        ...input,
        is_paid: false
      };
      storedReadings.push(created);
      return { ...created };
    },
    async list(userId) {
      calls.push(["list", userId]);
      return storedReadings.map((item) => ({ ...item }));
    },
    async remove(userId, id) {
      calls.push(["remove", userId, id]);
      const removed = storedReadings.find((item) => item.id === id);
      storedReadings = storedReadings.filter((item) => item.id !== id);
      return { ...removed };
    },
    async setPaid(userId, id, isPaid) {
      calls.push(["setPaid", userId, id, isPaid]);
      const changed = storedReadings.find((item) => item.id === id);
      Object.assign(changed, { is_paid: isPaid });
      return { ...changed };
    },
    async update(userId, id, input) {
      calls.push(["update", userId, id, input]);
      const changed = storedReadings.find((item) => item.id === id);
      Object.assign(changed, input);
      return { ...changed };
    }
  };
}

function createFixture(options = {}) {
  const dom = new JSDOM('<div id="app"></div>');
  const root = dom.window.document.querySelector("#app");
  const auth = options.auth ?? createFakeAuth();
  const readings = options.readings ?? createFakeReadings();
  const app = createApp({
    auth,
    readings,
    root,
    confirm: options.confirm ?? (() => true),
    today: options.today ?? (() => "2026-07-25")
  });

  return { app, auth, dom, readings, root };
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function submitAuthForm(root, { action = "signIn", email, password }) {
  const form = root.querySelector("form");
  form.elements.email.value = email;
  form.elements.password.value = password;
  const submitter = root.querySelector(`button[value="${action}"]`);
  form.dispatchEvent(
    new form.ownerDocument.defaultView.SubmitEvent("submit", {
      bubbles: true,
      cancelable: true,
      submitter
    })
  );
}

function enterReading(root, values) {
  for (const [name, value] of Object.entries(values)) {
    const field = root.querySelector(`[name="${name}"]`);
    field.value = value;
    field.dispatchEvent(
      new field.ownerDocument.defaultView.Event("input", { bubbles: true })
    );
  }
}

function submitReadingForm(root) {
  const form = root.querySelector('form[data-form="reading"]');
  form.dispatchEvent(
    new form.ownerDocument.defaultView.SubmitEvent("submit", {
      bubbles: true,
      cancelable: true
    })
  );
}

function normalizedText(element) {
  return element?.textContent.replaceAll("\u00a0", " ").replace(/\s+/g, " ").trim();
}

function click(root, selector) {
  const element = root.querySelector(selector);
  element.dispatchEvent(
    new element.ownerDocument.defaultView.MouseEvent("click", { bubbles: true })
  );
}

function pressTabKey(root, tab, key) {
  const element = root.querySelector(`[role="tab"][data-tab="${tab}"]`);
  element.focus();
  element.dispatchEvent(
    new element.ownerDocument.defaultView.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key
    })
  );
}

test("index provides a skip link, notification region, and app root", async () => {
  const html = await readFile(
    new URL("../../electricity/index.html", import.meta.url),
    "utf8"
  );
  const document = new JSDOM(html).window.document;

  assert.equal(document.querySelector('a[href="#main-content"]')?.textContent, "К содержанию");
  assert.equal(document.querySelector('[aria-live="polite"]')?.id, "notifications");
  assert.equal(document.querySelector("main#main-content")?.contains(document.querySelector("#app")), true);
});

test("bootstrap renders the setup screen and rejects missing public configuration", async () => {
  const dom = new JSDOM('<div id="app"><p>Загрузка…</p></div>');
  const root = dom.window.document.querySelector("#app");
  const setupMessage =
    "Не настроено подключение к Supabase. Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.";

  await assert.rejects(bootstrap({ env: {}, root }), {
    message: setupMessage
  });

  assert.equal(root.querySelector('[role="alert"]')?.textContent, setupMessage);
  assert.equal(root.querySelector("h2")?.textContent, "Требуется настройка");
});

test("derives the email confirmation redirect from the current app directory", () => {
  const cases = [
    ["http://localhost:5173/?source=signup", "http://localhost:5173/"],
    [
      "https://bbenicore-web.github.io/bencode/electricity/?source=signup",
      "https://bbenicore-web.github.io/bencode/electricity/"
    ]
  ];

  for (const [href, expected] of cases) {
    assert.equal(getAppDirectoryUrl({ href }), expected);
  }
});

test("production composition configures sign-up to return to the current app directory", async () => {
  const calls = [];
  const client = {
    auth: {
      async signUp(payload) {
        calls.push(payload);
        return { data: { user: { id: "new-user" }, session: null }, error: null };
      }
    }
  };

  const { auth } = createProductionServices(client, {
    href: "https://bbenicore-web.github.io/bencode/electricity/"
  });
  await auth.signUp("person@example.com", "secret-password");

  assert.deepEqual(calls, [
    {
      email: "person@example.com",
      password: "secret-password",
      options: {
        emailRedirectTo: "https://bbenicore-web.github.io/bencode/electricity/"
      }
    }
  ]);
});

test("shows loading immediately while the initial session is restored", async () => {
  const session = deferred();
  const auth = createFakeAuth();
  auth.getSession = () => session.promise;
  const { app, root } = createFixture({ auth });

  const started = app.start();

  assert.equal(root.querySelector('[role="status"]')?.textContent, "Загрузка…");

  session.resolve(null);
  await started;
});

test("renders a labelled sign-in form with separate login and registration actions", async () => {
  const { app, root } = createFixture();

  await app.start();

  assert.equal(root.querySelector('label[for="email"]')?.textContent, "Email");
  assert.equal(root.querySelector("#email")?.type, "email");
  assert.equal(root.querySelector('label[for="password"]')?.textContent, "Пароль");
  assert.equal(root.querySelector("#password")?.type, "password");
  assert.equal(root.querySelector('button[value="signIn"]')?.textContent, "Войти");
  assert.equal(
    root.querySelector('button[value="signUp"]')?.textContent,
    "Зарегистрироваться"
  );
});

test("disables both auth actions while login is pending", async () => {
  const pending = deferred();
  const auth = createFakeAuth();
  auth.signIn = (email, password) => {
    auth.calls.push(["signIn", email, password]);
    return pending.promise;
  };
  const { app, root } = createFixture({ auth });
  await app.start();

  submitAuthForm(root, {
    email: "person@example.com",
    password: "secret-password"
  });

  assert.equal(root.querySelector('button[value="signIn"]').disabled, true);
  assert.equal(root.querySelector('button[value="signUp"]').disabled, true);
  pending.resolve({
    session: { user: { id: "user-1", email: "person@example.com" } }
  });
  await settle();
});

test("retains entered credentials and shows a safe Russian alert after a network failure", async () => {
  const auth = createFakeAuth();
  auth.signIn = async (email, password) => {
    auth.calls.push(["signIn", email, password]);
    throw new TypeError("Failed to fetch");
  };
  const { app, root } = createFixture({ auth });
  await app.start();

  submitAuthForm(root, {
    email: "person@example.com",
    password: "secret-password"
  });
  await settle();

  assert.equal(root.querySelector("#email").value, "person@example.com");
  assert.equal(root.querySelector("#password").value, "secret-password");
  assert.equal(
    root.querySelector('[role="alert"]')?.textContent,
    "Не удалось подключиться к серверу. Проверьте интернет-соединение."
  );
});

test("uses the registration action without conflating it with login", async () => {
  const { app, auth, root } = createFixture();
  await app.start();

  submitAuthForm(root, {
    action: "signUp",
    email: "new@example.com",
    password: "secret-password"
  });
  await settle();

  assert.deepEqual(
    auth.calls.filter(([method]) => method === "signUp" || method === "signIn"),
    [["signUp", "new@example.com", "secret-password"]]
  );
  assert.match(root.querySelector('[role="status"]')?.textContent, /проверьте почту/i);
});

test("renders signed-in navigation when authentication changes", async () => {
  const { app, auth, root } = createFixture();
  await app.start();

  auth.emit({
    user: { id: "user-1", email: "person@example.com" }
  });

  const navigation = root.querySelector('nav[aria-label="Основная навигация"]');
  assert.ok(navigation);
  assert.match(navigation.textContent, /Новая запись/);
  assert.match(navigation.textContent, /История/);
  assert.equal(root.querySelector("button[data-action='signOut']")?.textContent, "Выйти");
});

test("shows the baseline explanation and a reading form defaulted to today", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const { app, root } = createFixture({
    auth,
    today: () => "2026-08-03"
  });

  await app.start();

  assert.match(normalizedText(root.querySelector("#history")), /первая запись.*стартов/i);
  assert.match(normalizedText(root.querySelector("[data-unpaid-total]")), /0,00 ₽/);
  assert.equal(root.querySelector("#reading_date")?.value, "2026-08-03");
  for (const name of ["t1_reading", "t2_reading", "t1_rate", "t2_rate"]) {
    assert.equal(root.querySelector(`[name="${name}"]`)?.inputMode, "decimal");
  }
});

test("keeps unknown history locked after load failure and enables it only after retry succeeds", async () => {
  const retry = deferred();
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const readings = createFakeReadings();
  let listAttempts = 0;
  readings.list = async (userId) => {
    readings.calls.push(["list", userId]);
    listAttempts += 1;
    if (listAttempts === 1) {
      throw new TypeError("Failed to fetch");
    }
    return retry.promise;
  };
  const { app, root } = createFixture({ auth, readings });

  await app.start();

  assert.equal(
    normalizedText(root.querySelector('[role="alert"]')),
    "Не удалось подключиться к серверу. Проверьте интернет-соединение."
  );
  assert.equal(
    auth.calls.filter(([method]) => method === "getSession").length,
    2
  );
  assert.ok(root.querySelector('[data-action="retryReadings"]'));
  for (const control of root.querySelectorAll(
    'form[data-form="reading"] input, form[data-form="reading"] button'
  )) {
    assert.equal(control.disabled, true);
  }
  assert.equal(root.querySelector("[data-unpaid-total]"), null);

  enterReading(root, {
    reading_date: "2026-07-20",
    t1_reading: "6989",
    t2_reading: "3136",
    t1_rate: "6.25",
    t2_rate: "2.5"
  });
  submitReadingForm(root);
  await settle();
  assert.equal(
    readings.calls.filter(([method]) => method === "create").length,
    0
  );

  click(root, '[data-action="retryReadings"]');
  assert.equal(root.querySelector('form[data-form="reading"] button').disabled, true);
  assert.equal(root.querySelector("[data-reading-id]"), null);

  retry.resolve([reading({ id: "canonical" })]);
  await settle();

  assert.equal(
    readings.calls.filter(([method]) => method === "list").length,
    2
  );
  assert.ok(root.querySelector('[data-reading-id="canonical"]'));
  assert.equal(root.querySelector('form[data-form="reading"] button').disabled, false);
  assert.equal(root.querySelector('[data-action="retryReadings"]'), null);
});

test("returns to authentication when the initial readings failure finds no session", async () => {
  const session = {
    user: { id: "user-1", email: "person@example.com" }
  };
  const auth = createFakeAuth({ session });
  let sessionChecks = 0;
  auth.getSession = async () => {
    auth.calls.push(["getSession"]);
    sessionChecks += 1;
    return sessionChecks === 1 ? session : null;
  };
  const readings = createFakeReadings();
  readings.list = async (userId) => {
    readings.calls.push(["list", userId]);
    throw { code: "PGRST301", message: "JWT expired" };
  };
  const { app, root } = createFixture({ auth, readings });

  await app.start();

  assert.ok(root.querySelector('form[data-form="auth"]'));
  assert.equal(root.querySelector('form[data-form="reading"]'), null);
});

test("switches accessible tabs and preserves the active tab through mutations", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const readings = createFakeReadings([reading({ id: "baseline" })]);
  const { app, root } = createFixture({ auth, readings });
  await app.start();

  const tablist = root.querySelector('[role="tablist"]');
  const readingsTab = root.querySelector('[role="tab"][data-tab="readings"]');
  const historyTab = root.querySelector('[role="tab"][data-tab="history"]');
  assert.ok(tablist);
  assert.equal(readingsTab.textContent, "Новая запись");
  assert.equal(historyTab.textContent, "История");
  assert.equal(readingsTab.getAttribute("aria-selected"), "true");
  assert.equal(historyTab.getAttribute("aria-selected"), "false");
  assert.equal(root.querySelector('#readings[role="tabpanel"]').hidden, false);
  assert.equal(root.querySelector('#history[role="tabpanel"]').hidden, true);

  click(root, '[role="tab"][data-tab="history"]');

  assert.equal(
    root.querySelector('[role="tab"][data-tab="readings"]').getAttribute("aria-selected"),
    "false"
  );
  assert.equal(
    root.querySelector('[role="tab"][data-tab="history"]').getAttribute("aria-selected"),
    "true"
  );
  assert.equal(root.querySelector('#readings[role="tabpanel"]').hidden, true);
  assert.equal(root.querySelector('#history[role="tabpanel"]').hidden, false);

  click(root, '[data-action="togglePaid"][data-id="baseline"]');
  await settle();

  assert.equal(
    root.querySelector('[role="tab"][data-tab="history"]').getAttribute("aria-selected"),
    "true"
  );
  assert.equal(root.querySelector('#history[role="tabpanel"]').hidden, false);
});

test("wraps tab selection and focus with ArrowLeft and ArrowRight", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const { app, root } = createFixture({ auth });
  await app.start();

  pressTabKey(root, "readings", "ArrowLeft");

  let readingsTab = root.querySelector('[role="tab"][data-tab="readings"]');
  let historyTab = root.querySelector('[role="tab"][data-tab="history"]');
  assert.equal(readingsTab.getAttribute("aria-selected"), "false");
  assert.equal(readingsTab.tabIndex, -1);
  assert.equal(historyTab.getAttribute("aria-selected"), "true");
  assert.equal(historyTab.tabIndex, 0);
  assert.equal(root.ownerDocument.activeElement, historyTab);
  assert.equal(root.querySelector('#readings[role="tabpanel"]').hidden, true);
  assert.equal(root.querySelector('#history[role="tabpanel"]').hidden, false);

  pressTabKey(root, "history", "ArrowRight");

  readingsTab = root.querySelector('[role="tab"][data-tab="readings"]');
  historyTab = root.querySelector('[role="tab"][data-tab="history"]');
  assert.equal(readingsTab.getAttribute("aria-selected"), "true");
  assert.equal(readingsTab.tabIndex, 0);
  assert.equal(historyTab.getAttribute("aria-selected"), "false");
  assert.equal(historyTab.tabIndex, -1);
  assert.equal(root.ownerDocument.activeElement, readingsTab);
  assert.equal(root.querySelector('#readings[role="tabpanel"]').hidden, false);
  assert.equal(root.querySelector('#history[role="tabpanel"]').hidden, true);
});

test("selects and focuses the first and last tabs with Home and End", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const { app, root } = createFixture({ auth });
  await app.start();
  click(root, '[role="tab"][data-tab="history"]');

  pressTabKey(root, "history", "Home");

  let selected = root.querySelector('[role="tab"][aria-selected="true"]');
  assert.equal(selected.dataset.tab, "readings");
  assert.equal(selected.tabIndex, 0);
  assert.equal(root.ownerDocument.activeElement, selected);
  assert.equal(root.querySelector('#readings[role="tabpanel"]').hidden, false);
  assert.equal(root.querySelector('#history[role="tabpanel"]').hidden, true);

  pressTabKey(root, "readings", "End");

  selected = root.querySelector('[role="tab"][aria-selected="true"]');
  assert.equal(selected.dataset.tab, "history");
  assert.equal(selected.tabIndex, 0);
  assert.equal(root.ownerDocument.activeElement, selected);
  assert.equal(root.querySelector('#readings[role="tabpanel"]').hidden, true);
  assert.equal(root.querySelector('#history[role="tabpanel"]').hidden, false);
});

test("previews a first valid reading as a zero-cost baseline and accepts comma decimals", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const { app, root } = createFixture({ auth });
  await app.start();

  enterReading(root, {
    reading_date: "2026-07-25",
    t1_reading: "6989,5",
    t2_reading: "3136,5",
    t1_rate: "6,25",
    t2_rate: "2,50"
  });

  assert.match(normalizedText(root.querySelector("[data-preview]")), /0,00 ₽/);
});

test("previews exact T1 and T2 usage and costs for a second reading", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const readings = createFakeReadings([reading()]);
  const { app, root } = createFixture({ auth, readings });
  await app.start();

  enterReading(root, {
    reading_date: "2025-09-15",
    t1_reading: "7425",
    t2_reading: "3376",
    t1_rate: "6,43",
    t2_rate: "2,71"
  });

  const preview = normalizedText(root.querySelector("[data-preview]"));
  assert.match(preview, /Т1.*436.*2 803,48 ₽/);
  assert.match(preview, /Т2.*240.*650,40 ₽/);
  assert.match(preview, /3 453,88 ₽/);
});

test("updates the live preview without replacing the focused reading field", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const { app, root } = createFixture({ auth });
  await app.start();
  enterReading(root, {
    reading_date: "2026-07-25",
    t1_reading: "6989",
    t2_reading: "3136",
    t1_rate: "6.25",
    t2_rate: "2.5"
  });
  const field = root.querySelector("#t1_reading");
  field.focus();

  field.value = "6990";
  field.dispatchEvent(
    new field.ownerDocument.defaultView.Event("input", { bubbles: true })
  );

  assert.equal(root.ownerDocument.activeElement, field);
  assert.equal(root.querySelector("#t1_reading"), field);
  assert.match(normalizedText(root.querySelector("[data-preview]")), /0,00 ₽/);
});

test("shows field-level reading errors and does not persist invalid values", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const { app, readings, root } = createFixture({ auth });
  await app.start();

  enterReading(root, {
    reading_date: "",
    t1_reading: "-1",
    t2_reading: "-2",
    t1_rate: "0",
    t2_rate: "-1"
  });
  submitReadingForm(root);
  await settle();

  for (const name of [
    "reading_date",
    "t1_reading",
    "t2_reading",
    "t1_rate",
    "t2_rate"
  ]) {
    assert.ok(root.querySelector(`[data-field-error="${name}"]`)?.textContent);
    assert.equal(root.querySelector(`[name="${name}"]`)?.getAttribute("aria-invalid"), "true");
  }
  assert.deepEqual(
    Object.fromEntries(
      [
        "reading_date",
        "t1_reading",
        "t2_reading",
        "t1_rate",
        "t2_rate"
      ].map((name) => [
        name,
        normalizedText(root.querySelector(`[data-field-error="${name}"]`))
      ])
    ),
    {
      reading_date: "Укажите дату показаний.",
      t1_reading: "Показания Т1 не могут быть отрицательными.",
      t2_reading: "Показания Т2 не могут быть отрицательными.",
      t1_rate: "Тариф Т1 должен быть больше нуля.",
      t2_rate: "Тариф Т2 должен быть больше нуля."
    }
  );
  assert.equal(
    readings.calls.filter(([method]) => method === "create").length,
    0
  );
});

test("renders duplicate-date and neighbor validation errors only in Russian", async () => {
  const session = {
    user: { id: "user-1", email: "person@example.com" }
  };

  const duplicate = createFixture({
    auth: createFakeAuth({ session }),
    readings: createFakeReadings([reading({ id: "existing" })])
  });
  await duplicate.app.start();
  enterReading(duplicate.root, {
    reading_date: "2025-08-15",
    t1_reading: "6989",
    t2_reading: "3136",
    t1_rate: "6.25",
    t2_rate: "2.5"
  });
  submitReadingForm(duplicate.root);
  await settle();
  assert.equal(
    normalizedText(
      duplicate.root.querySelector('[data-field-error="reading_date"]')
    ),
    "На эту дату уже есть запись."
  );

  const below = createFixture({
    auth: createFakeAuth({ session }),
    readings: createFakeReadings([reading({ id: "previous" })])
  });
  await below.app.start();
  enterReading(below.root, {
    reading_date: "2025-09-15",
    t1_reading: "6988",
    t2_reading: "3135",
    t1_rate: "6.25",
    t2_rate: "2.5"
  });
  submitReadingForm(below.root);
  await settle();
  assert.equal(
    normalizedText(below.root.querySelector('[data-field-error="t1_reading"]')),
    "Показания Т1 не могут быть меньше предыдущей записи."
  );
  assert.equal(
    normalizedText(below.root.querySelector('[data-field-error="t2_reading"]')),
    "Показания Т2 не могут быть меньше предыдущей записи."
  );

  const above = createFixture({
    auth: createFakeAuth({ session }),
    readings: createFakeReadings([
      reading({ id: "editing" }),
      reading({
        id: "next",
        reading_date: "2025-09-15",
        t1_reading: 7000,
        t2_reading: 3200
      })
    ])
  });
  await above.app.start();
  click(above.root, '[data-action="edit"][data-id="editing"]');
  enterReading(above.root, {
    t1_reading: "7001",
    t2_reading: "3201"
  });
  submitReadingForm(above.root);
  await settle();
  assert.equal(
    normalizedText(above.root.querySelector('[data-field-error="t1_reading"]')),
    "Показания Т1 не могут превышать следующую запись."
  );
  assert.equal(
    normalizedText(above.root.querySelector('[data-field-error="t2_reading"]')),
    "Показания Т2 не могут превышать следующую запись."
  );

  const allMessages = [
    ...duplicate.root.querySelectorAll("[data-field-error]"),
    ...below.root.querySelectorAll("[data-field-error]"),
    ...above.root.querySelectorAll("[data-field-error]")
  ]
    .map(normalizedText)
    .filter(Boolean)
    .join(" ");
  assert.doesNotMatch(allMessages, /reading|must|cannot|previous|next|required/i);
});

test("renders newest-first history cards, separate tariff lines, and unpaid debt", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const readings = createFakeReadings([
    reading({ id: "baseline" }),
    reading({
      id: "paid",
      reading_date: "2025-09-15",
      t1_reading: 7425,
      t2_reading: 3376,
      t1_rate: 6.43,
      t2_rate: 2.71,
      is_paid: true
    }),
    reading({
      id: "newest",
      reading_date: "2025-10-15",
      t1_reading: 7500,
      t2_reading: 3400,
      t1_rate: 6.5,
      t2_rate: 3
    })
  ]);
  const { app, root } = createFixture({ auth, readings });

  await app.start();

  assert.deepEqual(
    [...root.querySelectorAll("[data-reading-id]")].map(
      (card) => card.dataset.readingId
    ),
    ["newest", "paid", "baseline"]
  );
  assert.match(normalizedText(root.querySelector("[data-unpaid-total]")), /559,50 ₽/);
  const newest = root.querySelector('[data-reading-id="newest"]');
  assert.match(normalizedText(newest.querySelector('[data-tariff="t1"]')), /Т1.*75.*487,50 ₽/);
  assert.match(normalizedText(newest.querySelector('[data-tariff="t2"]')), /Т2.*24.*72,00 ₽/);
  assert.match(normalizedText(newest), /559,50 ₽/);
});

test("creates a reading from normalized values and resets the form after success", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const { app, readings, root } = createFixture({
    auth,
    today: () => "2026-07-25"
  });
  await app.start();

  enterReading(root, {
    reading_date: "2026-07-20",
    t1_reading: "6989,5",
    t2_reading: "3136,5",
    t1_rate: "6,25",
    t2_rate: "2,50"
  });
  submitReadingForm(root);
  await settle();

  assert.deepEqual(
    readings.calls.find(([method]) => method === "create"),
    [
      "create",
      "user-1",
      {
        reading_date: "2026-07-20",
        t1_reading: 6989.5,
        t2_reading: 3136.5,
        t1_rate: 6.25,
        t2_rate: 2.5
      }
    ]
  );
  assert.ok(root.querySelector('[data-reading-id="reading-1"]'));
  assert.equal(root.querySelector("#reading_date").value, "2026-07-25");
  for (const name of ["t1_reading", "t2_reading", "t1_rate", "t2_rate"]) {
    assert.equal(root.querySelector(`[name="${name}"]`).value, "");
  }
});

test("retains raw reading values and refetches canonical history after a network failure", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const readings = createFakeReadings();
  readings.create = async (userId, input) => {
    readings.calls.push(["create", userId, input]);
    throw new TypeError("Failed to fetch");
  };
  const { app, root } = createFixture({ auth, readings });
  await app.start();

  const rawValues = {
    reading_date: "2026-07-20",
    t1_reading: "6989,5",
    t2_reading: "3136,5",
    t1_rate: "6,25",
    t2_rate: "2,50"
  };
  enterReading(root, rawValues);
  submitReadingForm(root);
  await settle();

  for (const [name, value] of Object.entries(rawValues)) {
    assert.equal(root.querySelector(`[name="${name}"]`).value, value);
  }
  assert.equal(
    normalizedText(root.querySelector('[role="alert"]')),
    "Не удалось подключиться к серверу. Проверьте интернет-соединение."
  );
  assert.equal(
    readings.calls.filter(([method]) => method === "list").length,
    2
  );
  assert.equal(root.querySelectorAll("[data-reading-id]").length, 0);
});

test("edits a canonical reading and recalculates later history periods", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const readings = createFakeReadings([
    reading({ id: "baseline" }),
    reading({
      id: "middle",
      reading_date: "2025-09-15",
      t1_reading: 7425,
      t2_reading: 3376,
      t1_rate: 6.43,
      t2_rate: 2.71
    }),
    reading({
      id: "newest",
      reading_date: "2025-10-15",
      t1_reading: 7500,
      t2_reading: 3400,
      t1_rate: 6.5,
      t2_rate: 3
    })
  ]);
  const { app, root } = createFixture({ auth, readings });
  await app.start();

  click(root, '[data-action="edit"][data-id="middle"]');
  assert.equal(root.querySelector("#reading_date").value, "2025-09-15");
  enterReading(root, {
    t1_reading: "7400",
    t2_reading: "3350"
  });
  submitReadingForm(root);
  await settle();

  assert.deepEqual(
    readings.calls.find(([method]) => method === "update"),
    [
      "update",
      "user-1",
      "middle",
      {
        reading_date: "2025-09-15",
        t1_reading: 7400,
        t2_reading: 3350,
        t1_rate: 6.43,
        t2_rate: 2.71
      }
    ]
  );
  assert.match(
    normalizedText(root.querySelector('[data-reading-id="newest"]')),
    /800,00 ₽/
  );
});

test("reorders an edited date and recalculates periods from the new chronology", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const readings = createFakeReadings([
    reading({
      id: "baseline",
      reading_date: "2025-01-15",
      t1_reading: 100,
      t2_reading: 100,
      t1_rate: 1,
      t2_rate: 1
    }),
    reading({
      id: "middle",
      reading_date: "2025-02-15",
      t1_reading: 200,
      t2_reading: 200,
      t1_rate: 1,
      t2_rate: 1
    }),
    reading({
      id: "newest",
      reading_date: "2025-03-15",
      t1_reading: 300,
      t2_reading: 300,
      t1_rate: 1,
      t2_rate: 1
    })
  ]);
  const { app, root } = createFixture({ auth, readings });
  await app.start();

  click(root, '[data-action="edit"][data-id="middle"]');
  enterReading(root, {
    reading_date: "2025-04-15",
    t1_reading: "400",
    t2_reading: "400"
  });
  submitReadingForm(root);
  await settle();

  assert.deepEqual(
    [...root.querySelectorAll("[data-reading-id]")].map(
      (card) => card.dataset.readingId
    ),
    ["middle", "newest", "baseline"]
  );
  assert.match(
    normalizedText(root.querySelector('[data-reading-id="newest"]')),
    /400,00 ₽/
  );
});

test("deletes a reading only after the exact confirmation prompt", async () => {
  const prompts = [];
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const readings = createFakeReadings([
    reading({ id: "baseline" }),
    reading({
      id: "newest",
      reading_date: "2025-09-15",
      t1_reading: 7425,
      t2_reading: 3376,
      t1_rate: 6.43,
      t2_rate: 2.71
    })
  ]);
  const { app, root } = createFixture({
    auth,
    readings,
    confirm(message) {
      prompts.push(message);
      return true;
    }
  });
  await app.start();

  click(root, '[data-action="delete"][data-id="newest"]');
  await settle();

  assert.deepEqual(prompts, ["Удалить эту запись?"]);
  assert.deepEqual(
    readings.calls.find(([method]) => method === "remove"),
    ["remove", "user-1", "newest"]
  );
  assert.equal(root.querySelector('[data-reading-id="newest"]'), null);
  assert.match(
    normalizedText(root.querySelector('[data-reading-id="baseline"]')),
    /0,00 ₽/
  );
});

test("leaves history unchanged when deletion is cancelled", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const readings = createFakeReadings([reading({ id: "baseline" })]);
  const { app, root } = createFixture({
    auth,
    readings,
    confirm: () => false
  });
  await app.start();

  click(root, '[data-action="delete"][data-id="baseline"]');
  await settle();

  assert.equal(
    readings.calls.filter(([method]) => method === "remove").length,
    0
  );
  assert.ok(root.querySelector('[data-reading-id="baseline"]'));
});

test("deleting a middle reading recalculates the downstream period", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const readings = createFakeReadings([
    reading({
      id: "baseline",
      reading_date: "2025-01-15",
      t1_reading: 100,
      t2_reading: 100
    }),
    reading({
      id: "middle",
      reading_date: "2025-02-15",
      t1_reading: 200,
      t2_reading: 200
    }),
    reading({
      id: "newest",
      reading_date: "2025-03-15",
      t1_reading: 300,
      t2_reading: 300,
      t1_rate: 2,
      t2_rate: 3
    })
  ]);
  const { app, root } = createFixture({ auth, readings });
  await app.start();
  assert.match(
    normalizedText(root.querySelector('[data-reading-id="newest"]')),
    /500,00 ₽/
  );

  click(root, '[data-action="delete"][data-id="middle"]');
  await settle();

  assert.equal(root.querySelector('[data-reading-id="middle"]'), null);
  assert.match(
    normalizedText(root.querySelector('[data-reading-id="newest"]')),
    /1 000,00 ₽/
  );
});

test("toggles paid status and removes that period from the debt total", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const readings = createFakeReadings([
    reading({ id: "baseline" }),
    reading({
      id: "unpaid",
      reading_date: "2025-09-15",
      t1_reading: 7425,
      t2_reading: 3376,
      t1_rate: 6.43,
      t2_rate: 2.71
    })
  ]);
  const { app, root } = createFixture({ auth, readings });
  await app.start();
  assert.match(normalizedText(root.querySelector("[data-unpaid-total]")), /3 453,88 ₽/);

  click(root, '[data-action="togglePaid"][data-id="unpaid"]');
  await settle();

  assert.deepEqual(
    readings.calls.find(([method]) => method === "setPaid"),
    ["setPaid", "user-1", "unpaid", true]
  );
  assert.match(normalizedText(root.querySelector("[data-unpaid-total]")), /0,00 ₽/);
  assert.match(
    normalizedText(root.querySelector('[data-reading-id="unpaid"]')),
    /Оплачено/
  );
});

test("disables reading controls while a mutation is pending", async () => {
  const pending = deferred();
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const readings = createFakeReadings();
  readings.create = (userId, input) => {
    readings.calls.push(["create", userId, input]);
    return pending.promise;
  };
  const { app, root } = createFixture({ auth, readings });
  await app.start();
  enterReading(root, {
    reading_date: "2026-07-20",
    t1_reading: "6989",
    t2_reading: "3136",
    t1_rate: "6.25",
    t2_rate: "2.5"
  });

  submitReadingForm(root);

  assert.equal(root.querySelector('form[data-form="reading"] button').disabled, true);
  for (const input of root.querySelectorAll('form[data-form="reading"] input')) {
    assert.equal(input.disabled, true);
  }

  pending.resolve({
    id: "created",
    user_id: "user-1",
    reading_date: "2026-07-20",
    t1_reading: 6989,
    t2_reading: 3136,
    t1_rate: 6.25,
    t2_rate: 2.5,
    is_paid: false
  });
  await settle();
});

test("returns to authentication when mutation recovery finds an expired session", async () => {
  const session = {
    user: { id: "user-1", email: "person@example.com" }
  };
  const auth = createFakeAuth({ session });
  let sessionChecks = 0;
  auth.getSession = async () => {
    auth.calls.push(["getSession"]);
    sessionChecks += 1;
    return sessionChecks === 1 ? session : null;
  };
  const readings = createFakeReadings();
  readings.create = async (userId, input) => {
    readings.calls.push(["create", userId, input]);
    throw { code: "PGRST301", message: "JWT expired" };
  };
  const { app, root } = createFixture({ auth, readings });
  await app.start();
  enterReading(root, {
    reading_date: "2026-07-20",
    t1_reading: "6989",
    t2_reading: "3136",
    t1_rate: "6.25",
    t2_rate: "2.5"
  });

  submitReadingForm(root);
  await settle();

  assert.ok(root.querySelector('form[data-form="auth"]'));
  assert.equal(root.querySelector("[data-reading-id]"), null);
});

test("returns to the signed-out login shell when the auth session becomes null", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const { app, root } = createFixture({ auth });
  await app.start();

  auth.emit(null, "SIGNED_OUT");

  assert.ok(root.querySelector('form[data-form="auth"]'));
  assert.equal(root.querySelector('button[value="signIn"]')?.textContent, "Войти");
  assert.equal(root.querySelector('nav[aria-label="Основная навигация"]'), null);
});

test("restores an existing session before showing the signed-in shell", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "restored-user", email: "restored@example.com" }
    }
  });
  const { app, root } = createFixture({ auth });

  await app.start();

  assert.match(root.textContent, /restored@example\.com/);
  assert.ok(root.querySelector('nav[aria-label="Основная навигация"]'));
});

test("logs out and returns to the authentication form", async () => {
  const auth = createFakeAuth({
    session: {
      user: { id: "user-1", email: "person@example.com" }
    }
  });
  const { app, root } = createFixture({ auth });
  await app.start();

  root
    .querySelector("button[data-action='signOut']")
    .dispatchEvent(new root.ownerDocument.defaultView.MouseEvent("click", { bubbles: true }));
  await settle();

  assert.equal(
    auth.calls.filter(([method]) => method === "signOut").length,
    1
  );
  assert.ok(root.querySelector("form"));
});

test("destroy removes DOM handling and unsubscribes from auth changes", async () => {
  const { app, auth, root } = createFixture();
  await app.start();

  app.destroy();
  root
    .querySelector('button[value="signIn"]')
    .dispatchEvent(new root.ownerDocument.defaultView.MouseEvent("click", { bubbles: true }));

  assert.equal(
    auth.calls.filter(([method]) => method === "unsubscribe").length,
    1
  );
  assert.equal(
    auth.calls.filter(([method]) => method === "signIn").length,
    0
  );
});
