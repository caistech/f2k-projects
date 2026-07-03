import { describe, it, expect } from "vitest";
import { signPromotion, verifyPromotionSignature } from "./promotion-auth";
import { canBuildEstate, hasTitleEvidence } from "./gate";

describe("promotion HMAC", () => {
  const secret = "test-secret-123";
  const body = JSON.stringify({ dealId: "abc", snapshotVersion: 1, verdict: "GO" });

  it("round-trips a valid signature", () => {
    const sig = signPromotion(body, secret);
    expect(verifyPromotionSignature(body, sig, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = signPromotion(body, secret);
    expect(verifyPromotionSignature(body + "x", sig, secret)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const sig = signPromotion(body, secret);
    expect(verifyPromotionSignature(body, sig, "other-secret")).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyPromotionSignature(body, null, secret)).toBe(false);
  });
});

describe("build gate", () => {
  const titled = { site_control: "owned", uploads: [{ category: "title", name: "ct.pdf" }] };

  it("clears on GO + title", () => {
    expect(canBuildEstate({ verdict: "GO", titlePresent: hasTitleEvidence(titled) }).ok).toBe(true);
  });

  it("clears on ADJUST + title", () => {
    expect(canBuildEstate({ verdict: "ADJUST", titlePresent: hasTitleEvidence(titled) }).ok).toBe(true);
  });

  it("blocks on REJECT even with title", () => {
    expect(canBuildEstate({ verdict: "REJECT", titlePresent: true }).ok).toBe(false);
  });

  it("blocks when title is missing", () => {
    const noTitle = { site_control: "owned", uploads: [{ category: "plan", name: "sketch.pdf" }] };
    expect(hasTitleEvidence(noTitle)).toBe(false);
    expect(canBuildEstate({ verdict: "GO", titlePresent: false }).ok).toBe(false);
  });

  it("blocks when site not controlled", () => {
    const notSecured = { site_control: "negotiating", uploads: [{ category: "title", name: "ct.pdf" }] };
    expect(hasTitleEvidence(notSecured)).toBe(false);
  });

  it("blocks when no verdict yet", () => {
    expect(canBuildEstate({ verdict: null, titlePresent: true }).ok).toBe(false);
  });
});
