import { component$, useVisibleTask$ } from "@builder.io/qwik";
import { type DocumentHead, useNavigate } from "@builder.io/qwik-city";
import { loadToken } from "~/lib/webauthn";

export default component$(() => {
  const nav = useNavigate();

  // eslint-disable-next-line qwik/no-use-visible-task -- localStorage is only available client-side
  useVisibleTask$(async () => {
    await nav(loadToken() ? "/passkeys/" : "/login/");
  });

  return null;
});

export const head: DocumentHead = {
  title: "brig·id",
};
