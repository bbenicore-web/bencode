const SUPABASE_SETUP_MESSAGE =
  "Не настроено подключение к Supabase. Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.";
const POCKETBASE_SETUP_MESSAGE =
  "Не настроено подключение к PocketBase. Укажите VITE_POCKETBASE_URL.";
const SETUP_MESSAGE = SUPABASE_SETUP_MESSAGE;

function isMissing(value) {
  return typeof value !== "string" || value.trim() === "";
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname !== ""
    );
  } catch {
    return false;
  }
}

export function getBackendKind(env = import.meta.env) {
  const explicit = String(env?.VITE_BACKEND ?? "")
    .trim()
    .toLowerCase();

  if (explicit === "pocketbase" || explicit === "supabase") {
    return explicit;
  }

  if (!isMissing(env?.VITE_POCKETBASE_URL)) {
    return "pocketbase";
  }

  return "supabase";
}

export function getSupabaseConfig(env = import.meta.env) {
  const {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_ANON_KEY: anonKey
  } = env ?? {};

  if (isMissing(url) || !isHttpUrl(url) || isMissing(anonKey)) {
    throw new Error(SETUP_MESSAGE);
  }

  return { url, anonKey };
}

export function getPocketBaseConfig(env = import.meta.env) {
  const url = env?.VITE_POCKETBASE_URL;

  if (isMissing(url) || !isHttpUrl(url)) {
    throw new Error(POCKETBASE_SETUP_MESSAGE);
  }

  return { url: url.replace(/\/$/, "") };
}
