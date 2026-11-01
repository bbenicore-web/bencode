import { createApp } from "./app.js";
import { createAuthService } from "./auth-service.js";
import {
  getBackendKind,
  getPocketBaseConfig,
  getSupabaseConfig
} from "./config.js";
import {
  createPocketBaseAuthService,
  createPocketBaseClient,
  createPocketBaseReadingsRepository,
  toUserMessage as toPocketBaseUserMessage
} from "./pocketbase-backend.js";
import { createReadingsRepository } from "./readings-repository.js";
import {
  createSupabaseClient,
  toUserMessage as toSupabaseUserMessage
} from "./supabase.js";

function renderSetupScreen(root, message) {
  root.innerHTML = `
    <section class="setup-card" aria-labelledby="setup-heading">
      <p class="eyebrow">Настройка приложения</p>
      <h2 id="setup-heading">Требуется настройка</h2>
      <p role="alert">${message}</p>
      <p class="setup-help">Добавьте публичные параметры подключения и перезапустите приложение.</p>
    </section>
  `;
}

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getAppDirectoryUrl(location) {
  return new URL("./", location.href).href;
}

export function createProductionServices(client, location) {
  return {
    auth: createAuthService(client, {
      emailRedirectTo: getAppDirectoryUrl(location)
    }),
    readings: createReadingsRepository(client),
    toUserMessage: toSupabaseUserMessage
  };
}

export function createPocketBaseProductionServices(client) {
  return {
    auth: createPocketBaseAuthService(client),
    readings: createPocketBaseReadingsRepository(client),
    toUserMessage: toPocketBaseUserMessage
  };
}

export async function bootstrap({
  env = import.meta.env,
  root = document.querySelector("#app")
} = {}) {
  const backend = getBackendKind(env);
  let services;

  try {
    if (backend === "pocketbase") {
      const config = getPocketBaseConfig(env);
      const client = createPocketBaseClient(config);
      services = createPocketBaseProductionServices(client);
    } else {
      const config = getSupabaseConfig(env);
      const client = createSupabaseClient(config);
      services = createProductionServices(
        client,
        root?.ownerDocument?.defaultView?.location ?? globalThis.location
      );
    }
  } catch (error) {
    if (root) {
      renderSetupScreen(root, error.message);
    }
    throw error;
  }

  if (!root) {
    throw new Error("Не найден корневой элемент приложения.");
  }

  const app = createApp({
    auth: services.auth,
    readings: services.readings,
    toUserMessage: services.toUserMessage,
    root,
    confirm: (message) => root.ownerDocument.defaultView.confirm(message),
    today: localDate
  });

  await app.start();
  return app;
}

if (typeof document !== "undefined") {
  void bootstrap().catch(() => {});
}
