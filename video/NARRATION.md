# AgentGate demo — narration (exact TTS text)

Generated with Windows System.Speech (`Microsoft Zira Desktop`, en-US, Rate=1) as one WAV per
section, mixed under the matching video segment. Each video segment's length is set to that
section's actual WAV duration (see `video/BUILD_VIDEO_REPORT.md` for the measured numbers /
ffprobe output).

**Revision 3 note:** the "after" section's calls are made live — see `video/BUILD_VIDEO_REPORT.md`
Revision 3 for exactly how. The calls you see are made live by an AI agent (Claude), choosing
each step from the previous receipt, over the Chrome DevTools Protocol, calling the real
`document.modelContext.getTools()` / `executeTool()` WebMCP API directly — not by clicking the
demo's pre-scripted "Agent console" buttons (which stay visible, unclicked, on the right of the
page for contrast).

## 1. Title (title.wav — 3.96s)

> AgentGate. Make your web page talk to agents.

## 2. Before / bare DOM (before.wav — 40.48s)

> WebMCP lets a page register tools an agent can call. But once a page has tools, four questions
> show up. What can I do here right now? Did that work? Is this safe to press? And who stops me
> from pressing it by accident? WebMCP doesn't answer any of those. This Grant Portal has no such
> layer. It loads, but nothing tells an agent when it's ready. This radio only responds to its
> label; the input itself gives a script no signal. Zero tools are registered on document dot
> model context. Submit, and you get a plain text toast. No confirmation, nothing structured,
> nothing an agent can parse.

## 3. After / AgentGate on, driven live by a real agent over CDP (after.wav — 69.99s)

> Same page, AgentGate on. The calls you see are made live by an A I agent, Claude, over the
> Chrome DevTools Protocol, calling the real document dot model context A P I directly and
> choosing each step from the previous receipt. get_tools returns eight real tools, tagged read,
> write, or irreversible. describe_page returns a receipt, not a guess. create_account, then
> set_org_type, then save_profile: ok false, bio is required; fixed, it succeeds. upload_file:
> scan running, not ready with a retry_after_ms; the agent waits, polls again, ok true.
> get_application_summary returns the full application as structured JSON. submit_application,
> called directly, comes back human required. request_human opens a real confirmation panel on
> the page. A human clicks Confirm, not the agent, minting a single use token. Replayed with that
> token: ok true, application submitted. Compare that to the bare dom toast from a minute ago.

## 4. Protocol (protocol.wav — 22.80s)

> That's the whole protocol. describe_page tells an agent what's here and what state it's in.
> Every call returns the same receipt: ok, state, errors, next. Every tool is tagged read, write,
> or irreversible; irreversible tools can't run without a token a human handed out by clicking
> Confirm. Ready gating means a tool never has to guess if the page finished loading.

## 5. Integration (integration.wav — 13.58s)

> For a developer it's three lines: init AgentGate, register a tool with a risk level, done. Zero
> dependency, M I T licensed, full test suite against WebMCP. Repo and live demo linked below.

Total narration: ~150.81s. Final video runtime target: ≤ 2:50 (170s); actual assembled runtime
is reported in `video/BUILD_VIDEO_REPORT.md`.
