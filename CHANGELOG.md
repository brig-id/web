# Changelog

All notable changes to `@brig-id/web` are documented in this file.

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

- Toolchain migrated to TypeScript 7, `rolldown-vite`, and `oxlint`.

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

### Known issues

- The static (SSG) build's first JS chunk ships empty under
  `rolldown-vite`, so hydration never starts when the build is served
  statically; the E2E suite currently runs against `pnpm dev` instead.
  Tracked in `.dev/phases/backlog.md`.
