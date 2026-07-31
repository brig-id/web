import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { type DocumentHead, useNavigate } from "@builder.io/qwik-city";
import { PasskeyItem } from "~/components/passkey-item/passkey-item";
import { wa, useWaClick, useWaTextInput, type WaInputElement } from "~/lib/wa";
import type { PasskeySummary } from "~/lib/api-types";
import { isValidUsername } from "~/lib/validation";
import { currentServer } from "~/lib/server";
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
  const signOutRef = useSignal<HTMLElement>();
  const addUsernameRef = useSignal<WaInputElement>();
  const addButtonRef = useSignal<HTMLElement>();
  const server = useSignal("");

  useVisibleTask$(() => {
    server.value = currentServer();
    void Promise.all([
      wa.card(),
      wa.input(),
      wa.button(),
      wa.callout(),
      wa.icon(),
    ]);
  });

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
    if (!isValidUsername(addUsername.value)) return;
    adding.value = true;
    try {
      await register(`${addUsername.value}@${server.value}`);
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

  useWaClick(signOutRef, handleSignOut);
  useWaTextInput(addUsernameRef, addUsername);
  useWaClick(addButtonRef, handleAdd);

  return (
    <wa-card class="auth-card auth-card--wide">
      <div class="wa-stack">
        <div class="wa-split">
          <h1 class="wa-heading-l">Your passkeys</h1>
          <wa-button ref={signOutRef} appearance="outlined">
            Sign out
          </wa-button>
        </div>

        {message.value && (
          <wa-callout
            variant={message.value.kind === "success" ? "success" : "danger"}
            role="alert"
          >
            <wa-icon
              slot="icon"
              name={
                message.value.kind === "success"
                  ? "circle-check"
                  : "circle-exclamation"
              }
            ></wa-icon>
            {message.value.text}
          </wa-callout>
        )}

        <div class="wa-stack wa-gap-xs">
          {passkeys.value.map((passkey) => (
            <PasskeyItem
              key={passkey.id}
              id={passkey.id}
              onDelete$={handleDelete}
            />
          ))}
        </div>

        <div class="wa-flank:end wa-gap-xs">
          <wa-input
            ref={addUsernameRef}
            label="Add a passkey"
            name="add-username"
            placeholder="username"
            value={addUsername.value}
          />
          <wa-button ref={addButtonRef} variant="brand" loading={adding.value}>
            Add
          </wa-button>
        </div>
      </div>
    </wa-card>
  );
});

export const head: DocumentHead = {
  title: "Passkeys — brig·id",
};
