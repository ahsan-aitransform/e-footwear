import type { MessageKey } from "./messageKeys";

// API status codes (sec.users.status, platform.companies.status) and the message that names each one.
const messageKeyByStatusCode: Record<string, MessageKey> = {
  ACTIVE: "common.status.active",
  LOCKED: "common.status.locked",
  DISABLED: "common.status.disabled",
  INACTIVE: "common.status.inactive",
  SUSPENDED: "common.status.suspended",
  CLOSED: "common.status.closed",
};

// Undefined for a status this build does not know; the screen then shows the raw code instead of hiding it.
export function findStatusMessageKey(statusCode: string): MessageKey | undefined {
  return messageKeyByStatusCode[statusCode.toUpperCase()];
}
