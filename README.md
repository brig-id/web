# brig·id — app

Qwik UI for brig·id: login, register, and passkey management (WebAuthn).
Consumes `brigid-api` (served by `server-leaf`) over the same origin.

- [Qwik Docs](https://qwik.dev/)
- [Qwik GitHub](https://github.com/QwikDev/qwik)

---

## Project structure

```
├── public/
│   └── ...
└── src/
    ├── components/       # PasskeyItem
    ├── lib/              # api-types.ts, webauthn.ts, validation.ts, wa.ts
    └── routes/           # /, /login, /register, /passkeys (native WebAwesome, no wrapper components)
```

## Development

```shell
pnpm install
pnpm dev       # Vite dev server; open https://brigid.localhost:5173 (see HTTPS below)
```

Vite proxies `/auth/*` and `/.well-known/*` to `http://localhost:8080` (server-leaf),
mirroring how leaf serves both the UI and these routes from one origin in production.
`*.localhost` resolves to 127.0.0.1 in every modern browser with no `/etc/hosts` entry
needed, and counts as a secure context, so WebAuthn works on it over plain HTTP.

If server-leaf runs with a different RP ID/domain (`LEAF_SERVER__DOMAIN` /
`LEAF_SERVER__PUBLIC_URL`), point it at `brigid.localhost` (and port 5173 for
`PUBLIC_URL`, `https://` once you've generated the dev cert below) to match, or
WebAuthn ceremonies will fail on an origin mismatch.

### HTTPS in dev

The plain-HTTP `*.localhost` exception above satisfies the browser's own WebAuthn
implementation, but not every WebAuthn *client* — some passkey-manager browser
extensions (e.g. Proton Pass) run their own origin check that doesn't grant that
exception and require a real `https://` scheme, failing registration with an
"insecure protocol" error even though the browser itself considers the page secure.

Generate a locally-trusted cert once with [`mkcert`](https://github.com/FiloSottile/mkcert):

```shell
mkcert -install   # one-time: trusts a local CA in your OS/browser trust store
mkdir -p .cert && cd .cert
mkcert -cert-file brigid.localhost.pem -key-file brigid.localhost-key.pem \
  brigid.localhost "*.brigid.localhost" localhost 127.0.0.1 ::1
```

`vite.config.ts` picks up `.cert/brigid.localhost{,-key}.pem` automatically if present
and serves HTTPS; without it, `pnpm dev` falls back to plain HTTP so a fresh clone
still runs out of the box. `.cert/` is gitignored — every developer generates their own.

If you're testing from your **host** browser through a devcontainer's forwarded port
(rather than inside the container), run `mkcert -install` on the host too — the CA
trusted inside the container isn't trusted by the host browser. Without it, expect a
cert-authority warning (Chrome: `NET::ERR_CERT_AUTHORITY_INVALID`, Firefox:
`SEC_ERROR_UNKNOWN_ISSUER`) — clicking through still gets you a real `https://` origin,
so it's not blocking, just not a clean padlock.

**Firefox note:** it ships its own certificate store, independent of the OS/system
trust store `mkcert -install` updates — installing the CA system-wide (or even running
`mkcert -install` a second time on the host) does not make Firefox trust it. Import the
CA into Firefox directly instead: copy the `rootCA.pem` from `mkcert -CAROOT` on the
machine that generated it, then in Firefox go to `about:preferences#privacy` →
**Certificates** → **View Certificates** → **Authorities** tab → **Import**, select the
file, and check "Trust this CA to identify websites". Reload the page — no restart
needed.

## Checks

```shell
pnpm typecheck
pnpm lint
pnpm test
pnpm build     # production build (type check + client modules + SSG + lint)
pnpm audit --audit-level=moderate
```

## Production

Qwik builds the UI to static files (SSG for `/login` and `/register`, CSR
for `/passkeys`). No Node.js runtime in production — `server-leaf` serves
`dist/` directly.
