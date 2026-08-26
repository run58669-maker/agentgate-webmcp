# Build report

Environment: Windows 11, Node v24.14.0, npm 11.9.0. Run from repo root
`C:\Users\86150\Desktop\hackathons\webmcp_agentgate`, 2026-08-26.

## 1. WebMCP API verification

Fetched directly from `webmachinelearning/webmcp` on GitHub (not paraphrased from memory):
`README.md`, `index.bs` (the actual Bikeshed spec — there is no separate `docs/explainer.md` in
that repo), `implementation-status.md`. Findings recorded in `docs/API_NOTES.md`. Headline result:
the real API is `document.modelContext.registerTool/getTools/executeTool` + `toolchange` event;
`navigator.modelContext` does not exist anywhere in the spec source. AgentGate feature-detects both
per the work order's instruction, and warns + falls back to a local-only registry if neither exists.

## 2. `packages/agentgate` — test output (actual, unedited)

```
> agentgate@0.1.0 test
> vitest run

 RUN  v2.1.9 C:/Users/86150/Desktop/hackathons/webmcp_agentgate/packages/agentgate

stderr | test/index.test.ts > describe_page > works even when no native modelContext exists (falls back to local registry)
AgentGate: no WebMCP implementation found (checked document.modelContext and navigator.modelContext). Tools will still be tracked on window.agentgate for local introspection, but will not be exposed to a real browser agent.

stderr | test/index.test.ts > callTool (direct-execute driver, no native WebMCP host required) > runs the exact same wrapped execute path as a real modelContext call
AgentGate: no WebMCP implementation found (checked document.modelContext and navigator.modelContext). Tools will still be tracked on window.agentgate for local introspection, but will not be exposed to a real browser agent.

stderr | test/index.test.ts > callTool (direct-execute driver, no native WebMCP host required) > returns an UNKNOWN_TOOL error receipt for a name that was never registered
AgentGate: no WebMCP implementation found (checked document.modelContext and navigator.modelContext). Tools will still be tracked on window.agentgate for local introspection, but will not be exposed to a real browser agent.

 ✓ test/index.test.ts (25 tests) 72ms

 Test Files  1 passed (1)
      Tests  25 passed (25)
   Start at  12:18:08
   Duration  2.21s (transform 95ms, setup 0ms, collect 127ms, tests 72ms, environment 1.40s, prepare 205ms)
```

25/25 tests pass (spec required ≥15). The three `console.warn` lines are expected — they're from
the tests that specifically exercise the no-native-WebMCP fallback path.

`tsc --noEmit` (both `packages/agentgate` and `apps/demo`): clean, zero errors, zero output.

## 3. `packages/agentgate` — build output (actual, unedited)

```
> agentgate@0.1.0 build
> tsup

CLI Building entry: {"agentgate":"src/index.ts"}
CLI Using tsconfig: tsconfig.json
CLI tsup v8.5.1
CLI Target: es2020
CLI Cleaning output folder
ESM Build start
IIFE Build start
IIFE dist\agentgate.js      7.86 KB
IIFE dist\agentgate.js.map  25.82 KB
IIFE Build success in 31ms
ESM  dist\agentgate.mjs      7.86 KB
ESM  dist\agentgate.mjs.map  25.82 KB
ESM  Build success in 32ms
DTS Build start
DTS Build success in 1010ms
DTS dist\agentgate.d.ts  4.34 KB
```

`packages/agentgate/dist/` file listing (`ls -la`):

```
-rw-r--r-- 1 86150 197609  4446 agentgate.d.ts
-rw-r--r-- 1 86150 197609  8044 agentgate.js        (IIFE, <script>-tag usable)
-rw-r--r-- 1 86150 197609 26448 agentgate.js.map
-rw-r--r-- 1 86150 197609  8044 agentgate.mjs       (ESM, `import { AgentGate } from "agentgate"`)
-rw-r--r-- 1 86150 197609 26447 agentgate.mjs.map
```

## 4. `apps/demo` — build output (actual, unedited)

```
> demo@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 13 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.45 kB │ gzip: 0.30 kB
dist/assets/index-C6V5UZZC.css  4.32 kB │ gzip: 1.49 kB
dist/assets/index-Cmeq9aLQ.js   23.74 kB │ gzip: 7.90 kB
✓ built in 231ms
```

`apps/demo/dist/` file listing (`ls -la`):

```
-rw-r--r-- 1 86150 197609   451 index.html
-rw-r--r-- 1 86150 197609  4322 assets/index-C6V5UZZC.css
-rw-r--r-- 1 86150 197609 23781 assets/index-Cmeq9aLQ.js
```

`npm run build` at the repo root runs both builds in sequence (`build --workspace=agentgate &&
build --workspace=demo`) — verified above, exit code 0 for both.

## 5. Functional verification beyond `tsc`/build (no live Chrome extension available in this
environment — see "Unresolved")

Since the sandbox has no working `claude-in-chrome` browser connection, the demo was smoke-tested
by bundling `apps/demo/src/main.ts` with esbuild (IIFE, IIFE bundle in-memory) and executing it
inside a `jsdom` window with `runScripts:"dangerously"`, then driving the actual DOM (form fields,
button clicks via `dispatchEvent`, the Agent console's buttons) exactly as a browser would. Full
transcript is not committed (scratch script, deleted after use); results:

- Both `?agentgate` on and `?agentgate=off` boot with **zero** JS exceptions / console errors.
- `window.agentgate` is present with all 8 tools (`describe_page`, `request_human`,
  `create_account`, `set_org_type`, `save_profile`, `upload_file`, `get_application_summary`,
  `submit_application`) in "on" mode; `undefined` in "off" mode, as designed.
- Human-path step 1 → step 2 transition (filling the account form, clicking Continue) works.
- Full agent-driven walk through all 10 "Agent console" buttons was run end-to-end and produced
  exactly the expected receipts at every step, in order:
  1. `create_account` → `ok:true`, `step:2`.
  2. `set_org_type("nonprofit")` → `ok:true`.
  3. `save_profile` → `ok:true`, `step:3`.
  4. `upload_file("budget.pdf")` (scan just started) → `ok:false, code:"NOT_READY", retry_after_ms:1500`.
  5. Same call after the 1.5s scan finished → `ok:true`, `step:4`.
  6. `get_application_summary` → `ok:true`, full `{account, profile, upload}` data payload.
  7. `submit_application` called directly → `ok:false, code:"HUMAN_REQUIRED", next:["request_human"]`.
  8. `request_human({action:"submit_application", reason:...})` → in-page confirmation panel
     rendered with the right action/reason text; clicking **Confirm** resolved it to
     `ok:true, data:{token, scope:"submit_application", expires_at}`.
  9. `submit_application({_agentgate_token: token})` → `ok:true, state:{step:5, submitted:true}`.
  10. Final DOM contains the "Application submitted" confirmation screen.
- Bare-DOM mode: verified `window.agentgate` is absent (library genuinely not loaded), and the
  custom organization-type radio group renders with the documented `pointer-events:none` on the
  `<input>` (the "click the input directly does nothing" bug) with the `<label>` as the only
  functional click target. Note: a synthetic `dispatchEvent("click")` in jsdom bypasses
  `pointer-events` CSS entirely (jsdom doesn't hit-test), so that specific assertion could not be
  automated here — `pointer-events:none` is the standard, well-established technique for this bug
  and blocks real click-based hit-testing (a human mouse click, or a coordinate-based automated
  click) in any real rendering engine; it's a CSS property, not something jsdom's synthetic events
  exercise correctly.

## Unresolved

- **Live deployment.** SPEC.md's contest deliverables call for a deployed URL (Cloudflare
  Pages/Netlify/GitHub Pages). Deploying requires creating/authenticating a hosting account, which
  this build pass did not do (out of scope for an unattended build worker; needs the account
  owner's go-ahead). `apps/demo/dist/` is built and verified — any static host can serve it as-is
  (it uses `base:"./"` relative asset paths).
- **YouTube demo video.** `video/SCRIPT.md` is written (≤3:00 script, four scenes: problem →
  side-by-side demo → protocol → integration) but not recorded — no screen/audio recording
  capability in this environment, and publishing to YouTube needs the account owner.
- **Real Chrome WebMCP origin trial.** Not exercised against an actual Chrome 149+ origin trial
  (`chrome://flags/#enable-webmcp-testing`) in this sandbox — no working browser automation
  connection was available (see "Functional verification" above for the jsdom-based substitute).
  The library's feature-detection and wrapped-execute logic are covered by the 25 vitest tests
  against a spec-shaped mock of `document.modelContext`, and separately verified end-to-end via the
  demo's own registered tools in the jsdom smoke run.
- **Repo name/visibility & GitHub push.** This build pass did not create or push to a public GitHub
  repo — `docs/SUBMISSION_DRAFT.md` has a placeholder for the repo URL. `git remote` is not yet
  configured in this workspace (per the work order: "Do not push (no remote yet)").

## Commit history (this build pass)

```
77f98da docs: MIT LICENSE, project README, one-page protocol spec, Devpost submission draft, video script
4d0ac19 feat(demo): Grant Portal 5-step Vite app with agentgate on/off toggle, agent console, and full irreversible+request_human flow
0c56c27 feat(agentgate): add callTool() direct-execute driver for demos/testing without a live WebMCP host
1b68c92 feat(agentgate): zero-dependency WebMCP protocol layer (describe_page, structured receipts, risk tiers, request_human, ready gating) with 23 passing vitest tests
1eb404b docs: record verified WebMCP API from spec source (document.modelContext, registerTool/getTools/executeTool, no navigator.modelContext, no built-in risk tiers/request_human/ready)
e8e3229 AgentGate spec
```
