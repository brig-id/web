import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  addVirtualAuthenticator,
  skipIfNoVirtualAuthenticator,
  uniqueUsername,
} from "./webauthn";

// Right after a client-side Qwik City navigation (dev/SSR mode), the
// on:input and on:click QRLs for a given element can be wired up a beat
// after the element itself is visible/actionable — Playwright sees a normal
// interactive input/button and fills/clicks it happily, but the event is
// lost because Qwik's listener isn't attached yet. This shows up two ways:
// the click silently no-ops, or (more subtly) `.fill()` sets the DOM value
// fine but the app's signal never sees the `input` event, so submitting
// re-validates against a stale empty value. Retrying the whole fill+click
// cycle — not just the click — covers both without depending on Qwik
// internals to detect "hydrated yet".
//
// `/auth/*` is also rate-limited server-side (1 token/3s, burst 5, per IP —
// a real security feature, see brigid-api's GovernorLayer). Every retry here
// is itself an API call, so retrying immediately on a 429 just prolongs the
// throttle. Back off ~3.5s (one refill tick) whenever the 429 error callout
// is visible, instead of the normal short retry delay.
async function retryDelay(page: Page): Promise<number> {
  const rateLimited = await page
    .getByText("Request failed with status 429")
    .isVisible()
    .catch(() => false);
  return rateLimited ? 3500 : 300;
}

async function fillAndSubmit(
  page: Page,
  textbox: Locator,
  button: Locator,
  value: string,
  pattern: RegExp,
  attempts = 5,
) {
  for (let i = 0; i < attempts; i++) {
    await textbox.fill("");
    await textbox.fill(value);
    await button.click();
    try {
      await page.waitForURL(pattern, { timeout: 2000 });
      return;
    } catch {
      await page.waitForTimeout(await retryDelay(page));
    }
  }
  await expect(page).toHaveURL(pattern);
}

async function register(page: Page, username: string) {
  await page.goto("/register/");
  await fillAndSubmit(
    page,
    page.getByRole("textbox", { name: "Username" }),
    page.getByRole("button", { name: "Create account" }),
    username,
    /\/login\/?$/,
  );
}

async function login(page: Page, username: string) {
  await fillAndSubmit(
    page,
    page.getByRole("textbox", { name: "Username" }),
    page.getByRole("button", { name: "Sign in with passkey" }),
    username,
    /\/passkeys\/?$/,
  );
}

// Same hydration race as fillAndSubmit, for actions with no associated text
// input to re-fill — retries the click itself until `check` passes. Always
// backs off a full refill tick (~3.5s): sign-out/delete-passkey calls often
// land as the 6th+ /auth/* request in a test that's already spent most of
// the burst on register+login+list, but unlike register/login's visible
// "Request failed with status 429" callout, delete-passkey's UI collapses
// every failure into a generic "Failed to remove passkey." — no reliable
// text to detect the rate-limit case specifically, so just always assume
// it might be that.
async function clickUntil(
  page: Page,
  button: Locator,
  check: () => Promise<void>,
  attempts = 5,
) {
  for (let i = 0; i < attempts; i++) {
    // A short timeout, not the default 30s: if a prior iteration's click
    // already went through and `button` vanished as a result (list emptied,
    // redirected away from the page it was on), there's nothing left to
    // click — falling through to `check()` below is what actually detects
    // that, rather than hanging here waiting for an element that will never
    // reappear.
    await button.click({ timeout: 2000 }).catch(() => {});
    try {
      await check();
      return;
    } catch {
      await page.waitForTimeout(3500);
    }
  }
  await check();
}

// Every test in this file shares one rate-limited `leaf` instance (see the
// backoff comment on retryDelay above) — a gap between tests lets the token
// bucket recover instead of every test starting from whatever the previous
// one left behind.
test.beforeEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 4000));
});

// The passkeys page's own GET /auth/passkeys fetch runs once, in a
// useVisibleTask$, right after register+login already spent most of the
// rate-limit burst (register begin/finish + login begin/finish = 4 calls
// against a burst of 5) — on a 429 the app shows "Unable to load passkeys."
// and never retries on its own. Reloading re-triggers that fetch.
async function waitForPasskeyList(page: Page, count: number, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    try {
      await expect(page.locator(".passkey-item")).toHaveCount(count, {
        timeout: 3000,
      });
      return;
    } catch {
      await page.waitForTimeout(3500);
      await page.reload();
    }
  }
  await expect(page.locator(".passkey-item")).toHaveCount(count);
}

test.describe("register", () => {
  test("full register flow creates an account and a usable passkey", async ({
    page,
    context,
    browserName,
  }) => {
    skipIfNoVirtualAuthenticator(browserName);
    await addVirtualAuthenticator(context, page);
    const username = uniqueUsername("register");

    await register(page, username);
    await expect(page).toHaveURL(/\/login\/?$/);

    // Prove the passkey created during registration actually works, rather
    // than just checking the redirect happened.
    await login(page, username);
    await expect(page).toHaveURL(/\/passkeys\/?$/);
  });
});

test.describe("login", () => {
  test("login redirects to /passkeys with token stored in localStorage", async ({
    page,
    context,
    browserName,
  }) => {
    skipIfNoVirtualAuthenticator(browserName);
    await addVirtualAuthenticator(context, page);
    const username = uniqueUsername("login");
    await register(page, username);

    await page.goto("/login/");
    await login(page, username);

    await expect(page).toHaveURL(/\/passkeys\/?$/);
    const token = await page.evaluate(() =>
      localStorage.getItem("brigid.token"),
    );
    const userId = await page.evaluate(() =>
      localStorage.getItem("brigid.user_id"),
    );
    expect(token).toBeTruthy();
    expect(userId).toBeTruthy();
  });
});

test.describe("passkeys page", () => {
  test("passkey list is displayed after login", async ({
    page,
    context,
    browserName,
  }) => {
    skipIfNoVirtualAuthenticator(browserName);
    await addVirtualAuthenticator(context, page);
    const username = uniqueUsername("list");
    await register(page, username);
    await page.goto("/login/");
    await login(page, username);

    await waitForPasskeyList(page, 1);
  });

  test("deleting a passkey updates the list", async ({
    page,
    context,
    browserName,
  }) => {
    skipIfNoVirtualAuthenticator(browserName);
    await addVirtualAuthenticator(context, page);
    const username = uniqueUsername("delete");
    await register(page, username);
    await page.goto("/login/");
    await login(page, username);

    await waitForPasskeyList(page, 1);

    // Deleting the only passkey (→ empty list) rather than adding a second
    // one first: "Add a passkey" here calls the same register() used for
    // brand-new accounts (see passkeys/index.tsx's handleAdd) — it's an
    // unrelated identity, not a second credential for the one currently
    // logged in (see phases/backlog.md for that product question), and
    // each attempt costs 2 more calls against the same rate-limited
    // /auth/* budget this test has already been drawing from for
    // register+login+list. Deleting the sole passkey covers "list updated"
    // just as well without that extra, flakier round trip.
    await clickUntil(
      page,
      page.locator(".passkey-item").first().getByRole("button", {
        name: "Remove",
      }),
      () =>
        expect(page.locator(".passkey-item")).toHaveCount(0, {
          timeout: 2000,
        }),
    );
  });
});

test.describe("sign out", () => {
  test("sign out redirects to /login and clears localStorage", async ({
    page,
    context,
    browserName,
  }) => {
    skipIfNoVirtualAuthenticator(browserName);
    await addVirtualAuthenticator(context, page);
    const username = uniqueUsername("signout");
    await register(page, username);
    await page.goto("/login/");
    await login(page, username);

    await clickUntil(page, page.getByRole("button", { name: "Sign out" }), () =>
      expect(page).toHaveURL(/\/login\/?$/, { timeout: 2000 }),
    );

    const token = await page.evaluate(() =>
      localStorage.getItem("brigid.token"),
    );
    expect(token).toBeNull();
  });
});

// These don't touch navigator.credentials at all (client-side format
// validation happens before register()/login() ever run), so — unlike
// every other describe block above — they run on both projects, Firefox
// included. This is what actually backs the "non-WebAuthn assertions still
// execute normally" claim in playwright.config.ts's project comment.
test.describe("form validation (no passkey required)", () => {
  test("register rejects a too-short username without calling the API", async ({
    page,
  }) => {
    await page.goto("/register/");
    const usernameField = page.getByRole("textbox", { name: "Username" });
    await usernameField.fill("ab");
    await usernameField.blur();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("3-64 letters, digits, - or _")).toBeVisible();
    await expect(page).toHaveURL(/\/register\/?$/);
  });

  test("login page renders the username field and submit button", async ({
    page,
  }) => {
    await page.goto("/login/");
    await expect(
      page.getByRole("textbox", { name: "Username" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in with passkey" }),
    ).toBeVisible();
  });
});

// isPasskeySupported() just checks "PublicKeyCredential" in window (see
// lib/webauthn.ts), so deleting it before any page script runs simulates an
// unsupported browser/device regardless of what Chromium/Firefox actually
// support — no navigator.credentials involved, so (like the validation
// block above) these run on both projects and never touch the rate-limited
// /auth/* endpoints.
test.describe("unsupported browser (no WebAuthn)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-expect-error - deliberately removing a browser API for the test
      delete window.PublicKeyCredential;
    });
  });

  test("register shows the unsupported-browser callout instead of the form", async ({
    page,
  }) => {
    await page.goto("/register/");

    await expect(page.locator(".auth-unsupported")).toBeVisible();
    await expect(
      page.getByText(/Passkeys aren't supported on this browser or device/),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Username" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).not.toBeVisible();
  });

  test("login shows the unsupported-browser callout instead of the form", async ({
    page,
  }) => {
    await page.goto("/login/");

    await expect(page.locator(".auth-unsupported")).toBeVisible();
    await expect(
      page.getByText(/Passkeys aren't supported on this browser or device/),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Username" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in with passkey" }),
    ).not.toBeVisible();
  });
});
