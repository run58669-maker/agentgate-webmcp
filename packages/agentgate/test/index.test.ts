import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentGate } from "../src/index";
import { installMockModelContext, uninstallMockModelContext } from "./mock-model-context";
import type { MockModelContext } from "./mock-model-context";

function getMockedExecute(mc: MockModelContext, name: string) {
  const tool = mc._tools.get(name);
  if (!tool) throw new Error(`tool "${name}" not found in mock registry`);
  return (input?: any) => tool.execute(input, { signal: new AbortController().signal });
}

function parseReceipt(raw: any) {
  // Every wrapped execute() returns the receipt object directly AND as content[0].text JSON.
  expect(raw.content).toBeInstanceOf(Array);
  expect(JSON.parse(raw.content[0].text)).toEqual(
    expect.objectContaining({ ok: raw.ok })
  );
  return raw;
}

describe("AgentGate.init feature detection", () => {
  afterEach(() => {
    uninstallMockModelContext();
    delete (document as any).__nav_mc__;
  });

  it("warns and still exposes window.agentgate when no modelContext exists anywhere", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const gate = AgentGate.init({ app: "NoMcApp" });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("no WebMCP implementation found"));
    expect(gate.hasNativeWebMCP()).toBe(false);
    expect((window as any).agentgate).toBe(gate);
    warnSpy.mockRestore();
  });

  it("detects and uses document.modelContext when present", () => {
    const mc = installMockModelContext();
    const gate = AgentGate.init({ app: "DocMcApp" });
    expect(gate.hasNativeWebMCP()).toBe(true);
    expect(mc._tools.has("describe_page")).toBe(true);
    expect(mc._tools.has("request_human")).toBe(true);
  });
});

describe("describe_page", () => {
  let mc: MockModelContext;

  beforeEach(() => {
    mc = installMockModelContext();
  });

  afterEach(() => uninstallMockModelContext());

  it("lists every registered tool with its risk tier and reflects ready state", async () => {
    const gate = AgentGate.init({ app: "Grant Portal", whoami: () => "run58669-maker" });
    gate.tool({ name: "save_draft", description: "Saves the draft", risk: "write", execute: () => ({ ok: true }) });

    const before = parseReceipt(await getMockedExecute(mc, "describe_page")());
    expect(before.state.app).toBe("Grant Portal");
    expect(before.state.whoami).toBe("run58669-maker");
    expect(before.state.ready).toBe(false);
    const names = before.data.tools.map((t: any) => t.name);
    expect(names).toEqual(expect.arrayContaining(["describe_page", "request_human", "save_draft"]));
    expect(before.data.tools.find((t: any) => t.name === "save_draft").risk).toBe("write");

    gate.ready();
    const after = parseReceipt(await getMockedExecute(mc, "describe_page")());
    expect(after.state.ready).toBe(true);
  });

  it("works even when no native modelContext exists (falls back to local registry)", () => {
    uninstallMockModelContext();
    const gate = AgentGate.init({ app: "Local only" });
    gate.tool({ name: "noop", description: "does nothing", risk: "read", execute: () => ({ ok: true }) });
    const tools = gate.getRegisteredTools();
    expect(tools.map((t) => t.name)).toEqual(expect.arrayContaining(["describe_page", "request_human", "noop"]));
  });
});

describe("ready gating", () => {
  let mc: MockModelContext;
  beforeEach(() => {
    mc = installMockModelContext();
  });
  afterEach(() => uninstallMockModelContext());

  it("returns NOT_READY with retry_after_ms for a read tool before ready()", async () => {
    const gate = AgentGate.init({ app: "A" });
    gate.tool({ name: "read_status", description: "reads status", risk: "read", execute: () => ({ ok: true, data: "x" }) });
    const receipt = parseReceipt(await getMockedExecute(mc, "read_status")());
    expect(receipt.ok).toBe(false);
    expect(receipt.code).toBe("NOT_READY");
    expect(receipt.retry_after_ms).toBeGreaterThan(0);
  });

  it("returns NOT_READY for a write tool before ready() too", async () => {
    const gate = AgentGate.init({ app: "A" });
    gate.tool({ name: "save_thing", description: "saves", risk: "write", execute: () => ({ ok: true }) });
    const receipt = parseReceipt(await getMockedExecute(mc, "save_thing")());
    expect(receipt.code).toBe("NOT_READY");
  });

  it("allows describe_page and request_human to run before ready()", async () => {
    const gate = AgentGate.init({ app: "A" });
    const receipt = parseReceipt(await getMockedExecute(mc, "describe_page")());
    expect(receipt.ok).toBe(true);
  });

  it("lets tools run normally once ready() has been called", async () => {
    const gate = AgentGate.init({ app: "A" });
    gate.tool({ name: "read_status2", description: "reads status", risk: "read", execute: () => ({ ok: true, data: { x: 1 } }) });
    gate.ready();
    const receipt = parseReceipt(await getMockedExecute(mc, "read_status2")());
    expect(receipt.ok).toBe(true);
    expect(receipt.data).toEqual({ x: 1 });
  });

  it("uses a custom notReadyRetryMs when provided", async () => {
    const gate = AgentGate.init({ app: "A", notReadyRetryMs: 1234 });
    gate.tool({ name: "custom_retry", description: "x", risk: "read", execute: () => ({ ok: true }) });
    const receipt = parseReceipt(await getMockedExecute(mc, "custom_retry")());
    expect(receipt.retry_after_ms).toBe(1234);
  });
});

describe("structured receipts", () => {
  let mc: MockModelContext;
  beforeEach(() => {
    mc = installMockModelContext();
  });
  afterEach(() => uninstallMockModelContext());

  it("fills in defaults (state, errors, next) when the tool author omits them", async () => {
    const gate = AgentGate.init({ app: "A" });
    gate.tool({ name: "bare", description: "x", risk: "read", execute: () => ({}) });
    gate.ready();
    const receipt = parseReceipt(await getMockedExecute(mc, "bare")());
    expect(receipt).toMatchObject({ ok: true, state: {}, errors: [], next: [] });
  });

  it("passes through field-level validation errors from the tool author", async () => {
    const gate = AgentGate.init({ app: "A" });
    gate.tool({
      name: "validate_form",
      description: "x",
      risk: "write",
      execute: (input: any) =>
        input.email
          ? { ok: true }
          : { ok: false, errors: [{ field: "email", code: "REQUIRED", message: "Email is required" }] },
    });
    gate.ready();
    const receipt = parseReceipt(await getMockedExecute(mc, "validate_form")({}));
    expect(receipt.ok).toBe(false);
    expect(receipt.errors).toEqual([{ field: "email", code: "REQUIRED", message: "Email is required" }]);
  });

  it("catches a thrown error from the tool author and returns an EXCEPTION receipt", async () => {
    const gate = AgentGate.init({ app: "A" });
    gate.tool({
      name: "throws",
      description: "x",
      risk: "read",
      execute: () => {
        throw new Error("boom");
      },
    });
    gate.ready();
    const receipt = parseReceipt(await getMockedExecute(mc, "throws")());
    expect(receipt.ok).toBe(false);
    expect(receipt.errors[0]).toEqual(expect.objectContaining({ code: "EXCEPTION", message: "boom" }));
  });

  it("throws synchronously when registering a duplicate tool name", () => {
    const gate = AgentGate.init({ app: "A" });
    gate.tool({ name: "dup", description: "x", risk: "read", execute: () => ({ ok: true }) });
    expect(() => gate.tool({ name: "dup", description: "y", risk: "read", execute: () => ({ ok: true }) })).toThrow(
      /already registered/
    );
  });
});

describe("irreversible risk + request_human", () => {
  let mc: MockModelContext;
  beforeEach(() => {
    mc = installMockModelContext();
  });
  afterEach(() => uninstallMockModelContext());

  it("refuses direct execution of an irreversible tool without a token", async () => {
    const gate = AgentGate.init({ app: "A" });
    gate.tool({ name: "submit_application", description: "submits", risk: "irreversible", execute: () => ({ ok: true }) });
    gate.ready();
    const receipt = parseReceipt(await getMockedExecute(mc, "submit_application")({}));
    expect(receipt.ok).toBe(false);
    expect(receipt.code).toBe("HUMAN_REQUIRED");
    expect(receipt.request_human_reason).toEqual(expect.stringContaining("submit_application"));
    expect(receipt.next).toContain("request_human");
  });

  it("request_human validates missing action/reason", async () => {
    AgentGate.init({ app: "A" });
    const missingAction = parseReceipt(await getMockedExecute(mc, "request_human")({ reason: "please" }));
    expect(missingAction.ok).toBe(false);
    expect(missingAction.errors[0].field).toBe("action");

    const missingReason = parseReceipt(await getMockedExecute(mc, "request_human")({ action: "submit_application" }));
    expect(missingReason.ok).toBe(false);
    expect(missingReason.errors[0].field).toBe("reason");
  });

  it("request_human rejects an action naming an unregistered tool", async () => {
    AgentGate.init({ app: "A" });
    const receipt = parseReceipt(
      await getMockedExecute(mc, "request_human")({ action: "does_not_exist", reason: "test" })
    );
    expect(receipt.ok).toBe(false);
    expect(receipt.errors[0].code).toBe("UNKNOWN_TOOL");
  });

  it("renders a confirmation panel with the action and reason, and resolves ok:true + token on Confirm", async () => {
    const gate = AgentGate.init({ app: "A" });
    gate.tool({ name: "delete_account", description: "deletes", risk: "irreversible", execute: () => ({ ok: true }) });

    const pending = getMockedExecute(mc, "request_human")({ action: "delete_account", reason: "Agent wants to delete your account." });

    // Panel should now be in the DOM.
    const panel = document.querySelector("[data-agentgate-panel]") as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.querySelector("[data-agentgate-action]")!.textContent).toContain("delete_account");
    expect(panel.querySelector("[data-agentgate-reason]")!.textContent).toContain("Agent wants to delete your account.");

    (panel.querySelector("[data-agentgate-confirm]") as HTMLButtonElement).click();

    const receipt = parseReceipt(await pending);
    expect(receipt.ok).toBe(true);
    expect(receipt.data.scope).toBe("delete_account");
    expect(typeof receipt.data.token).toBe("string");
    expect(document.querySelector("[data-agentgate-panel]")).toBeNull();
  });

  it("resolves ok:false HUMAN_DENIED when the human clicks Cancel", async () => {
    const gate = AgentGate.init({ app: "A" });
    gate.tool({ name: "cancel_me", description: "x", risk: "irreversible", execute: () => ({ ok: true }) });

    const pending = getMockedExecute(mc, "request_human")({ action: "cancel_me", reason: "test" });
    const panel = document.querySelector("[data-agentgate-panel]") as HTMLElement;
    (panel.querySelector("[data-agentgate-cancel]") as HTMLButtonElement).click();

    const receipt = parseReceipt(await pending);
    expect(receipt.ok).toBe(false);
    expect(receipt.code).toBe("HUMAN_DENIED");
  });

  it("lets the irreversible tool execute once a valid token is supplied, and consumes it (single-use)", async () => {
    const gate = AgentGate.init({ app: "A" });
    const execSpy = vi.fn(() => ({ ok: true, state: { deleted: true } }));
    gate.tool({ name: "delete_thing", description: "x", risk: "irreversible", execute: execSpy });
    gate.ready();

    const pending = getMockedExecute(mc, "request_human")({ action: "delete_thing", reason: "test" });
    (document.querySelector("[data-agentgate-confirm]") as HTMLButtonElement).click();
    const humanReceipt = parseReceipt(await pending);
    const token = humanReceipt.data.token;

    const runReceipt = parseReceipt(await getMockedExecute(mc, "delete_thing")({ _agentgate_token: token }));
    expect(runReceipt.ok).toBe(true);
    expect(runReceipt.state).toEqual({ deleted: true });
    expect(execSpy).toHaveBeenCalledTimes(1);

    // Re-using the same token must fail.
    const secondRunReceipt = parseReceipt(await getMockedExecute(mc, "delete_thing")({ _agentgate_token: token }));
    expect(secondRunReceipt.ok).toBe(false);
    expect(secondRunReceipt.code).toBe("HUMAN_REQUIRED");
    expect(execSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects a token minted for a different tool (scope mismatch)", async () => {
    const gate = AgentGate.init({ app: "A" });
    gate.tool({ name: "tool_a", description: "x", risk: "irreversible", execute: () => ({ ok: true }) });
    gate.tool({ name: "tool_b", description: "x", risk: "irreversible", execute: () => ({ ok: true }) });
    gate.ready();

    const pending = getMockedExecute(mc, "request_human")({ action: "tool_a", reason: "test" });
    (document.querySelector("[data-agentgate-confirm]") as HTMLButtonElement).click();
    const { data } = parseReceipt(await pending);

    const receipt = parseReceipt(await getMockedExecute(mc, "tool_b")({ _agentgate_token: data.token }));
    expect(receipt.ok).toBe(false);
    expect(receipt.code).toBe("HUMAN_REQUIRED");
  });

  it("expires a human token after the configured TTL", async () => {
    vi.useFakeTimers();
    const gate = AgentGate.init({ app: "A", humanTokenTtlMs: 1000 });
    gate.tool({ name: "expiring", description: "x", risk: "irreversible", execute: () => ({ ok: true }) });
    gate.ready();

    const pending = getMockedExecute(mc, "request_human")({ action: "expiring", reason: "test" });
    (document.querySelector("[data-agentgate-confirm]") as HTMLButtonElement).click();
    const { data } = parseReceipt(await pending);

    vi.advanceTimersByTime(1001);

    const receipt = parseReceipt(await getMockedExecute(mc, "expiring")({ _agentgate_token: data.token }));
    expect(receipt.ok).toBe(false);
    expect(receipt.code).toBe("HUMAN_REQUIRED");
    vi.useRealTimers();
  });
});

describe("tool lifecycle & onToolChange", () => {
  let mc: MockModelContext;
  beforeEach(() => {
    mc = installMockModelContext();
  });
  afterEach(() => uninstallMockModelContext());

  it("unregister() removes the tool from both AgentGate's registry and the native modelContext", () => {
    const gate = AgentGate.init({ app: "A" });
    const handle = gate.tool({ name: "temp", description: "x", risk: "read", execute: () => ({ ok: true }) });
    expect(mc._tools.has("temp")).toBe(true);
    handle.unregister();
    expect(mc._tools.has("temp")).toBe(false);
    expect(gate.getRegisteredTools().map((t) => t.name)).not.toContain("temp");
  });

  it("fires onToolChange listeners on registration, ready(), and unregister()", () => {
    const gate = AgentGate.init({ app: "A" });
    const cb = vi.fn();
    gate.onToolChange(cb);
    const before = cb.mock.calls.length;

    const handle = gate.tool({ name: "watched", description: "x", risk: "read", execute: () => ({ ok: true }) });
    gate.ready();
    handle.unregister();

    expect(cb.mock.calls.length).toBe(before + 3);
  });
});

describe("callTool (direct-execute driver, no native WebMCP host required)", () => {
  it("runs the exact same wrapped execute path as a real modelContext call", async () => {
    uninstallMockModelContext();
    const gate = AgentGate.init({ app: "A" });
    gate.tool({ name: "echo", description: "x", risk: "read", execute: (input: any) => ({ ok: true, data: input }) });
    const notReady = await gate.callTool("echo", { hi: 1 });
    expect(notReady.code).toBe("NOT_READY");

    gate.ready();
    const receipt = await gate.callTool("echo", { hi: 1 });
    expect(receipt).toMatchObject({ ok: true, data: { hi: 1 } });
    expect((receipt as any).content).toBeUndefined();
  });

  it("returns an UNKNOWN_TOOL error receipt for a name that was never registered", async () => {
    const gate = AgentGate.init({ app: "A" });
    const receipt = await gate.callTool("nope");
    expect(receipt.ok).toBe(false);
    expect(receipt.errors[0].code).toBe("UNKNOWN_TOOL");
  });
});
