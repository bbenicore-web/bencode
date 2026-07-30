import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createReadingsRepository } from "../../electricity/js/readings-repository.js";

function createFakeClient(response = { data: null, error: null }) {
  const client = {
    response,
    calls: [],
    filters: [],
    lastDelete: undefined,
    lastInsert: undefined,
    lastOrder: undefined,
    lastRpc: undefined,
    lastSelect: undefined,
    lastTable: undefined,
    lastUpdate: undefined,
    from(table) {
      this.lastTable = table;
      this.calls.push(["from", table]);

      const query = {
        delete: () => {
          client.lastDelete = true;
          client.calls.push(["delete"]);
          return query;
        },
        eq: (column, value) => {
          client.filters.push([column, value]);
          client.calls.push(["eq", column, value]);
          return query;
        },
        insert: (value) => {
          client.lastInsert = value;
          client.calls.push(["insert", value]);
          return query;
        },
        order: async (column, options) => {
          client.lastOrder = [column, options];
          client.calls.push(["order", column, options]);
          return client.response;
        },
        select: (columns = "*") => {
          client.lastSelect = columns;
          client.calls.push(["select", columns]);
          return query;
        },
        single: async () => {
          client.calls.push(["single"]);
          return client.response;
        },
        update: (value) => {
          client.lastUpdate = value;
          client.calls.push(["update", value]);
          return query;
        },
        then: (resolve, reject) => Promise.resolve(client.response).then(resolve, reject)
      };

      return query;
    },
    async rpc(name, parameters) {
      this.lastRpc = [name, parameters];
      this.calls.push(["rpc", name, parameters]);
      return this.response;
    }
  };

  return client;
}

test("lists the user's readings by reading date ascending", async () => {
  const readings = [
    { id: "reading-1", reading_date: "2025-08-15" },
    { id: "reading-2", reading_date: "2025-09-15" }
  ];
  const fakeClient = createFakeClient({ data: readings, error: null });
  const repository = createReadingsRepository(fakeClient);

  const result = await repository.list("user-1");

  assert.equal(fakeClient.lastTable, "electricity_readings");
  assert.deepEqual(fakeClient.filters, [["user_id", "user-1"]]);
  assert.deepEqual(fakeClient.lastOrder, ["reading_date", { ascending: true }]);
  assert.deepEqual(result, readings);
});

test("creates an unpaid reading with only persisted input fields", async () => {
  const persisted = { id: "reading-1", user_id: "user-1" };
  const fakeClient = createFakeClient({ data: persisted, error: null });
  const repository = createReadingsRepository(fakeClient);

  const result = await repository.create("user-1", {
    reading_date: "2025-09-15",
    t1_reading: 7425,
    t2_reading: 3376,
    t1_rate: 6.43,
    t2_rate: 2.71
  });

  assert.equal(fakeClient.lastTable, "electricity_readings");
  assert.deepEqual(fakeClient.lastInsert, {
    user_id: "user-1",
    reading_date: "2025-09-15",
    t1_reading: 7425,
    t2_reading: 3376,
    t1_rate: 6.43,
    t2_rate: 2.71,
    is_paid: false
  });
  assert.equal(fakeClient.lastSelect, "*");
  assert.equal(fakeClient.calls.at(-1)[0], "single");
  assert.deepEqual(result, persisted);
});

test("updates only reading fields and scopes the mutation by user and ID", async () => {
  const persisted = { id: "reading-7", reading_date: "2025-10-15" };
  const fakeClient = createFakeClient({ data: persisted, error: null });
  const repository = createReadingsRepository(fakeClient);

  const result = await repository.update("user-1", "reading-7", {
    reading_date: "2025-10-15",
    t1_reading: 7500,
    t2_reading: 3400,
    t1_rate: 6.43,
    t2_rate: 2.71,
    is_paid: true,
    totalCost: 1234
  });

  assert.deepEqual(fakeClient.lastUpdate, {
    reading_date: "2025-10-15",
    t1_reading: 7500,
    t2_reading: 3400,
    t1_rate: 6.43,
    t2_rate: 2.71
  });
  assert.deepEqual(fakeClient.filters, [
    ["user_id", "user-1"],
    ["id", "reading-7"]
  ]);
  assert.deepEqual(fakeClient.calls.slice(-2), [["select", "*"], ["single"]]);
  assert.deepEqual(result, persisted);
});

test("removes one reading scoped by user and ID and returns it", async () => {
  const persisted = { id: "reading-7", user_id: "user-1" };
  const fakeClient = createFakeClient({ data: persisted, error: null });
  const repository = createReadingsRepository(fakeClient);

  const result = await repository.remove("user-1", "reading-7");

  assert.equal(fakeClient.lastDelete, true);
  assert.deepEqual(fakeClient.filters, [
    ["user_id", "user-1"],
    ["id", "reading-7"]
  ]);
  assert.deepEqual(fakeClient.calls.slice(-2), [["select", "*"], ["single"]]);
  assert.deepEqual(result, persisted);
});

test("changes only payment status scoped by user and ID", async () => {
  const persisted = { id: "reading-7", is_paid: true };
  const fakeClient = createFakeClient({ data: persisted, error: null });
  const repository = createReadingsRepository(fakeClient);

  const result = await repository.setPaid("user-1", "reading-7", true);

  assert.deepEqual(fakeClient.lastUpdate, { is_paid: true });
  assert.deepEqual(fakeClient.filters, [
    ["user_id", "user-1"],
    ["id", "reading-7"]
  ]);
  assert.deepEqual(fakeClient.calls.slice(-2), [["select", "*"], ["single"]]);
  assert.deepEqual(result, persisted);
});

test("throws the Supabase error object unchanged", async () => {
  const error = { code: "23505", message: "duplicate reading date" };
  const fakeClient = createFakeClient({ data: null, error });
  const repository = createReadingsRepository(fakeClient);

  await assert.rejects(
    repository.list("user-1"),
    (thrown) => thrown === error
  );
});

test("saves a baseline and current reading through one focused RPC", async () => {
  const rows = [
    { id: "baseline", reading_date: "2025-07-15" },
    { id: "current", reading_date: "2025-08-15" }
  ];
  const fakeClient = createFakeClient({ data: rows, error: null });
  const repository = createReadingsRepository(fakeClient);

  const result = await repository.saveWithBaseline({
    currentId: "current",
    previous: {
      reading_date: "2025-07-15",
      t1_reading: 100,
      t2_reading: 200
    },
    current: {
      reading_date: "2025-08-15",
      t1_reading: 110,
      t2_reading: 220,
      t1_rate: 6.5,
      t2_rate: 3,
      totalCost: 125
    }
  });

  assert.deepEqual(fakeClient.lastRpc, [
    "save_electricity_reading_with_baseline",
    {
      p_current_id: "current",
      p_previous_date: "2025-07-15",
      p_previous_t1_reading: 100,
      p_previous_t2_reading: 200,
      p_reading_date: "2025-08-15",
      p_t1_reading: 110,
      p_t2_reading: 220,
      p_t1_rate: 6.5,
      p_t2_rate: 3
    }
  ]);
  assert.deepEqual(result, rows);
});

test("propagates an atomic baseline RPC error without synthesizing rows", async () => {
  const error = { code: "23514", message: "previous date must be before current date" };
  const fakeClient = createFakeClient({ data: null, error });
  const repository = createReadingsRepository(fakeClient);

  await assert.rejects(
    repository.saveWithBaseline({
      currentId: null,
      previous: {
        reading_date: "2025-08-15",
        t1_reading: 100,
        t2_reading: 200
      },
      current: {
        reading_date: "2025-08-15",
        t1_reading: 110,
        t2_reading: 220,
        t1_rate: 6.5,
        t2_rate: 3
      }
    }),
    (thrown) => thrown === error
  );
});

test("migration creates an RLS-protected readings table and updated-at trigger", async () => {
  const migration = await readFile(
    new URL(
      "../../electricity/supabase/20260725000000_create_electricity_readings.sql",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(migration, /create table public\.electricity_readings \(/);
  assert.match(migration, /id uuid primary key default gen_random_uuid\(\)/);
  assert.match(
    migration,
    /user_id uuid not null references auth\.users\(id\) on delete cascade/
  );
  assert.match(migration, /reading_date date not null/);
  assert.match(migration, /t1_reading numeric\(14,3\) not null check \(t1_reading >= 0\)/);
  assert.match(migration, /t2_reading numeric\(14,3\) not null check \(t2_reading >= 0\)/);
  assert.match(migration, /t1_rate numeric\(10,4\) not null check \(t1_rate > 0\)/);
  assert.match(migration, /t2_rate numeric\(10,4\) not null check \(t2_rate > 0\)/);
  assert.match(migration, /is_paid boolean not null default false/);
  assert.match(migration, /created_at timestamptz not null default now\(\)/);
  assert.match(migration, /updated_at timestamptz not null default now\(\)/);
  assert.match(migration, /unique \(user_id, reading_date\)/);
  assert.match(
    migration,
    /alter table public\.electricity_readings enable row level security/
  );
  assert.equal(migration.match(/create policy /g)?.length, 4);
  assert.equal(migration.match(/\(select auth\.uid\(\)\) = user_id/g)?.length, 5);
  assert.match(migration, /new\.updated_at = now\(\)/);
  assert.match(
    migration,
    /create trigger set_electricity_readings_updated_at[\s\S]*before update on public\.electricity_readings/
  );
  assert.doesNotMatch(migration, /(?:usage|cost|total_amount) numeric/);
});

test("migration rejects readings below the immediate previous row", async () => {
  const migration = await readFile(
    new URL(
      "../../electricity/supabase/20260725000000_create_electricity_readings.sql",
      import.meta.url
    ),
    "utf8"
  );
  const sql = migration.replace(/\s+/g, " ");

  assert.match(sql, /create function public\.validate_electricity_reading_monotonicity\(\)/);
  assert.match(
    sql,
    /where user_id = new\.user_id and reading_date < new\.reading_date .*order by reading_date desc limit 1/
  );
  assert.match(sql, /if new\.t1_reading < previous_t1_reading then/);
  assert.match(sql, /if new\.t2_reading < previous_t2_reading then/);
  assert.match(sql, /errcode = '23514'/);
  assert.match(sql, /constraint = 'electricity_readings_t1_monotonic'/);
  assert.match(sql, /constraint = 'electricity_readings_t2_monotonic'/);
});

test("migration acquires a transaction-scoped per-user lock before neighbor reads", async () => {
  const migration = await readFile(
    new URL(
      "../../electricity/supabase/20260725000000_create_electricity_readings.sql",
      import.meta.url
    ),
    "utf8"
  );
  const functionBody = migration.match(
    /create function public\.validate_electricity_reading_monotonicity\(\)[\s\S]*?as \$\$([\s\S]*?)\$\$;/
  )?.[1];

  assert.ok(functionBody, "expected the monotonicity trigger function body");
  const sql = functionBody.replace(/\s+/g, " ");
  const lockIndex = sql.search(
    /perform pg_catalog\.pg_advisory_xact_lock\( ?pg_catalog\.hashtextextended\(new\.user_id::text, 0\) ?\)/
  );
  const firstNeighborReadIndex = sql.indexOf("select t1_reading, t2_reading");

  assert.notEqual(lockIndex, -1, "expected a lock derived from new.user_id");
  assert.notEqual(firstNeighborReadIndex, -1, "expected neighbor reads");
  assert.ok(
    lockIndex < firstNeighborReadIndex,
    "the per-user lock must be acquired before reading neighbors"
  );
});

test("migration rejects readings above the immediate next row and excludes an updated row", async () => {
  const migration = await readFile(
    new URL(
      "../../electricity/supabase/20260725000000_create_electricity_readings.sql",
      import.meta.url
    ),
    "utf8"
  );
  const sql = migration.replace(/\s+/g, " ");

  assert.match(sql, /if tg_op = 'UPDATE' then excluded_id := old\.id/);
  assert.equal(
    sql.match(/and \(excluded_id is null or id <> excluded_id\)/g)?.length,
    2
  );
  assert.match(
    sql,
    /where user_id = new\.user_id and reading_date > new\.reading_date .*order by reading_date asc limit 1/
  );
  assert.match(sql, /if new\.t1_reading > next_t1_reading then/);
  assert.match(sql, /if new\.t2_reading > next_t2_reading then/);
  assert.match(
    sql,
    /create trigger validate_electricity_reading_monotonicity before insert or update on public\.electricity_readings/
  );
  assert.match(
    sql,
    /execute function public\.validate_electricity_reading_monotonicity\(\)/
  );
});

test("baseline-pair migration statically orders authentication, locking, mutations, and grants", async () => {
  const migration = await readFile(
    new URL(
      "../../electricity/supabase/20260730000000_save_electricity_reading_with_baseline.sql",
      import.meta.url
    ),
    "utf8"
  );
  const functionDefinition = migration.match(
    /create function public\.save_electricity_reading_with_baseline\([\s\S]*?\$\$;/
  )?.[0];
  const functionBody = functionDefinition?.match(/as \$\$([\s\S]*?)\$\$;/)?.[1];
  const sql = migration.replace(/\s+/g, " ");
  const bodySql = functionBody?.replace(/\s+/g, " ");

  assert.ok(functionDefinition, "expected the baseline-pair function definition");
  assert.ok(functionBody, "expected the baseline-pair function body");
  assert.match(
    functionDefinition.replace(/\s+/g, " "),
    /returns setof public\.electricity_readings language plpgsql security invoker set search_path = '' as \$\$/
  );
  assert.match(sql, /returns setof public\.electricity_readings/);
  const authCheck = bodySql.match(
    /if v_user_id is null then raise exception using .*?end if;/
  );
  const authCheckIndex = authCheck?.index ?? -1;
  const authCheckEndIndex = authCheckIndex + (authCheck?.[0].length ?? 0);
  const lockIndex = bodySql.search(
    /perform pg_catalog\.pg_advisory_xact_lock\( pg_catalog\.hashtextextended\(v_user_id::text, 0\) \)/
  );
  const tableAccessIndexes = [
    ...bodySql.matchAll(
      /(?:from|insert into|update) public\.electricity_readings/g
    )
  ].map((match) => match.index);
  const insertIndexes = [
    ...bodySql.matchAll(/insert into public\.electricity_readings/g)
  ].map((match) => match.index);
  const updateIndex = bodySql.indexOf("update public.electricity_readings");
  const returnIndex = bodySql.indexOf("return query");

  assert.match(bodySql, /v_user_id := \(select auth\.uid\(\)\)/);
  assert.notEqual(authCheckIndex, -1, "expected an unauthenticated-user guard");
  assert.notEqual(lockIndex, -1, "expected a transaction-scoped advisory lock");
  assert.equal(insertIndexes.length, 2, "expected current and baseline inserts");
  assert.notEqual(updateIndex, -1, "expected the current-row update branch");
  assert.notEqual(returnIndex, -1, "expected the pair return query");
  assert.ok(
    authCheckEndIndex < Math.min(...insertIndexes, updateIndex),
    "authentication must be checked before every write"
  );
  assert.ok(
    tableAccessIndexes.every((index) => lockIndex < index),
    "the advisory lock must precede every table read and write"
  );
  assert.ok(
    insertIndexes[0] < insertIndexes[1] && updateIndex < insertIndexes[1],
    "the current-row insert/update branches must precede the baseline insert"
  );
  assert.ok(
    insertIndexes.every((index) => index < returnIndex) && updateIndex < returnIndex,
    "both mutations must occur before the return query"
  );
  assert.match(
    bodySql,
    /update public\.electricity_readings set .* where id = p_current_id and user_id = v_user_id returning id into v_current_id/
  );
  assert.match(
    bodySql,
    /where user_id = v_user_id and reading_date < p_reading_date and \(p_current_id is null or id <> p_current_id\)/
  );
  assert.match(bodySql, /if p_previous_date >= p_reading_date then/);
  assert.match(bodySql, /if p_previous_t1_reading > p_t1_reading then/);
  assert.match(bodySql, /if p_previous_t2_reading > p_t2_reading then/);
  assert.match(bodySql, /return query .* order by (?:reading\.)?reading_date/);
  assert.match(sql, /revoke execute on function .* from public, anon/);
  assert.match(sql, /grant execute on function .* to authenticated/);
  assert.equal(
    sql.match(/grant execute on function /g)?.length,
    1,
    "authenticated must be the only grantee"
  );
  assert.doesNotMatch(
    sql,
    /grant execute on function .* to (?:public|anon|service_role)/
  );
  assert.doesNotMatch(sql, /(?:usage|cost|total_amount) numeric/);
});
