// One line of Users Activity (docx 1.4): a data change or a sign-in event, with before and after values as JSON text.

export const UserActivityEntryKinds = {
  businessChange: "BUSINESS_CHANGE",
  signIn: "SIGN_IN",
} as const;

export type UserActivityEntryKind = (typeof UserActivityEntryKinds)[keyof typeof UserActivityEntryKinds];

export type UserActivityEntryResponse = {
  entryId: string;
  occurredAt: string;
  userId: string | null;
  userFullName: string | null;
  userEmail: string | null;
  entryKind: UserActivityEntryKind;
  action: string;
  entityType: string;
  entityId: string | null;
  remarks: string | null;
  deviceLabel: string | null;
  ipAddress: string | null;
  oldValuesJson: string | null;
  newValuesJson: string | null;
};
