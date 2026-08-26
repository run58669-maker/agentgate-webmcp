# Devpost submission draft — AgentGate

**Live URL:** https://run58669-maker.github.io/agentgate-webmcp/ (GitHub Pages, verified HTTP 200 + 8 tools visible via document.modelContext.getTools() in Chrome with WebMCP enabled)
**Repo:** https://github.com/run58669-maker/agentgate-webmcp (public, MIT)
**Video:** https://www.youtube.com/watch?v=EmpHneJSSlw (public, 2:24)

---

## Why is this a good fit for WebMCP?

WebMCP solves discovery and invocation — a page can say "here are my tools" and an agent can call
them. But every non-trivial real product built on top of that immediately needs the same five
things: a map of what's on the page and what state it's in, a reliable way to know if a call
succeeded, a way to mark some actions as more dangerous than others, a way to put a human in the
loop before an irreversible action fires, and a way to say "not yet" instead of racing async
content. WebMCP itself has an open issue for the human-confirmation problem (#165 "Human in the Loop support" / #50 "Handling multiple elicitation requests", both open) and doesn't specify any of the other four. AgentGate is a direct,
minimal-surface-area answer to those five gaps, built entirely on `registerTool()`/`execute()` —
it doesn't fork or reimplement WebMCP, it wraps it. That's the deepest kind of "WebMCP leverage": we
don't just call `registerTool()` once for a toy button, we use it as the substrate for a full
five-step transactional flow with real risk-tiered, human-gated, ready-gated tools.

## Why is the experience better — for both the human and the agent?

For the agent: instead of dumping the DOM and guessing which of 40 buttons matters, it calls
`describe_page()` once and gets a typed list of tools with risk levels and current state. Instead
of `sleep(1500)` and re-reading `innerText` hoping for "Thanks!", every call returns
`{ok, state, errors, next}` — including which field failed validation and what to try next.
Instead of an agent being able to click "Submit" exactly like a "Cancel" button, irreversible
actions are structurally different: they *cannot* execute without a token that only exists after a
human clicked Confirm on a panel that named the exact action and reason. For the human: nothing
changes about how they use the page themselves (a human clicking Submit doesn't need a token — see
`apps/demo/src/render.ts`), but they get visibility and a veto over what an agent does on their
behalf, instead of an agent silently automating a UI they never see.

## What can a human + agent do together that wasn't possible before?

Delegate a genuinely multi-step, stateful, partly-irreversible workflow — filling out a grant
application across five pages, including a file upload with real async processing — to an agent,
while keeping a hard checkpoint at the one step that can't be undone. Before AgentGate, that
checkpoint either didn't exist (the agent submits, period) or existed only as "the agent is
supposed to ask the user in chat first," which is a convention the *page* has no way to enforce. In
our demo, `submit_application` is registered `risk:"irreversible"` — the browser-mediated tool
itself refuses to run without a token minted by a human clicking Confirm in the page. The agent
can prepare everything (account, profile, upload) autonomously and fast; the human's involvement is
reduced to exactly one deliberate click, on exactly the one step where a mistake can't be undone.

## Implementation summary

`packages/agentgate/` is a ~300-line, zero-runtime-dependency TypeScript library
(`AgentGate.init()` / `gate.tool()` / `gate.ready()`) that wraps every registered tool's `execute`
with: a readiness check, a risk-tier + single-use-token check for `irreversible` tools, and a
receipt normalizer, then registers the wrapped function with the real
`document.modelContext.registerTool()` (falling back to `navigator.modelContext`, or to a
local-only registry with a console warning if neither exists — see `docs/API_NOTES.md` for how we
verified the actual spec API before writing any of this). `request_human()` and `describe_page()`
are themselves ordinary auto-registered tools. 25 vitest tests cover all five capabilities against a
mocked `document.modelContext`. `apps/demo/` is a Vite + vanilla TypeScript "Grant Portal" with a
real five-step flow, an `?agentgate=off` bare-DOM comparison mode, and a live "Agent console" panel
that drives and logs every tool call for the demo video.
