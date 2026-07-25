import { toUserMessage } from "./supabase.js";
import {
  calculatePeriods,
  calculateUnpaidTotal,
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

function emptyReadingForm(today) {
  return {
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

function readingErrors(candidate, readings, editingId) {
  const errors = validateReading(candidate, readings, editingId);

  for (const field of READING_FIELDS.slice(1)) {
    if (!Number.isFinite(candidate[field])) {
      errors[field] = "Введите число";
    }
  }

  return errors;
}

function persistedReadingInput(candidate) {
  return Object.fromEntries(
    READING_FIELDS.map((field) => [field, candidate[field]])
  );
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
    const errors = readingErrors(
      candidate,
      nextState.readings,
      nextState.editingId
    );
    let preview = null;

    if (Object.keys(errors).length === 0) {
      const previewReadings = nextState.editingId
        ? nextState.readings.map((reading) =>
            reading.id === nextState.editingId
              ? {
                  ...reading,
                  ...candidate,
                  id: reading.id,
                  is_paid: reading.is_paid
                }
              : reading
          )
        : [...nextState.readings, candidate];
      preview = calculatePeriods(previewReadings).find(
        (period) => period.id === candidate.id
      );
    }

    return {
      ...nextState,
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

  async function renderSession(session) {
    mutationRequest += 1;
    const request = ++sessionRequest;

    if (session?.user) {
      render({
        status: "signedIn",
        user: session.user,
        readings: [],
        form: emptyReadingForm(today),
        editingId: null,
        fieldErrors: {},
        loadingReadings: true,
        pending: false,
        error: ""
      });

      try {
        const storedReadings = await readings.list(session.user.id);
        if (!destroyed && request === sessionRequest) {
          render({
            ...state,
            readings: storedReadings,
            loadingReadings: false
          });
        }
      } catch (error) {
        if (!destroyed && request === sessionRequest) {
          render({
            ...state,
            loadingReadings: false,
            error: toUserMessage(error)
          });
        }
      }
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
    if (!field || state.status !== "signedIn" || state.pending) {
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
      view.updatePreview(stateForView(state).preview);
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
    if (state.status !== "signedIn" || state.pending) {
      return;
    }

    const candidate = readingCandidate(
      state.form,
      state.editingId ?? "__preview__"
    );
    const errors = readingErrors(candidate, state.readings, state.editingId);
    if (Object.keys(errors).length > 0) {
      render({ ...state, fieldErrors: errors });
      return;
    }

    const input = persistedReadingInput(candidate);
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
      form: Object.fromEntries(
        READING_FIELDS.map((field) => [field, String(reading[field])])
      ),
      editingId: id,
      fieldErrors: {},
      error: ""
    });
  }

  async function handleReadingAction(event) {
    const button = event.target.closest?.("[data-action][data-id]");
    if (!button || state.status !== "signedIn" || state.pending) {
      return;
    }

    const { action, id } = button.dataset;
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
    root.addEventListener("click", handleReadingAction);
    root.addEventListener("click", signOut);
    authSubscription = auth.onAuthStateChange((_event, session) => {
      if (!destroyed) {
        void renderSession(session);
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
      root.removeEventListener("click", handleReadingAction);
      root.removeEventListener("click", signOut);
      authSubscription?.unsubscribe();
    }
  };
}
