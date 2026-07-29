import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { type DocumentHead, useNavigate } from "@builder.io/qwik-city";
import { Button } from "~/components/button/button";
import { Input } from "~/components/input/input";
import { Alert } from "~/components/alert/alert";
import { Card } from "~/components/card/card";
import { PasskeyItem } from "~/components/passkey-item/passkey-item";
import type { PasskeySummary } from "~/lib/api-types";
import {
  clearAuth,
  deletePasskey,
  loadToken,
  loadUserId,
  register,
  WebAuthnError,
} from "~/lib/webauthn";

export default component$(() => {
  const nav = useNavigate();
  const passkeys = useSignal<PasskeySummary[]>([]);
  const message = useSignal<{ kind: "success" | "error"; text: string } | null>(
    null,
  );
  const addUsername = useSignal("");
  const adding = useSignal(false);

  const refresh = $(async () => {
    const token = loadToken();
    const userId = loadUserId();
    if (!token || !userId) {
      await nav("/login/");
      return;
    }
    const response = await fetch(
      `/auth/passkeys?user_id=${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      message.value = { kind: "error", text: "Unable to load passkeys." };
      return;
    }
    passkeys.value = (await response.json()) as PasskeySummary[];
  });

  // eslint-disable-next-line qwik/no-use-visible-task -- localStorage is only available client-side
  useVisibleTask$(async () => {
    await refresh();
  });

  const handleDelete = $(async (passkeyId: string) => {
    const token = loadToken();
    const userId = loadUserId();
    if (!token || !userId) return;
    try {
      await deletePasskey(passkeyId, userId, token);
      message.value = { kind: "success", text: "Passkey removed." };
      await refresh();
    } catch {
      message.value = { kind: "error", text: "Failed to remove passkey." };
    }
  });

  const handleAdd = $(async () => {
    if (!addUsername.value) return;
    adding.value = true;
    try {
      await register(addUsername.value);
      message.value = { kind: "success", text: "Passkey added." };
      addUsername.value = "";
      await refresh();
    } catch (err) {
      message.value = {
        kind: "error",
        text:
          err instanceof WebAuthnError ? err.message : "Failed to add passkey.",
      };
    } finally {
      adding.value = false;
    }
  });

  const handleSignOut = $(async () => {
    const token = loadToken();
    if (token) {
      await fetch("/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    clearAuth();
    await nav("/login/");
  });

  return (
    <main class="flex min-h-screen items-center justify-center p-4">
      <Card>
        <div class="flex w-96 flex-col gap-4">
          <div class="flex items-center justify-between">
            <h1 class="text-xl font-semibold">Your passkeys</h1>
            <Button
              label="Sign out"
              variant="secondary"
              onClick$={handleSignOut}
            />
          </div>

          {message.value && (
            <Alert
              variant={message.value.kind === "success" ? "success" : "error"}
            >
              {message.value.text}
            </Alert>
          )}

          <div class="flex flex-col gap-2">
            {passkeys.value.map((passkey) => (
              <PasskeyItem
                key={passkey.id}
                id={passkey.id}
                onDelete$={handleDelete}
              />
            ))}
          </div>

          <div class="flex gap-2">
            <Input
              label="Add a passkey"
              name="add-username"
              placeholder="user@server"
              value={addUsername.value}
              onInput$={(_: Event, el: HTMLInputElement) => {
                addUsername.value = el.value;
              }}
            />
            <Button label="Add" loading={adding.value} onClick$={handleAdd} />
          </div>
        </div>
      </Card>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Passkeys — brig·id",
};
