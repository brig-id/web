import { $, component$, useSignal } from "@builder.io/qwik";
import { type DocumentHead, useNavigate } from "@builder.io/qwik-city";
import { Button } from "~/components/button/button";
import { Input } from "~/components/input/input";
import { Alert } from "~/components/alert/alert";
import { Card } from "~/components/card/card";
import { isValidHandle } from "~/lib/validation";
import { register, WebAuthnError } from "~/lib/webauthn";

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
      await register(username.value);
      await nav("/login/");
    } catch (err) {
      if (err instanceof WebAuthnError) {
        if (err.kind === "browser") {
          error.value = "Passkey creation was cancelled.";
        } else if (err.kind === "network") {
          error.value = "Server unreachable. Please try again.";
        } else {
          error.value = "Username already taken.";
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
          <h1 class="text-xl font-semibold">Create account</h1>
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
            label="Create account"
            loading={loading.value}
          />
          <a href="/login/" class="text-center text-sm text-primary">
            Already have an account? Sign in
          </a>
        </form>
      </Card>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Create account — brig·id",
};
