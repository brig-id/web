import { component$, Slot } from "@builder.io/qwik";

export const Card = component$(() => {
  return (
    <div class="rounded-default bg-surface p-6 shadow-lg">
      <Slot />
    </div>
  );
});
