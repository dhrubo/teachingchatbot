import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyHighRiskMessage } from "./escalation";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("notifyHighRiskMessage", () => {
  it("no-ops when GUARDIAN_ESCALATION_WEBHOOK_URL is not set", async () => {
    vi.stubEnv("GUARDIAN_ESCALATION_WEBHOOK_URL", undefined as unknown as string);
    delete process.env.GUARDIAN_ESCALATION_WEBHOOK_URL;
    await notifyHighRiskMessage({ mode: "teach", violations: ["unsafe_content"] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no-ops when unsafe_content is not among the violations", async () => {
    vi.stubEnv("GUARDIAN_ESCALATION_WEBHOOK_URL", "https://hooks.example.com/x");
    await notifyHighRiskMessage({ mode: "teach", violations: ["too_long"] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to the webhook when unsafe_content is present and the URL is configured", async () => {
    vi.stubEnv("GUARDIAN_ESCALATION_WEBHOOK_URL", "https://hooks.example.com/x");
    await notifyHighRiskMessage({
      studentId: "student-123",
      mode: "hint",
      violations: ["unsafe_content"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.example.com/x");
    const body = JSON.parse(init.body);
    expect(body.violations).toEqual(["unsafe_content"]);
    expect(body.mode).toBe("hint");
    // Never the raw studentId in the payload.
    expect(JSON.stringify(body)).not.toContain("student-123");
  });

  it("never throws even if the webhook call fails", async () => {
    vi.stubEnv("GUARDIAN_ESCALATION_WEBHOOK_URL", "https://hooks.example.com/x");
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(
      notifyHighRiskMessage({ mode: "teach", violations: ["unsafe_content"] })
    ).resolves.toBeUndefined();
  });

  it("omits the learner ref gracefully when ANALYTICS_HASH_SECRET is not configured", async () => {
    vi.stubEnv("GUARDIAN_ESCALATION_WEBHOOK_URL", "https://hooks.example.com/x");
    vi.stubEnv("ANALYTICS_HASH_SECRET", undefined as unknown as string);
    delete process.env.ANALYTICS_HASH_SECRET;
    await notifyHighRiskMessage({
      studentId: "student-123",
      mode: "teach",
      violations: ["unsafe_content"],
    });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.learnerRef).toContain("unavailable");
  });
});
