import type { MessageKey } from "@/lib/i18n/messageKeys";
import { PromiseStatusCodes } from "../types/cashTypes";

const messageKeyByPromiseStatusCode: Record<string, MessageKey> = {
  [PromiseStatusCodes.open]: "cash.promise.status.open",
  [PromiseStatusCodes.partial]: "cash.promise.status.partial",
  [PromiseStatusCodes.paid]: "cash.promise.status.paid",
  [PromiseStatusCodes.broken]: "cash.promise.status.broken",
  [PromiseStatusCodes.cancelled]: "cash.promise.status.cancelled",
};

// An unknown status code (a newer server) falls back to the open message instead of showing a raw key.
export function promiseStatusMessageKey(statusCode: string): MessageKey {
  return messageKeyByPromiseStatusCode[statusCode] ?? "cash.promise.status.open";
}
