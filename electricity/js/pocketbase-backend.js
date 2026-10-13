import PocketBase from "pocketbase";

const USER_MESSAGES = {
  invalidCredentials: "Неверный email или пароль.",
  duplicateUser: "Пользователь с таким email уже зарегистрирован.",
  weakPassword: "Пароль слишком слабый. Используйте не менее 6 символов.",
  network: "Не удалось подключиться к серверу. Проверьте интернет-соединение.",
  fallback: "Не удалось выполнить запрос. Попробуйте ещё раз."
};

const READING_FIELDS = [
  "reading_date",
  "t1_reading",
  "t2_reading",
  "t1_rate",
  "t2_rate"
];

function persistedReadingInput(input) {
  return Object.fromEntries(READING_FIELDS.map((field) => [field, input[field]]));
}

function normalizeDate(value) {
  const raw = String(value ?? "");
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

function mapReading(record) {
  return {
    id: record.id,
    user_id: record.user,
    reading_date: normalizeDate(record.reading_date),
    t1_reading: Number(record.t1_reading),
    t2_reading: Number(record.t2_reading),
    t1_rate: Number(record.t1_rate),
    t2_rate: Number(record.t2_rate),
    is_paid: Boolean(record.is_paid)
  };
}

function sessionFromModel(model) {
  if (!model?.id) {
    return null;
  }

  return {
    user: {
      id: model.id,
      email: model.email ?? ""
    }
  };
}

export function toUserMessage(error) {
  const status = Number(error?.status ?? 0);
  const message = String(error?.message ?? error ?? "").toLowerCase();
  const data = error?.data ?? {};
  const dataText = JSON.stringify(data).toLowerCase();

  if (
    status === 400 &&
    (message.includes("failed to authenticate") ||
      dataText.includes("invalid login") ||
      message.includes("invalid login"))
  ) {
    return USER_MESSAGES.invalidCredentials;
  }

  if (
    status === 400 &&
    (message.includes("already exists") ||
      dataText.includes("already exists") ||
      dataText.includes("unique constraint"))
  ) {
    return USER_MESSAGES.duplicateUser;
  }

  if (
    message.includes("password") &&
    (message.includes("at least") ||
      message.includes("too short") ||
      message.includes("weak") ||
      dataText.includes("min"))
  ) {
    return USER_MESSAGES.weakPassword;
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("network request failed") ||
    message.includes("networkerror")
  ) {
    return USER_MESSAGES.network;
  }

  return USER_MESSAGES.fallback;
}

export function createPocketBaseClient(config, factory = PocketBase) {
  const client = factory(config.url);
  client.autoCancellation(false);
  return client;
}

export function createPocketBaseAuthService(client) {
  return {
    async getSession() {
      if (!client.authStore.isValid) {
        return null;
      }

      try {
        await client.collection("users").authRefresh();
      } catch {
        client.authStore.clear();
        return null;
      }

      return sessionFromModel(client.authStore.model);
    },

    async signUp(email, password) {
      await client.collection("users").create({
        email,
        password,
        passwordConfirm: password
      });

      const auth = await client
        .collection("users")
        .authWithPassword(email, password);
      return {
        user: { id: auth.record.id, email: auth.record.email },
        session: sessionFromModel(auth.record)
      };
    },

    async signIn(email, password) {
      const auth = await client
        .collection("users")
        .authWithPassword(email, password);
      return {
        user: { id: auth.record.id, email: auth.record.email },
        session: sessionFromModel(auth.record)
      };
    },

    async signOut() {
      client.authStore.clear();
    },

    onAuthStateChange(callback) {
      const unsubscribe = client.authStore.onChange(() => {
        const session = client.authStore.isValid
          ? sessionFromModel(client.authStore.model)
          : null;
        callback(session ? "SIGNED_IN" : "SIGNED_OUT", session);
      }, false);

      return { unsubscribe };
    }
  };
}

export function createPocketBaseReadingsRepository(client) {
  return {
    async list(userId) {
      const rows = await client.collection("electricity_readings").getFullList({
        filter: `user = "${userId}"`,
        sort: "reading_date"
      });
      return rows.map(mapReading);
    },

    async create(userId, input) {
      const created = await client.collection("electricity_readings").create({
        user: userId,
        ...persistedReadingInput(input),
        reading_date: normalizeDate(input.reading_date)
        // PocketBase treats required bool false as blank; default is unpaid.
      });
      return mapReading(created);
    },

    async saveWithBaseline({ currentId = null, previous, current }) {
      const previousRow = await client.collection("electricity_readings").create({
        user: client.authStore.model.id,
        reading_date: normalizeDate(previous.reading_date),
        t1_reading: previous.t1_reading,
        t2_reading: previous.t2_reading,
        t1_rate: current.t1_rate,
        t2_rate: current.t2_rate
      });

      let currentRow;
      if (currentId) {
        currentRow = await client
          .collection("electricity_readings")
          .update(currentId, {
            ...persistedReadingInput(current),
            reading_date: normalizeDate(current.reading_date)
          });
      } else {
        currentRow = await client.collection("electricity_readings").create({
          user: client.authStore.model.id,
          ...persistedReadingInput(current),
          reading_date: normalizeDate(current.reading_date)
        });
      }

      return [mapReading(previousRow), mapReading(currentRow)];
    },

    async update(userId, id, input) {
      const updated = await client.collection("electricity_readings").update(id, {
        ...persistedReadingInput(input),
        reading_date: normalizeDate(input.reading_date)
      });
      return mapReading(updated);
    },

    async remove(userId, id) {
      const existing = await client.collection("electricity_readings").getOne(id);
      await client.collection("electricity_readings").delete(id);
      return mapReading(existing);
    },

    async setPaid(userId, id, isPaid) {
      const updated = await client
        .collection("electricity_readings")
        .update(id, { is_paid: isPaid });
      return mapReading(updated);
    }
  };
}
