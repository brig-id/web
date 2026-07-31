import { $, component$, useSignal, type QRL } from "@builder.io/qwik";
import { useWaClick } from "~/lib/wa";

interface PasskeyItemProps {
  id: string;
  onDelete$: QRL<(id: string) => void>;
}

function truncate(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export const PasskeyItem = component$<PasskeyItemProps>(({ id, onDelete$ }) => {
  const removeRef = useSignal<HTMLElement>();
  useWaClick(
    removeRef,
    $(() => onDelete$(id)),
  );

  return (
    <div class="passkey-item wa-split">
      <div class="wa-cluster wa-gap-s">
        <wa-icon name="key" variant="solid"></wa-icon>
        <span class="passkey-item-id">{truncate(id)}</span>
      </div>
      <wa-button
        ref={removeRef}
        variant="danger"
        appearance="outlined"
        size="s"
      >
        Remove
      </wa-button>
    </div>
  );
});
