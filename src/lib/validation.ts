/**
 * Client-side mirror of `RootId::parse` (brigid-identity/src/root_id.rs).
 * Format: `username@server` where `username` is 3-64 ASCII alphanumeric/-/_
 * chars (not all underscores) and `server` is a DNS hostname.
 */

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,64}$/;
const HOSTNAME_LABEL_PATTERN = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/;

function isValidUsername(username: string): boolean {
  if (!USERNAME_PATTERN.test(username)) return false;
  return !/^_+$/.test(username);
}

function isValidServer(server: string): boolean {
  if (server.length === 0 || server.length > 253) return false;
  const labels = server.split(".");
  return labels.every(
    (label) => label.length > 0 && label.length <= 63 && HOSTNAME_LABEL_PATTERN.test(label),
  );
}

export function isValidHandle(handle: string): boolean {
  const at = handle.indexOf("@");
  if (at === -1 || at !== handle.lastIndexOf("@")) return false;
  const username = handle.slice(0, at);
  const server = handle.slice(at + 1);
  return isValidUsername(username) && isValidServer(server);
}
