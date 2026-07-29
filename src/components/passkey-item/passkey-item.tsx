import { component$, type QRL } from "@builder.io/qwik";
import { Button } from "../button/button";

interface PasskeyItemProps {
  id: string;
  onDelete$: QRL<(id: string) => void>;
}

function truncate(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export const PasskeyItem = component$<PasskeyItemProps>(({ id, onDelete$ }) => {
  return (
    <div class="flex items-center justify-between rounded-default border border-white/10 bg-surface px-4 py-3">
      <div class="flex items-center gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="h-5 w-5 text-primary"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
          />
        </svg>
        <span class="font-mono text-sm text-text-muted">{truncate(id)}</span>
      </div>
      <Button label="Remove" variant="danger" onClick$={() => onDelete$(id)} />
    </div>
  );
});
