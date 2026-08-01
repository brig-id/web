import { staticAdapter } from "@builder.io/qwik-city/adapters/static/vite";
import { extendConfig } from "@builder.io/qwik-city/vite";
import baseConfig from "../../vite.config";

// brig·id is self-hosted — each `leaf` instance picks its own domain via
// `LEAF_SERVER__DOMAIN` at runtime, so there's no single real origin to bake
// in at build time. The value below only feeds the `<link rel="canonical">`
// tag (see `src/components/router-head/router-head.tsx`) and would-be
// sitemap entries on these auth pages, which aren't meant to be publicly
// indexed anyway — sitemap generation is disabled outright below.
export default extendConfig(baseConfig, () => {
  return {
    build: {
      ssr: true,
      rollupOptions: {
        input: ["@qwik-city-plan"],
      },
    },
    plugins: [
      staticAdapter({
        origin: "https://brigid.invalid",
        sitemapOutFile: null,
      }),
    ],
  };
});
