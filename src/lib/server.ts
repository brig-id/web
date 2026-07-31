/**
 * Returns the domain of the brig·id server currently serving this UI.
 * The web UI and `brigid-api` are always same-origin (`server-leaf` serves
 * both from one binary — see phase 3), so the browser's own hostname is
 * authoritative: it matches `[server].domain` in that server's `leaf.toml`
 * by construction, in both dev and prod.
 */
export function currentServer(): string {
  return window.location.hostname;
}
