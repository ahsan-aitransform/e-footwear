// POS devices (Part 6 device authorization). The token hash never leaves the server; the token is shown once.

export const DeviceStatusCodes = {
  pending: "PENDING",
  authorized: "AUTHORIZED",
  revoked: "REVOKED",
} as const;

export type DeviceStatusCode = (typeof DeviceStatusCodes)[keyof typeof DeviceStatusCodes];

export type DeviceResponse = {
  id: string;
  storeId: string;
  storeCode: string;
  deviceUuid: string;
  label: string | null;
  status: DeviceStatusCode;
  lastSeenAt: string | null;
  createdAt: string;
  authorizedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  rowVersion: number;
};

export type RegisterDeviceRequest = { storeId: string; label: string; deviceUuid: string | null };
export type RegisteredDeviceResponse = { device: DeviceResponse; deviceToken: string };
export type UpdateDeviceRequest = { label: string; rowVersion: number };
export type RevokeDeviceRequest = { reason: string | null };
