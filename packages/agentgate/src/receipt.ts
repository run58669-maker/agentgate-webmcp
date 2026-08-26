import type { PartialReceipt, Receipt } from "./types";

/** Fills in the required fields of a Receipt from whatever a tool author's execute() returned. */
export function normalizeReceipt<T>(partial: PartialReceipt<T> | undefined | null): Receipt<T> {
  const p = partial ?? {};
  return {
    ok: p.ok ?? true,
    state: p.state ?? {},
    errors: p.errors ?? [],
    next: p.next ?? [],
    ...(p.data !== undefined ? { data: p.data } : {}),
    ...(p.code !== undefined ? { code: p.code } : {}),
    ...(p.retry_after_ms !== undefined ? { retry_after_ms: p.retry_after_ms } : {}),
    ...(p.request_human_reason !== undefined ? { request_human_reason: p.request_human_reason } : {}),
  };
}

/**
 * Wraps a Receipt in the MCP-conventional `{content:[{type:"text",...}]}` shape (see
 * docs/API_NOTES.md — WebMCP's execute callback return type is `Promise<any>`, unconstrained by
 * the platform, but every explainer example returns this shape). We spread the receipt fields
 * alongside `content` so a structured consumer can read `.ok`/`.state`/etc directly off the same
 * object, while an MCP-style consumer can read `content[0].text` as JSON.
 */
export function toToolResult<T>(receipt: Receipt<T>): Receipt<T> & { content: { type: "text"; text: string }[] } {
  return {
    ...receipt,
    content: [{ type: "text", text: JSON.stringify(receipt) }],
  };
}
