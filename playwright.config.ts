import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The E2E suite exercises the real login/register/passkey flows, which only
// work end-to-end against a running `leaf` — the Qwik UI alone has nothing
// to POST /auth/* to. `leaf` lives in the sibling `server-leaf` repo; this
// assumes the devcontainer's workspace layout (`/workspaces/<repo>`, see
// `.dev/AGENTS.md`). There is no equivalent assumption-free path today —
// wiring this for a non-devcontainer checkout (e.g. plain CI) is tracked as
// follow-up work alongside the GitHub Actions workflow itself.
export const SERVER_LEAF_DIR =
  process.env.SERVER_LEAF_DIR ?? path.resolve(__dirname, "../server-leaf");

// KNOWN ISSUE (see phases/backlog.md "Static SSG build breaks Qwik
// hydration"): the `pnpm build` static-adapter output currently ships at
// least one empty bootstrap chunk, so qwikloader never initializes and no
// custom element (wa-input, wa-button, ...) ever becomes interactive when
// served statically — reproduced with `leaf` entirely out of the picture
// (plain Python http.server). Until that's root-caused, this suite runs
// against `pnpm dev` instead (vite dev server + SSR), which is known-good —
// verified manually multiple times this session. Swap back to the static
// build + a single `leaf` webServer once the bug above is fixed; that's the
// actually-representative-of-production setup.
const CERT_DIR = path.join(__dirname, ".cert");
const HAS_CERT =
  existsSync(path.join(CERT_DIR, "brigid.localhost.pem")) &&
  existsSync(path.join(CERT_DIR, "brigid.localhost-key.pem"));
const WEB_PROTOCOL = HAS_CERT ? "https" : "http";
const WEB_PORT = 5173;
const LEAF_PORT = 8080; // hardcoded in vite.config.ts's dev proxy target

export const E2E_ORIGIN = `${WEB_PROTOCOL}://brigid.localhost:${WEB_PORT}`;

// Fixed, valid-looking 64-hex-char (32 byte) master key — deterministic,
// dev/test only. Mirrors server-leaf/tests/binary.rs's TEST_MASTER_KEY.
export const E2E_MASTER_KEY =
  "0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0";

export default defineConfig({
  testDir: "./e2e",
  // Rate-limit backoff (see retryDelay in auth.spec.ts) can stack across
  // several steps of a single test — register, login, and a passkeys-list
  // refresh can each need a 3.5s backoff-and-retry. The 30s default timeout
  // isn't enough headroom for the worst case.
  timeout: 90_000,
  // Every test hits the same `leaf` instance from the same loopback IP, and
  // `/auth/*` is rate-limited there (20 req/min, burst 5) — a real security
  // feature, not something to work around by weakening it for tests. Running
  // workers in parallel reliably trips it (concurrent register/login calls
  // from multiple test files landing within the same instant). One worker
  // keeps the suite fast enough while staying realistic.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: E2E_ORIGIN,
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // No CDP-equivalent virtual authenticator exists for Firefox in
      // Playwright (the WebAuthn domain used by e2e/webauthn.ts is Chrome
      // DevTools Protocol only), so passkey-dependent specs skip themselves
      // here via `skipIfNoVirtualAuthenticator()` rather than silently not
      // running. Non-WebAuthn assertions (form validation, static rendering)
      // still execute normally.
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],

  webServer: [
    {
      command: `cargo run --manifest-path ${path.join(SERVER_LEAF_DIR, "Cargo.toml")}`,
      // Readiness polling happens in Node (not a browser) — Node's
      // `dns.lookup` has no built-in RFC 6761 `.localhost` handling on this
      // system (unlike curl and every real browser, which special-case it
      // internally), so `brigid.localhost` here would fail with ENOTFOUND.
      // 127.0.0.1 sidesteps that; the actual tests navigate via `baseURL`,
      // which Chromium/Firefox resolve to loopback just fine.
      url: `http://127.0.0.1:${LEAF_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        BRIGID_MASTER_KEY: E2E_MASTER_KEY,
        LEAF_SERVER__DOMAIN: "brigid.localhost",
        LEAF_SERVER__HOST: "127.0.0.1",
        LEAF_SERVER__PORT: String(LEAF_PORT),
        LEAF_SERVER__PUBLIC_URL: E2E_ORIGIN,
        LEAF_DATABASE__PATH: path.join(__dirname, ".e2e-leaf.db"),
      },
    },
    {
      command: "pnpm dev",
      // A `port` (TCP-only) check, not `url`: vite dev serves HTTPS whenever
      // `web/.cert/` is populated (see vite.config.ts's `httpsConfig()`),
      // and Playwright's webServer readiness check can't be told to accept
      // a self-signed cert the way `use.ignoreHTTPSErrors` does for the
      // browser itself.
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
