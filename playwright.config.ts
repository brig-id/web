import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import os from "node:os";
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

// This suite now runs against the real production topology: a single
// `leaf` process serving both the API and the Qwik static (SSG) build via
// `LEAF_SERVER__UI_DIST_DIR`, exactly as `server-leaf` does in production —
// no separate `pnpm dev`/vite process, no proxy, no CORS.
//
// (Previously this ran against `pnpm dev` instead: the static-adapter
// output shipped an empty bootstrap chunk under `rolldown-vite`, so
// qwikloader never initialized and no custom element ever became
// interactive when served statically — reproduced with `leaf` entirely out
// of the picture, plain Python http.server. Root-caused to `rolldown-vite`
// itself: switching `web`'s `vite` dependency back to plain `vite` produces
// a real, non-empty bootstrap chunk with working hydration — verified with
// a headless Chromium check (custom elements upgrade, shadow roots attach,
// zero console errors). See `CHANGELOG.md`.)
const CERT_DIR = path.join(__dirname, ".cert");
const HAS_CERT =
  existsSync(path.join(CERT_DIR, "brigid.localhost.pem")) &&
  existsSync(path.join(CERT_DIR, "brigid.localhost-key.pem"));
const WEB_PROTOCOL = HAS_CERT ? "https" : "http";
const LEAF_PORT = 8080;

export const E2E_ORIGIN = `${WEB_PROTOCOL}://brigid.localhost:${LEAF_PORT}`;

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
      // Build the real static (SSG) artifact first, then start the single
      // `leaf` process that serves both the API and that build via
      // `LEAF_SERVER__UI_DIST_DIR` — the actual production topology, one
      // origin, no proxy, no CORS.
      command: `pnpm build.server && cargo run --manifest-path ${path.join(SERVER_LEAF_DIR, "Cargo.toml")}`,
      // A `port` (TCP-only) check, not `url`: when `.cert/` is populated
      // `leaf` serves HTTPS only, and Playwright's webServer readiness
      // check can't be told to accept a self-signed cert the way
      // `use.ignoreHTTPSErrors` does for the browser itself.
      port: LEAF_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        BRIGID_MASTER_KEY: E2E_MASTER_KEY,
        LEAF_SERVER__DOMAIN: "brigid.localhost",
        LEAF_SERVER__HOST: "127.0.0.1",
        LEAF_SERVER__PORT: String(LEAF_PORT),
        LEAF_SERVER__PUBLIC_URL: E2E_ORIGIN,
        LEAF_SERVER__UI_DIST_DIR: path.join(__dirname, "dist"),
        // A per-config-load path, not a fixed one in the repo: a fixed path
        // would persist stale accounts/passkeys across runs on anything that
        // doesn't do a clean checkout per run (self-hosted CI runners,
        // `reuseExistingServer: false` re-runs), silently changing test
        // behavior instead of starting from an empty database each time.
        LEAF_DATABASE__PATH: path.join(
          os.tmpdir(),
          `brigid-e2e-${Date.now()}.db`,
        ),
        ...(HAS_CERT
          ? {
              LEAF_SERVER__TLS_CERT: path.join(
                CERT_DIR,
                "brigid.localhost.pem",
              ),
              LEAF_SERVER__TLS_KEY: path.join(
                CERT_DIR,
                "brigid.localhost-key.pem",
              ),
            }
          : {}),
      },
    },
  ],
});
