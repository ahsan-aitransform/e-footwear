// Live sign-in sessions and the sign-in history. The token itself is never part of a response.

export type UserSessionResponse = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceLabel: string | null;
  isCurrentSession: boolean;
};

export type LoginHistoryEntryResponse = {
  attemptId: string;
  userId: string | null;
  usernameEntered: string | null;
  // SUCCESS, WRONG_PASSWORD, LOCKED, LOGOUT, PASSWORD_CHANGED, ADMIN_RESET, BLOCKED, UNBLOCKED ...
  outcome: string;
  attemptedAt: string;
  ipAddress: string | null;
  deviceLabel: string | null;
  actedByUserId: string | null;
};

export type EndOtherSessionsResponse = { endedCount: number };
