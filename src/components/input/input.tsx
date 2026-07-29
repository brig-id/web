import { component$, type QwikIntrinsicElements } from "@builder.io/qwik";

type InputProps = QwikIntrinsicElements["input"] & {
  label: string;
  error?: string;
  name: string;
};

export const Input = component$<InputProps>(
  ({ label, error, name, ...rest }) => {
    const errorId = `${name}-error`;

    return (
      <div class="flex flex-col gap-1">
        <label for={name} class="text-sm text-text-muted">
          {label}
        </label>
        <input
          {...rest}
          id={name}
          name={name}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          class={`rounded-default border bg-surface px-3 py-2 text-text outline-none ${
            error ? "border-danger" : "border-white/10"
          }`}
        />
        {error && (
          <p id={errorId} class="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
