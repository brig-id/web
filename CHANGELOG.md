# Changelog

All notable changes to `@brig-id/app` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

First tagged release, targeting `v0.1.0` alongside `crypto`, `core`, and
`server-leaf`.

### Added

- Qwik UI: login, register, and passkeys pages, talking to `server-leaf`'s
  `brigid-api` over HTTP.
- Native WebAuthn passkey registration/authentication in the browser,
  including detecting whether the platform supports passkeys at all.
- Username-only register/login flow (no separate display-name field),
  with an "add a passkey" flow reusing the same fields.
- Qwik static adapter (SSG) build (`pnpm build.server`), so the UI ships
  as static files for `server-leaf` to serve directly — no Node runtime
  needed in production.
- Dev server on `brigid.localhost` (instead of bare `localhost`) over
  HTTPS via `mkcert`, matching the domain shape a real deployment uses.
- WebAwesome Pro component library, replacing the initial Tailwind CSS
  setup.
- Playwright E2E suite (`pnpm test.e2e`): register, login, list/delete
  passkeys, sign out, and Firefox-compatible form-validation checks,
  driven against a real `leaf` binary and a virtual CDP WebAuthn
  authenticator (Chromium only).
- `SECURITY.md`, matching the SLA already published by `crypto`, `core`,
  and `server-leaf`.

### Changed

- Toolchain migrated to TypeScript 7 and `oxlint`.
- `vite` switched back from the `rolldown-vite` alias to plain `vite`
  (see Fixed below) — `rolldown-vite` remains an option to revisit once
  its bundler-splitting bug is fixed upstream.

### Fixed

- API error responses are now surfaced to the user instead of being
  swallowed; empty-body responses no longer fail to parse.
- `pnpm audit` findings: `sharp` (bundled `libvips` CVEs, pulled in via
  `vite-imagetools`) pinned via a `pnpm-workspace.yaml` override;
  `brace-expansion` bumped.
- Playwright's `clickUntil` retry helper could hang retrying a click on a
  locator that had already vanished from the page; now bounded with a
  timeout.
- The E2E suite's scratch database path is now randomized per run
  (`os.tmpdir()` + timestamp) instead of a fixed repo-root path, so
  parallel/repeated local runs don't collide.
- **Static (SSG) build produced an unusable page**: the first JS chunk
  shipped empty under `rolldown-vite`, so qwikloader never initialized and
  no custom element (`wa-input`, `wa-button`, ...) ever became interactive
  when the build was served statically — reproduced with `server-leaf`
  entirely out of the picture (plain static file server). Root-caused to
  `rolldown-vite` itself: switching the `vite` dependency back to plain
  `vite` produces a real, non-empty bootstrap chunk with working hydration
  (verified with a headless Chromium check: custom elements upgrade,
  shadow roots attach, zero console errors). The Playwright E2E suite now
  runs against the actual static build served by a single `leaf` process
  (`LEAF_SERVER__UI_DIST_DIR`) — the real production topology — instead of
  `pnpm dev`.
- `/passkeys`: deleting a passkey could leave the list showing the
  already-deleted item indefinitely. The delete itself succeeded, but the
  list-refresh fetch that follows it can land within the same `/auth/*`
  rate-limit burst as the register/login calls that preceded it; on a 429
  the refresh silently gave up and never retried, so the UI never
  re-synced. `refresh()` now retries once after a 3.5s backoff (the
  limiter refills one token every 3s) if the first attempt is
  rate-limited.
- Removed a dangling `data-fa-kit-code` attribute in `entry.ssr.tsx` — a
  leftover Font Awesome Kit reference with no corresponding loader script
  anywhere in the app.

### Security

- This build's inline `<script>`/`<style>` output (Qwik's SSG
  resumability bootstrap) is the reason `server-leaf` currently serves a
  `Content-Security-Policy` with `'unsafe-inline'` on `script-src`/
  `style-src` — a tracked stopgap, not a permanent choice. See
  `brig-id/spec`'s `security-model.md` §4.6 and `audit-checklist.md` §2.6
  for the open finding, and `.dev/phases/backlog.md` for the real fix
  (a build-time SHA-256 hash allowlist generated from this repo's static
  output).
