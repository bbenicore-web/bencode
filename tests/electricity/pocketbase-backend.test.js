import assert from "node:assert/strict";
import test from "node:test";

import {
  getBackendKind,
  getPocketBaseConfig
} from "../../electricity/js/config.js";
import {
  createPocketBaseAuthService,
  createPocketBaseClient,
  createPocketBaseReadingsRepository,
  toUserMessage
} from "../../electricity/js/pocketbase-backend.js";

test("selects pocketbase when VITE_POCKETBASE_URL is present", () => {
  assert.equal(
    getBackendKind({ VITE_POCKETBASE_URL: "https://example.com/pb" }),
    "pocketbase"
  );
});

test("keeps supabase as the default backend", () => {
  assert.equal(getBackendKind({}), "supabase");
});

test("validates pocketbase URL configuration", () => {
  assert.deepEqual(
    getPocketBaseConfig({ VITE_POCKETBASE_URL: "https://example.com/pb/" }),
    { url: "https://example.com/pb" }
  );
  assert.throws(
    () => getPocketBaseConfig({}),
    /VITE_POCKETBASE_URL/
  );
});

test("maps pocketbase auth failures to safe Russian messages", () => {
  assert.equal(
    toUserMessage({ status: 400, message: "Failed to authenticate." }),
    "Неверный email или пароль."
  );
  assert.equal(
    toUserMessage(new TypeError("Failed to fetch")),
    "Не удалось подключиться к серверу. Проверьте интернет-соединение."
  );
});

test("creates a pocketbase client through the injected factory", () => {
  const calls = [];
  const client = {
    autoCancellation(value) {
      calls.push(["autoCancellation", value]);
    }
  };
  const factory = (url) => {
    calls.push(["factory", url]);
    return client;
  };

  const result = createPocketBaseClient(
    { url: "https://example.com/pb" },
    factory
  );

  assert.equal(result, client);
  assert.deepEqual(calls, [
    ["factory", "https://example.com/pb"],
    ["autoCancellation", false]
  ]);
});

function createFakePocketBase() {
  const calls = [];
  let model = null;
  let valid = false;
  let listener;

  const readings = new Map();

  return {
    calls,
    authStore: {
      get isValid() {
        return valid;
      },
      get model() {
        return model;
      },
      clear() {
        calls.push(["clear"]);
        valid = false;
        model = null;
        listener?.();
      },
      onChange(callback) {
        listener = callback;
        return () => {
          listener = undefined;
        };
      }
    },
    collection(name) {
      return {
        async authWithPassword(email, password) {
          calls.push(["authWithPassword", name, email, password]);
          model = { id: "user-1", email };
          valid = true;
          listener?.();
          return { record: model, token: "token" };
        },
        async authRefresh() {
          calls.push(["authRefresh", name]);
          if (!valid) {
            throw new Error("missing auth");
          }
          return { record: model, token: "token" };
        },
        async create(payload) {
          calls.push(["create", name, payload]);
          if (name === "users") {
            return { id: "user-1", email: payload.email };
          }
          const id = `reading-${readings.size + 1}`;
          const row = { id, ...payload };
          readings.set(id, row);
          return row;
        },
        async getFullList({ filter, sort }) {
          calls.push(["getFullList", name, filter, sort]);
          return [...readings.values()].sort((a, b) =>
            String(a.reading_date).localeCompare(String(b.reading_date))
          );
        },
        async getOne(id) {
          return { ...readings.get(id) };
        },
        async update(id, payload) {
          const next = { ...readings.get(id), ...payload, id };
          readings.set(id, next);
          calls.push(["update", name, id, payload]);
          return next;
        },
        async delete(id) {
          calls.push(["delete", name, id]);
          readings.delete(id);
        }
      };
    }
  };
}

test("pocketbase auth service signs in and restores a session", async () => {
  const client = createFakePocketBase();
  const auth = createPocketBaseAuthService(client);

  const signedIn = await auth.signIn("a@example.com", "secret");
  assert.deepEqual(signedIn.session.user, {
    id: "user-1",
    email: "a@example.com"
  });

  const session = await auth.getSession();
  assert.equal(session.user.id, "user-1");
});

test("pocketbase readings repository maps records for the app", async () => {
  const client = createFakePocketBase();
  await client.collection("users").authWithPassword("a@example.com", "x");
  const readings = createPocketBaseReadingsRepository(client);

  const created = await readings.create("user-1", {
    reading_date: "2026-01-01T00:00:00.000Z",
    t1_reading: 10,
    t2_reading: 5,
    t1_rate: 6,
    t2_rate: 2
  });

  assert.equal(created.reading_date, "2026-01-01");
  assert.equal(created.user_id, "user-1");
  assert.equal(created.is_paid, false);

  const listed = await readings.list("user-1");
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, created.id);
});
