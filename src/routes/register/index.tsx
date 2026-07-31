import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { type DocumentHead, useNavigate } from "@builder.io/qwik-city";
import { wa, useWaTextInput, type WaInputElement } from "~/lib/wa";
import { isValidHandle } from "~/lib/validation";
import { register, WebAuthnError } from "~/lib/webauthn";

export default component$(() => {
  const nav = useNavigate();
  const username = useSignal("");
  const touched = useSignal(false);
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);
  const formatError = useSignal<string | null>(null);
  const usernameRef = useSignal<WaInputElement>();

  useVisibleTask$(() => {
    void Promise.all([
      wa.card(),
      wa.input(),
      wa.button(),
      wa.callout(),
      wa.icon(),
    ]);
  });
  useWaTextInput(usernameRef, username, touched);

  const handleSubmit = $(async () => {
    if (!isValidHandle(username.value)) {
      formatError.value = "Expected format: user@server";
      return;
    }
    formatError.value = null;
    error.value = null;
    loading.value = true;
    try {
      await register(username.value);
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

  return (
    <wa-card class="auth-card">
      <form class="wa-stack" preventdefault:submit onSubmit$={handleSubmit}>
        <h1 class="wa-heading-l">Create account</h1>
        <wa-input
          ref={usernameRef}
          label="Username"
          name="username"
          placeholder="user@server"
          value={username.value}
          hint={usernameError}
          class={usernameError ? "wa-input-error" : undefined}
        />
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
