/**
 * A minimal mock of the real `document.modelContext` object, shaped after the verified spec
 * signatures in docs/API_NOTES.md (`registerTool(tool, {signal})` returning `Promise<undefined>`,
 * rejecting AbortSignal-driven unregistration). Good enough to exercise AgentGate's integration
 * with a real WebMCP host without needing an actual browser origin trial.
 */
export interface MockedTool {
  name: string;
  description: string;
  inputSchema?: object;
  execute: (input: any, ctx: { signal: AbortSignal }) => Promise<any>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
}

export interface MockModelContext {
  registerTool: (tool: MockedTool, options?: { signal?: AbortSignal }) => Promise<void>;
  getTools: () => Promise<MockedTool[]>;
  executeTool: (tool: { name: string }, input: any) => Promise<string>;
  addEventListener: (type: string, cb: () => void) => void;
  _tools: Map<string, MockedTool>;
}

export function installMockModelContext(): MockModelContext {
  const tools = new Map<string, MockedTool>();

  const mc: MockModelContext = {
    async registerTool(tool, options) {
      if (tools.has(tool.name)) {
        throw new Error(`AgentGate mock: tool "${tool.name}" already registered`);
      }
      tools.set(tool.name, tool);
      options?.signal?.addEventListener("abort", () => tools.delete(tool.name));
    },
    async getTools() {
      return [...tools.values()];
    },
    async executeTool(toolRef, input) {
      const tool = tools.get(toolRef.name);
      if (!tool) throw new Error(`AgentGate mock: no such tool "${toolRef.name}"`);
      const controller = new AbortController();
      const result = await tool.execute(input, { signal: controller.signal });
      return JSON.stringify(result);
    },
    addEventListener() {
      /* not exercised directly by these tests; AgentGate uses its own onToolChange */
    },
    _tools: tools,
  };

  (document as any).modelContext = mc;
  return mc;
}

export function uninstallMockModelContext(): void {
  delete (document as any).modelContext;
}
