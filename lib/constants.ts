export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.VITEST ||
    process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const LEARNER_COOKIE_NAME = "ranedeer_learner_id";
export const DEFAULT_LEARNER_ID = "00000000-0000-4000-8000-000000000001";
