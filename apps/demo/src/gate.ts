import { AgentGate } from "../../../packages/agentgate/src/index";
import { AppState } from "./state";
import * as logic from "./logic";

/**
 * Registers every Grant Portal tool with AgentGate, wrapping the exact same logic.ts functions
 * the human-facing buttons in render.ts call directly. See SPEC.md deliverable A / WebMCP's own
 * "code reuse" goal in docs/API_NOTES.md.
 */
export function wireAgentGate(state: AppState, whoami: () => string | null, rerender: () => void): AgentGate {
  const gate = AgentGate.init({ app: "Grant Portal", whoami });

  gate.tool({
    name: "create_account",
    description: "Creates the applicant's account with a username and email address. Step 1 of 5.",
    risk: "write",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string", description: "At least 3 characters." },
        email: { type: "string", description: "Must contain '@'." },
      },
      required: ["username", "email"],
    },
    execute: (input: { username?: string; email?: string }) => {
      const r = logic.createAccount(state, input);
      rerender();
      return r;
    },
  });

  gate.tool({
    name: "set_org_type",
    description:
      "Sets the applicant's organization type (nonprofit, small-business, individual, government). Use this instead of clicking the on-page radio buttons.",
    risk: "write",
    inputSchema: {
      type: "object",
      properties: { orgType: { type: "string", enum: ["nonprofit", "small-business", "individual", "government"] } },
      required: ["orgType"],
    },
    execute: (input: { orgType?: string }) => {
      const r = logic.setOrgType(state, input);
      rerender();
      return r;
    },
  });

  gate.tool({
    name: "save_profile",
    description: "Saves the applicant's full name and a short bio (min 20 characters). Call set_org_type first. Validation failures come back as field-level errors. Step 2 of 5.",
    risk: "write",
    inputSchema: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        bio: { type: "string" },
      },
      required: ["fullName", "bio"],
    },
    execute: (input: { fullName?: string; bio?: string }) => {
      const r = logic.saveProfile(state, input);
      rerender();
      return r;
    },
  });

  gate.tool({
    name: "upload_file",
    description:
      "Uploads a document by file name and waits for it to finish a virus scan. Call again with the same fileName to poll; returns NOT_READY with retry_after_ms while scanning is in progress. Step 3 of 5.",
    risk: "write",
    inputSchema: {
      type: "object",
      properties: { fileName: { type: "string" } },
      required: ["fileName"],
    },
    execute: (input: { fileName?: string }) => {
      const r = logic.uploadFile(state, input);
      rerender();
      return r;
    },
  });

  gate.tool({
    name: "get_application_summary",
    description: "Returns the full application (account, profile, upload) as structured JSON. Step 4 of 5.",
    risk: "read",
    execute: () => logic.getApplicationSummary(state),
  });

  gate.tool({
    name: "submit_application",
    description: "Submits the completed application. This is irreversible and cannot be undone.",
    risk: "irreversible",
    execute: () => {
      const r = logic.submitApplication(state);
      rerender();
      return r;
    },
  });

  return gate;
}
