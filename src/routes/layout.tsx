import { component$, Slot, useVisibleTask$ } from "@builder.io/qwik";
import { wa } from "~/lib/wa";

export default component$(() => {
  useVisibleTask$(() => {
    void wa.page();
  });

  return (
    <wa-page class="wa-cloak" mobile-breakpoint="768">
      <header slot="header" class="app-header">
        <a href="/" class="app-brand">
          brig·id
        </a>
      </header>

      <main>
        <Slot />
      </main>
    </wa-page>
  );
});
