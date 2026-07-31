import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { type DocumentHead, useNavigate } from "@builder.io/qwik-city";
import { wa, useWaTextInput, type WaInputElement } from "~/lib/wa";
import { parseLoginInput } from "~/lib/validation";
import { currentServer } from "~/lib/server";
import {
  login,
  storeAuth,
  isPasskeySupported,
  WebAuthnError,
} from "~/lib/webauthn";

export default component$(() => {
  const nav = useNavigate();
  const username = useSignal("");
  const touched = useSignal(false);
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);
  const formatError = useSignal<string | null>(null);
  const remoteServer = useSignal<string | null>(null);
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
    remoteServer.value = null;
    const parsed = parseLoginInput(username.value, server.value);
    if (parsed.kind === "invalid") {
      formatError.value = "Expected: username or username@server";
      return;
    }
    formatError.value = null;
    if (parsed.kind === "remote") {
      remoteServer.value = parsed.server;
      return;
    }
    error.value = null;
    loading.value = true;
    try {
      const clientId = window.location.origin;
      const result = await login(
        `${parsed.username}@${parsed.server}`,
        clientId,
      );
      storeAuth(result.id_token, result.user_id);
      await nav("/passkeys/");
    } catch (err) {
      if (err instanceof WebAuthnError) {
        if (err.kind === "network") {
          error.value = "Server unreachable. Please try again.";
        } else if (err.kind === "browser") {
          error.value = "Passkey sign-in was cancelled.";
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
        <h1 class="wa-heading-l">Sign in</h1>
        <wa-input
          ref={usernameRef}
          label="Username"
          name="username"
          placeholder="username"
          value={username.value}
          hint={usernameError}
          class={usernameError ? "wa-input-error" : undefined}
        />
        {remoteServer.value && (
          <wa-callout variant="neutral" role="alert">
            <wa-icon slot="icon" name="circle-info"></wa-icon>
            This account is on <strong>{remoteServer.value}</strong>.{" "}
            <a href={`https://${remoteServer.value}/login/`}>
              Continue to {remoteServer.value} →
            </a>
          </wa-callout>
        )}
        {error.value && (
          <wa-callout variant="danger" role="alert">
            <wa-icon slot="icon" name="circle-exclamation"></wa-icon>
            {error.value}
          </wa-callout>
        )}
        <wa-button type="submit" variant="brand" loading={loading.value}>
          Sign in with passkey
        </wa-button>
        <a href="/register/" class="auth-alt-link">
          Create an account
        </a>
      </form>
    </wa-card>
  );
});

export const head: DocumentHead = {
  title: "Sign in — brig·id",
};
