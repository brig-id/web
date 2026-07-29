import { component$, type QwikIntrinsicElements } from "@builder.io/qwik";

export type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends Omit<QwikIntrinsicElements["button"], "type"> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary hover:bg-primary-hover text-white",
  secondary: "bg-surface hover:bg-white/10 text-text border border-white/10",
  danger: "bg-danger hover:bg-danger/80 text-white",
};

export const Button = component$<ButtonProps>(
  ({
    label,
    variant = "primary",
    loading = false,
    disabled,
    type = "button",
    ...rest
  }) => {
    return (
      <button
        {...rest}
        type={type}
        disabled={disabled || loading}
        class={`rounded-default px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]}`}
      >
        {loading ? "…" : label}
      </button>
    );
  },
);
