// SINGLE SOURCE OF TRUTH for the machine-readable error codes the API sends in the "errorCode" member of every problem response.
// They mirror the backend class EFootwear.Domain.Common.ErrorCodes; a screen reacts to a code instead of parsing a message.
export const ApiErrorCodes = {
  validationFailed: "VALIDATION_FAILED",
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  permissionDenied: "PERMISSION_DENIED",
  notFound: "NOT_FOUND",
  conflict: "CONFLICT",
  concurrentUpdate: "CONCURRENT_UPDATE",
  recordInUse: "RECORD_IN_USE",
  databaseRuleViolation: "DATABASE_RULE_VIOLATION",
} as const;
export type ApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes];
