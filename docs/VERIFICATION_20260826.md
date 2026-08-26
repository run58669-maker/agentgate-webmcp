# Verification log — 2026-08-26 12:35 JST (小克, hand-checked)

- `packages/agentgate`: `npx vitest run` → 25/25 passed (2.14s).
- `apps/demo`: `npm run build` → dist 0.45 kB html + 4.32 kB css + 23.74 kB js.
- Real Chrome 151 launched with `--enable-features=WebMCP,WebMCPTesting --enable-blink-features=WebMCP`:
  - `document.modelContext` and `navigator.modelContext` both exist and are the same object; prototype = `ontoolchange, executeTool, getTools, registerTool`.
  - `getTools()` on the live site lists our 8 tools (registered through the real API, not the fallback).
  - `executeTool(tool, '{}')` — **input must be a JSON string**; passing an object throws "Failed to parse input arguments". Return value is a string (JSON receipt).
  - `describe_page` → `{ok:true,state:{app,whoami,ready},next:[...],data:{tools:[...risk tiers]}}`.
  - `submit_application` without token → `{ok:false,code:"HUMAN_REQUIRED",next:["request_human"]}`.
- Full 10-step agent flow driven in ordinary Chrome (9222) via the console: NOT_READY poll, HUMAN_REQUIRED block, request_human panel, token-gated submit → "Application submitted". Screenshots: flow_20260826_panel.png, flow_20260826_final.png.
- Live URL https://run58669-maker.github.io/agentgate-webmcp/ → HTTP 200, screenshot live_pages_webmcp_chrome_20260826.png.
