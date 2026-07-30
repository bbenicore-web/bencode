import { toUserMessage } from "./supabase.js";
import {
  calculatePeriods,
  calculateReadingPreview,
  calculateUnpaidTotal,
  findPreviousReading,
  requiresPreviousReading,
  validatePreviousReading,
  validateReading
} from "./domain.js";
import { createView } from "./view.js";

const REGISTRATION_NOTICE =
  "Регистрация завершена. Проверьте почту, чтобы подтвердить email.";
const READING_FIELDS = [
  "reading_date",
  "t1_reading",
  "t2_reading",
  "t1_rate",
  "t2_rate"
];
const PREVIOUS_FIELDS = [
  "previous_date",
  "previous_t1_reading",
  "previous_t2_reading"
];
const TABS = ["readings", "history"];
const VALIDATION_MESSAGES = {
  "Reading date is required": "Укажите дату показаний.",
  "A reading already exists for this date": "На эту дату уже есть запись.",
  "T1 reading must be zero or greater":
    "Показания Т1 не могут быть отрицательными.",
  "T2 reading must be zero or greater":
    "Показания Т2 не могут быть отрицательными.",
  "T1 rate must be greater than zero": "Тариф Т1 должен быть больше нуля.",
  "T2 rate must be greater than zero": "Тариф Т2 должен быть больше нуля.",
  "T1 reading cannot be below the previous reading":
    "Показания Т1 не могут быть меньше предыдущей записи.",
  "T2 reading cannot be below the previous reading":
    "Показания Т2 не могут быть меньше предыдущей записи.",
  "T1 reading cannot exceed the next reading":
    "Показания Т1 не могут превышать следующую запись.",
  "T2 reading cannot exceed the next reading":
    "Показания Т2 не могут превышать следующую запись.",
  "Previous date is required": "Укажите предыдущую дату.",
  "Previous date must be before the current date":
    "Предыдущая дата должна быть раньше текущей.",
  "Previous T1 reading must be zero or greater":
    "Предыдущие показания Т1 не могут быть отрицательными.",
  "Previous T2 reading must be zero or greater":
    "Предыдущие показания Т2 не могут быть отрицательными.",
  "Previous T1 reading cannot exceed the current reading":
    "Предыдущие показания Т1 не могут превышать текущие.",
  "Previous T2 reading cannot exceed the current reading":
    "Предыдущие показания Т2 не могут превышать текущие."
};

function emptyReadingForm(today) {
  return {
    previous_date: "",
    previous_t1_reading: "",
    previous_t2_reading: "",
    reading_date: today(),
    t1_reading: "",
    t2_reading: "",
    t1_rate: "",
    t2_rate: ""
  };
}

function parseDecimal(value) {
  const normalized = String(value).trim().replace(",", ".");
  return normalized === "" ? Number.NaN : Number(normalized);
}

function previousCandidate(form) {
  return {
    id: "__previous_preview__",
    reading_date: form.previous_date,
    t1_reading: parseDecimal(form.previous_t1_reading),
    t2_reading: parseDecimal(form.previous_t2_reading)
  };
}

function readingCandidate(form, id = "__preview__") {
  return {
    id,
    reading_date: form.reading_date,
    t1_reading: parseDecimal(form.t1_reading),
    t2_reading: parseDecimal(form.t2_reading),
    t1_rate: parseDecimal(form.t1_rate),
    t2_rate: parseDecimal(form.t2_rate),
    is_paid: false
  };
}

function readingErrors(
  candidate,
  readings,
  editingId,
  previous,
  needsPrevious
) {
  const errors = Object.fromEntries(
    Object.entries(validateReading(candidate, readings, editingId)).map(
      ([field, message]) => [
        field,
        VALIDATION_MESSAGES[message] ?? "Проверьте значение."
      ]
    )
  );

  for (const field of READING_FIELDS.slice(1)) {
    if (!Number.isFinite(candidate[field])) {
      errors[field] = "Введите число";
    }
  }

  if (needsPrevious) {
    Object.assign(
      errors,
      Object.fromEntries(
        Object.entries(validatePreviousReading(previous, candidate)).map(
          ([field, message]) => [
            field,
            VALIDATION_MESSAGES[message] ?? "Проверьте значение."
          ]
        )
      )
    );

    for (const field of PREVIOUS_FIELDS.slice(1)) {
      const candidateField = field.replace("previous_", "");
      if (!Number.isFinite(previous[candidateField])) {
        errors[field] = "Введите число";
      }
    }
  }

  return errors;
}

function persistedReadingInput(candidate) {
  return Object.fromEntries(
    READING_FIELDS.map((field) => [field, candidate[field]])
  );
}

function previousReadingInput(previous) {
  return {
    reading_date: previous.reading_date,
    t1_reading: previous.t1_reading,
    t2_reading: previous.t2_reading
  };
}

export function createApp({ auth, readings, root, confirm, today }) {
  const view = createView(root);
  let authSubscription;
  let destroyed = false;
  let mutationRequest = 0;
  let sessionRequest = 0;
  let startPromise;
  let state = { status: "loading" };

  function stateForView(nextState) {
    if (nextState.status !== "signedIn") {
      return nextState;
    }

    const periods = calculatePeriods(nextState.readings);
    const candidate = readingCandidate(
      nextState.form,
      nextState.editingId ?? "__preview__"
    );
    const previous = previousCandidate(nextState.form);
    const needsPrevious = requiresPreviousReading(
      candidate,
      nextState.readings,
      nextState.editingId
    );
    const errors = readingErrors(
      candidate,
      nextState.readings,
      nextState.editingId,
      previous,
      needsPrevious
    );
    let preview = null;

    if (Object.keys(errors).length === 0) {
      const predecessor = needsPrevious
        ? {
            ...previous,
            t1_rate: candidate.t1_rate,
            t2_rate: candidate.t2_rate,
            is_paid: false
          }
        : findPreviousReading(
            candidate,
            nextState.readings,
            nextState.editingId
          );
      preview = calculateReadingPreview(
        {
          ...candidate,
          is_paid:
            nextState.readings.find(
              (reading) => reading.id === nextState.editingId
            )?.is_paid ?? false
        },
        predecessor
      );
    }
    return {
      ...nextState,
      needsPrevious,
      periods,
      preview,
      unpaidTotal: calculateUnpaidTotal(periods)
    };
  }

  function render(nextState) {
    state = nextState;
    if (!destroyed) {
      view.render(stateForView(state));
    }
  }

  async function loadCanonicalReadings(user) {
    const request = ++sessionRequest;
    render({
      ...state,
      user,
      readingsLoaded: false,
      loadingReadings: true,
      pending: false,
      error: ""
    });

    try {
      const storedReadings = await readings.list(user.id);
      if (!destroyed && request === sessionRequest) {
        render({
          ...state,
          readings: storedReadings,
          readingsLoaded: true,
          loadingReadings: false,
          error: ""
        });
      }
    } catch (error) {
      let session;

      try {
        session = await auth.getSession();
      } catch {
        session = { user };
      }

      if (destroyed || request !== sessionRequest) {
        return;
      }

      if (!session?.user) {
        await renderSession(null);
        return;
      }

      if (session.user.id !== user.id) {
        await renderSession(session);
        return;
      }

      render({
        ...state,
        readings: [],
        readingsLoaded: false,
        loadingReadings: false,
        pending: false,
        error: toUserMessage(error)
      });
    }
  }

  async function renderSession(session) {
    mutationRequest += 1;

    if (session?.user) {
      const activeTab =
        state.status === "signedIn" && state.user.id === session.user.id
          ? state.activeTab
          : "readings";
      render({
        status: "signedIn",
        user: session.user,
        readings: [],
        readingsLoaded: false,
        form: emptyReadingForm(today),
        editingId: null,
        fieldErrors: {},
        activeTab,
        loadingReadings: true,
        pending: false,
        error: ""
      });
      await loadCanonicalReadings(session.user);
      return;
    }

    render({
      status: "signedOut",
      email: state.email ?? "",
      pending: false,
      error: "",
      notice: ""
    });
  }

  function handleAuthStateChange(event, session) {
    const repeatsCurrentUser =
      state.status === "signedIn" &&
      session?.user?.id === state.user.id &&
      (event === "TOKEN_REFRESHED" || event === "SIGNED_IN");

    if (!repeatsCurrentUser) {
      void renderSession(session);
    }
  }

  async function submitAuthentication(event) {
    if (!event.target.matches('[data-form="auth"]')) {
      return;
    }

    event.preventDefault();
    if (state.pending) {
      return;
    }

    const FormData = event.target.ownerDocument.defaultView.FormData;
    const formData = new FormData(event.target);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const action = event.submitter?.value;

    view.clearFieldErrors();
    render({
      status: "signedOut",
      email,
      password,
      pending: true,
      error: "",
      notice: ""
    });

    try {
      const result =
        action === "signUp"
          ? await auth.signUp(email, password)
          : await auth.signIn(email, password);

      if (destroyed) {
        return;
      }

      if (result.session) {
        await renderSession(result.session);
      } else {
        render({
          status: "signedOut",
          email,
          pending: false,
          error: "",
          notice: REGISTRATION_NOTICE
        });
      }
    } catch (error) {
      render({
        status: "signedOut",
        email,
        password,
        pending: false,
        error: toUserMessage(error),
        notice: ""
      });
    }
  }

  function updateReadingForm(event) {
    const field = event.target.closest?.('[data-form="reading"] [name]');
    if (
      !field ||
      state.status !== "signedIn" ||
      !state.readingsLoaded ||
      state.pending
    ) {
      return;
    }

    state = {
      ...state,
      form: {
        ...state.form,
        [field.name]: field.value
      },
      fieldErrors: {}
    };

    if (!destroyed) {
      view.clearFieldErrors();
      view.updateReadingForm(stateForView(state));
    }
  }

  async function recoverMutation(error, failedState, request) {
    let session;

    try {
      session = await auth.getSession();
    } catch {
      session = { user: failedState.user };
    }

    if (destroyed || request !== mutationRequest) {
      return;
    }

    if (!session?.user) {
      await renderSession(null);
      return;
    }

    if (session.user.id !== failedState.user.id) {
      await renderSession(session);
      return;
    }

    let canonicalReadings = failedState.readings;
    try {
      canonicalReadings = await readings.list(session.user.id);
    } catch {
      // Keep the last confirmed canonical state when reconciliation also fails.
    }

    if (!destroyed && request === mutationRequest) {
      render({
        ...failedState,
        readings: canonicalReadings,
        pending: false,
        error: toUserMessage(error)
      });
    }
  }

  async function mutateReadings(operation, applyResult, { resetForm = false } = {}) {
    const failedState = state;
    const request = ++mutationRequest;
    render({ ...state, pending: true, error: "" });

    try {
      const result = await operation();
      if (destroyed || request !== mutationRequest) {
        return;
      }

      render({
        ...state,
        readings: applyResult(failedState.readings, result),
        form: resetForm ? emptyReadingForm(today) : state.form,
        editingId: resetForm ? null : state.editingId,
        fieldErrors: {},
        pending: false,
        error: ""
      });
    } catch (error) {
      await recoverMutation(error, failedState, request);
    }
  }

  async function submitReading(event) {
    if (!event.target.matches('[data-form="reading"]')) {
      return;
    }

    event.preventDefault();
    if (
      state.status !== "signedIn" ||
      !state.readingsLoaded ||
      state.pending
    ) {
      return;
    }

    const candidate = readingCandidate(
      state.form,
      state.editingId ?? "__preview__"
    );
    const previous = previousCandidate(state.form);
    const needsPrevious = requiresPreviousReading(
      candidate,
      state.readings,
      state.editingId
    );
    const errors = readingErrors(
      candidate,
      state.readings,
      state.editingId,
      previous,
      needsPrevious
    );
    if (Object.keys(errors).length > 0) {
      render({ ...state, fieldErrors: errors });
      return;
    }

    const input = persistedReadingInput(candidate);

    if (needsPrevious) {
      const currentId = state.editingId;
      await mutateReadings(
        () =>
          readings.saveWithBaseline({
            currentId,
            previous: previousReadingInput(previous),
            current: input
          }),
        (canonicalReadings, savedRows) => {
          if (!Array.isArray(savedRows) || savedRows.length !== 2) {
            throw new Error("Atomic baseline RPC did not return two rows");
          }

          const savedIds = new Set(savedRows.map((reading) => reading.id));
          return [
            ...canonicalReadings.filter(
              (reading) =>
                reading.id !== currentId && !savedIds.has(reading.id)
            ),
            ...savedRows
          ];
        },
        { resetForm: true }
      );
      return;
    }

    const userId = state.user.id;
    if (state.editingId) {
      const editingId = state.editingId;
      await mutateReadings(
        () => readings.update(userId, editingId, input),
        (canonicalReadings, updated) =>
          canonicalReadings.map((reading) =>
            reading.id === editingId ? { ...reading, ...updated } : reading
          ),
        { resetForm: true }
      );
    } else {
      await mutateReadings(
        () => readings.create(userId, input),
        (canonicalReadings, created) => [...canonicalReadings, created],
        { resetForm: true }
      );
    }
  }

  function beginEditing(id) {
    const reading = state.readings.find((item) => item.id === id);
    if (!reading) {
      return;
    }

    render({
      ...state,
      form: {
        ...emptyReadingForm(today),
        ...Object.fromEntries(
          READING_FIELDS.map((field) => [field, String(reading[field])])
        )
      },
      editingId: id,
      activeTab: "readings",
      fieldErrors: {},
      error: ""
    });
  }

  function selectTab(tab, moveFocus = false) {
    if (!state.readingsLoaded || !TABS.includes(tab)) {
      return;
    }

    render({ ...state, activeTab: tab });
    if (moveFocus && !destroyed) {
      root.querySelector(`[role="tab"][data-tab="${tab}"]`)?.focus();
    }
  }

  function handleTabKeydown(event) {
    const tab = event.target.closest?.('[role="tab"][data-tab]');
    if (
      !tab ||
      state.status !== "signedIn" ||
      !state.readingsLoaded ||
      state.pending
    ) {
      return;
    }

    const currentIndex = TABS.indexOf(tab.dataset.tab);
    let nextTab;

    if (event.key === "ArrowRight") {
      nextTab = TABS[(currentIndex + 1) % TABS.length];
    } else if (event.key === "ArrowLeft") {
      nextTab = TABS[(currentIndex - 1 + TABS.length) % TABS.length];
    } else if (event.key === "Home") {
      [nextTab] = TABS;
    } else if (event.key === "End") {
      nextTab = TABS.at(-1);
    } else if (event.key === "Enter" || event.key === " ") {
      nextTab = tab.dataset.tab;
    } else {
      return;
    }

    event.preventDefault();
    selectTab(nextTab, true);
  }

  async function handleReadingAction(event) {
    const button = event.target.closest?.("[data-action]");
    if (!button || state.status !== "signedIn" || state.pending) {
      return;
    }

    const { action, id } = button.dataset;

    if (action === "switchTab") {
      selectTab(button.dataset.tab, true);
      return;
    }

    if (action === "retryReadings") {
      if (!state.loadingReadings) {
        await loadCanonicalReadings(state.user);
      }
      return;
    }

    if (!state.readingsLoaded || !id) {
      return;
    }

    const reading = state.readings.find((item) => item.id === id);
    if (!reading) {
      return;
    }

    if (action === "edit") {
      beginEditing(id);
      return;
    }

    if (action === "cancelEdit") {
      render({
        ...state,
        form: emptyReadingForm(today),
        editingId: null,
        fieldErrors: {},
        error: ""
      });
      return;
    }

    if (action === "delete") {
      if (!confirm("Удалить эту запись?")) {
        return;
      }

      await mutateReadings(
        () => readings.remove(state.user.id, id),
        (canonicalReadings) =>
          canonicalReadings.filter((item) => item.id !== id),
        { resetForm: state.editingId === id }
      );
      return;
    }

    if (action === "togglePaid") {
      const isPaid = !reading.is_paid;
      await mutateReadings(
        () => readings.setPaid(state.user.id, id, isPaid),
        (canonicalReadings, updated) =>
          canonicalReadings.map((item) =>
            item.id === id ? { ...item, ...updated } : item
          )
      );
    }
  }

  async function signOut(event) {
    const button = event.target.closest?.('[data-action="signOut"]');
    if (!button || state.pending) {
      return;
    }

    render({ ...state, pending: true, error: "" });

    try {
      await auth.signOut();
      if (!destroyed) {
        renderSession(null);
      }
    } catch (error) {
      render({
        ...state,
        pending: false,
        error: toUserMessage(error)
      });
    }
  }

  async function restoreSession() {
    view.render({ status: "loading" });
    root.addEventListener("submit", submitAuthentication);
    root.addEventListener("submit", submitReading);
    root.addEventListener("input", updateReadingForm);
    root.addEventListener("keydown", handleTabKeydown);
    root.addEventListener("click", handleReadingAction);
    root.addEventListener("click", signOut);
    authSubscription = auth.onAuthStateChange((event, session) => {
      if (!destroyed) {
        handleAuthStateChange(event, session);
      }
    });

    try {
      const session = await auth.getSession();
      if (!destroyed) {
        await renderSession(session);
      }
    } catch (error) {
      render({
        status: "signedOut",
        email: "",
        pending: false,
        error: toUserMessage(error),
        notice: ""
      });
    }
  }

  return {
    start() {
      if (!startPromise) {
        startPromise = restoreSession();
      }
      return startPromise;
    },

    destroy() {
      destroyed = true;
      sessionRequest += 1;
      root.removeEventListener("submit", submitAuthentication);
      root.removeEventListener("submit", submitReading);
      root.removeEventListener("input", updateReadingForm);
      root.removeEventListener("keydown", handleTabKeydown);
      root.removeEventListener("click", handleReadingAction);
      root.removeEventListener("click", signOut);
      authSubscription?.unsubscribe();
    }
  };
}
