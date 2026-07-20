import { afterEach, describe, expect, it, vi } from "vitest";
import { pseudonymousId, redactForAnalytics } from "./redact";

describe("redactForAnalytics", () => {
  it("redacts email addresses", () => {
    expect(redactForAnalytics("Contact me at jo.smith@example.com please")).toBe(
      "Contact me at [redacted-email] please"
    );
  });

  it("redacts UK-style phone numbers", () => {
    expect(redactForAnalytics("Call me on 07911 123456 tonight")).toContain(
      "[redacted-phone]"
    );
  });

  it("redacts UK postcodes", () => {
    expect(redactForAnalytics("I live near SW1A 1AA")).toContain(
      "[redacted-postcode]"
    );
  });

  it("redacts a name self-disclosure", () => {
    expect(redactForAnalytics("my name is Jordan Smith, nice to meet you")).toContain(
      "[redacted-name-disclosure]"
    );
  });

  it("redacts a school self-disclosure", () => {
    expect(redactForAnalytics("i go to Riverside Academy school")).toContain(
      "[redacted-school-disclosure]"
    );
  });

  it("redacts an address-like string", () => {
    expect(redactForAnalytics("I live at 42 Maple Street")).toContain(
      "[redacted-address]"
    );
  });

  it("leaves ordinary maths tutoring text untouched", () => {
    const text = "Percentages are fractions out of 100, like 50% = 50/100.";
    expect(redactForAnalytics(text)).toBe(text);
  });

  it("is idempotent — redacting twice gives the same result", () => {
    const once = redactForAnalytics("Email me at test@example.com");
    expect(redactForAnalytics(once)).toBe(once);
  });
});

describe("pseudonymousId", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws without ANALYTICS_HASH_SECRET configured", () => {
    vi.stubEnv("ANALYTICS_HASH_SECRET", undefined as unknown as string);
    delete process.env.ANALYTICS_HASH_SECRET;
    expect(() => pseudonymousId("student-123")).toThrow(
      /ANALYTICS_HASH_SECRET/
    );
  });

  it("is deterministic for the same input and secret", () => {
    vi.stubEnv("ANALYTICS_HASH_SECRET", "test-secret");
    const a = pseudonymousId("student-123");
    const b = pseudonymousId("student-123");
    expect(a).toBe(b);
  });

  it("does not reveal the original id", () => {
    vi.stubEnv("ANALYTICS_HASH_SECRET", "test-secret");
    const hashed = pseudonymousId("student-123");
    expect(hashed).not.toContain("student-123");
  });

  it("produces different ids for different secrets (not reversible without the secret)", () => {
    vi.stubEnv("ANALYTICS_HASH_SECRET", "secret-a");
    const a = pseudonymousId("student-123");
    vi.stubEnv("ANALYTICS_HASH_SECRET", "secret-b");
    const b = pseudonymousId("student-123");
    expect(a).not.toBe(b);
  });
});
