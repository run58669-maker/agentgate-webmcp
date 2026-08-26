// The Grant Portal's actual client-side application logic — the same functions back both the
// human-facing buttons AND the AgentGate tools registered in gate-wiring.ts. This is deliberate:
// WebMCP's whole pitch is reusing existing client-side logic as agent tools instead of writing a
// second backend integration (see docs/API_NOTES.md / the WebMCP README's Goals section).

import { AppState, OrgType, UPLOAD_SCAN_MS } from "./state";

export interface LogicReceipt {
  ok: boolean;
  state?: Record<string, unknown>;
  errors?: { field: string; code: string; message: string }[];
  next?: string[];
  data?: unknown;
  code?: string;
  retry_after_ms?: number;
}

const ORG_TYPES: OrgType[] = ["nonprofit", "small-business", "individual", "government"];

export function createAccount(state: AppState, input: { username?: string; email?: string }): LogicReceipt {
  const errors: LogicReceipt["errors"] = [];
  const username = input?.username?.trim();
  const email = input?.email?.trim();
  if (!username || username.length < 3) {
    errors.push({ field: "username", code: "TOO_SHORT", message: "Username must be at least 3 characters." });
  }
  if (!email || !email.includes("@")) {
    errors.push({ field: "email", code: "INVALID_FORMAT", message: "Enter a valid email address." });
  }
  if (errors.length) return { ok: false, errors };

  state.account = { username: username!, email: email! };
  if (state.step < 2) state.step = 2;
  return { ok: true, state: { step: state.step, account: state.account }, next: ["set_org_type", "save_profile"] };
}

export function setOrgType(state: AppState, input: { orgType?: string }): LogicReceipt {
  const orgType = input?.orgType as OrgType | undefined;
  if (!orgType || !ORG_TYPES.includes(orgType)) {
    return {
      ok: false,
      errors: [{ field: "orgType", code: "INVALID_VALUE", message: `orgType must be one of: ${ORG_TYPES.join(", ")}` }],
    };
  }
  state.profile = state.profile ?? { fullName: "", orgType: null, bio: "" };
  state.profile.orgType = orgType;
  return { ok: true, state: { profile: state.profile }, next: ["save_profile"] };
}

export function saveProfile(state: AppState, input: { fullName?: string; bio?: string }): LogicReceipt {
  const errors: LogicReceipt["errors"] = [];
  const fullName = input?.fullName?.trim();
  const orgType = state.profile?.orgType ?? null;
  if (!fullName) {
    errors.push({ field: "fullName", code: "REQUIRED", message: "Full name is required." });
  }
  if (!orgType) {
    errors.push({ field: "orgType", code: "REQUIRED", message: "Select an organization type first (see set_org_type)." });
  }
  const bio = input?.bio?.trim() ?? "";
  if (!bio) {
    errors.push({ field: "bio", code: "REQUIRED", message: "A short bio is required." });
  } else if (bio.length < 20) {
    errors.push({ field: "bio", code: "TOO_SHORT", message: `Bio must be at least 20 characters (got ${bio.length}).` });
  }
  if (errors.length) return { ok: false, errors };

  state.profile = { fullName: fullName!, orgType, bio };
  if (state.step < 3) state.step = 3;
  return { ok: true, state: { step: state.step, profile: state.profile }, next: ["upload_file"] };
}

export function uploadFile(state: AppState, input: { fileName?: string }): LogicReceipt {
  const fileName = input?.fileName?.trim();
  if (!fileName) {
    return { ok: false, errors: [{ field: "fileName", code: "REQUIRED", message: "fileName is required." }] };
  }

  if (!state.upload || state.upload.fileName !== fileName) {
    state.upload = { fileName, scanning: true, scanStartedAt: Date.now() };
  }

  const elapsed = Date.now() - (state.upload.scanStartedAt ?? 0);
  if (elapsed < UPLOAD_SCAN_MS) {
    return {
      ok: false,
      code: "NOT_READY",
      retry_after_ms: Math.max(50, UPLOAD_SCAN_MS - elapsed),
      state: { scanning: true, fileName },
      errors: [{ field: "_", code: "NOT_READY", message: "File is still being scanned." }],
    };
  }

  state.upload.scanning = false;
  if (state.step < 4) state.step = 4;
  return { ok: true, state: { step: state.step, scanning: false, fileName: state.upload.fileName }, next: ["get_application_summary"] };
}

export function getApplicationSummary(state: AppState): LogicReceipt {
  return {
    ok: true,
    state: { step: state.step },
    data: {
      account: state.account,
      profile: state.profile,
      upload: state.upload,
    },
    next: state.step >= 4 ? ["submit_application"] : [],
  };
}

export function submitApplication(state: AppState): LogicReceipt {
  const errors: LogicReceipt["errors"] = [];
  if (!state.account) errors.push({ field: "account", code: "MISSING", message: "Complete the account step first." });
  if (!state.profile?.fullName || !state.profile?.orgType) {
    errors.push({ field: "profile", code: "MISSING", message: "Complete the profile step first." });
  }
  if (!state.upload || state.upload.scanning) {
    errors.push({ field: "upload", code: "MISSING", message: "Upload and finish scanning a file first." });
  }
  if (errors.length) return { ok: false, errors };

  state.submitted = true;
  state.step = 5;
  return { ok: true, state: { step: 5, submitted: true }, next: [] };
}
