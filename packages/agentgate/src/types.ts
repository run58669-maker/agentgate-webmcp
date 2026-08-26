/** Risk tier for a registered tool, per SPEC.md capability 3. */
export type Risk = "read" | "write" | "irreversible";

export interface ReceiptError {
  field: string;
  code: string;
  message: string;
}

/** The structured receipt every AgentGate-wrapped tool.execute() resolves to. */
export interface Receipt<TData = unknown> {
  ok: boolean;
  /** Free-form snapshot of relevant app state after this call (e.g. { step: 3, of: 5 }). */
  state: Record<string, unknown>;
  errors: ReceiptError[];
  /** Names of tools the agent can reasonably call next. */
  next: string[];
  /** Optional payload for tools that return data (e.g. describe_page). */
  data?: TData;
  /** Machine-readable code for special outcomes: NOT_READY, HUMAN_REQUIRED, EXCEPTION, etc. */
  code?: string;
  retry_after_ms?: number;
  request_human_reason?: string;
}

/** What a tool author is allowed to return from their own execute() — AgentGate fills in the rest. */
export type PartialReceipt<TData = unknown> = Partial<Receipt<TData>>;

export interface ToolExecuteContext {
  signal?: AbortSignal;
}

export interface ToolDef<TInput = any, TData = unknown> {
  name: string;
  description: string;
  risk: Risk;
  inputSchema?: object;
  execute: (input: TInput, ctx: ToolExecuteContext) => PartialReceipt<TData> | Promise<PartialReceipt<TData>>;
}

export interface ToolHandle {
  name: string;
  unregister: () => void;
}

export interface RequestHumanArgs {
  /** Name of the tool this confirmation authorizes. */
  action: string;
  /** Human-readable reason shown in the confirmation panel. */
  reason: string;
}

export interface HumanToken {
  token: string;
  scope: string;
  expires_at: string;
}

export interface AgentGateOptions {
  /** Application name shown to agents via describe_page. */
  app: string;
  /** Returns a human-readable identity of the current session, or null/undefined if signed out. */
  whoami?: () => string | null | undefined;
  /** DOM node the request_human confirmation panel is appended to. Defaults to document.body. */
  panelContainer?: HTMLElement;
  /** Override the default 500ms retry_after_ms for NOT_READY receipts. */
  notReadyRetryMs?: number;
  /** Override the default 5 minute (300000ms) human token expiry. */
  humanTokenTtlMs?: number;
}
