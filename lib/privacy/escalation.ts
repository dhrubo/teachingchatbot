import { pseudonymousId } from "./redact";

// Reuses the SAME real, generic notification mechanism already trusted for
// topic-request alerts (lib/db/queries/topic-requests.ts's
// notifyNewTopicRequest — a Slack/Discord/Zapier-compatible incoming
// webhook), applied to a second, distinct concern. This is deliberately NOT
// a bespoke "escalation system" — it's one webhook POST to whatever channel
// a real adult is actually watching, exactly like the existing feature.
//
// Scope, stated honestly (see docs/privacy.md): this fires only when a tutor
// reply's `unsafe_content` violation survives BOTH the draft and the one
// repair attempt (i.e. `runTutorTurn`/`createTutorValidationTransform`
// resolved to `repairStatus: "fallback"` with `unsafe_content` still in the
// violations list) — the student never sees unsafe text either way, since
// the fallback text is always safe, but a persistent unsafe_content signal
// is itself worth a human's attention. This does NOT screen the student's
// own incoming message, and does NOT fire on a draft that failed but was
// successfully repaired.

export type EscalationEvent = {
  studentId?: string | null;
  mode: string;
  violations: string[];
};

/** No-op (never throws) unless GUARDIAN_ESCALATION_WEBHOOK_URL is set. */
export async function notifyHighRiskMessage(event: EscalationEvent): Promise<void> {
  const url = process.env.GUARDIAN_ESCALATION_WEBHOOK_URL;
  if (!url) {
    return;
  }
  if (!event.violations.includes("unsafe_content")) {
    return;
  }
  let learnerRef = "unknown";
  if (event.studentId) {
    try {
      learnerRef = pseudonymousId(event.studentId);
    } catch {
      // ANALYTICS_HASH_SECRET not configured — omit the id rather than
      // logging the raw studentId or failing the request.
      learnerRef = "unavailable (ANALYTICS_HASH_SECRET not set)";
    }
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 SARA flagged a tutor reply for unsafe content (mode: ${event.mode}) that needed the safety fallback. Learner ref: ${learnerRef}.`,
        mode: event.mode,
        violations: event.violations,
        learnerRef,
        source: "sara-tutor-validator",
      }),
    });
  } catch (error) {
    console.error("[escalation] webhook notify failed:", error);
  }
}
