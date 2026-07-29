import { component$, Slot } from "@builder.io/qwik";

export type AlertVariant = "info" | "success" | "error";

interface AlertProps {
  variant: AlertVariant;
}

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: "border-primary/40 bg-primary/10 text-text",
  success: "border-success/40 bg-success/10 text-success",
  error: "border-danger/40 bg-danger/10 text-danger",
};

export const Alert = component$<AlertProps>(({ variant }) => {
  return (
    <div
      role="alert"
      class={`rounded-default border px-4 py-2 ${VARIANT_CLASSES[variant]}`}
    >
      <Slot />
    </div>
  );
});
