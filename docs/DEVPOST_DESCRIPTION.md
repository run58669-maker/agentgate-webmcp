**AgentGate** is a zero-dependency protocol layer on top of WebMCP's `document.modelContext.registerTool()`. It makes a web page *talk* to agents: what it can do and what state it's in (`describe_page`), whether a call worked and which field failed (structured receipts), which actions are dangerous (`risk: read | write | irreversible`), how to hand the one irreversible step to a human (`request_human` → single-use scoped token), and when async content is actually ready (`ready` gating). Three lines to integrate into any site; a real five-step **Grant Portal** demo shows the same page with and without it.

**Live demo:** https://run58669-maker.github.io/agentgate-webmcp/ (open in Chrome with `chrome://flags/#enable-webmcp-testing` or ChatGPT's in-app browser; `?agentgate=off` shows the bare-DOM "before" version)
**Code (MIT):** https://github.com/run58669-maker/agentgate-webmcp

## The problem, from an agent's point of view
Every one of these is something an agent actually hits when operating real websites: it dumps every button and guesses which one matters; it clicks Submit, sleeps, and re-reads the page hoping to spot "Thanks"; validation errors come back as one vague sentence with no field name; Submit and Cancel look identical, so nothing marks the irreversible step; "page loaded" says nothing about whether the async content is ready; and a captcha or a payment step either kills the run or gets hard-clicked. WebMCP solves discovery and invocation. AgentGate adds the five things a page needs to say next.

## Why a site owner would install this (the honest version)
We used this exact protocol to ship this submission — and every third-party site we touched today (Devpost, YouTube) had none of it, so we fell back to the old way: dump every button, guess, click an `<input>` that ignores clicks until you hit its `<label>`, sleep, re-read the page. That is what agent traffic looks like to a site today: brittle scrapers that break on the next redesign, retry blindly, and sometimes fire the irreversible button.

AgentGate is the cheap alternative for the site owner:
- **Three lines, no rewrite.** Wrap the handlers you already have. Nothing changes for human visitors.
- **You decide what agents may do.** `risk: "irreversible"` means no agent can submit, pay, or delete without a person on your page clicking Confirm — the site enforces it, not the agent's good manners.
- **Fewer support tickets.** Structured receipts and field-level errors mean agents fix their own mistakes instead of retrying, and `describe_page` means they stop clicking things at random.
- **Ready gating protects your backend.** `NOT_READY` + `retry_after_ms` replaces the hammering that "sleep and retry" agents do today.

It also **dogfoods**: after building it, the author-agent (Claude) drove the demo site end-to-end purely from receipts — and immediately found a gap (a required field the demo silently accepted), which is now a field-level error in the demo and a step in the video.

## Why WebMCP is the right fit

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

## Why the experience is better — for the human and the agent

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

## What a human + agent can now do together

Delegate a genuinely multi-step, stateful, partly-irreversible workflow — filling out a grant
application across five pages, including a file upload with real async processing — to an agent,
while keeping a hard checkpoint at the one step that can't be undone. Before AgentGate, that
checkpoint either didn't exist (the agent submits, period) or existed only as "the agent is
supposed to ask the user in chat first," which is a convention the *page* has no way to enforce. In
our demo, `submit_application` is registered `risk:"irreversible"` — the browser-mediated tool
itself refuses to run without a token minted by a human clicking Confirm in the page. The agent
can prepare everything (account, profile, upload) autonomously and fast; the human's involvement is
reduced to exactly one deliberate click, on exactly the one step where a mistake can't be undone.

## How we implemented WebMCP

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