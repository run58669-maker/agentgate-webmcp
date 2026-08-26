import { AppState, OrgType, STEP_NAMES } from "./state";
import * as logic from "./logic";
import { UPLOAD_SCAN_MS } from "./state";

export type Mode = "on" | "off";

export interface RenderCtx {
  state: AppState;
  mode: Mode;
  rerender: () => void;
}

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  nonprofit: "Nonprofit",
  "small-business": "Small business",
  individual: "Individual",
  government: "Government",
};

export function render(root: HTMLElement, ctx: RenderCtx): void {
  const { state, mode } = ctx;
  root.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "app-shell";

  wrap.appendChild(renderHeader(mode));
  wrap.appendChild(renderStepper(state.step));

  const card = document.createElement("div");
  card.className = "card";

  if (state.loading) {
    card.appendChild(renderLoading(mode));
  } else if (state.submitted) {
    card.appendChild(renderDone(state, mode));
  } else {
    switch (state.step) {
      case 1:
        card.appendChild(renderAccountStep(ctx));
        break;
      case 2:
        card.appendChild(renderProfileStep(ctx));
        break;
      case 3:
        card.appendChild(renderUploadStep(ctx));
        break;
      case 4:
        card.appendChild(renderReviewStep(ctx));
        break;
      case 5:
        card.appendChild(renderSubmitStep(ctx));
        break;
    }
  }

  wrap.appendChild(card);
  root.appendChild(wrap);
}

function renderHeader(mode: Mode): HTMLElement {
  const header = document.createElement("header");
  header.className = "app-header";
  const otherMode = mode === "on" ? "off" : "on";
  const otherHref = mode === "on" ? "?agentgate=off" : "?";
  header.innerHTML = `
    <div>
      <h1>Grant Portal</h1>
      <p class="mode-badge ${mode === "on" ? "mode-on" : "mode-off"}">
        ${mode === "on" ? "AgentGate ON — tools registered via WebMCP" : "bare DOM — agentgate=off"}
      </p>
    </div>
    <a class="mode-toggle" href="${otherHref}">Switch to ${otherMode === "on" ? "AgentGate" : "bare DOM"} version</a>
  `;
  return header;
}

function renderStepper(step: number): HTMLElement {
  const ol = document.createElement("ol");
  ol.className = "stepper";
  STEP_NAMES.forEach((name, i) => {
    const n = i + 1;
    const li = document.createElement("li");
    li.className = n === step ? "current" : n < step ? "done" : "";
    li.textContent = `${n}. ${name}`;
    ol.appendChild(li);
  });
  return ol;
}

function renderLoading(mode: Mode): HTMLElement {
  const div = document.createElement("div");
  div.className = "loading-panel";
  div.innerHTML = `
    <div class="spinner" aria-hidden="true"></div>
    <p>Loading your saved draft…</p>
    ${
      mode === "on"
        ? `<p class="hint">An agent calling any tool right now gets back <code>{ok:false, code:"NOT_READY", retry_after_ms}</code>.</p>`
        : `<p class="hint">An agent has no signal here — it can only guess how long to sleep before retrying.</p>`
    }
  `;
  return div;
}

function renderAccountStep(ctx: RenderCtx): HTMLElement {
  const { state, rerender } = ctx;
  const section = document.createElement("section");
  section.innerHTML = `
    <h2>1. Create your account</h2>
    <label>Username<input type="text" id="f-username" value="${state.account?.username ?? ""}" /></label>
    <label>Email<input type="email" id="f-email" value="${state.account?.email ?? ""}" /></label>
    <div class="field-errors" id="f-errors"></div>
    <button type="button" class="primary" id="f-continue">Continue</button>
  `;
  section.querySelector<HTMLButtonElement>("#f-continue")!.addEventListener("click", () => {
    const username = (section.querySelector<HTMLInputElement>("#f-username")!).value;
    const email = (section.querySelector<HTMLInputElement>("#f-email")!).value;
    const receipt = logic.createAccount(state, { username, email });
    showErrors(section, receipt.errors);
    if (receipt.ok) rerender();
  });
  return section;
}

function renderProfileStep(ctx: RenderCtx): HTMLElement {
  const { state, mode, rerender } = ctx;
  const section = document.createElement("section");
  const orgType = state.profile?.orgType ?? null;

  const radiosHtml = (Object.keys(ORG_TYPE_LABELS) as OrgType[])
    .map((value) => {
      const checked = orgType === value ? "checked" : "";
      const brokenAttrs = mode === "off" ? 'style="pointer-events:none" tabindex="-1"' : "";
      return `
        <label class="radio-row" data-org-label="${value}">
          <input type="radio" name="orgType" value="${value}" ${checked} ${brokenAttrs} />
          <span>${ORG_TYPE_LABELS[value]}</span>
        </label>`;
    })
    .join("");

  section.innerHTML = `
    <h2>2. Organization profile</h2>
    <label>Full name<input type="text" id="f-fullname" value="${state.profile?.fullName ?? ""}" /></label>
    <fieldset class="radio-group">
      <legend>Organization type${mode === "off" ? " (click the label — the radio itself is decorative)" : ""}</legend>
      ${radiosHtml}
    </fieldset>
    <label>Short bio<textarea id="f-bio">${state.profile?.bio ?? ""}</textarea></label>
    <div class="field-errors" id="f-errors"></div>
    <button type="button" class="primary" id="f-continue">Continue</button>
  `;

  if (mode === "off") {
    // The bare-DOM bug this demo exists to complain about: the radio input itself is
    // pointer-events:none, so only a click on the <label> text toggles selection. A generic
    // browser agent clicking the semantically-correct <input> does nothing here.
    section.querySelectorAll<HTMLLabelElement>("[data-org-label]").forEach((label) => {
      label.addEventListener("click", () => {
        const value = label.getAttribute("data-org-label") as OrgType;
        state.profile = state.profile ?? { fullName: "", orgType: null, bio: "" };
        state.profile.orgType = value;
        rerender();
      });
    });
  } else {
    // Native, fully functional radios — no quirk. Agents also get set_org_type as a direct tool.
    section.querySelectorAll<HTMLInputElement>('input[name="orgType"]').forEach((input) => {
      input.addEventListener("change", () => {
        logic.setOrgType(state, { orgType: input.value });
      });
    });
  }

  section.querySelector<HTMLButtonElement>("#f-continue")!.addEventListener("click", () => {
    const fullName = section.querySelector<HTMLInputElement>("#f-fullname")!.value;
    const bio = section.querySelector<HTMLTextAreaElement>("#f-bio")!.value;
    const receipt = logic.saveProfile(state, { fullName, bio });
    showErrors(section, receipt.errors);
    if (receipt.ok) rerender();
  });

  return section;
}

function renderUploadStep(ctx: RenderCtx): HTMLElement {
  const { state, mode, rerender } = ctx;
  const section = document.createElement("section");
  const scanning = state.upload?.scanning ?? false;

  section.innerHTML = `
    <h2>3. Upload supporting document</h2>
    <label>Choose a file<input type="file" id="f-file" ${scanning ? "disabled" : ""} /></label>
    <div id="f-status">${
      scanning
        ? `<div class="spinner small" aria-hidden="true"></div><span>Scanning ${state.upload?.fileName}… ${
            mode === "on"
              ? "(agent polling upload_file gets NOT_READY + retry_after_ms)"
              : "(no signal for an agent — only a spinner)"
          }</span>`
        : state.upload?.fileName
          ? `<span class="ok-badge">✓ ${state.upload.fileName} uploaded</span>`
          : ""
    }</div>
    <div class="field-errors" id="f-errors"></div>
    <button type="button" class="primary" id="f-continue" ${!state.upload || scanning ? "disabled" : ""}>Continue</button>
  `;

  section.querySelector<HTMLInputElement>("#f-file")!.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    const fileName = file?.name ?? "document.pdf";
    logic.uploadFile(state, { fileName });
    rerender();
    setTimeout(() => {
      logic.uploadFile(state, { fileName });
      rerender();
    }, UPLOAD_SCAN_MS + 20);
  });

  section.querySelector<HTMLButtonElement>("#f-continue")!.addEventListener("click", () => {
    if (state.step < 4) state.step = 4;
    rerender();
  });

  return section;
}

function renderReviewStep(ctx: RenderCtx): HTMLElement {
  const { state, rerender } = ctx;
  const section = document.createElement("section");
  section.innerHTML = `
    <h2>4. Review</h2>
    <dl class="summary">
      <dt>Username</dt><dd>${state.account?.username ?? "—"}</dd>
      <dt>Email</dt><dd>${state.account?.email ?? "—"}</dd>
      <dt>Full name</dt><dd>${state.profile?.fullName ?? "—"}</dd>
      <dt>Organization type</dt><dd>${state.profile?.orgType ? ORG_TYPE_LABELS[state.profile.orgType] : "—"}</dd>
      <dt>Bio</dt><dd>${state.profile?.bio || "—"}</dd>
      <dt>Document</dt><dd>${state.upload?.fileName ?? "—"}</dd>
    </dl>
    <button type="button" class="primary" id="f-continue">Continue to submit</button>
  `;
  section.querySelector<HTMLButtonElement>("#f-continue")!.addEventListener("click", () => {
    state.step = 5;
    rerender();
  });
  return section;
}

function renderSubmitStep(ctx: RenderCtx): HTMLElement {
  const { state, mode, rerender } = ctx;
  const section = document.createElement("section");
  section.innerHTML = `
    <h2>5. Submit application</h2>
    <p>Submitting is final. ${mode === "on" ? "An agent calling submit_application directly will be blocked and sent through request_human — a human clicking this button does not need a token." : ""}</p>
    <div class="field-errors" id="f-errors"></div>
    <button type="button" class="primary danger" id="f-submit">Submit application</button>
    <div id="f-toast"></div>
  `;
  section.querySelector<HTMLButtonElement>("#f-submit")!.addEventListener("click", () => {
    const receipt = logic.submitApplication(state);
    if (!receipt.ok) {
      showErrors(section, receipt.errors);
      return;
    }
    if (mode === "off") {
      // Bare DOM: submit "succeeds" with nothing but a plain text toast. No structured signal.
      const toast = section.querySelector<HTMLDivElement>("#f-toast")!;
      toast.className = "toast";
      toast.textContent = "Thanks! We got it.";
      return;
    }
    rerender();
  });
  return section;
}

function renderDone(state: AppState, mode: Mode): HTMLElement {
  const section = document.createElement("section");
  section.innerHTML = `
    <h2>Application submitted</h2>
    <dl class="summary">
      <dt>Applicant</dt><dd>${state.account?.username ?? "—"}</dd>
      <dt>Organization</dt><dd>${state.profile?.orgType ? ORG_TYPE_LABELS[state.profile.orgType] : "—"}</dd>
      <dt>Document</dt><dd>${state.upload?.fileName ?? "—"}</dd>
    </dl>
    ${mode === "on" ? `<p class="hint">This structured confirmation is available to an agent via get_application_summary — not just this page's rendered HTML.</p>` : ""}
  `;
  return section;
}

function showErrors(root: HTMLElement, errors: logic.LogicReceipt["errors"] | undefined): void {
  const box = root.querySelector<HTMLDivElement>("#f-errors");
  if (!box) return;
  if (!errors || errors.length === 0) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = errors.map((e) => `<div class="field-error"><strong>${e.field}:</strong> ${e.message}</div>`).join("");
}
