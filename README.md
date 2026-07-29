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
    ├── components/       # Button, Input, Alert, Card, PasskeyItem
    ├── lib/              # api-types.ts, webauthn.ts, validation.ts
    └── routes/           # /, /login, /register, /passkeys
```

## Development

```shell
pnpm install
pnpm dev       # Vite dev server, proxies /auth/* to http://localhost:8080
```

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
