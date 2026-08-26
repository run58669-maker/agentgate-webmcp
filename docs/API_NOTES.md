# WebMCP API Notes (verified 2026-08-26)

Sources fetched directly from the spec repo (not paraphrased from memory):

- `https://raw.githubusercontent.com/webmachinelearning/webmcp/main/README.md`
- `https://raw.githubusercontent.com/webmachinelearning/webmcp/main/index.bs` (the actual Bikeshed spec — this is the normative source, there is no separate `docs/explainer.md`)
- `https://raw.githubusercontent.com/webmachinelearning/webmcp/main/implementation-status.md`

## The real global object: `document.modelContext`, NOT `navigator.modelContext`

The spec's IDL (index.bs line ~602-610) is explicit:

```webidl
[Exposed=Window, SecureContext]
interface ModelContext : EventTarget {
  Promise<undefined> registerTool(ModelContextTool tool, optional ModelContextRegisterToolOptions options = {});
  Promise<sequence<RegisteredTool>> getTools(optional ModelContextGetToolOptions options = {});
  Promise<DOMString> executeTool(RegisteredTool tool, optional object inputObject = {}, optional ModelContextExecuteToolOptions options = {});
  attribute EventHandler ontoolchange;
};
```

and it is exposed as `Document.modelContext` (a partial `Document` interface, referenced throughout the explainer as `document.modelContext.registerTool(...)`). There is **no** `navigator.modelContext` anywhere in the README, the explainer prose, or the spec IDL — that name does not exist in the current proposal. Chrome 149 / Edge 150 origin trials both implement `document.modelContext`.

Because the SPEC.md work order asked us to hedge against the API living on `navigator` instead, AgentGate **feature-detects both** (`document.modelContext` first, `navigator.modelContext` second) at init time and only uses whichever is actually present. If neither exists, AgentGate logs a `console.warn` and still exposes `window.agentgate` in a degraded, no-op mode (tools can be registered against it and describe_page/receipts still work for same-page introspection; nothing is exposed to a real browser agent).

## `registerTool(tool, options)`

```js
await document.modelContext.registerTool({
  name: "add-todo",                 // required, unique
  title: "Add todo",                // optional, DOMString, for native UI
  description: "...",               // required, non-empty
  inputSchema: { type: "object", properties: {...}, required: [...] }, // optional JSON Schema object
  execute: async (inputObject, options) => { /* options.signal is an AbortSignal */
    return { content: [{ type: "text", text: "..." }] }; // convention seen in every explainer example; execute callback return type is `Promise<any>` in the IDL, so it is NOT enforced by the browser
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false } // optional metadata
}, { exposedTo: [...], signal: abortController.signal }); // options optional
```

- Rejects if a tool with the same `name` is already registered, or if `name`/`description` is empty, or `inputSchema` is invalid.
- `execute`'s callback type is `Promise<any>` — **the return shape is not constrained by the platform**. The README examples happen to return an MCP-style `{content:[{type:"text", text}]}` object by convention (because WebMCP intentionally shares vocabulary with MCP), but nothing stops a tool from returning a different plain object. AgentGate exploits this: our wrapped `execute` returns our own structured receipt (`{ok, state, errors, next}`) merged with an MCP-compatible `content` array, so both a raw-object consumer and an MCP-style consumer can read the result.
- `ToolAnnotations.readOnlyHint` (bool) and `untrustedContentHint` (bool) are the *only* built-in risk-style hints in the spec. There is **no built-in "irreversible" risk tier** — that's a gap AgentGate fills. We map our `risk: "read"|"write"|"irreversible"` onto `annotations.readOnlyHint = (risk === "read")` for spec-compatible hinting, and additionally encode the full three-tier value in the tool `description` (machine-parseable prefix) plus our own `describe_page` tool, since annotations has no free-form risk field.

## Unregistering

There is no explicit `unregisterTool()` method. Registration takes an `AbortSignal` (`options.signal`); aborting the associated `AbortController` unregisters the tool. AgentGate wraps this: `gate.tool()` returns a handle with `.unregister()` that internally calls `controller.abort()`.

## Discovery & execution (for in-page/iframe agents)

- `document.modelContext.getTools({ fromOrigins })` → `Promise<RegisteredTool[]>`, each with `name`, `title?`, `description`, `inputSchema`, `window`, `origin`.
- `document.modelContext.executeTool(registeredTool, inputObject, { signal })` → `Promise<DOMString>` — **the stringified result**. (Built-in browser agents use a separate internal mechanism and are not required to go through this method; this path is documented for author-provided in-page/iframe agents.)
- `document.modelContext.addEventListener("toolchange", handler)` fires when tools are added/removed/updated — used by in-page agents to keep their tool list fresh. AgentGate re-dispatches this after every `gate.tool()` / `.unregister()` call implicitly (native browser behavior), and additionally exposes `gate.onToolChange(cb)` as a convenience wrapper.

## `ready` gating

Nothing like a `ready` gate exists in the WebMCP spec at all — it is entirely an AgentGate addition. We implement it ourselves: `AgentGate.init()` starts in a not-ready state; every registered tool's wrapped `execute` checks readiness before running the real user `execute` and short-circuits with `{ok:false, code:"NOT_READY", retry_after_ms}` (default 500ms) until the app calls `gate.ready()`.

## `request_human` / irreversible confirmation

Also entirely a AgentGate addition — WebMCP has an **open question** (`Issue #165`, `Issue #50` — "User prompting and elicitation") acknowledging this exact gap ("Exploring a way for a tool to prompt the user for confirmation when tools require explicit user authorization") is unsolved upstream. AgentGate's `request_human()` panel + single-use scoped token is our answer to that open question, registered as a normal read-risk WebMCP tool itself (`request_human`) so an agent can discover and call it like any other tool.

## describe_page

Not a spec feature. AgentGate registers `describe_page` as an ordinary `risk:"read"` tool during `AgentGate.init()`; its `execute` returns the app name, whoami() result, ready state, and every currently-registered tool's name/risk/description — solving the "agent has to dump every button" problem named in SPEC.md.

## Summary of what's real vs. what AgentGate adds

| Capability | Status |
|---|---|
| `document.modelContext.registerTool/getTools/executeTool`, `toolchange` event, `AbortSignal` unregistration | **Real, verified from spec source** |
| `annotations.readOnlyHint` / `untrustedContentHint` | **Real**, but no irreversible tier |
| `describe_page`, structured `{ok,state,errors,next}` receipts, `risk:"irreversible"` gating, `request_human`, `ready`/`NOT_READY` gating | **AgentGate protocol layer — not in WebMCP**, built on top of `registerTool`/`execute` |
