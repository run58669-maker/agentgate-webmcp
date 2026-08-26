# AgentGate demo — narration (exact TTS text)

Generated with Windows System.Speech (`Microsoft Zira Desktop`, en-US, Rate=1) as one WAV per
section, mixed under the matching video segment. Each video segment's length is set to that
section's actual WAV duration (see `video/BUILD_VIDEO_REPORT.md` for the measured numbers /
ffprobe output).

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

## 3. After / AgentGate on (after.wav — 60.14s)

> Same page, AgentGate on. Eight tools are registered through the real document dot model context
> A P I, each tagged read, write, or irreversible. Call describe_page and you get a receipt back,
> not a guess; full tool list, current state, what's next. While the session loads, gated tools
> return not ready with a retry time instead of failing silently. Upload a file: the scan is
> running, so upload_file returns not ready with a retry_after_ms. Poll again, it flips to ok
> true. Now the irreversible one; call submit_application directly and AgentGate blocks it: human
> required. Call request_human, and a real confirmation panel opens on the page, showing the
> action and reason. A human clicks Confirm, not the agent, and that mints a single use token.
> Replay submit_application with that token; ok true, application submitted. Compare that to the
> bare dom toast from a minute ago.

## 4. Protocol (protocol.wav — 22.80s)

> That's the whole protocol. describe_page tells an agent what's here and what state it's in.
> Every call returns the same receipt: ok, state, errors, next. Every tool is tagged read, write,
> or irreversible; irreversible tools can't run without a token a human handed out by clicking
> Confirm. Ready gating means a tool never has to guess if the page finished loading.

## 5. Integration (integration.wav — 13.58s)

> For a developer it's three lines: init AgentGate, register a tool with a risk level, done. Zero
> dependency, M I T licensed, full test suite against WebMCP. Repo and live demo linked below.

Total narration: ~140.96s. Final video runtime target: ≤ 2:50 (170s); actual assembled runtime
is reported in `video/BUILD_VIDEO_REPORT.md`.
