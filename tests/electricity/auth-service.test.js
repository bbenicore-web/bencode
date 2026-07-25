import assert from "node:assert/strict";
import test from "node:test";

import { createAuthService } from "../../electricity/js/auth-service.js";
import { getSupabaseConfig } from "../../electricity/js/config.js";
import {
  createSupabaseClient,
  toUserMessage
} from "../../electricity/js/supabase.js";

const SETUP_MESSAGE =
  "Не настроено подключение к Supabase. Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.";

function createFakeClient() {
  const calls = [];
  const subscription = { unsubscribe() {} };
  const session = { user: { id: "user-1" } };

  return {
    calls,
    session,
    subscription,
    auth: {
      async getSession() {
        calls.push(["getSession"]);
        return { data: { session }, error: null };
      },
      async signUp(credentials) {
        calls.push(["signUp", credentials]);
        return { data: { user: { id: "new-user" }, session: null }, error: null };
      },
      async signInWithPassword(credentials) {
        calls.push(["signInWithPassword", credentials]);
        return { data: { user: session.user, session }, error: null };
      },
      async signOut() {
        calls.push(["signOut"]);
        return { error: null };
      },
      onAuthStateChange(callback) {
        calls.push(["onAuthStateChange", callback]);
        return { data: { subscription } };
      }
    }
  };
}

test("returns only validated public Supabase configuration", () => {
  const env = {
    VITE_SUPABASE_URL: "https://project.supabase.co",
    VITE_SUPABASE_ANON_KEY: "public-anon-key",
    get SUPABASE_SERVICE_ROLE_KEY() {
      throw new Error("service-role secret must not be read");
    }
  };

  assert.deepEqual(getSupabaseConfig(env), {
    url: "https://project.supabase.co",
    anonKey: "public-anon-key"
  });
});

test("rejects a missing Supabase URL with the Russian setup message", () => {
  assert.throws(
    () => getSupabaseConfig({ VITE_SUPABASE_ANON_KEY: "public-anon-key" }),
    (error) => error.message === SETUP_MESSAGE
  );
});

test("rejects a missing Supabase anon key with the Russian setup message", () => {
  assert.throws(
    () => getSupabaseConfig({ VITE_SUPABASE_URL: "https://project.supabase.co" }),
    (error) => error.message === SETUP_MESSAGE
  );
});

test("rejects malformed and non-http Supabase URLs with the Russian setup message", () => {
  for (const url of [
    "not a URL",
    "ftp://project.supabase.co",
    "javascript:alert('unsafe')"
  ]) {
    assert.throws(
      () =>
        getSupabaseConfig({
          VITE_SUPABASE_URL: url,
          VITE_SUPABASE_ANON_KEY: "public-anon-key"
        }),
      (error) => error.message === SETUP_MESSAGE,
      url
    );
  }
});

test("creates a Supabase client with an explicit persistent session contract", () => {
  const client = { name: "injected client" };
  const calls = [];
  const factory = (...args) => {
    calls.push(args);
    return client;
  };

  const result = createSupabaseClient(
    {
      url: "https://project.supabase.co",
      anonKey: "public-anon-key"
    },
    factory
  );

  assert.equal(result, client);
  assert.deepEqual(calls, [
    [
      "https://project.supabase.co",
      "public-anon-key",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    ]
  ]);
});

test("returns the current session", async () => {
  const client = createFakeClient();

  const result = await createAuthService(client).getSession();

  assert.equal(result, client.session);
  assert.deepEqual(client.calls, [["getSession"]]);
});

test("passes sign-up credentials to Supabase unchanged", async () => {
  const client = createFakeClient();
  const service = createAuthService(client);

  const result = await service.signUp(" not-an-email ", "x");

  assert.deepEqual(client.calls, [
    ["signUp", { email: " not-an-email ", password: "x" }]
  ]);
  assert.deepEqual(result, { user: { id: "new-user" }, session: null });
});

test("adds the configured email confirmation redirect to sign-up", async () => {
  const client = createFakeClient();
  const service = createAuthService(client, {
    emailRedirectTo: "https://example.com/electricity/"
  });

  await service.signUp("person@example.com", "secret-password");

  assert.deepEqual(client.calls, [
    [
      "signUp",
      {
        email: "person@example.com",
        password: "secret-password",
        options: {
          emailRedirectTo: "https://example.com/electricity/"
        }
      }
    ]
  ]);
});

test("passes sign-in credentials to Supabase unchanged", async () => {
  const client = createFakeClient();
  const service = createAuthService(client);

  const result = await service.signIn(" not-an-email ", "x");

  assert.deepEqual(client.calls, [
    ["signInWithPassword", { email: " not-an-email ", password: "x" }]
  ]);
  assert.deepEqual(result, { user: client.session.user, session: client.session });
});

test("signs out through Supabase", async () => {
  const client = createFakeClient();

  const result = await createAuthService(client).signOut();

  assert.equal(result, undefined);
  assert.deepEqual(client.calls, [["signOut"]]);
});

test("returns the auth subscription for cleanup", () => {
  const client = createFakeClient();
  const callback = () => {};

  const result = createAuthService(client).onAuthStateChange(callback);

  assert.equal(result, client.subscription);
  assert.deepEqual(client.calls, [["onAuthStateChange", callback]]);
});

test("throws raw Supabase auth errors unchanged", async (t) => {
  const error = { code: "auth_error", message: "Supabase auth failed" };
  const cases = [
    ["getSession", [], async () => ({ data: { session: null }, error })],
    ["signUp", ["a", "b"], async () => ({ data: null, error })],
    ["signIn", ["a", "b"], async () => ({ data: null, error })],
    ["signOut", [], async () => ({ error })]
  ];

  for (const [method, args, implementation] of cases) {
    await t.test(method, async () => {
      const client = createFakeClient();
      const authMethod = method === "signIn" ? "signInWithPassword" : method;
      client.auth[authMethod] = implementation;

      await assert.rejects(
        createAuthService(client)[method](...args),
        (thrown) => thrown === error
      );
    });
  }
});

test("maps common Supabase auth errors to safe Russian messages", () => {
  const cases = [
    [
      { message: "Invalid login credentials" },
      "Неверный email или пароль."
    ],
    [
      { code: "user_already_exists", message: "User already registered" },
      "Пользователь с таким email уже зарегистрирован."
    ],
    [
      { code: "weak_password", message: "Password should be at least 6 characters" },
      "Пароль слишком слабый. Используйте не менее 6 символов."
    ],
    [
      new TypeError("Failed to fetch"),
      "Не удалось подключиться к серверу. Проверьте интернет-соединение."
    ],
    [
      new TypeError("unexpected local failure"),
      "Не удалось выполнить запрос. Попробуйте ещё раз."
    ],
    [
      { message: "sensitive internal detail" },
      "Не удалось выполнить запрос. Попробуйте ещё раз."
    ]
  ];

  for (const [error, expected] of cases) {
    assert.equal(toUserMessage(error), expected);
  }
});
