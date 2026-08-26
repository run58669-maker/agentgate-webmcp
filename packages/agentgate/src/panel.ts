import type { RequestHumanArgs } from "./types";

let panelSeq = 0;

/**
 * Renders an in-page confirmation panel for an irreversible tool call and resolves once a human
 * clicks Confirm or Cancel. This is the UI half of request_human() — see SPEC.md capability 4.
 */
export function showConfirmationPanel(
  container: HTMLElement,
  args: RequestHumanArgs
): Promise<boolean> {
  return new Promise((resolve) => {
    const id = `agentgate-panel-${++panelSeq}`;
    const doc = container.ownerDocument ?? document;

    const overlay = doc.createElement("div");
    overlay.id = id;
    overlay.setAttribute("data-agentgate-panel", "true");
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(15,15,20,0.55);font-family:system-ui,-apple-system,sans-serif;";

    const card = doc.createElement("div");
    card.style.cssText =
      "background:#fff;color:#1a1a1a;max-width:420px;width:90%;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.35);";

    const title = doc.createElement("div");
    title.textContent = "Human confirmation required";
    title.style.cssText = "font-weight:700;font-size:16px;margin-bottom:8px;";

    const action = doc.createElement("div");
    action.setAttribute("data-agentgate-action", "true");
    action.textContent = `Action: ${args.action}`;
    action.style.cssText = "font-size:13px;color:#555;margin-bottom:12px;font-family:ui-monospace,monospace;";

    const reason = doc.createElement("div");
    reason.setAttribute("data-agentgate-reason", "true");
    reason.textContent = args.reason;
    reason.style.cssText = "font-size:14px;line-height:1.5;margin-bottom:20px;";

    const row = doc.createElement("div");
    row.style.cssText = "display:flex;gap:10px;justify-content:flex-end;";

    const cancelBtn = doc.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.setAttribute("data-agentgate-cancel", "true");
    cancelBtn.style.cssText =
      "padding:8px 16px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer;font-size:14px;";

    const confirmBtn = doc.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.textContent = "Confirm";
    confirmBtn.setAttribute("data-agentgate-confirm", "true");
    confirmBtn.style.cssText =
      "padding:8px 16px;border-radius:8px;border:none;background:#16a34a;color:#fff;cursor:pointer;font-size:14px;font-weight:600;";

    function cleanup(result: boolean) {
      overlay.remove();
      resolve(result);
    }

    cancelBtn.addEventListener("click", () => cleanup(false));
    confirmBtn.addEventListener("click", () => cleanup(true));

    row.appendChild(cancelBtn);
    row.appendChild(confirmBtn);
    card.appendChild(title);
    card.appendChild(action);
    card.appendChild(reason);
    card.appendChild(row);
    overlay.appendChild(card);
    container.appendChild(overlay);
  });
}
