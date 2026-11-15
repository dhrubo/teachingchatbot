export type ErrorType =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limit"
  | "offline";

export type Surface = "api" | "tutor" | "voice" | "reminders" | "database";

export type ErrorCode = `${ErrorType}:${Surface}`;

export type ErrorVisibility = "response" | "log" | "none";

export const visibilityBySurface: Record<Surface, ErrorVisibility> = {
  database: "log",
  api: "response",
  tutor: "response",
  voice: "response",
  reminders: "response",
};

export class ChatbotError extends Error {
  type: ErrorType;
  surface: Surface;
  statusCode: number;

  constructor(errorCode: ErrorCode, cause?: string) {
    super();

    const [type, surface] = errorCode.split(":");

    this.type = type as ErrorType;
    this.cause = cause;
    this.surface = surface as Surface;
    this.message = getMessageByErrorCode(errorCode);
    this.statusCode = getStatusCodeByType(this.type);
  }

  toResponse(): Response {
    const code: ErrorCode = `${this.type}:${this.surface}`;
    const visibility = visibilityBySurface[this.surface];

    const { message, cause, statusCode } = this;

    if (visibility === "log") {
      console.error({
        code,
        message,
        cause,
      });

      return Response.json(
        { code: "", message: "Something went wrong. Please try again later." },
        { status: statusCode }
      );
    }

    return Response.json({ code, message, cause }, { status: statusCode });
  }
}

export function getMessageByErrorCode(errorCode: ErrorCode): string {
  if (errorCode.includes("database")) {
    return "An error occurred while executing a database query.";
  }

  switch (errorCode) {
    case "bad_request:api":
      return "The request couldn't be processed. Please check your input and try again.";
    case "bad_request:tutor":
      return "The tutoring request was invalid. Please try again.";
    case "rate_limit:tutor":
      return "All configured free AI providers are temporarily rate-limited. Wait a few seconds or add a backup free API key in Settings.";
    case "offline:tutor":
      return "No AI provider keys are configured yet, or the provider could not be reached.";
    case "bad_request:voice":
      return "That audio couldn't be processed. Please try speaking again.";
    case "rate_limit:voice":
      return "Voice requests hit a temporary limit. Switching to browser voice or try again shortly.";
    case "offline:voice":
      return "Server voice service isn't configured yet — using browser speech instead.";
    case "bad_request:reminders":
      return "Invalid reminder configuration. Please check your notification permissions.";
    case "unauthorized:reminders":
      return "Missing or invalid cron authorization token.";
    default:
      return "Something went wrong. Please try again later.";
  }
}

function getStatusCodeByType(type: ErrorType): number {
  switch (type) {
    case "bad_request":
      return 400;
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "rate_limit":
      return 429;
    case "offline":
      return 503;
    default:
      return 500;
  }
}
