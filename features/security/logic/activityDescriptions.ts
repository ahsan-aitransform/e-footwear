import type { MessageKey } from "@/lib/i18n/messageKeys";

// The words of the Users Activity screen (docx 1.4: "Log In, Log Out, ..."). The server sends a technical action code; this maps the
// codes this build knows to a message and leaves any other code as it is, so an action added later is shown, never hidden.
const messageKeyByActionCode: Record<string, MessageKey> = {
  SUCCESS: "securityManagement.activity.action.SUCCESS",
  LOGOUT: "securityManagement.activity.action.LOGOUT",
  WRONG_PASSWORD: "securityManagement.activity.action.WRONG_PASSWORD",
  UNKNOWN_USER: "securityManagement.activity.action.UNKNOWN_USER",
  LOCKED: "securityManagement.activity.action.LOCKED",
  DISABLED: "securityManagement.activity.action.DISABLED",
  PASSWORD_CHANGED: "securityManagement.activity.action.PASSWORD_CHANGED",
  RESET_REQUESTED: "securityManagement.activity.action.RESET_REQUESTED",
  RESET_THROTTLED: "securityManagement.activity.action.RESET_THROTTLED",
  PASSWORD_RESET: "securityManagement.activity.action.PASSWORD_RESET",
  ADMIN_RESET: "securityManagement.activity.action.ADMIN_RESET",
  BLOCKED: "securityManagement.activity.action.BLOCKED",
  UNBLOCKED: "securityManagement.activity.action.UNBLOCKED",
  INSERT: "securityManagement.activity.action.INSERT",
  UPDATE: "securityManagement.activity.action.UPDATE",
  DELETE: "securityManagement.activity.action.DELETE",
  PERMISSIONS_CHANGED: "securityManagement.activity.action.PERMISSIONS_CHANGED",
  STORE_ASSIGNMENTS_CHANGED: "securityManagement.activity.action.STORE_ASSIGNMENTS_CHANGED",
  QUICK_ACTIONS_CHANGED: "securityManagement.activity.action.QUICK_ACTIONS_CHANGED",
  USER_DELETED: "securityManagement.activity.action.USER_DELETED",
  USER_PASSWORD_RESET_BY_ADMINISTRATOR: "securityManagement.activity.action.USER_PASSWORD_RESET_BY_ADMINISTRATOR",
  PASSWORD_RESET_TOKEN_ISSUED: "securityManagement.activity.action.PASSWORD_RESET_TOKEN_ISSUED",
  SESSION_REVOKED: "securityManagement.activity.action.SESSION_REVOKED",
  DEVICE_REGISTERED: "securityManagement.activity.action.DEVICE_REGISTERED",
  DEVICE_TOKEN_ROTATED: "securityManagement.activity.action.DEVICE_TOKEN_ROTATED",
};

export function findActivityActionMessageKey(actionCode: string): MessageKey | undefined {
  return messageKeyByActionCode[actionCode];
}

// Pretty-prints a JSON text for the before/after panel. Anything that is not valid JSON is returned as it is.
export function formatJsonForDisplay(jsonText: string | null): string {
  if (!jsonText) return "";
  try {
    return JSON.stringify(JSON.parse(jsonText), null, 2);
  } catch {
    return jsonText;
  }
}
