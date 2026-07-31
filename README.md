# brig·id — web

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
pnpm dev       # Vite dev server; open http://brigid.localhost:5173
```

Vite proxies `/auth/*` and `/.well-known/*` to `http://localhost:8080` (server-leaf),
mirroring how leaf serves both the UI and these routes from one origin in production.
`*.localhost` resolves to 127.0.0.1 in every modern browser with no `/etc/hosts` entry
needed, and counts as a secure context, so WebAuthn works on it over plain HTTP.

If server-leaf runs with a different RP ID/domain (`LEAF_SERVER__DOMAIN` /
`LEAF_SERVER__PUBLIC_URL`), point it at `brigid.localhost` (and port 5173 for
`PUBLIC_URL`) to match, or WebAuthn ceremonies will fail on an origin mismatch.

## Checks

```shell
pnpm typecheck
pnpm lint
pnpm test
pnpm build     # production build (client modules + type check + lint)
pnpm audit --audit-level=moderate
```

## Production

Qwik builds the UI to static files (SSG for `/login` and `/register`, CSR
for `/passkeys`). No Node.js runtime in production — `server-leaf` serves
`dist/` directly.
