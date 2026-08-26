import "./style.css";
import { createInitialState, SESSION_LOAD_MS } from "./state";
import { render, Mode } from "./render";
import { wireAgentGate } from "./gate";
import { mountAgentConsole } from "./console";
import type { AgentGate } from "../../../packages/agentgate/src/index";

const params = new URLSearchParams(window.location.search);
const mode: Mode = params.get("agentgate") === "off" ? "off" : "on";

const appRoot = document.getElementById("app")!;
const consoleRoot = document.getElementById("console-root")!;
document.body.classList.toggle("has-console", mode === "on");

const state = createInitialState();

function rerender(): void {
  render(appRoot, { state, mode, rerender });
}

let gate: AgentGate | null = null;

if (mode === "on") {
  gate = wireAgentGate(state, () => state.account?.username ?? null, rerender);
  mountAgentConsole(consoleRoot, gate, rerender);
}

rerender();

// Simulates the app loading the user's saved draft/session on first paint. In AgentGate mode
// every tool except describe_page/request_human returns NOT_READY until gate.ready() below fires.
setTimeout(() => {
  state.loading = false;
  gate?.ready();
  rerender();
}, SESSION_LOAD_MS);
