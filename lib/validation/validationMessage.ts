import type { MessageKey } from "@/lib/i18n/messageKeys";
import type { MessageParameters } from "@/lib/i18n/translateMessage";

// One error text of a form field: the message key and the values its placeholders need ("The payment cannot be more than {outstanding}").
// Validators return these instead of translated text, so they stay pure and testable; the screen translates them.
export type ValidationMessage = { messageKey: MessageKey; parameters?: MessageParameters };

export function validationMessage(messageKey: MessageKey, parameters?: MessageParameters): ValidationMessage {
  return parameters ? { messageKey, parameters } : { messageKey };
}

export function translateValidationMessage(
  translateMessage: (messageKey: MessageKey, parameters?: MessageParameters) => string,
  message: ValidationMessage | undefined,
): string | undefined {
  return message ? translateMessage(message.messageKey, message.parameters) : undefined;
}
