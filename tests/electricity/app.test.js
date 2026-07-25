import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { JSDOM } from "jsdom";

import { createApp } from "../../electricity/js/app.js";

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
      listener(event, nextSession);
    },
    async getSession() {
      calls.push(["getSession"]);
      return session;
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

function createFixture(options = {}) {
  const dom = new JSDOM('<div id="app"></div>');
  const root = dom.window.document.querySelector("#app");
  const auth = options.auth ?? createFakeAuth();
  const app = createApp({
    auth,
    readings: options.readings ?? {},
    root,
    confirm: options.confirm ?? (() => true),
    today: options.today ?? (() => "2026-07-25")
  });

  return { app, auth, dom, root };
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

test("retains the email and shows a safe Russian alert after login fails", async () => {
  const auth = createFakeAuth();
  auth.signIn = async (email, password) => {
    auth.calls.push(["signIn", email, password]);
    throw new Error("Invalid login credentials");
  };
  const { app, root } = createFixture({ auth });
  await app.start();

  submitAuthForm(root, {
    email: "person@example.com",
    password: "wrong-password"
  });
  await settle();

  assert.equal(root.querySelector("#email").value, "person@example.com");
  assert.equal(root.querySelector("#password").value, "");
  assert.equal(root.querySelector('[role="alert"]')?.textContent, "Неверный email или пароль.");
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
  assert.match(navigation.textContent, /Показания/);
  assert.match(navigation.textContent, /История/);
  assert.equal(root.querySelector("button[data-action='signOut']")?.textContent, "Выйти");
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
