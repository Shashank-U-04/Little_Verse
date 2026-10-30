export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;

/** Error bodies carry a stable `code` the client maps to child-friendly copy. */
export function jsonError(code: string, message: string, status: number, extraHeaders: Record<string, string> = {}): Response {
  return Response.json({ error: message, code }, { status, headers: { ...NO_STORE_HEADERS, ...extraHeaders } });
}
