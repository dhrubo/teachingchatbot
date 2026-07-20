import { describe, expect, it } from "vitest";
import {
  checkVoiceSessionOwnership,
  isVoiceSessionActive,
} from "./voice-session";
import type { VoiceSession } from "@/lib/db/schema";

function makeSession(overrides: Partial<VoiceSession> = {}): VoiceSession {
  return {
    id: "session-1",
    studentId: null,
    guestSessionId: null,
    createdAt: new Date(),
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    terminatedAt: null,
    ...overrides,
  };
}

describe("checkVoiceSessionOwnership", () => {
  it("matches the owning student", () => {
    const session = makeSession({ studentId: "s1" });
    expect(checkVoiceSessionOwnership(session, { studentId: "s1" })).toBe(true);
  });

  it("rejects a different student", () => {
    const session = makeSession({ studentId: "s1" });
    expect(checkVoiceSessionOwnership(session, { studentId: "s2" })).toBe(false);
  });

  it("matches the owning guest session", () => {
    const session = makeSession({ guestSessionId: "g1" });
    expect(checkVoiceSessionOwnership(session, { guestSessionId: "g1" })).toBe(
      true
    );
  });

  it("rejects a caller with no matching id at all", () => {
    const session = makeSession({ studentId: "s1" });
    expect(checkVoiceSessionOwnership(session, {})).toBe(false);
  });

  it("rejects an ownerless session (can't be legitimately claimed)", () => {
    const session = makeSession();
    expect(
      checkVoiceSessionOwnership(session, { studentId: "s1", guestSessionId: "g1" })
    ).toBe(false);
  });
});

describe("isVoiceSessionActive", () => {
  it("is active when not expired and not terminated", () => {
    const session = makeSession({ expiresAt: new Date(Date.now() + 1000) });
    expect(isVoiceSessionActive(session)).toBe(true);
  });

  it("is inactive once expired", () => {
    const session = makeSession({ expiresAt: new Date(Date.now() - 1000) });
    expect(isVoiceSessionActive(session)).toBe(false);
  });

  it("is inactive once explicitly terminated, even if not yet expired", () => {
    const session = makeSession({
      expiresAt: new Date(Date.now() + 60_000),
      terminatedAt: new Date(),
    });
    expect(isVoiceSessionActive(session)).toBe(false);
  });
});
