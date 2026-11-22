// The rules for a new password (docx 1.5 and 1.1): at least 8 characters, letters and digits. The server checks them again
// (PasswordRules in the API), so this only saves a round trip and shows the problem next to the field.
export const MINIMUM_PASSWORD_LENGTH = 8;
export const MAXIMUM_PASSWORD_LENGTH = 200;

export type PasswordRuleViolation = "tooShort" | "tooLong" | "needsLettersAndDigits";

export function findPasswordRuleViolation(password: string): PasswordRuleViolation | undefined {
  if (password.length < MINIMUM_PASSWORD_LENGTH) return "tooShort";
  if (password.length > MAXIMUM_PASSWORD_LENGTH) return "tooLong";
  const hasLetter = /\p{L}/u.test(password);
  const hasDigit = /\p{Nd}/u.test(password);
  if (!hasLetter || !hasDigit) return "needsLettersAndDigits";
  return undefined;
}
