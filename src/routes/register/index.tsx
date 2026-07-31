import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { type DocumentHead, useNavigate } from "@builder.io/qwik-city";
import { wa, useWaTextInput, type WaInputElement } from "~/lib/wa";
import { isValidUsername } from "~/lib/validation";
import { currentServer } from "~/lib/server";
import { register, isPasskeySupported, WebAuthnError } from "~/lib/webauthn";

export default component$(() => {
  const nav = useNavigate();
  const username = useSignal("");
  const touched = useSignal(false);
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);
  const formatError = useSignal<string | null>(null);
  const usernameRef = useSignal<WaInputElement>();
  const supported = useSignal(true);
  const server = useSignal("");

  useVisibleTask$(() => {
    server.value = currentServer();
    supported.value = isPasskeySupported();
    if (supported.value) {
      void Promise.all([
        wa.card(),
        wa.input(),
        wa.button(),
        wa.callout(),
        wa.icon(),
      ]);
    } else {
      void Promise.all([wa.callout(), wa.icon()]);
    }
  });
  useWaTextInput(usernameRef, username, touched);

  const handleSubmit = $(async () => {
    if (!isValidUsername(username.value)) {
      formatError.value = "3-64 letters, digits, - or _";
      return;
    }
    formatError.value = null;
    error.value = null;
    loading.value = true;
    try {
      await register(`${username.value}@${server.value}`);
      await nav("/login/");
    } catch (err) {
      if (err instanceof WebAuthnError) {
        if (err.kind === "browser") {
          error.value = "Passkey creation was cancelled.";
        } else if (err.kind === "network") {
          error.value = "Server unreachable. Please try again.";
        } else {
          error.value = err.message;
        }
      } else {
        error.value = "Unexpected error.";
      }
    } finally {
      loading.value = false;
    }
  });

  const usernameError = touched.value
    ? (formatError.value ?? undefined)
    : undefined;

  if (!supported.value) {
    return (
      <wa-callout variant="warning" class="auth-unsupported" role="alert">
        <wa-icon slot="icon" name="triangle-exclamation"></wa-icon>
        Passkeys aren't supported on this browser or device. Try a recent
        version of Chrome, Safari, Edge, or Firefox.
      </wa-callout>
    );
  }

  return (
    <wa-card class="auth-card">
      <form class="wa-stack" preventdefault:submit onSubmit$={handleSubmit}>
        <h1 class="wa-heading-l">Create account</h1>
        <wa-input
          ref={usernameRef}
          label="Username"
          name="username"
          placeholder="username"
          value={username.value}
          hint={usernameError}
          class={usernameError ? "wa-input-error" : undefined}
        />
        {server.value && (
          <p class="auth-server-hint">
            on <strong>{server.value}</strong>
          </p>
        )}
        {error.value && (
          <wa-callout variant="danger" role="alert">
            <wa-icon slot="icon" name="circle-exclamation"></wa-icon>
            {error.value}
          </wa-callout>
        )}
        <wa-button type="submit" variant="brand" loading={loading.value}>
          Create account
        </wa-button>
        <a href="/login/" class="auth-alt-link">
          Already have an account? Sign in
        </a>
      </form>
    </wa-card>
  );
});

export const head: DocumentHead = {
  title: "Create account — brig·id",
};
