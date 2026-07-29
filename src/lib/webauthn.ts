import type {
  BeginLoginRequest,
  BeginLoginResponse,
  BeginRegisterRequest,
  BeginRegisterResponse,
  FinishLoginRequest,
  FinishRegisterRequest,
  LoginResponse,
  PublicKeyCredentialJSON,
  RegisterPublicKeyCredentialJSON,
} from "./api-types";

export type WebAuthnErrorKind = "network" | "browser" | "api";

export class WebAuthnError extends Error {
  kind: WebAuthnErrorKind;

  constructor(kind: WebAuthnErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "WebAuthnError";
  }
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(padded + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function apiRequest<T>(
  path: string,
  body: unknown,
  method: "POST" | "DELETE" = "POST",
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new WebAuthnError("network", "Unable to reach the server.");
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore — keep the generic message
    }
    throw new WebAuthnError("api", message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function register(username: string): Promise<void> {
  const begin = await apiRequest<BeginRegisterResponse>(
    "/auth/register/begin",
    { username } satisfies BeginRegisterRequest,
  );

  const options = begin.challenge.publicKey;
  let credential: PublicKeyCredential | null;
  try {
    credential = (await navigator.credentials.create({
      publicKey: {
        ...options,
        challenge: base64UrlToBuffer(options.challenge),
        user: {
          ...options.user,
          id: base64UrlToBuffer(options.user.id),
        },
        excludeCredentials: options.excludeCredentials?.map((cred) => ({
          type: cred.type,
          id: base64UrlToBuffer(cred.id),
          transports: cred.transports as AuthenticatorTransport[] | undefined,
        })),
      } as PublicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;
  } catch {
    throw new WebAuthnError("browser", "Passkey creation was cancelled or failed.");
  }
  if (!credential) {
    throw new WebAuthnError("browser", "No passkey was created.");
  }

  const response = credential.response as AuthenticatorAttestationResponse;
  const finishCredential: RegisterPublicKeyCredentialJSON = {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: "public-key",
    response: {
      attestationObject: bufferToBase64Url(response.attestationObject),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
    },
    clientExtensionResults: credential.getClientExtensionResults() as unknown as Record<
      string,
      unknown
    >,
  };

  await apiRequest<void>("/auth/register/finish", {
    session_id: begin.session_id,
    credential: finishCredential,
  } satisfies FinishRegisterRequest);
}

export async function login(
  username: string,
  clientId: string,
): Promise<LoginResponse> {
  const begin = await apiRequest<BeginLoginResponse>("/auth/login/begin", {
    username,
    client_id: clientId,
  } satisfies BeginLoginRequest);

  const options = begin.challenge.publicKey;
  let credential: PublicKeyCredential | null;
  try {
    credential = (await navigator.credentials.get({
      publicKey: {
        ...options,
        challenge: base64UrlToBuffer(options.challenge),
        allowCredentials: options.allowCredentials?.map((cred) => ({
          type: cred.type,
          id: base64UrlToBuffer(cred.id),
          transports: cred.transports as AuthenticatorTransport[] | undefined,
        })),
      } as PublicKeyCredentialRequestOptions,
    })) as PublicKeyCredential | null;
  } catch {
    throw new WebAuthnError("browser", "Passkey sign-in was cancelled or failed.");
  }
  if (!credential) {
    throw new WebAuthnError("browser", "No passkey was selected.");
  }

  const response = credential.response as AuthenticatorAssertionResponse;
  const finishCredential: PublicKeyCredentialJSON = {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: "public-key",
    response: {
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle
        ? bufferToBase64Url(response.userHandle)
        : undefined,
    },
    clientExtensionResults: credential.getClientExtensionResults() as unknown as Record<
      string,
      unknown
    >,
  };

  return apiRequest<LoginResponse>("/auth/login/finish", {
    session_id: begin.session_id,
    credential: finishCredential,
  } satisfies FinishLoginRequest);
}

export async function deletePasskey(
  passkeyId: string,
  userId: string,
  token: string,
): Promise<void> {
  const response = await fetch(`/auth/passkeys/${passkeyId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_id: userId }),
  }).catch(() => {
    throw new WebAuthnError("network", "Unable to reach the server.");
  });

  if (!response.ok) {
    throw new WebAuthnError(
      "api",
      `Failed to delete passkey (status ${response.status}).`,
    );
  }
}

const TOKEN_KEY = "brigid.token";
const USER_ID_KEY = "brigid.user_id";

export function storeAuth(token: string, userId: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, userId);
}

export function loadToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function loadUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
}
