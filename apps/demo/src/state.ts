// Shared application state for the "Grant Portal" demo. Plain mutable object — this is a demo
// app, not a state-management showcase, so we keep it as boring as possible: one object, one
// render() call after each mutation.

export type OrgType = "nonprofit" | "small-business" | "individual" | "government";

export interface AppState {
  step: number; // 1..5
  loading: boolean; // true during the initial 1.5s simulated session load
  account: { username: string; email: string } | null;
  profile: { fullName: string; orgType: OrgType | null; bio: string } | null;
  upload: { fileName: string; scanning: boolean; scanStartedAt: number | null } | null;
  submitted: boolean;
}

export function createInitialState(): AppState {
  return {
    step: 1,
    loading: true,
    account: null,
    profile: null,
    upload: null,
    submitted: false,
  };
}

export const STEP_NAMES = ["Account", "Profile", "Upload", "Review", "Submit"] as const;

export const UPLOAD_SCAN_MS = 1500;
export const SESSION_LOAD_MS = 1500;
