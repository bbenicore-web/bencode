import { toUserMessage } from "./supabase.js";
import { createView } from "./view.js";

const REGISTRATION_NOTICE =
  "Регистрация завершена. Проверьте почту, чтобы подтвердить email.";

export function createApp({ auth, readings, root, confirm, today }) {
  const view = createView(root);
  let authSubscription;
  let destroyed = false;
  let startPromise;
  let state = { status: "loading" };

  function render(nextState) {
    state = nextState;
    if (!destroyed) {
      view.render(state);
    }
  }

  function renderSession(session) {
    if (session?.user) {
      render({
        status: "signedIn",
        user: session.user,
        pending: false,
        error: ""
      });
    } else {
      render({
        status: "signedOut",
        email: state.email ?? "",
        pending: false,
        error: "",
        notice: ""
      });
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
        renderSession(result.session);
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
    root.addEventListener("click", signOut);
    authSubscription = auth.onAuthStateChange((_event, session) => {
      if (!destroyed) {
        renderSession(session);
      }
    });

    try {
      const session = await auth.getSession();
      if (!destroyed) {
        renderSession(session);
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
      root.removeEventListener("submit", submitAuthentication);
      root.removeEventListener("click", signOut);
      authSubscription?.unsubscribe();
    }
  };
}
