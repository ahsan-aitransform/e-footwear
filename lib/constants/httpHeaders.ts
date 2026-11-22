// SINGLE SOURCE OF TRUTH FOR HTTP HEADER NAMES AND MEDIA TYPES USED BY THE API CLIENT.

export const HttpHeaderNames = {
  accept: "Accept",
  contentType: "Content-Type",
  authorization: "Authorization",
  // Optional: selects the store the request is about (the API checks it against the user's store access).
  selectedStoreId: "X-Store-Id",
  // Makes a retried POST safe: the API returns the first result instead of creating a second record.
  idempotencyKey: "Idempotency-Key",
  correlationId: "X-Correlation-Id",
} as const;

export const BEARER_AUTHENTICATION_SCHEME = "Bearer";
export const JSON_MEDIA_TYPE = "application/json";
