import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { guardRecipients, isTestEmail } from "./recipient-guard";

const REROUTE = "dennis@corporateaisolutions.com";

describe("recipient-guard", () => {
  const prevEnv = process.env.VERCEL_ENV;
  afterEach(() => {
    process.env.VERCEL_ENV = prevEnv;
  });

  describe("isTestEmail", () => {
    it("flags reserved test domains", () => {
      expect(isTestEmail("jane@example.com")).toBe(true);
      expect(isTestEmail("foo@qa.factory2key.com.au")).toBe(true);
    });
    it("flags the QA account (case-insensitive)", () => {
      expect(isTestEmail("qa@updates.corporateaisolutions.com")).toBe(true);
      expect(isTestEmail("QA@Updates.CorporateAISolutions.com")).toBe(true);
    });
    it("passes real addresses and junk", () => {
      expect(isTestEmail("uwe@factory2key.com.au")).toBe(false);
      expect(isTestEmail(null)).toBe(false);
      expect(isTestEmail("not-an-email")).toBe(false);
    });
  });

  describe("in production", () => {
    beforeEach(() => {
      process.env.VERCEL_ENV = "production";
    });

    it("sends real recipients as-is for a real submitter", () => {
      const r = guardRecipients(
        ["uwe@factory2key.com.au", "agent@raywhite.com"],
        { triggeredByEmail: "buyer@gmail.com" },
      );
      expect(r.rerouted).toBe(false);
      expect(r.reason).toBeNull();
      expect(r.to).toEqual(["uwe@factory2key.com.au", "agent@raywhite.com"]);
    });

    it("reroutes the admin fan-out when the submitter is a test address", () => {
      const r = guardRecipients(["uwe@factory2key.com.au"], {
        triggeredByEmail: "tester@example.com",
      });
      expect(r.rerouted).toBe(true);
      expect(r.reason).toBe("test-actor");
      expect(r.to).toEqual([REROUTE]);
      expect(r.original).toEqual(["uwe@factory2key.com.au"]);
    });

    it("reroutes a confirmation addressed to a test recipient", () => {
      const r = guardRecipients("tester@example.com");
      expect(r.rerouted).toBe(true);
      expect(r.reason).toBe("test-recipient");
      expect(r.to).toEqual([REROUTE]);
    });
  });

  describe("outside production", () => {
    it("reroutes everything on a preview deploy", () => {
      process.env.VERCEL_ENV = "preview";
      const r = guardRecipients(["uwe@factory2key.com.au"], {
        triggeredByEmail: "buyer@gmail.com",
      });
      expect(r.rerouted).toBe(true);
      expect(r.reason).toBe("non-production");
      expect(r.to).toEqual([REROUTE]);
    });

    it("reroutes when VERCEL_ENV is unset (local)", () => {
      delete process.env.VERCEL_ENV;
      const r = guardRecipients("uwe@factory2key.com.au");
      expect(r.rerouted).toBe(true);
      expect(r.reason).toBe("non-production");
    });
  });
});
