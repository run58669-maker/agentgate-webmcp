# The AgentGate protocol

AgentGate is a thin, opinionated protocol layered on top of [WebMCP](https://github.com/webmachinelearning/webmcp)'s
`document.modelContext.registerTool()`. WebMCP standardizes how a page exposes JS functions as
agent-callable tools; it does not standardize *what those tools say back*, *how risky they are*,
or *how a human stays in the loop* for the dangerous ones. AgentGate fills exactly those five gaps
— see `docs/API_NOTES.md` for the line-by-line justification against the spec source.

## 1. `describe_page`

Auto-registered by `AgentGate.init()`. A `risk:"read"` tool with no required input, always
callable (not gated by `ready()`). Returns:

```json
{
  "ok": true,
  "state": { "app": "Grant Portal", "whoami": "run58669-maker", "ready": true },
  "data": { "tools": [{ "name": "submit_application", "risk": "irreversible", "description": "..." }] },
  "next": ["create_account", "save_profile", "..."]
}
```

Replaces dumping the DOM's `a`/`button` elements and guessing which ones matter, and answers
"who am I logged in as" without scraping a nav bar.

## 2. Structured receipts

Every `gate.tool()`-registered `execute()` — no matter what the tool author returns — resolves
through AgentGate to the same shape:

```ts
{ ok: boolean, state: object, errors: {field, code, message}[], next: string[], data?, code?, retry_after_ms?, request_human_reason? }
```

`normalizeReceipt()` (`packages/agentgate/src/receipt.ts`) fills in any field the tool author
omitted (`state:{}`, `errors:[]`, `next:[]`, `ok:true`), and a thrown exception is caught and
converted into `{ok:false, errors:[{code:"EXCEPTION", message}]}` rather than propagating as an
unhandled rejection. Replaces `sleep()` + re-read `innerText` to guess whether a submit worked, and
gives a field name for every validation error instead of a generic "Please answer this question."

For a recoverable failure, `next` names the tool to call after correcting the input. A validation
failure from `save_profile` therefore returns `next:["save_profile"]`; a `NOT_READY` result returns
the polling tool itself. AgentGate adds this automatically for its page-wide ready gate. App tools
must include it for their own validation and async receipts. This keeps the recovery path entirely
inside the receipt instead of forcing the agent to reconstruct it from prose.

## 3. Risk tiers

Every tool is registered with `risk: "read" | "write" | "irreversible"`. AgentGate maps this onto
WebMCP's own `annotations.readOnlyHint` for spec-compatible hinting, and additionally prefixes the
tool's description with `[risk:...]` since WebMCP has no native irreversible tier. A `risk:"read"`
or `"write"` tool runs like any WebMCP tool. A `risk:"irreversible"` tool's wrapped `execute()`
refuses to run without a valid `_agentgate_token` in its input (see §4) and returns:

```json
{ "ok": false, "code": "HUMAN_REQUIRED", "request_human_reason": "...", "next": ["request_human"] }
```

## 4. `request_human`

Also auto-registered (`risk:"read"`, always callable). Input: `{action: string, reason: string}`
where `action` must name an already-registered tool. Renders an in-page confirmation panel
(`packages/agentgate/src/panel.ts`) showing the action and reason with Confirm/Cancel buttons, and
returns a promise that resolves once a human clicks one:

- **Cancel** → `{ok:false, code:"HUMAN_DENIED"}`
- **Confirm** → `{ok:true, data:{token, scope, expires_at}}`

The token is minted by an in-memory `HumanTokenStore` (`packages/agentgate/src/token.ts`): single-use
(a `consume()` call marks it used and any second use fails), scoped to the one tool name in `scope`
(a token minted for `delete_account` is rejected by `submit_application`), and expires after 5
minutes by default (`humanTokenTtlMs` option). The agent replays the original tool call with
`{..., _agentgate_token: token}` and it now executes.

## 5. `ready` gating

`AgentGate.init()` starts not-ready. Every `gate.tool()`-registered tool (but not the bootstrap
`describe_page`/`request_human` tools) checks readiness first and short-circuits with:

```json
{ "ok": false, "code": "NOT_READY", "retry_after_ms": 500, "next": ["the_tool_called"] }
```

until the app calls `gate.ready()`. `retry_after_ms` is configurable via `notReadyRetryMs`. Because
`code`/`retry_after_ms` are just receipt fields, a tool author can also return the identical shape
from *inside* their own `execute()` for a narrower, per-tool async condition — the demo's
`upload_file` tool does exactly this while a simulated virus scan is in progress, independent of
the page-wide `gate.ready()` signal (see `apps/demo/src/logic.ts`).

## What AgentGate does not do

It does not talk to a backend, does not replace WebMCP's own transport (`registerTool` /
`getTools` / `executeTool` / `toolchange`), does not attempt any CAPTCHA solving or bot-detection
evasion, and does not persist tokens or state across page loads — everything above lives in memory
for the lifetime of the `AgentGate` instance.
