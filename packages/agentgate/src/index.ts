import type {
  AgentGateOptions,
  HumanToken,
  PartialReceipt,
  Receipt,
  Risk,
  ToolDef,
  ToolExecuteContext,
  ToolHandle,
} from "./types";
import { normalizeReceipt, toToolResult } from "./receipt";
import { HumanTokenStore } from "./token";
import { showConfirmationPanel } from "./panel";

export type {
  AgentGateOptions,
  HumanToken,
  PartialReceipt,
  Receipt,
  ReceiptError,
  Risk,
  ToolDef,
  ToolExecuteContext,
  ToolHandle,
  RequestHumanArgs,
} from "./types";

const DEFAULT_NOT_READY_RETRY_MS = 500;
const DEFAULT_HUMAN_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes, per SPEC.md capability 4

interface RegistryEntry {
  def: ToolDef;
  controller: AbortController;
  wrappedExecute: (input: any, ctx: ToolExecuteContext) => Promise<Receipt & { content: { type: "text"; text: string }[] }>;
}

/**
 * Minimal shape of the real `document.modelContext` / `navigator.modelContext` object we depend
 * on. See docs/API_NOTES.md for how this was verified against the WebMCP spec source.
 */
interface RawModelContext {
  registerTool: (tool: unknown, options?: { signal?: AbortSignal; exposedTo?: string[] }) => Promise<void>;
  addEventListener?: (type: "toolchange", cb: () => void) => void;
}

function detectModelContext(): RawModelContext | null {
  if (typeof document !== "undefined" && (document as any).modelContext) {
    return (document as any).modelContext as RawModelContext;
  }
  if (typeof navigator !== "undefined" && (navigator as any).modelContext) {
    return (navigator as any).modelContext as RawModelContext;
  }
  return null;
}

export class AgentGate {
  private app: string;
  private whoamiFn?: () => string | null | undefined;
  private mc: RawModelContext | null;
  private readyFlag = false;
  private notReadyRetryMs: number;
  private tokenStore: HumanTokenStore;
  private panelContainer: HTMLElement;
  private registry = new Map<string, RegistryEntry>();
  private toolChangeListeners = new Set<() => void>();

  private constructor(options: AgentGateOptions) {
    this.app = options.app;
    this.whoamiFn = options.whoami;
    this.notReadyRetryMs = options.notReadyRetryMs ?? DEFAULT_NOT_READY_RETRY_MS;
    this.tokenStore = new HumanTokenStore(options.humanTokenTtlMs ?? DEFAULT_HUMAN_TOKEN_TTL_MS);
    this.panelContainer =
      options.panelContainer ?? (typeof document !== "undefined" ? document.body : (undefined as any));

    this.mc = detectModelContext();
    if (!this.mc) {
      // eslint-disable-next-line no-console
      console.warn(
        "AgentGate: no WebMCP implementation found (checked document.modelContext and navigator.modelContext). " +
          "Tools will still be tracked on window.agentgate for local introspection, but will not be exposed to a real browser agent."
      );
    }

    this.registerBootstrapTools();
  }

  /** Creates an AgentGate instance and publishes it on window.agentgate. */
  static init(options: AgentGateOptions): AgentGate {
    const gate = new AgentGate(options);
    if (typeof window !== "undefined") {
      (window as any).agentgate = gate;
    }
    return gate;
  }

  /** Registers describe_page and request_human — always available, never gated by ready(). */
  private registerBootstrapTools(): void {
    this.registerTool(
      {
        name: "describe_page",
        description:
          "Describes what this page can do for an agent: every registered tool with its risk tier and description, plus a summary of current app state.",
        risk: "read",
        execute: () => this.describePage(),
      },
      { bypassReadyGate: true }
    );

    this.registerTool(
      {
        name: "request_human",
        description:
          "Requests human confirmation for an irreversible tool. Renders an in-page panel; resolves once a human clicks Confirm or Cancel. Returns a single-use token scoped to the named tool.",
        risk: "read",
        inputSchema: {
          type: "object",
          properties: {
            action: { type: "string", description: "Name of the irreversible tool this confirms." },
            reason: { type: "string", description: "Human-readable reason shown in the confirmation panel." },
          },
          required: ["action", "reason"],
        },
        execute: (input: { action?: string; reason?: string }) => this.requestHuman(input),
      },
      { bypassReadyGate: true }
    );
  }

  private describePage(): PartialReceipt {
    const tools = [...this.registry.values()].map(({ def }) => ({
      name: def.name,
      risk: def.risk,
      description: def.description,
    }));
    return {
      ok: true,
      state: {
        app: this.app,
        whoami: this.whoamiFn ? this.whoamiFn() ?? null : null,
        ready: this.readyFlag,
      },
      data: { tools },
      next: tools.map((t) => t.name),
    };
  }

  private async requestHuman(input: { action?: string; reason?: string }): Promise<PartialReceipt<HumanToken>> {
    const action = input?.action;
    const reason = input?.reason;
    if (!action) {
      return { ok: false, errors: [{ field: "action", code: "MISSING_FIELD", message: "action is required" }] };
    }
    if (!reason) {
      return { ok: false, errors: [{ field: "reason", code: "MISSING_FIELD", message: "reason is required" }] };
    }
    if (!this.registry.has(action)) {
      return {
        ok: false,
        errors: [{ field: "action", code: "UNKNOWN_TOOL", message: `No tool named "${action}" is registered.` }],
      };
    }
    if (!this.panelContainer) {
      return {
        ok: false,
        errors: [{ field: "_", code: "NO_PANEL_CONTAINER", message: "No DOM container available to render the confirmation panel." }],
      };
    }

    const confirmed = await showConfirmationPanel(this.panelContainer, { action, reason });
    if (!confirmed) {
      return {
        ok: false,
        code: "HUMAN_DENIED",
        errors: [{ field: "_", code: "HUMAN_DENIED", message: "Human declined the confirmation panel." }],
      };
    }

    const humanToken = this.tokenStore.mint(action);
    return { ok: true, data: humanToken, state: { scope: action }, next: [action] };
  }

  /** Registers an app-defined tool. Public entry point; always ready-gated. */
  tool(def: ToolDef): ToolHandle {
    return this.registerTool(def, { bypassReadyGate: false });
  }

  private registerTool(def: ToolDef, opts: { bypassReadyGate: boolean }): ToolHandle {
    if (this.registry.has(def.name)) {
      throw new Error(`AgentGate: a tool named "${def.name}" is already registered.`);
    }

    const controller = new AbortController();

    const wrappedExecute = async (input: any, ctx: ToolExecuteContext) => {
      try {
        if (!opts.bypassReadyGate && !this.readyFlag) {
          return toToolResult(
            normalizeReceipt({
              ok: false,
              code: "NOT_READY",
              retry_after_ms: this.notReadyRetryMs,
              errors: [{ field: "_", code: "NOT_READY", message: "The page has not signalled ready() yet." }],
              next: [def.name],
            })
          );
        }

        if (def.risk === "irreversible") {
          const token = input?._agentgate_token;
          if (!this.tokenStore.consume(token, def.name)) {
            return toToolResult(
              normalizeReceipt({
                ok: false,
                code: "HUMAN_REQUIRED",
                request_human_reason: `"${def.name}" is irreversible and requires human confirmation. Call request_human({action:"${def.name}", reason:...}) first, then retry with the returned token.`,
                next: ["request_human"],
              })
            );
          }
        }

        const result = await def.execute(input, ctx);
        return toToolResult(normalizeReceipt(result));
      } catch (err) {
        return toToolResult(
          normalizeReceipt({
            ok: false,
            errors: [
              {
                field: "_",
                code: "EXCEPTION",
                message: err instanceof Error ? err.message : String(err),
              },
            ],
          })
        );
      }
    };

    this.registry.set(def.name, { def, controller, wrappedExecute });

    const inputSchema = augmentSchemaForRisk(def.inputSchema, def.risk);

    if (this.mc) {
      this.mc
        .registerTool(
          {
            name: def.name,
            description: `[risk:${def.risk}] ${def.description}`,
            inputSchema,
            execute: wrappedExecute,
            annotations: { readOnlyHint: def.risk === "read" },
          },
          { signal: controller.signal }
        )
        .catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error(`AgentGate: registerTool("${def.name}") failed`, err);
        });
    }

    this.notifyToolChange();

    return {
      name: def.name,
      unregister: () => {
        controller.abort();
        this.registry.delete(def.name);
        this.notifyToolChange();
      },
    };
  }

  /** Signals that async page content is ready; all ready-gated tools become callable. */
  ready(): void {
    this.readyFlag = true;
    this.notifyToolChange();
  }

  isReady(): boolean {
    return this.readyFlag;
  }

  /** Subscribes to tool registration/unregistration changes (fires for both WebMCP-backed and local-only runs). */
  onToolChange(cb: () => void): () => void {
    this.toolChangeListeners.add(cb);
    return () => this.toolChangeListeners.delete(cb);
  }

  private notifyToolChange(): void {
    for (const cb of this.toolChangeListeners) cb();
  }

  /** Read-only snapshot of currently registered tools, for UI/demo introspection. */
  getRegisteredTools(): { name: string; risk: Risk; description: string }[] {
    return [...this.registry.values()].map(({ def }) => ({
      name: def.name,
      risk: def.risk,
      description: def.description,
    }));
  }

  /** Whether a real WebMCP implementation (document.modelContext or navigator.modelContext) was found. */
  hasNativeWebMCP(): boolean {
    return this.mc !== null;
  }

  /**
   * Invokes a registered tool's exact wrapped execute path (ready gating, risk/token checks,
   * receipt normalization) directly, bypassing the browser's WebMCP mediation. This is the same
   * code that a real browser agent triggers via `document.modelContext.executeTool()` — useful for
   * driving tools from an in-page "agent console" or from tests/tooling that don't have a live
   * WebMCP host (e.g. no chrome://flags/#enable-webmcp-testing available).
   */
  async callTool(name: string, input: any = {}): Promise<Receipt> {
    const entry = this.registry.get(name);
    if (!entry) {
      return normalizeReceipt({
        ok: false,
        errors: [{ field: "name", code: "UNKNOWN_TOOL", message: `No tool named "${name}" is registered.` }],
      });
    }
    const controller = new AbortController();
    const { content: _content, ...receipt } = await entry.wrappedExecute(input, { signal: controller.signal });
    return receipt as Receipt;
  }
}

// For plain <script src="dist/agentgate.js"> usage (no bundler, no `import`), expose the class
// directly as window.AgentGate so `AgentGate.init(...)` works exactly like the ESM import form.
if (typeof window !== "undefined") {
  (window as any).AgentGate = AgentGate;
}

function augmentSchemaForRisk(schema: object | undefined, risk: Risk): object {
  if (risk !== "irreversible") {
    return schema ?? { type: "object", properties: {} };
  }
  const base: any = schema ? { ...(schema as any) } : { type: "object", properties: {} };
  base.properties = {
    ...(base.properties ?? {}),
    _agentgate_token: {
      type: "string",
      description: "Single-use human confirmation token returned by request_human(). Required to execute this irreversible tool.",
    },
  };
  return base;
}
