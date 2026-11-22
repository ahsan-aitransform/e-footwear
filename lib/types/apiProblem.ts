// What the API returns for an error: RFC 7807 ProblemDetails with the extension members errorCode and correlationId.
export type ApiProblemDetailsPayload = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errorCode?: string;
  correlationId?: string;
  // ASP.NET model-validation errors: field name -> messages.
  errors?: Record<string, string[]>;
};

// The normalised form every screen works with.
export type ApiProblem = {
  message: string;
  errorCode: string | null;
  correlationId: string | null;
  // First message per field, keyed by the camelCase field name, so a form can show it next to the field.
  fieldErrorMessages: Record<string, string>;
};

export type ApiFailureKind =
  | "offline"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "validation"
  | "conflict"
  | "rateLimited"
  | "serverError"
  | "aborted"
  | "unknown";
