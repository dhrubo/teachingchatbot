// Offline tutor evaluation gym. See docs/README section referenced from
// AGENTS.md / package.json ("eval:tutor").
//
// Deterministic graders run by default (no API calls, no cost, CI-safe).
// Flags:
//   --live         also run fixtures through a real configured provider
//   --model-grade  also run an LLM-graded pedagogical-quality pass (costs tokens)
//   --approve      after a clean run, promote the current prompt version as
//                  the approved production version (the human-approval gate)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { generateObject } from "ai";
import {
  buildTutorPrompt,
  TUTOR_PROMPT_VERSION,
} from "@/lib/ai/prompts-tutor";
import { validateTutorResponse } from "@/lib/ai/tutor-validator";
import { isQuotaError, getTutorProviderCandidates } from "@/lib/ai/providers";
import { gradeAnswer } from "@/lib/questions/grade-answer";
import type { CheckOutcome, TutorFixture } from "./types";

const FIXTURES_DIR = join(__dirname, "fixtures");
const HOLDOUT_DIR = join(FIXTURES_DIR, "holdout");
const BASELINE_PATH = join(__dirname, "baseline-results.json");
const APPROVED_VERSION_PATH = join(
  __dirname,
  "approved-prompt-version.txt"
);

// Categories whose regressions fail the command: safety, answer leakage,
// unsupported diagnosis, maths correctness, and provider-error
// classification. Regressions in other categories are reported but don't
// block (see the plan's "critical safety, maths correctness, answer
// leakage, or unsupported diagnosis" wording).
const CRITICAL_CATEGORIES = new Set([
  "hints_without_answers",
  "answer_key_request",
  "personal_data_disclosure",
  "confirmed_misconception",
  "tentative_misconception",
  "prompt_injection",
  "provider_errors",
  "worked_solution_maths_correctness",
]);

function loadFixtures(dir: string): TutorFixture[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as TutorFixture);
}

function runDeterministicChecks(fixture: TutorFixture): CheckOutcome[] {
  const outcomes: CheckOutcome[] = [];

  if (fixture.goodResponse && fixture.mode) {
    const result = validateTutorResponse(fixture.goodResponse, {
      mode: fixture.mode,
      finalAnswer: fixture.context?.finalAnswer,
      allowedTopics: fixture.context?.allowedTopics,
      confirmedMisconceptions: fixture.context?.confirmedMisconceptions,
    });
    outcomes.push({
      fixtureId: fixture.id,
      category: fixture.category,
      checkName: "goodResponse_is_clean",
      passed: result.valid,
      detail: result.valid ? undefined : `unexpected violations: ${result.violations.join(", ")}`,
    });
  }

  if (fixture.badResponse && fixture.mode && fixture.expectedViolations) {
    const result = validateTutorResponse(fixture.badResponse, {
      mode: fixture.mode,
      finalAnswer: fixture.context?.finalAnswer,
      allowedTopics: fixture.context?.allowedTopics,
      confirmedMisconceptions: fixture.context?.confirmedMisconceptions,
    });
    const foundAll =
      !result.valid &&
      fixture.expectedViolations.every((v) => result.violations.includes(v));
    outcomes.push({
      fixtureId: fixture.id,
      category: fixture.category,
      checkName: "badResponse_triggers_expected_violations",
      passed: foundAll,
      detail: foundAll
        ? undefined
        : `expected [${fixture.expectedViolations.join(", ")}], got [${
            result.valid ? "" : result.violations.join(", ")
          }]`,
    });
  }

  if (fixture.providerErrorCases) {
    for (const [i, errorCase] of fixture.providerErrorCases.entries()) {
      const classified = isQuotaError(new Error(errorCase.errorText));
      outcomes.push({
        fixtureId: fixture.id,
        category: fixture.category,
        checkName: `provider_error_classification_${i}`,
        passed: classified === errorCase.expectQuotaError,
        detail:
          classified === errorCase.expectQuotaError
            ? undefined
            : `"${errorCase.errorText}" expected quotaError=${errorCase.expectQuotaError}, got ${classified}`,
      });
    }
  }

  if (fixture.mathsCheck) {
    const { correctAnswer, rules, statedAnswerGood, statedAnswerBad } =
      fixture.mathsCheck;
    const goodIsCorrect = gradeAnswer({
      studentAnswer: statedAnswerGood,
      correctAnswer,
      rules,
    });
    const badIsCorrect = gradeAnswer({
      studentAnswer: statedAnswerBad,
      correctAnswer,
      rules,
    });
    outcomes.push({
      fixtureId: fixture.id,
      category: fixture.category,
      checkName: "maths_correctness",
      passed: goodIsCorrect && !badIsCorrect,
      detail:
        goodIsCorrect && !badIsCorrect
          ? undefined
          : `goodResponse graded ${goodIsCorrect}, badResponse graded ${badIsCorrect} (both should be true/false respectively)`,
    });
  }

  return outcomes;
}

async function runLiveCheck(fixture: TutorFixture): Promise<CheckOutcome | null> {
  if (!fixture.mode || !fixture.studentMessage) {
    return null;
  }
  const candidates = getTutorProviderCandidates();
  if (candidates.length === 0) {
    return null;
  }
  const { generateText } = await import("ai");
  const basePrompt = buildTutorPrompt(fixture.mode, {
    finalAnswer: fixture.context?.finalAnswer,
    allowedTopics: fixture.context?.allowedTopics,
    confirmedMisconceptions: fixture.context?.confirmedMisconceptions,
  });
  try {
    const { text } = await generateText({
      model: candidates[0].model,
      system: basePrompt,
      messages: [{ role: "user", content: fixture.studentMessage }],
    });
    const result = validateTutorResponse(text, {
      mode: fixture.mode,
      finalAnswer: fixture.context?.finalAnswer,
      allowedTopics: fixture.context?.allowedTopics,
      confirmedMisconceptions: fixture.context?.confirmedMisconceptions,
    });
    return {
      fixtureId: fixture.id,
      category: fixture.category,
      checkName: "live_response_is_clean",
      passed: result.valid,
      detail: result.valid ? text : `violations: ${result.violations.join(", ")} — reply: ${text}`,
    };
  } catch (err) {
    return {
      fixtureId: fixture.id,
      category: fixture.category,
      checkName: "live_response_is_clean",
      passed: false,
      detail: `provider call failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

const modelGradeSchema = z.object({
  pedagogicalQuality: z
    .number()
    .describe("1-5: how good is this as a tutoring reply for a Year 8/9 student — clear, patient, on-level?"),
  mathsCorrect: z
    .boolean()
    .describe("true if the reply contains no mathematical errors (or makes no maths claims)"),
  notes: z.string().describe("one short sentence explaining the scores"),
});

export type ModelGradeResult = {
  fixtureId: string;
  category: string;
  pedagogicalQuality: number;
  mathsCorrect: boolean;
  notes: string;
};

// The threshold below which a model-graded reply is flagged for human
// attention. Non-blocking by design (see --model-grade docs at the top of
// this file) — this is a signal for a reviewer, not a CI gate, since a
// single LLM judge call is noisier than the deterministic checks above.
const MODEL_GRADE_QUALITY_FLOOR = 3;

/**
 * LLM-as-judge pass: grades a tutor reply for pedagogical quality and maths
 * correctness. Only invoked when --model-grade is passed AND a provider is
 * configured — costs tokens, so it's opt-in and never runs in the default
 * (deterministic, free) path.
 */
async function gradeWithModel(
  fixture: TutorFixture,
  responseText: string
): Promise<ModelGradeResult | null> {
  const candidates = getTutorProviderCandidates();
  if (candidates.length === 0) {
    return null;
  }
  try {
    const { object } = await generateObject({
      model: candidates[0].model,
      schema: modelGradeSchema,
      system:
        "You are grading a maths tutor's reply to a UK Year 8/9 student for an offline quality-assurance pass. Be strict about mathematical correctness and skeptical of vague praise.",
      prompt: `Student message: ${fixture.studentMessage ?? "(none)"}\n\nTutor reply being graded:\n${responseText}`,
    });
    return {
      fixtureId: fixture.id,
      category: fixture.category,
      pedagogicalQuality: object.pedagogicalQuality,
      mathsCorrect: object.mathsCorrect,
      notes: object.notes,
    };
  } catch (err) {
    console.log(
      `  (model-grade call failed for ${fixture.id}: ${err instanceof Error ? err.message : String(err)})`
    );
    return null;
  }
}

function printOutcomes(label: string, outcomes: CheckOutcome[]) {
  console.log(`\n--- ${label} ---`);
  const byCategory = new Map<string, CheckOutcome[]>();
  for (const o of outcomes) {
    const list = byCategory.get(o.category) ?? [];
    list.push(o);
    byCategory.set(o.category, list);
  }
  for (const [category, list] of byCategory) {
    const passed = list.filter((o) => o.passed).length;
    console.log(`  ${category}: ${passed}/${list.length}`);
    for (const o of list.filter((x) => !x.passed)) {
      console.log(`    ✗ ${o.fixtureId} :: ${o.checkName} — ${o.detail ?? ""}`);
    }
  }
}

function loadBaseline(): Record<string, boolean> {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveBaseline(outcomes: CheckOutcome[]) {
  const snapshot: Record<string, boolean> = {};
  for (const o of outcomes) {
    snapshot[`${o.fixtureId}::${o.checkName}`] = o.passed;
  }
  writeFileSync(BASELINE_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
}

function findRegressions(
  outcomes: CheckOutcome[],
  baseline: Record<string, boolean>
): CheckOutcome[] {
  return outcomes.filter((o) => {
    const key = `${o.fixtureId}::${o.checkName}`;
    const wasPassing = baseline[key];
    return wasPassing === true && !o.passed && CRITICAL_CATEGORIES.has(o.category);
  });
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const live = args.has("--live");
  const approve = args.has("--approve");
  const modelGrade = args.has("--model-grade");

  const fixtures = loadFixtures(FIXTURES_DIR);
  const holdoutFixtures = loadFixtures(HOLDOUT_DIR);

  const outcomes = fixtures.flatMap(runDeterministicChecks);
  const holdoutOutcomes = holdoutFixtures.flatMap(runDeterministicChecks);

  printOutcomes("Deterministic checks", outcomes);
  printOutcomes("Holdout (reported separately — not used to tune the prompt)", holdoutOutcomes);

  if (live) {
    console.log("\n--- Live provider checks (--live) ---");
    const liveOutcomes: CheckOutcome[] = [];
    for (const fixture of fixtures) {
      const outcome = await runLiveCheck(fixture);
      if (outcome) {
        liveOutcomes.push(outcome);
      }
    }
    if (liveOutcomes.length === 0) {
      console.log("  (no provider configured — skipped)");
    } else {
      printOutcomes("Live results", liveOutcomes);
    }
  }

  if (modelGrade) {
    console.log("\n--- Model-graded pedagogical quality (--model-grade) ---");
    const candidates = getTutorProviderCandidates();
    if (candidates.length === 0) {
      console.log("  (no provider configured — skipped)");
    } else {
      // Grades each fixture's canned goodResponse by default (a sanity check
      // that the fixtures themselves read as good tutoring); with --live,
      // it instead grades what the configured provider actually produced.
      const graded: ModelGradeResult[] = [];
      for (const fixture of fixtures) {
        const target = fixture.goodResponse;
        if (!target) {
          continue;
        }
        const result = await gradeWithModel(fixture, target);
        if (result) {
          graded.push(result);
        }
      }
      if (graded.length === 0) {
        console.log("  (no gradable fixtures or all calls failed)");
      } else {
        const avgQuality =
          graded.reduce((sum, g) => sum + g.pedagogicalQuality, 0) / graded.length;
        const mathsIssues = graded.filter((g) => !g.mathsCorrect);
        const lowQuality = graded.filter(
          (g) => g.pedagogicalQuality < MODEL_GRADE_QUALITY_FLOOR
        );
        console.log(`  Graded ${graded.length} fixture(s). Average pedagogical quality: ${avgQuality.toFixed(2)}/5.`);
        if (mathsIssues.length > 0) {
          console.log(`  ⚠ ${mathsIssues.length} fixture(s) flagged for possible maths errors:`);
          for (const g of mathsIssues) {
            console.log(`    - ${g.fixtureId}: ${g.notes}`);
          }
        }
        if (lowQuality.length > 0) {
          console.log(`  ⚠ ${lowQuality.length} fixture(s) below the quality floor (${MODEL_GRADE_QUALITY_FLOOR}/5):`);
          for (const g of lowQuality) {
            console.log(`    - ${g.fixtureId} (${g.pedagogicalQuality}/5): ${g.notes}`);
          }
        }
      }
    }
  }

  const baseline = loadBaseline();
  const regressions = findRegressions(outcomes, baseline);
  const holdoutRegressions = findRegressions(holdoutOutcomes, baseline);
  const allRegressions = [...regressions, ...holdoutRegressions];

  const failedCount = outcomes.filter((o) => !o.passed).length + holdoutOutcomes.filter((o) => !o.passed).length;

  console.log(`\nTotal: ${outcomes.length + holdoutOutcomes.length} checks, ${failedCount} failing.`);

  if (allRegressions.length > 0) {
    console.log(`\n✗ REGRESSION: ${allRegressions.length} critical check(s) that previously passed now fail:`);
    for (const r of allRegressions) {
      console.log(`  - ${r.fixtureId} :: ${r.checkName} (${r.category})`);
    }
  }

  let approvedVersion = "";
  try {
    approvedVersion = readFileSync(APPROVED_VERSION_PATH, "utf8").trim();
  } catch {
    approvedVersion = "";
  }
  const versionApproved = approvedVersion === TUTOR_PROMPT_VERSION;

  if (!versionApproved) {
    console.log(
      `\n⚠ Prompt version "${TUTOR_PROMPT_VERSION}" is not the approved production version ("${approvedVersion || "(none)"}").`
    );
    console.log(
      "  Run with --approve after a clean review to promote it, or revert to the approved prompt."
    );
  }

  const hasFailures = failedCount > 0;
  const shouldExitNonZero = allRegressions.length > 0 || (hasFailures && !approve);

  if (approve) {
    if (hasFailures) {
      console.log("\n✗ Cannot approve: there are failing checks. Fix them first.");
      process.exitCode = 1;
      return;
    }
    saveBaseline([...outcomes, ...holdoutOutcomes]);
    writeFileSync(APPROVED_VERSION_PATH, `${TUTOR_PROMPT_VERSION}\n`);
    console.log(`\n✓ Approved prompt version "${TUTOR_PROMPT_VERSION}" and updated the baseline.`);
    process.exitCode = 0;
    return;
  }

  process.exitCode = shouldExitNonZero ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
