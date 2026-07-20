import { createHmac } from "node:crypto";

// Redaction and pseudonymisation for anything that might leave the private
// live system — analytics exports, shareable eval fixtures, support
// tickets. Live student traffic itself is NOT run through this (the DB
// schema already separates identity: studentProfile.name vs studentProfile.id,
// and student-facing tables key on the pseudonymous id, not the name) — this
// module exists for the boundary where data crosses INTO a shareable or
// analytics context. See docs/privacy.md for the full data-handling model.

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const UK_PHONE_RE = /\b(?:\+?44\s?|0)(?:\d\s?){9,10}\b/g;
const UK_POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi;
// "my name is X", "I'm X", "I go to X school" — best-effort, deterministic;
// this is NOT a full PII classifier (see docs/privacy.md for the honest
// scope of this guard).
const NAME_DISCLOSURE_RE =
  /\b(my name is|i'?m called|i am called)\s+[a-z][a-z'-]*(\s+[a-z][a-z'-]*)?/gi;
const SCHOOL_DISCLOSURE_RE =
  /\bi go to\s+[a-z0-9][a-z0-9'&\s]{2,40}?\s(school|academy|college)\b/gi;
const ADDRESS_LIKE_RE =
  /\b\d{1,4}\s+[a-z][a-z\s]{2,30}\b(street|road|avenue|lane|drive|close|way)\b/gi;

const REDACTORS: { pattern: RegExp; replacement: string }[] = [
  { pattern: EMAIL_RE, replacement: "[redacted-email]" },
  { pattern: UK_PHONE_RE, replacement: "[redacted-phone]" },
  { pattern: UK_POSTCODE_RE, replacement: "[redacted-postcode]" },
  { pattern: NAME_DISCLOSURE_RE, replacement: "[redacted-name-disclosure]" },
  { pattern: SCHOOL_DISCLOSURE_RE, replacement: "[redacted-school-disclosure]" },
  { pattern: ADDRESS_LIKE_RE, replacement: "[redacted-address]" },
];

/**
 * Best-effort redaction for any text crossing into analytics or a shareable
 * eval export. NOT a substitute for keeping raw transcripts out of those
 * exports in the first place — see docs/privacy.md. Idempotent and pure.
 */
export function redactForAnalytics(text: string): string {
  let result = text;
  for (const { pattern, replacement } of REDACTORS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Deterministic pseudonymous id for analytics/export contexts — same input
 * always maps to the same output (so trends are still traceable), but the
 * output can't be reversed to the original id without ANALYTICS_HASH_SECRET.
 * Requires ANALYTICS_HASH_SECRET to be set; throws otherwise rather than
 * silently falling back to an unkeyed (and therefore guessable) hash.
 */
export function pseudonymousId(id: string): string {
  const secret = process.env.ANALYTICS_HASH_SECRET;
  if (!secret) {
    throw new Error(
      "ANALYTICS_HASH_SECRET is not set — required to compute a pseudonymous id. See docs/privacy.md."
    );
  }
  return createHmac("sha256", secret).update(id).digest("hex").slice(0, 32);
}
