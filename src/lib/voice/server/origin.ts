function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first ? first : null;
}

/**
 * The origin the browser should have used to reach this server.
 *
 * `request.url` is not reliable here: `next dev` rewrites it to `localhost`
 * even when the page was opened on 127.0.0.1 or a LAN address, which made
 * every non-localhost voice session fail with 403. The Host header (or the
 * proxy's forwarded host on Vercel) reflects what the browser actually used.
 */
export function expectedOrigin(headers: Headers, requestUrl: string): string | null {
  const host = firstHeaderValue(headers.get("x-forwarded-host")) ?? firstHeaderValue(headers.get("host"));
  if (!host) return null;
  const forwardedProto = firstHeaderValue(headers.get("x-forwarded-proto"));
  let protocol: string;
  try {
    protocol = forwardedProto ?? new URL(requestUrl).protocol.replace(/:$/, "");
  } catch {
    return null;
  }
  if (protocol !== "http" && protocol !== "https") return null;
  return `${protocol}://${host}`.toLowerCase();
}

/** Same-origin browser request check for state-changing voice routes. */
export function isSameOriginRequest(headers: Headers, requestUrl: string, extraAllowedOrigins: string[] = []): boolean {
  const origin = headers.get("origin")?.toLowerCase();
  if (!origin) return false;

  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin") return false;

  if (extraAllowedOrigins.some((allowed) => allowed.toLowerCase() === origin)) return true;
  return origin === expectedOrigin(headers, requestUrl);
}
