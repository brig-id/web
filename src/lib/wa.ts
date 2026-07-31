import {
  type PropFunction,
  type Signal,
  useVisibleTask$,
} from "@builder.io/qwik";

/**
 * Static, cherry-picked WebAwesome component loaders. Each is a literal
 * dynamic import so Vite/Rolldown can code-split it into its own chunk —
 * routes call only the ones they actually render, on visibility.
 */
export const wa = {
  page: () =>
    import("@web.awesome.me/webawesome-pro/dist/components/page/page.js"),
  card: () =>
    import("@web.awesome.me/webawesome-pro/dist/components/card/card.js"),
  input: () =>
    import("@web.awesome.me/webawesome-pro/dist/components/input/input.js"),
  button: () =>
    import("@web.awesome.me/webawesome-pro/dist/components/button/button.js"),
  callout: () =>
    import(
      "@web.awesome.me/webawesome-pro/dist/components/callout/callout.js"
    ),
  icon: () =>
    import("@web.awesome.me/webawesome-pro/dist/components/icon/icon.js"),
};

export type WaInputElement = HTMLElement & { value: string };

/**
 * WA form controls aren't native <input>/<button> elements, so Qwik's
 * onInput$/onClick$ JSX sugar (which only targets native intrinsic
 * elements) doesn't apply to them. Bind through a ref instead: attach a
 * plain DOM listener once the element is visible/defined, forwarding into
 * a Qwik signal. Signals (and QRLs, in useWaClick below) are Qwik's
 * serializable primitives, so capturing them across the useVisibleTask$
 * boundary here is safe — unlike plain closures over arbitrary values.
 *
 * Note: these helpers are deliberately NOT named with a trailing `$` —
 * Qwik's optimizer treats any identifier ending in `$` as a QRL boundary
 * to extract, which breaks on a plain function like this one.
 */
export function useWaTextInput(
  ref: Signal<WaInputElement | undefined>,
  value: Signal<string>,
  touched?: Signal<boolean>,
) {
  useVisibleTask$(({ cleanup }) => {
    const el = ref.value;
    if (!el) return;
    const handleInput = () => {
      value.value = el.value;
    };
    const handleBlur = () => {
      if (touched) touched.value = true;
    };
    el.addEventListener("input", handleInput);
    el.addEventListener("blur", handleBlur);
    cleanup(() => {
      el.removeEventListener("input", handleInput);
      el.removeEventListener("blur", handleBlur);
    });
  });
}

/** Same idea as useWaTextInput, for wa-button's click (outside a submit flow). */
export function useWaClick(
  ref: Signal<HTMLElement | undefined>,
  handler?: PropFunction<() => void>,
) {
  useVisibleTask$(({ cleanup }) => {
    const el = ref.value;
    if (!el || !handler) return;
    const handleClick = () => void handler();
    el.addEventListener("click", handleClick);
    cleanup(() => el.removeEventListener("click", handleClick));
  });
}
