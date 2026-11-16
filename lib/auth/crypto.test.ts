import { describe, expect, it } from "vitest";
import {
  generateWatcherCode,
  hashSecret,
  signSessionToken,
  verifySecret,
  verifySessionToken,
} from "./crypto";

describe("Authentication & Watcher Cryptography", () => {
  it("hashes and verifies passwords and 4-digit kid PINs accurately", () => {
    const pwHash = hashSecret("gcse-maths-2026");
    expect(pwHash.startsWith("scrypt:")).toBe(true);
    expect(verifySecret("gcse-maths-2026", pwHash)).toBe(true);
    expect(verifySecret("wrong-password", pwHash)).toBe(false);

    const pinHash = hashSecret("4829");
    expect(verifySecret("4829", pinHash)).toBe(true);
    expect(verifySecret("4828", pinHash)).toBe(false);
    expect(verifySecret("4829", null)).toBe(false);
    expect(verifySecret("4829", "invalid-hash")).toBe(false);
  });

  it("signs and verifies session tokens and rejects tampered or expired tokens", () => {
    const token = signSessionToken({
      accountId: "11111111-1111-4111-8111-111111111111",
      role: "student",
      displayName: "Maya",
      username: "maya_y9",
      learnerId: "22222222-2222-4222-8222-222222222222",
    });

    const verified = verifySessionToken(token);
    expect(verified?.username).toBe("maya_y9");
    expect(verified?.role).toBe("student");

    // Tamper signature
    const tampered = `${token.slice(0, -3)}xyz`;
    expect(verifySessionToken(tampered)).toBeNull();

    // Expired token
    const expired = signSessionToken(
      {
        accountId: "11111111-1111-4111-8111-111111111111",
        role: "parent",
        displayName: "Sarah",
        username: "sarah_g",
        learnerId: null,
      },
      -60
    );
    expect(verifySessionToken(expired)).toBeNull();
  });

  it("generates 6-digit numeric Parent/Guardian Watcher Codes", () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateWatcherCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});
