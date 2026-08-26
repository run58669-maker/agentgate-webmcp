# AgentGate

WebMCP lets a web page register JS functions as tools an agent can call
(`document.modelContext.registerTool()`). It doesn't say what those tools should say back, how
dangerous they are, or how a human stays in the loop before an agent deletes or submits something.
**AgentGate is that missing layer**: `describe_page()`, structured `{ok,state,errors,next}`
receipts, `read`/`write`/`irreversible` risk tiers, a `request_human()` confirmation panel with a
single-use scoped token, and `ready()` gating — three lines to add to any site, built on real
WebMCP underneath. See `docs/PROTOCOL.md` for the one-page spec and `docs/API_NOTES.md` for exactly
what's real WebMCP vs. what AgentGate adds.

```js
import { AgentGate } from "agentgate";
const gate = AgentGate.init({ app: "Grant Portal", whoami: () => session.user });
gate.tool({ name: "save_draft", risk: "write", inputSchema, execute });
gate.tool({ name: "submit_application", risk: "irreversible", inputSchema, execute });
```

## Why a site owner would install this
We used this exact protocol to ship this submission — and every third-party site we touched today (Devpost, YouTube) had none of it, so we fell back to the old way: dump every button, guess, click an `<input>` that ignores clicks until you hit its `<label>`, sleep, re-read the page. That is what agent traffic looks like to a site today: brittle scrapers that break on the next redesign, retry blindly, and sometimes fire the irreversible button.

AgentGate is the cheap alternative for the site owner:
- **Three lines, no rewrite.** Wrap the handlers you already have. Nothing changes for human visitors.
- **You decide what agents may do.** `risk: "irreversible"` means no agent can submit, pay, or delete without a person on your page clicking Confirm — the site enforces it, not the agent's good manners.
- **Fewer support tickets.** Structured receipts and field-level errors mean agents fix their own mistakes instead of retrying, and `describe_page` means they stop clicking things at random.
- **Ready gating protects your backend.** `NOT_READY` + `retry_after_ms` replaces the hammering that "sleep and retry" agents do today.

It also **dogfoods**: after building it, the author-agent (Claude) drove the demo site end-to-end purely from receipts — and immediately found a gap (a required field the demo silently accepted), which is now a field-level error in the demo and a step in the video.

## What's in this repo

- `packages/agentgate/` — the zero-runtime-dependency library. ESM + `<script>`-tag IIFE build,
  25 vitest tests against a mocked `document.modelContext`.
- `apps/demo/` — "Grant Portal", a 5-step application flow (account → profile → upload → review →
  submit) built with Vite + vanilla TS. `?agentgate=off` swaps in a deliberately bare-DOM version
  (custom radio buttons that only respond to label clicks, an unsignalled 1.5s async load, a submit
  button that shows nothing but a text toast) for side-by-side comparison. The AgentGate version
  registers real tools, gates the irreversible submit behind `request_human`, and includes a live
  "Agent console" panel that logs every tool call and receipt as JSON.
- `docs/` — `API_NOTES.md` (what's verified from the WebMCP spec source vs. what AgentGate adds),
  `PROTOCOL.md` (one-page protocol spec), `SUBMISSION_DRAFT.md` (Devpost write-up).
- `video/SCRIPT.md` — the ≤3 minute demo video script.

## Run it

```
npm install
npm run build          # builds packages/agentgate, then apps/demo -> apps/demo/dist
npm run dev             # apps/demo dev server (Vite)
npm run test            # packages/agentgate vitest suite
```

Then open the printed dev URL for the AgentGate version, and append `?agentgate=off` for the bare
DOM comparison.

## Testing against a real WebMCP browser agent

AgentGate feature-detects `document.modelContext` (and `navigator.modelContext`, in case the final
spec lands there instead — see `docs/API_NOTES.md`). Without either, it still runs — tools are
tracked locally on `window.agentgate`, and the demo's "Agent console" panel drives them directly via
`agentgate.callTool()`, which is the identical wrapped-execute code path a real WebMCP host would
invoke. To exercise the actual browser-mediated path in Chrome:

1. Use Chrome 149+ (or Edge 150+) and open `chrome://flags/#enable-webmcp-testing`, enable it, and
   relaunch.
2. Open the deployed demo URL. `document.modelContext` will now be present, so
   `AgentGate.init()` registers every tool through the real WebMCP API instead of the local-only
   fallback (check the "Agent console" — `hasNativeWebMCP()` shows true, no `console.warn`).
3. Chrome's own in-browser agent (where enabled under the origin trial) or any in-page agent using
   `document.modelContext.getTools()` / `executeTool()` can now discover and call the site's tools
   directly.

## Rules followed

No paid services (Vite dev server / static build, deployed to a free static host). No CAPTCHA
bypass or anti-detection code. Zero runtime dependencies in `packages/agentgate` (build/test
tooling — tsup, vitest, jsdom, TypeScript — are devDependencies only). MIT-licensed, see `LICENSE`.
