import { $, component$, useSignal } from "@builder.io/qwik";
import { type DocumentHead, useNavigate } from "@builder.io/qwik-city";
import { Button } from "~/components/button/button";
import { Input } from "~/components/input/input";
import { Alert } from "~/components/alert/alert";
import { Card } from "~/components/card/card";
import { isValidHandle } from "~/lib/validation";
import { login, storeAuth, WebAuthnError } from "~/lib/webauthn";

export default component$(() => {
  const nav = useNavigate();
  const username = useSignal("");
  const touched = useSignal(false);
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);

  const formatError = useSignal<string | null>(null);

  const handleSubmit = $(async () => {
    if (!isValidHandle(username.value)) {
      formatError.value = "Expected format: user@server";
      return;
    }
    formatError.value = null;
    error.value = null;
    loading.value = true;
    try {
      const clientId = window.location.origin;
      const result = await login(username.value, clientId);
      storeAuth(result.id_token, result.user_id);
      await nav("/passkeys/");
    } catch (err) {
      if (err instanceof WebAuthnError) {
        if (err.kind === "network") {
          error.value = "Server unreachable. Please try again.";
        } else if (err.kind === "browser") {
          error.value = "Passkey sign-in was cancelled.";
        } else {
          error.value = "Unknown user or sign-in failed.";
        }
      } else {
        error.value = "Unexpected error.";
      }
    } finally {
      loading.value = false;
    }
  });

  return (
    <main class="flex min-h-screen items-center justify-center p-4">
      <Card>
        <form
          class="flex w-80 flex-col gap-4"
          preventdefault:submit
          onSubmit$={handleSubmit}
        >
          <h1 class="text-xl font-semibold">Sign in</h1>
          <Input
            label="Username"
            name="username"
            placeholder="user@server"
            value={username.value}
            error={touched.value ? (formatError.value ?? undefined) : undefined}
            onInput$={(_: Event, el: HTMLInputElement) => {
              username.value = el.value;
            }}
            onBlur$={() => {
              touched.value = true;
            }}
          />
          {error.value && <Alert variant="error">{error.value}</Alert>}
          <Button
            type="submit"
            label="Sign in with passkey"
            loading={loading.value}
          />
          <a href="/register/" class="text-center text-sm text-primary">
            Create an account
          </a>
        </form>
      </Card>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Sign in — brig·id",
};
