function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLoading() {
  return '<p role="status">Загрузка…</p>';
}

function renderSignedOut(state) {
  const email = escapeHtml(state.email ?? "");
  const password = escapeHtml(state.password ?? "");
  const pending = state.pending ? " disabled" : "";
  const alert = state.error
    ? `<p role="alert">${escapeHtml(state.error)}</p>`
    : "";
  const notice = state.notice
    ? `<p role="status">${escapeHtml(state.notice)}</p>`
    : "";

  return `
    <section aria-labelledby="auth-heading">
      <h2 id="auth-heading">Вход в приложение</h2>
      ${alert}
      ${notice}
      <form data-form="auth">
        <div>
          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="email" value="${email}" required>
          <p id="email-error" data-field-error="email"></p>
        </div>
        <div>
          <label for="password">Пароль</label>
          <input id="password" name="password" type="password" autocomplete="current-password" value="${password}" required>
          <p id="password-error" data-field-error="password"></p>
        </div>
        <button type="submit" name="action" value="signIn"${pending}>Войти</button>
        <button type="submit" name="action" value="signUp"${pending}>Зарегистрироваться</button>
      </form>
    </section>
  `;
}

function renderSignedIn(state) {
  const email = escapeHtml(state.user.email ?? "");
  const pending = state.pending ? " disabled" : "";
  const alert = state.error
    ? `<p role="alert">${escapeHtml(state.error)}</p>`
    : "";

  return `
    <section aria-labelledby="account-heading">
      <h2 id="account-heading">Личный кабинет</h2>
      <p>Вы вошли как ${email}</p>
      ${alert}
      <nav aria-label="Основная навигация">
        <a href="#readings">Показания</a>
        <a href="#history">История</a>
      </nav>
      <button type="button" data-action="signOut"${pending}>Выйти</button>
      <section id="readings" aria-labelledby="readings-heading">
        <h3 id="readings-heading">Показания электроэнергии</h3>
      </section>
      <section id="history" aria-labelledby="history-heading">
        <h3 id="history-heading">История</h3>
      </section>
    </section>
  `;
}

export function createView(root) {
  function clearFieldErrors() {
    for (const message of root.querySelectorAll("[data-field-error]")) {
      const field = root.querySelector(`#${message.dataset.fieldError}`);
      message.textContent = "";
      field?.removeAttribute("aria-describedby");
      field?.removeAttribute("aria-invalid");
    }
  }

  function showFieldErrors(errors) {
    clearFieldErrors();

    for (const [name, text] of Object.entries(errors)) {
      const field = root.querySelector(`#${name}`);
      const message = root.querySelector(`[data-field-error="${name}"]`);
      if (!field || !message) {
        continue;
      }

      message.textContent = text;
      field.setAttribute("aria-describedby", message.id);
      field.setAttribute("aria-invalid", "true");
    }
  }

  return {
    clearFieldErrors,
    render(state) {
      if (state.status === "loading") {
        root.innerHTML = renderLoading();
      } else if (state.status === "signedIn") {
        root.innerHTML = renderSignedIn(state);
      } else {
        root.innerHTML = renderSignedOut(state);
      }
    },
    showFieldErrors
  };
}
