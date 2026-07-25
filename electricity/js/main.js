import { createApp } from "./app.js";
import { createAuthService } from "./auth-service.js";
import { getSupabaseConfig } from "./config.js";
import { createReadingsRepository } from "./readings-repository.js";
import { createSupabaseClient } from "./supabase.js";

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
    readings: createReadingsRepository(client)
  };
}

export async function bootstrap({
  env = import.meta.env,
  root = document.querySelector("#app")
} = {}) {
  let config;

  try {
    config = getSupabaseConfig(env);
  } catch (error) {
    if (root) {
      renderSetupScreen(root, error.message);
    }
    throw error;
  }

  if (!root) {
    throw new Error("Не найден корневой элемент приложения.");
  }

  const client = createSupabaseClient(config);
  const { auth, readings } = createProductionServices(
    client,
    root.ownerDocument.defaultView.location
  );
  const app = createApp({
    auth,
    readings,
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
