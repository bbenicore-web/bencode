import { createClient } from "@supabase/supabase-js";

const USER_MESSAGES = {
  invalidCredentials: "Неверный email или пароль.",
  duplicateUser: "Пользователь с таким email уже зарегистрирован.",
  weakPassword: "Пароль слишком слабый. Используйте не менее 6 символов.",
  network: "Не удалось подключиться к серверу. Проверьте интернет-соединение.",
  fallback: "Не удалось выполнить запрос. Попробуйте ещё раз."
};

export function createSupabaseClient(config) {
  return createClient(config.url, config.anonKey);
}

export function toUserMessage(error) {
  const code = String(error?.code ?? "").toLowerCase();
  const message = String(error?.message ?? "").toLowerCase();

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials")
  ) {
    return USER_MESSAGES.invalidCredentials;
  }

  if (
    code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists")
  ) {
    return USER_MESSAGES.duplicateUser;
  }

  if (
    code === "weak_password" ||
    message.includes("weak password") ||
    message.includes("password should be at least")
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
