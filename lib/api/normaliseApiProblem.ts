import { getLanguageSnapshot } from "@/lib/i18n/languageStore";
import { translateMessageForLanguage } from "@/lib/i18n/translateMessage";
import type { ApiFailureKind, ApiProblem, ApiProblemDetailsPayload } from "@/lib/types/apiProblem";

export function failureKindForStatus(status: number): ApiFailureKind {
  switch (status) {
    case 0:
      return "offline";
    case 400:
    case 422:
      return "validation";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "notFound";
    case 409:
    case 423:
      return "conflict";
    case 429:
      return "rateLimited";
    default:
      return status >= 500 ? "serverError" : "unknown";
  }
}

// "Password" -> "password", "Items[0].UnitPrice" -> "items[0].unitPrice": the form field names are camelCase.
function toCamelCaseFieldName(serverFieldName: string): string {
  return serverFieldName
    .split(".")
    .map((segment) => (segment.length > 0 ? segment[0].toLowerCase() + segment.slice(1) : segment))
    .join(".");
}

function firstFieldErrorMessages(errors: Record<string, string[]> | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!errors) return result;
  for (const [fieldName, messages] of Object.entries(errors)) {
    if (Array.isArray(messages) && messages.length > 0) result[toCamelCaseFieldName(fieldName)] = String(messages[0]);
  }
  return result;
}

function isPayloadObject(value: unknown): value is ApiProblemDetailsPayload {
  return typeof value === "object" && value !== null;
}

// Turns whatever the server (or the network layer) answered into the one shape the screens use.
export function normaliseApiProblem(status: number, payload: unknown): ApiProblem {
  const details: ApiProblemDetailsPayload = isPayloadObject(payload) ? payload : {};
  const languageCode = getLanguageSnapshot();
  const fallbackMessage =
    status === 0
      ? translateMessageForLanguage(languageCode, "errors.noConnectionToServer")
      : translateMessageForLanguage(languageCode, "errors.somethingWentWrong");
  return {
    message: details.detail ?? details.title ?? fallbackMessage,
    errorCode: details.errorCode ?? null,
    correlationId: details.correlationId ?? null,
    fieldErrorMessages: firstFieldErrorMessages(details.errors),
  };
}
