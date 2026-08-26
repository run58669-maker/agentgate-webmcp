# AgentGate — demo video script (target ≤ 3:00)

Screen recording + voiceover. Timestamps are targets, not hard cuts — pad/trim in editing, but do
not exceed 3:00 total.

## 0:00–0:30 — The problem (30s)

**Visual:** Split screen or quick cuts across: an agent clicking a styled-radio input that does
nothing; a `sleep(1500)` in a terminal followed by scraping `innerText`; a generic "Please answer
this question" form error; a Submit button that looks identical to every other button.

**Voiceover:**
> "WebMCP lets a web page register tools an agent can call. But once a page has tools, four
> questions show up immediately: what can I do here, right now? Did that actually work? Is this
> button safe to press, or does it delete something? And who's going to stop me from pressing it by
> accident? WebMCP doesn't answer any of those. We built the layer that does — AgentGate."

## 0:30–2:00 — Side-by-side demo (90s)

**Visual:** Two browser windows/tabs of the same "Grant Portal" 5-step app: left = `?agentgate=off`
(bare DOM), right = AgentGate on, with the Agent console panel visible on the right side.

1. (0:30–0:50) **Bare DOM, left window.** Click the organization-type radio input directly —
   nothing happens. Click the label instead — it works. Point out: "an agent that correctly clicks
   the semantically right element gets nothing." Trigger the 1.5s load; nothing on the page signals
   it's not ready.
2. (0:50–1:15) **AgentGate, right window — Agent console driving the flow.** Click through the
   console buttons: `describe_page` (show the JSON: full tool list + risk tiers + current state),
   `create_account`, `set_org_type`, `save_profile` — each receipt logs `{ok, state, errors, next}`
   live in the panel.
3. (1:15–1:40) **Upload + ready gating.** Click `upload_file` — show the `NOT_READY` receipt with
   `retry_after_ms`; wait ~1.5s, click it again — now `ok:true`. Contrast: bare DOM had a spinner
   and nothing else.
4. (1:40–2:00) **The irreversible submit.** Click `submit_application` directly — show the
   `HUMAN_REQUIRED` receipt. Click `request_human` — the confirmation panel appears on the page
   itself (not in the console). Click **Confirm** on the panel. Click `submit_application (with
   token)` — `ok:true`, application submitted. Cut to the bare-DOM left window submitting instead:
   button click → a plain text toast, no confirmation, no way back.

## 2:00–2:30 — The protocol (30s)

**Visual:** `docs/PROTOCOL.md` or a simple slide listing the five capabilities.

**Voiceover:**
> "That's the whole protocol: describe_page tells an agent what's here and what state it's in.
> Every tool call returns the same structured receipt — ok, state, errors, next. Every tool is
> tagged read, write, or irreversible. Irreversible tools are physically incapable of running
> without a token a human handed out by clicking Confirm on request_human. And ready gating means
> a tool never has to guess whether the page actually finished loading."

## 2:30–3:00 — The integration (30s)

**Visual:** Editor with `packages/agentgate/README.md`'s code sample, then the terminal running
`npm run build` / `npm run test` with real output on screen.

**Voiceover:**
> "For a developer, it's three lines: init AgentGate, register a tool with a risk level, done —
> the library handles readiness, receipts, and the confirmation flow underneath a real
> `document.modelContext.registerTool()` call. It's a zero-dependency library, MIT licensed, with a
> full test suite against WebMCP. Any site can add this today."

**End card:** repo URL + live demo URL.
