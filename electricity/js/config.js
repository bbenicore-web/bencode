const SETUP_MESSAGE =
  "Не настроено подключение к Supabase. Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.";

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
