import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the DB before importing the module under test
vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ calls: 0, tokens: 0 }])),
      })),
    })),
  },
}));

async function fresh() {
  return await import("@/lib/ai/quota-monitor");
}

describe("quota monitor — tier mapping", () => {
  beforeEach(() => {
    process.env.MAX_DAILY_AI_CALLS = "100";
    vi.resetModules();
  });

  it("maps chat and hint to critical", async () => {
    const m = await fresh();
    expect((await m.checkQuota("chat")).allowed).toBe(true);
    expect((await m.checkQuota("hint")).allowed).toBe(true);
  });

  it("maps explanation to important", async () => {
    const m = await fresh();
    expect((await m.checkQuota("explanation")).allowed).toBe(true);
  });

  it("maps parent_report, misconception_analysis to deferrable and proceeds when green", async () => {
    const m = await fresh();
    expect((await m.checkQuota("parent_report")).allowed).toBe(true);
    expect((await m.checkQuota("misconception_analysis")).allowed).toBe(true);
  });

  it("maps unknown purpose to important", async () => {
    const m = await fresh();
    expect((await m.checkQuota("unknown_purpose")).allowed).toBe(true);
  });
});

describe("quota monitor — state transitions", () => {
  beforeEach(() => {
    process.env.MAX_DAILY_AI_CALLS = "100";
    vi.resetModules();
  });

  it("returns green when usage < 60%", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ calls: 10, tokens: 500 }])),
      })),
    } as any);

    const m = await fresh();
    const state = await m.getQuotaState();
    expect(state.state).toBe("green");
    expect(state.callsToday).toBe(10);
    expect(state.usagePct).toBeCloseTo(0.1);
  });

  it("returns amber when usage >= 60%", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ calls: 60, tokens: 3000 }])),
      })),
    } as any);

    const m = await fresh();
    const state = await m.getQuotaState();
    expect(state.state).toBe("amber");
    expect(state.callsToday).toBe(60);
  });

  it("returns red when usage >= 80%", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ calls: 85, tokens: 4000 }])),
      })),
    } as any);

    const m = await fresh();
    const state = await m.getQuotaState();
    expect(state.state).toBe("red");
    expect(state.usagePct).toBeCloseTo(0.85);
  });
});

describe("quota monitor — checkQuota at different levels", () => {
  beforeEach(() => {
    process.env.MAX_DAILY_AI_CALLS = "100";
    vi.resetModules();
  });

  it("green: all purposes proceed", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ calls: 10, tokens: 500 }])),
      })),
    } as any);

    const m = await fresh();
    expect((await m.checkQuota("hint")).allowed).toBe(true);
    expect((await m.checkQuota("explanation")).allowed).toBe(true);
    expect((await m.checkQuota("parent_report")).allowed).toBe(true);
  });

  it("amber: defers deferrable, allows critical and important", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ calls: 65, tokens: 3000 }])),
      })),
    } as any);

    const m = await fresh();
    expect((await m.checkQuota("hint")).allowed).toBe(true);
    expect((await m.checkQuota("explanation")).allowed).toBe(true);
    expect((await m.checkQuota("parent_report")).allowed).toBe(false);
  });

  it("amber: preferLite for important purposes", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ calls: 65, tokens: 3000 }])),
      })),
    } as any);

    const m = await fresh();
    const r = await m.checkQuota("explanation");
    expect(r.allowed).toBe(true);
    expect(r.preferLite).toBe(true);
  });

  it("amber: critical purposes do NOT get preferLite", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ calls: 65, tokens: 3000 }])),
      })),
    } as any);

    const m = await fresh();
    const r = await m.checkQuota("hint");
    expect(r.allowed).toBe(true);
    expect(r.preferLite).toBe(false);
  });

  it("red: only critical proceeds, important and deferrable blocked", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ calls: 90, tokens: 4500 }])),
      })),
    } as any);

    const m = await fresh();
    expect((await m.checkQuota("hint")).allowed).toBe(true);
    expect((await m.checkQuota("explanation")).allowed).toBe(false);
    expect((await m.checkQuota("parent_report")).allowed).toBe(false);
  });

  it("red: critical purposes get preferLite", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ calls: 90, tokens: 4500 }])),
      })),
    } as any);

    const m = await fresh();
    const r = await m.checkQuota("hint");
    expect(r.allowed).toBe(true);
    expect(r.preferLite).toBe(true);
  });
});

describe("quota monitor — cache", () => {
  beforeEach(() => {
    process.env.MAX_DAILY_AI_CALLS = "100";
    vi.resetModules();
  });

  it("invalidateQuotaCache forces a re-query", async () => {
    const { db } = await import("@/lib/db/client");
    const mockWhere = vi.fn(() => Promise.resolve([{ calls: 10, tokens: 500 }]));
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: mockWhere,
      })),
    } as any);

    const m = await fresh();
    await m.getQuotaState();
    expect(mockWhere).toHaveBeenCalledTimes(1);

    // Second call uses cache
    await m.getQuotaState();
    expect(mockWhere).toHaveBeenCalledTimes(1);

    // After invalidation, re-queries
    m.invalidateQuotaCache();
    await m.getQuotaState();
    expect(mockWhere).toHaveBeenCalledTimes(2);
  });
});
