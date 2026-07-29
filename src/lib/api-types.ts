/**
 * Mirrors the Rust structs in `brigid-api/src/routes/auth.rs`.
 * Field names match the wire format exactly (serde defaults to snake_case
 * unless a struct carries `#[serde(rename_all = "camelCase")]`, as the
 * webauthn-rs proto types do for the WebAuthn challenge/credential payloads).
 */

// -- WebAuthn browser payloads (standard W3C JSON shapes, base64url-encoded) --

export interface PublicKeyCredentialCreationOptionsJSON {
  rp: { id?: string; name: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: Array<{ type: "public-key"; alg: number }>;
  timeout?: number;
  excludeCredentials?: Array<{
    id: string;
    type: "public-key";
    transports?: string[];
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: string;
    residentKey?: string;
    requireResidentKey?: boolean;
    userVerification?: string;
  };
  attestation?: string;
}

export interface PublicKeyCredentialRequestOptionsJSON {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{
    id: string;
    type: "public-key";
    transports?: string[];
  }>;
  userVerification?: string;
}

export interface RegisterPublicKeyCredentialJSON {
  id: string;
  rawId: string;
  type: "public-key";
  response: {
    attestationObject: string;
    clientDataJSON: string;
    transports?: string[];
  };
  clientExtensionResults: Record<string, unknown>;
}

export interface PublicKeyCredentialJSON {
  id: string;
  rawId: string;
  type: "public-key";
  response: {
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
    userHandle?: string;
  };
  clientExtensionResults: Record<string, unknown>;
}

// -- /auth/register --

export interface BeginRegisterRequest {
  username: string;
}

export interface BeginRegisterResponse {
  session_id: string;
  challenge: { publicKey: PublicKeyCredentialCreationOptionsJSON };
}

export interface FinishRegisterRequest {
  session_id: string;
  credential: RegisterPublicKeyCredentialJSON;
}

// -- /auth/login --

export interface BeginLoginRequest {
  username: string;
  client_id: string;
}

export interface BeginLoginResponse {
  session_id: string;
  challenge: {
    publicKey: PublicKeyCredentialRequestOptionsJSON;
    mediation?: string;
  };
}

export interface FinishLoginRequest {
  session_id: string;
  credential: PublicKeyCredentialJSON;
}

export interface LoginResponse {
  id_token: string;
  user_id: string;
}

// -- /auth/passkeys --

export interface PasskeySummary {
  id: string;
}

export interface DeletePasskeyRequest {
  user_id: string;
}

// -- errors --

export interface ApiErrorBody {
  error: string;
}
