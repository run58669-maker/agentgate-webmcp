// The "Agent console" panel from SPEC.md: logs every tool call + receipt as JSON, and lets a
// human drive a simulated agent through the flow for the demo video (there's no live browser
// agent available in this environment / in most viewers' browsers without chrome://flags — see
// README "Simulate agent" note). Every button here calls AgentGate.callTool(), which runs the
// exact same wrapped execute path (ready gating, risk/token checks, receipts) a real WebMCP host
// would invoke via document.modelContext.executeTool().

import type { AgentGate } from "../../../packages/agentgate/src/index";

interface Step {
  label: string;
  tool: string;
  input?: Record<string, unknown>;
  dynamicInput?: () => Record<string, unknown>;
}

let lastHumanToken: string | null = null;

const SAMPLE_STEPS: Step[] = [
  { label: "1. describe_page", tool: "describe_page" },
  { label: "2. create_account", tool: "create_account", input: { username: "avery.chen", email: "avery@example.org" } },
  { label: "3. set_org_type", tool: "set_org_type", input: { orgType: "nonprofit" } },
  { label: "4a. save_profile (bio missing → field error)", tool: "save_profile", input: { fullName: "Avery Chen" } },
  { label: "4b. save_profile (fixed)", tool: "save_profile", input: { fullName: "Avery Chen", bio: "Community garden nonprofit in Ueda, Nagano." } },
  { label: "5. upload_file (starts scan)", tool: "upload_file", input: { fileName: "budget.pdf" } },
  { label: "6. upload_file (poll after scan)", tool: "upload_file", input: { fileName: "budget.pdf" } },
  { label: "7. get_application_summary", tool: "get_application_summary" },
  { label: "8. submit_application (blocked)", tool: "submit_application" },
  { label: "9. request_human", tool: "request_human", input: { action: "submit_application", reason: "Agent has completed the application on Avery's behalf and is ready to submit." } },
  {
    label: "10. submit_application (with token)",
    tool: "submit_application",
    dynamicInput: () => ({ _agentgate_token: lastHumanToken }),
  },
];

export function mountAgentConsole(root: HTMLElement, gate: AgentGate, onChange: () => void): void {
  root.innerHTML = "";
  const panel = document.createElement("aside");
  panel.className = "console-panel";

  const heading = document.createElement("h2");
  heading.textContent = "Agent console";
  panel.appendChild(heading);

  const sub = document.createElement("p");
  sub.className = "console-sub";
  sub.textContent = "Each button below drives AgentGate.callTool() — the same code path a real WebMCP agent triggers.";
  panel.appendChild(sub);

  const buttonRow = document.createElement("div");
  buttonRow.className = "console-buttons";

  const log = document.createElement("div");
  log.className = "console-log";
  log.setAttribute("data-testid", "console-log");

  function appendLog(tool: string, input: unknown, receipt: unknown) {
    const entry = document.createElement("div");
    entry.className = "console-entry";
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<div class="console-entry-head">[${time}] <strong>${tool}</strong></div>`;
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify({ input, receipt }, null, 2);
    entry.appendChild(pre);
    log.prepend(entry);
  }

  for (const step of SAMPLE_STEPS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "console-btn";
    btn.textContent = step.label;
    btn.addEventListener("click", async () => {
      const input = step.dynamicInput ? step.dynamicInput() : step.input ?? {};
      const receipt = await gate.callTool(step.tool, input);
      if (step.tool === "request_human" && receipt.ok && (receipt.data as any)?.token) {
        lastHumanToken = (receipt.data as any).token as string;
      }
      appendLog(step.tool, input, receipt);
      onChange();
    });
    buttonRow.appendChild(btn);
  }

  panel.appendChild(buttonRow);
  panel.appendChild(log);
  root.appendChild(panel);
}
