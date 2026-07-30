import { formatRubles } from "./domain.js";

const PREVIOUS_REQUIREMENT_MESSAGE =
  "Предыдущая дата, показания Т1 и показания Т2 теперь обязательны.";

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
  const progress = state.pending
    ? '<p role="status" aria-live="polite" data-progress>Отправка данных…</p>'
    : "";

  return `
    <section aria-labelledby="auth-heading">
      <h2 id="auth-heading">Вход в приложение</h2>
      ${alert}
      ${notice}
      ${progress}
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

function fieldError(state, name) {
  const message = state.fieldErrors?.[name] ?? "";

  return {
    attributes: message
      ? ` aria-describedby="${name}-error" aria-invalid="true"`
      : "",
    message: escapeHtml(message)
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 3
  }).format(value);
}

function renderPreview(preview) {
  if (!preview) {
    return `
      <section data-preview aria-labelledby="preview-heading">
        <h4 id="preview-heading">Предварительный расчёт</h4>
        <p>Заполните корректно все поля, чтобы увидеть расчёт.</p>
      </section>
    `;
  }

  return `
    <section data-preview aria-labelledby="preview-heading">
      <h4 id="preview-heading">Предварительный расчёт</h4>
      ${
        preview.isBaseline
          ? "<p>Первая запись будет стартовой и не создаст начисление.</p>"
          : `
            <p>Т1: ${formatNumber(preview.t1Usage)} кВт⋅ч × ${formatNumber(preview.t1_rate)} ₽ = ${formatRubles(preview.t1Cost)}</p>
            <p>Т2: ${formatNumber(preview.t2Usage)} кВт⋅ч × ${formatNumber(preview.t2_rate)} ₽ = ${formatRubles(preview.t2Cost)}</p>
          `
      }
      <p><strong>Итого: ${formatRubles(preview.totalCost)}</strong></p>
    </section>
  `;
}

function renderReadingForm(state) {
  const disabled =
    state.pending || state.loadingReadings || !state.readingsLoaded
      ? " disabled"
      : "";
  const previousDisabled = disabled || (state.needsPrevious ? "" : " disabled");
  const previousDateError = fieldError(state, "previous_date");
  const previousT1Error = fieldError(state, "previous_t1_reading");
  const previousT2Error = fieldError(state, "previous_t2_reading");
  const dateError = fieldError(state, "reading_date");
  const t1ReadingError = fieldError(state, "t1_reading");
  const t2ReadingError = fieldError(state, "t2_reading");
  const t1RateError = fieldError(state, "t1_rate");
  const t2RateError = fieldError(state, "t2_rate");

  return `
    <form data-form="reading">
      <fieldset data-previous-fields aria-describedby="previous-fields-requirement"${state.needsPrevious ? "" : " hidden"}${previousDisabled}>
        <legend>Предыдущие показания</legend>
        <p>Нужны для расчёта первого оплачиваемого периода.</p>
        <p id="previous-fields-requirement" data-previous-requirement role="status" aria-live="polite"${state.needsPrevious ? "" : " hidden"}>${state.needsPrevious ? PREVIOUS_REQUIREMENT_MESSAGE : ""}</p>
        <div>
          <label for="previous_date">Предыдущая дата</label>
          <input id="previous_date" name="previous_date" type="date" value="${escapeHtml(state.form.previous_date)}"${state.needsPrevious ? " required" : ""}${previousDateError.attributes}${previousDisabled}>
          <p id="previous_date-error" data-field-error="previous_date">${previousDateError.message}</p>
        </div>
        <div>
          <label for="previous_t1_reading">Предыдущие показания Т1</label>
          <input id="previous_t1_reading" name="previous_t1_reading" type="text" inputmode="decimal" value="${escapeHtml(state.form.previous_t1_reading)}"${state.needsPrevious ? " required" : ""}${previousT1Error.attributes}${previousDisabled}>
          <p id="previous_t1_reading-error" data-field-error="previous_t1_reading">${previousT1Error.message}</p>
        </div>
        <div>
          <label for="previous_t2_reading">Предыдущие показания Т2</label>
          <input id="previous_t2_reading" name="previous_t2_reading" type="text" inputmode="decimal" value="${escapeHtml(state.form.previous_t2_reading)}"${state.needsPrevious ? " required" : ""}${previousT2Error.attributes}${previousDisabled}>
          <p id="previous_t2_reading-error" data-field-error="previous_t2_reading">${previousT2Error.message}</p>
        </div>
      </fieldset>
      <div>
        <label for="reading_date">Дата показаний</label>
        <input id="reading_date" name="reading_date" type="date" value="${escapeHtml(state.form.reading_date)}" required${dateError.attributes}${disabled}>
        <p id="reading_date-error" data-field-error="reading_date">${dateError.message}</p>
      </div>
      <div>
        <label for="t1_reading">Показания Т1</label>
        <input id="t1_reading" name="t1_reading" type="text" inputmode="decimal" value="${escapeHtml(state.form.t1_reading)}" required${t1ReadingError.attributes}${disabled}>
        <p id="t1_reading-error" data-field-error="t1_reading">${t1ReadingError.message}</p>
      </div>
      <div>
        <label for="t2_reading">Показания Т2</label>
        <input id="t2_reading" name="t2_reading" type="text" inputmode="decimal" value="${escapeHtml(state.form.t2_reading)}" required${t2ReadingError.attributes}${disabled}>
        <p id="t2_reading-error" data-field-error="t2_reading">${t2ReadingError.message}</p>
      </div>
      <div>
        <label for="t1_rate">Тариф Т1</label>
        <input id="t1_rate" name="t1_rate" type="text" inputmode="decimal" value="${escapeHtml(state.form.t1_rate)}" required${t1RateError.attributes}${disabled}>
        <p id="t1_rate-error" data-field-error="t1_rate">${t1RateError.message}</p>
      </div>
      <div>
        <label for="t2_rate">Тариф Т2</label>
        <input id="t2_rate" name="t2_rate" type="text" inputmode="decimal" value="${escapeHtml(state.form.t2_rate)}" required${t2RateError.attributes}${disabled}>
        <p id="t2_rate-error" data-field-error="t2_rate">${t2RateError.message}</p>
      </div>
      <button type="submit"${disabled}>${state.editingId ? "Сохранить изменения" : "Сохранить запись"}</button>
      ${
        state.editingId
          ? `<button type="button" data-action="cancelEdit" data-id="${escapeHtml(state.editingId)}"${disabled}>Отменить редактирование</button>`
          : ""
      }
    </form>
    ${renderPreview(state.preview)}
  `;
}

function renderHistoryCard(period, disabled) {
  const id = escapeHtml(period.id);
  const paymentStatus = period.is_paid ? "Оплачено" : "Не оплачено";
  const paymentAction = period.is_paid
    ? "Отметить неоплаченным"
    : "Отметить оплаченным";

  return `
    <article data-reading-id="${id}">
      <h4><time datetime="${escapeHtml(period.reading_date)}">${escapeHtml(period.reading_date)}</time></h4>
      ${period.isBaseline ? "<p>Стартовая запись</p>" : ""}
      <p data-tariff="t1">Т1: показание ${formatNumber(period.t1_reading)}, расход ${formatNumber(period.t1Usage)} кВт⋅ч, тариф ${formatNumber(period.t1_rate)} ₽, стоимость ${formatRubles(period.t1Cost)}</p>
      <p data-tariff="t2">Т2: показание ${formatNumber(period.t2_reading)}, расход ${formatNumber(period.t2Usage)} кВт⋅ч, тариф ${formatNumber(period.t2_rate)} ₽, стоимость ${formatRubles(period.t2Cost)}</p>
      <p><strong>Итого: ${formatRubles(period.totalCost)}</strong></p>
      <p>${paymentStatus}</p>
      <button type="button" data-action="togglePaid" data-id="${id}"${disabled}>${paymentAction}</button>
      <button type="button" data-action="edit" data-id="${id}"${disabled}>Редактировать</button>
      <button type="button" data-action="delete" data-id="${id}"${disabled}>Удалить</button>
    </article>
  `;
}

function renderHistory(state) {
  if (state.loadingReadings) {
    return "<p>Загрузка показаний…</p>";
  }

  if (!state.readingsLoaded) {
    return "<p>История недоступна, пока показания не загружены.</p>";
  }

  const summary = `<p data-unpaid-total>Задолженность: <strong>${formatRubles(state.unpaidTotal)}</strong></p>`;

  if (state.periods.length === 0) {
    return `
      ${summary}
      <p>Для первой записи укажите предыдущие показания — начисление рассчитается сразу.</p>
    `;
  }

  const disabled = state.pending ? " disabled" : "";
  const cards = [...state.periods]
    .reverse()
    .map((period) => renderHistoryCard(period, disabled))
    .join("");

  return `
    ${summary}
    <div>${cards}</div>
  `;
}

function renderSignedIn(state) {
  const email = escapeHtml(state.user.email ?? "");
  const pending = state.pending || state.loadingReadings ? " disabled" : "";
  const tabsDisabled =
    state.pending || state.loadingReadings || !state.readingsLoaded
      ? " disabled"
      : "";
  const readingsSelected = state.activeTab === "readings";
  const historySelected = state.activeTab === "history";
  const alert = state.error
    ? `<p role="alert">${escapeHtml(state.error)}</p>`
    : "";
  const retry =
    !state.readingsLoaded && !state.loadingReadings
      ? '<button type="button" data-action="retryReadings">Повторить загрузку</button>'
      : "";
  const loadingStatus = state.loadingReadings
    ? '<p role="status" aria-live="polite" data-progress>Загрузка показаний…</p>'
    : "";

  return `
    <section aria-labelledby="account-heading">
      <h2 id="account-heading">Личный кабинет</h2>
      <p>Вы вошли как ${email}</p>
      ${alert}
      ${loadingStatus}
      ${retry}
      <nav aria-label="Основная навигация">
        <div role="tablist" aria-label="Разделы приложения">
          <button id="readings-tab" type="button" role="tab" data-action="switchTab" data-tab="readings" aria-controls="readings" aria-selected="${readingsSelected}" tabindex="${readingsSelected ? "0" : "-1"}"${tabsDisabled}>Новая запись</button>
          <button id="history-tab" type="button" role="tab" data-action="switchTab" data-tab="history" aria-controls="history" aria-selected="${historySelected}" tabindex="${historySelected ? "0" : "-1"}"${tabsDisabled}>История</button>
        </div>
      </nav>
      <button type="button" data-action="signOut"${pending}>Выйти</button>
      <section id="readings" role="tabpanel" aria-labelledby="readings-tab"${readingsSelected ? "" : " hidden"}>
        <h3>Показания электроэнергии</h3>
        ${renderReadingForm(state)}
      </section>
      <section id="history" role="tabpanel" aria-labelledby="history-tab"${historySelected ? "" : " hidden"}>
        <h3>История</h3>
        ${renderHistory(state)}
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
    showFieldErrors,
    updateReadingForm(state) {
      const previousFields = root.querySelector("[data-previous-fields]");
      if (previousFields) {
        previousFields.hidden = !state.needsPrevious;
        previousFields.disabled = !state.needsPrevious;
        for (const field of previousFields.querySelectorAll("input")) {
          field.required = state.needsPrevious;
          field.disabled = !state.needsPrevious;
        }
      }
      const previousRequirement = root.querySelector(
        "[data-previous-requirement]"
      );
      if (previousRequirement) {
        previousRequirement.hidden = !state.needsPrevious;
        previousRequirement.textContent = state.needsPrevious
          ? PREVIOUS_REQUIREMENT_MESSAGE
          : "";
      }
      const currentPreview = root.querySelector("[data-preview]");
      if (currentPreview) {
        currentPreview.outerHTML = renderPreview(state.preview);
      }
    }
  };
}
