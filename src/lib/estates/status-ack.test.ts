import { describe, it, expect, beforeEach, afterEach } from "vitest";

/**
 * The ack token is the only authorisation on a route that writes "this agent's buyers have been
 * informed" — a claim nobody can verify from inside the system. These tests pin the three
 * properties that keep that record trustworthy: a token can't be forged, a token for one
 * notification can't acknowledge another, and an unconfigured signing key yields NO token rather
 * than an unsigned one that would sail through verification.
 */

const SECRET = "test-signing-secret-value";

// The module reads the secret at call time, so importing fresh per test keeps them independent.
async function load() {
  return import("./status-ack");
}

describe("estate status acknowledgement tokens", () => {
  const original = process.env.HEMP_HOMES_UNSUBSCRIBE_SECRET;

  beforeEach(() => {
    process.env.HEMP_HOMES_UNSUBSCRIBE_SECRET = SECRET;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.HEMP_HOMES_UNSUBSCRIBE_SECRET;
    else process.env.HEMP_HOMES_UNSUBSCRIBE_SECRET = original;
  });

  it("round-trips the notification id it was signed for", async () => {
    const { signStatusAckToken, verifyStatusAckToken } = await load();
    const id = "11111111-2222-3333-4444-555555555555";
    const token = signStatusAckToken(id);
    expect(token).toBeTruthy();
    expect(verifyStatusAckToken(token!)).toBe(id);
  });

  it("rejects a token whose payload was swapped for another notification", async () => {
    const { signStatusAckToken, verifyStatusAckToken } = await load();
    const token = signStatusAckToken("11111111-2222-3333-4444-555555555555")!;
    const signature = token.slice(token.lastIndexOf(".") + 1);
    const forgedPayload = Buffer.from("99999999-9999-9999-9999-999999999999", "utf-8").toString(
      "base64url",
    );
    expect(verifyStatusAckToken(`${forgedPayload}.${signature}`)).toBeNull();
  });

  it("rejects a tampered signature, a malformed token, and an empty string", async () => {
    const { signStatusAckToken, verifyStatusAckToken } = await load();
    const token = signStatusAckToken("11111111-2222-3333-4444-555555555555")!;
    expect(verifyStatusAckToken(`${token}x`)).toBeNull();
    expect(verifyStatusAckToken("no-separator")).toBeNull();
    expect(verifyStatusAckToken("")).toBeNull();
  });

  it("rejects a token signed with a different key", async () => {
    const { signStatusAckToken } = await load();
    const token = signStatusAckToken("11111111-2222-3333-4444-555555555555")!;
    process.env.HEMP_HOMES_UNSUBSCRIBE_SECRET = "a-completely-different-secret";
    const { verifyStatusAckToken } = await load();
    expect(verifyStatusAckToken(token)).toBeNull();
  });

  it("produces no token at all when no signing key is configured", async () => {
    delete process.env.HEMP_HOMES_UNSUBSCRIBE_SECRET;
    const { signStatusAckToken, verifyStatusAckToken, buildStatusAckUrl } = await load();
    // Fail-closed on both sides: the email ships without a confirm button rather than with a
    // button that anyone could mint, and nothing verifies while the key is missing.
    expect(signStatusAckToken("11111111-2222-3333-4444-555555555555")).toBeNull();
    expect(buildStatusAckUrl("11111111-2222-3333-4444-555555555555")).toBeNull();
    expect(verifyStatusAckToken("anything.atall")).toBeNull();
  });
});
