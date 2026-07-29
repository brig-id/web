import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAuth,
  deletePasskey,
  loadToken,
  loadUserId,
  login,
  register,
  storeAuth,
  WebAuthnError,
} from "./webauthn";

function toArrayBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

function fakeCredential(kind: "attestation" | "assertion") {
  return {
    id: "credential-id",
    rawId: toArrayBuffer("raw-id"),
    response:
      kind === "attestation"
        ? {
            attestationObject: toArrayBuffer("attestation"),
            clientDataJSON: toArrayBuffer("client-data"),
          }
        : {
            authenticatorData: toArrayBuffer("auth-data"),
            clientDataJSON: toArrayBuffer("client-data"),
            signature: toArrayBuffer("signature"),
            userHandle: null,
          },
    getClientExtensionResults: () => ({}),
  };
}

describe("register/login", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("register() posts begin then finish with the session credential", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          session_id: "sess-1",
          challenge: { publicKey: { challenge: "Y2hhbGxlbmdl", user: { id: "dXNlcg", name: "u", displayName: "u" }, rp: { name: "brig-id" }, pubKeyCredParams: [] } },
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", {
      credentials: { create: vi.fn().mockResolvedValue(fakeCredential("attestation")) },
    });

    await register("alice@example.com");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/auth/register/begin");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/auth/register/finish");
    const finishBody = JSON.parse(fetchMock.mock.calls[1]![1].body);
    expect(finishBody.session_id).toBe("sess-1");
    expect(finishBody.credential.id).toBe("credential-id");
  });

  it("register() throws a browser WebAuthnError when the passkey ceremony is cancelled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          session_id: "sess-1",
          challenge: { publicKey: { challenge: "Y2hhbGxlbmdl", user: { id: "dXNlcg", name: "u", displayName: "u" }, rp: { name: "brig-id" }, pubKeyCredParams: [] } },
        }),
      }),
    );
    vi.stubGlobal("navigator", {
      credentials: { create: vi.fn().mockRejectedValue(new Error("NotAllowedError")) },
    });

    const error = await register("alice@example.com").catch((err) => err);
    expect(error).toBeInstanceOf(WebAuthnError);
    expect((error as WebAuthnError).kind).toBe("browser");
  });

  it("register() throws a network WebAuthnError when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const error = await register("alice@example.com").catch((err) => err);
    expect(error).toBeInstanceOf(WebAuthnError);
    expect((error as WebAuthnError).kind).toBe("network");
  });

  it("register() throws an api WebAuthnError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: "username taken" }),
      }),
    );

    const error = await register("alice@example.com").catch((err) => err);
    expect(error).toBeInstanceOf(WebAuthnError);
    expect((error as WebAuthnError).kind).toBe("api");
    expect((error as WebAuthnError).message).toBe("username taken");
  });

  it("login() returns the LoginResponse from the finish call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          session_id: "sess-2",
          challenge: { publicKey: { challenge: "Y2hhbGxlbmdl" } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id_token: "jwt-token", user_id: "user-1" }),
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", {
      credentials: { get: vi.fn().mockResolvedValue(fakeCredential("assertion")) },
    });

    const result = await login("alice@example.com", "client-1");

    expect(result).toEqual({ id_token: "jwt-token", user_id: "user-1" });
    const beginBody = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(beginBody).toEqual({ username: "alice@example.com", client_id: "client-1" });
  });

  it("deletePasskey() sends a DELETE with the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await deletePasskey("pk-1", "user-1", "jwt-token");

    expect(fetchMock).toHaveBeenCalledWith(
      "/auth/passkeys/pk-1",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ Authorization: "Bearer jwt-token" }),
      }),
    );
  });

  it("round-trips auth state through localStorage", () => {
    expect(loadToken()).toBeNull();
    storeAuth("jwt-token", "user-1");
    expect(loadToken()).toBe("jwt-token");
    expect(loadUserId()).toBe("user-1");
    clearAuth();
    expect(loadToken()).toBeNull();
    expect(loadUserId()).toBeNull();
  });
});
