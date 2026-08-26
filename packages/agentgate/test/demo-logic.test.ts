import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getApplicationSummary,
  saveProfile,
  setOrgType,
  submitApplication,
  uploadFile,
} from "../../../apps/demo/src/logic";
import { createInitialState, UPLOAD_SCAN_MS } from "../../../apps/demo/src/state";

describe("Grant Portal structured recovery receipts", () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    {
      label: "fullName",
      prepareOrg: true,
      input: { bio: "Community garden nonprofit." },
      field: "fullName",
      code: "REQUIRED",
      next: ["save_profile"],
    },
    {
      label: "orgType",
      prepareOrg: false,
      input: { fullName: "Avery Chen", bio: "Community garden nonprofit." },
      field: "orgType",
      code: "REQUIRED",
      next: ["set_org_type"],
    },
    {
      label: "bio",
      prepareOrg: true,
      input: { fullName: "Avery Chen" },
      field: "bio",
      code: "REQUIRED",
      next: ["save_profile"],
    },
  ])("returns a field-level error and recovery tool for missing $label", ({ prepareOrg, input, field, code, next }) => {
    const state = createInitialState();
    if (prepareOrg) setOrgType(state, { orgType: "nonprofit" });

    const receipt = saveProfile(state, input);

    expect(receipt.ok).toBe(false);
    expect(receipt.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field, code })]));
    expect(receipt.next).toEqual(next);
  });

  it("returns only the changed organization type instead of empty profile fields", () => {
    const state = createInitialState();

    const receipt = setOrgType(state, { orgType: "nonprofit" });

    expect(receipt.state).toEqual({ orgType: "nonprofit" });
  });

  it("names upload_file while scanning, then advances to summary when ready", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T05:00:00Z"));
    const state = createInitialState();

    const receipt = uploadFile(state, { fileName: "budget.pdf" });

    expect(receipt).toMatchObject({
      ok: false,
      code: "NOT_READY",
      next: ["upload_file"],
      retry_after_ms: UPLOAD_SCAN_MS,
    });

    vi.advanceTimersByTime(UPLOAD_SCAN_MS);
    const ready = uploadFile(state, { fileName: "budget.pdf" });
    expect(ready).toMatchObject({ ok: true, next: ["get_application_summary"] });
  });

  it("returns every missing submit prerequisite and starts recovery at account creation", () => {
    const state = createInitialState();

    const receipt = submitApplication(state);

    expect(receipt.ok).toBe(false);
    expect(receipt.errors?.map((error) => error.field)).toEqual(["account", "profile", "upload"]);
    expect(receipt.next).toEqual(["create_account"]);
  });

  it("keeps internal scan timestamps out of the application summary", () => {
    const state = createInitialState();
    state.step = 4;
    state.upload = { fileName: "budget.pdf", scanning: false, scanStartedAt: 123456789 };

    const receipt = getApplicationSummary(state);

    expect((receipt.data as any).upload).toEqual({ fileName: "budget.pdf", scanning: false });
  });
});
