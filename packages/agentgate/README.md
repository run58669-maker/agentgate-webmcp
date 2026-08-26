# agentgate

A protocol layer on top of [WebMCP](https://github.com/webmachinelearning/webmcp)'s
`document.modelContext.registerTool()`. WebMCP lets a page expose tools to an agent; AgentGate
adds the five things a real agent still needs once tools exist: a `describe_page` map of the page,
structured `{ok,state,errors,next}` receipts instead of guessed toast text, `read`/`write`/`irreversible`
risk tiers (irreversible tools refuse to run until a human confirms), a `request_human` confirmation
panel that returns a scoped single-use token, and `ready()` gating so agents don't race async content.
Zero runtime dependencies; ships as ESM (`import`) and a plain IIFE (`<script>` tag).

## Install

```
npm install agentgate
```

## Usage

```js
import { AgentGate } from "agentgate";

const gate = AgentGate.init({ app: "Grant Portal", whoami: () => session.user });
gate.tool({ name: "save_draft", description: "Saves the current draft.", risk: "write", inputSchema, execute });
gate.tool({ name: "submit_application", description: "Submits the application. Cannot be undone.", risk: "irreversible", inputSchema, execute });
```

Call `gate.ready()` once your async content has actually loaded — before that, every tool call
(except `describe_page`/`request_human`) returns `{ok:false, code:"NOT_READY", retry_after_ms}`.

An agent calling the `irreversible` `submit_application` tool directly gets back
`{ok:false, code:"HUMAN_REQUIRED", request_human_reason, next:["request_human"]}`. It then calls
the auto-registered `request_human({action:"submit_application", reason:"..."})` tool, which renders
an in-page confirm panel; once a human clicks Confirm, it returns `{token, scope, expires_at}`. The
agent retries `submit_application({..., _agentgate_token: token})` and it runs — the token is
single-use, scoped to that one tool name, and expires after 5 minutes by default.

`AgentGate.init()` feature-detects `document.modelContext` and `navigator.modelContext` (see
`../../docs/API_NOTES.md` for why both are checked) and falls back to a local-only registry with a
`console.warn` if neither exists, while still publishing `window.agentgate` for introspection.

## `<script>` tag usage

```html
<script src="./dist/agentgate.js"></script>
<script>
  const gate = AgentGate.init({ app: "Grant Portal" });
</script>
```

## Build & test

```
npm run build   # tsup -> dist/agentgate.mjs (ESM) + dist/agentgate.js (IIFE) + dist/agentgate.d.ts
npm run test    # vitest, jsdom, mocks document.modelContext
```
