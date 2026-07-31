import { component$, isDev } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";

import "./global.css";

// Web Awesome Pro — theme, palette, native HTML reset, and cloak/layout
// utilities. Imported as JS (not CSS @import) so Vite bundles each
// stylesheet independently instead of concatenating raw @import chains,
// which the bundler can silently reorder.
import "@web.awesome.me/webawesome-pro/dist/styles/themes/tailspin.css";
import "@web.awesome.me/webawesome-pro/dist/styles/color/palettes/shoelace.css";
import "@web.awesome.me/webawesome-pro/dist/styles/native.css";
import "@web.awesome.me/webawesome-pro/dist/styles/utilities.css";

export default component$(() => {
  /**
   * The root of a QwikCity site always start with the <QwikCityProvider> component,
   * immediately followed by the document's <head> and <body>.
   *
   * Don't remove the `<head>` and `<body>` elements.
   */

  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        {!isDev && (
          <link
            rel="manifest"
            href={`${import.meta.env.BASE_URL}manifest.json`}
          />
        )}
        <RouterHead />
      </head>
      <body lang="en">
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
