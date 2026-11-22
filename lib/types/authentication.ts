export type CompanyLoginRequest = { email: string; password: string };
export type CompanyLoginResponse = { accessToken: string; mustChangePassword: boolean };

export type PlatformAdministratorLoginRequest = { username: string; password: string };
export type PlatformAdministratorLoginResponse = { accessToken: string };

export type ChangePasswordRequest = { currentPassword: string; newPassword: string };
