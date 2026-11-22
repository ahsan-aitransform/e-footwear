"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { TextInputField } from "@/components/forms/TextInputField";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { IssuedPasswordResetTokenResponse, UserDetailsResponse } from "@/lib/types/userManagement";
import { formatTimestamp } from "../logic/formatTimestamp";
import { findPasswordRuleViolation } from "../logic/temporaryPasswordRules";

// What an administrator can do to ANOTHER user's account (docx 1.3, Part 6): block or unblock, set a temporary password, issue a
// single-use reset token, delete. The server decides who may do what to whom (the owner account and your own account are protected);
// buttons for actions the person has no permission for are not shown.
export function UserAccountActionsPanel({
  user,
  isOwnAccount,
  isOnline,
  onChanged,
}: {
  user: UserDetailsResponse;
  isOwnAccount: boolean;
  isOnline: boolean;
  onChanged: () => void;
}) {
  const { translateMessage, languageCode } = useTranslation();
  const router = useRouter();
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [issuedToken, setIssuedToken] = useState<IssuedPasswordResetTokenResponse>();
  const [isBusy, setIsBusy] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isBlocked = user.status === "DISABLED";

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, successKey: Parameters<typeof translateMessage>[0]) {
    setIsBusy(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    const outcome = await action();
    setIsBusy(false);
    if (outcome.ok) {
      setSuccessMessage(translateMessage(successKey));
      onChanged();
    } else setErrorMessage(outcome.message);
  }

  async function handleToggleBlock() {
    await run(
      async () => {
        const result = await apiRequest(isBlocked ? ApiEndpoints.users.unblock(user.id) : ApiEndpoints.users.block(user.id), { method: "POST" });
        return result.ok ? { ok: true } : { ok: false, message: result.problem.message };
      },
      isBlocked ? "securityManagement.accountActions.unblocked" : "securityManagement.accountActions.blocked",
    );
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const violation = findPasswordRuleViolation(temporaryPassword);
    if (violation) {
      setPasswordErrorMessage(translateMessage("securityManagement.userEditor.passwordNeedsLettersAndDigits"));
      return;
    }
    setPasswordErrorMessage(undefined);
    await run(async () => {
      const result = await apiRequest(ApiEndpoints.users.resetPassword(user.id), { method: "POST", body: { temporaryPassword } });
      if (result.ok) setTemporaryPassword("");
      return result.ok ? { ok: true } : { ok: false, message: result.problem.message };
    }, "securityManagement.accountActions.passwordReset");
  }

  async function handleIssueToken() {
    setIsBusy(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    const result = await apiRequest<IssuedPasswordResetTokenResponse>(ApiEndpoints.users.issuePasswordResetToken(user.id), { method: "POST" });
    setIsBusy(false);
    if (result.ok) setIssuedToken(result.data);
    else setErrorMessage(result.problem.message);
  }

  async function handleDelete() {
    setIsBusy(true);
    const result = await apiRequest(ApiEndpoints.users.remove(user.id), { method: "DELETE" });
    setIsBusy(false);
    setIsDeleteDialogOpen(false);
    if (result.ok) router.push(ApplicationRoutes.usersList);
    else setErrorMessage(result.problem.message);
  }

  return (
    <SectionCard title={translateMessage("securityManagement.accountActions.title")} description={translateMessage("securityManagement.accountActions.description")}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusBadge statusCode={user.status} />
          {user.lockedUntil && (
            <span className="text-muted-foreground">
              {translateMessage("securityManagement.accountActions.lockedUntil", { lockedUntil: formatTimestamp(user.lockedUntil, languageCode) })}
            </span>
          )}
          <span className="text-muted-foreground">
            {translateMessage("securityManagement.accountActions.lastSignIn", {
              lastSignIn: user.lastSignInAt ? formatTimestamp(user.lastSignInAt, languageCode) : translateMessage("securityManagement.usersList.neverSignedIn"),
            })}
          </span>
        </div>

        {isOwnAccount ? (
          <InlineNotice tone="info">{translateMessage("securityManagement.accountActions.ownAccountNotice")}</InlineNotice>
        ) : (
          <>
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.RESTRICTED_OPERATIONS.ADMINISTRATION.USER_BLOCK)}>
              <Button type="button" variant="outline" disabled={isBusy || !isOnline} onClick={handleToggleBlock}>
                {translateMessage(isBlocked ? "securityManagement.accountActions.unblock" : "securityManagement.accountActions.block")}
              </Button>
            </PermissionGate>

            <PermissionGate requirement={requireAnyPermission(PermissionCodes.RESTRICTED_OPERATIONS.ADMINISTRATION.USER_PASSWORD_RESET)}>
              <form onSubmit={handleResetPassword} className="max-w-md space-y-3" noValidate>
                <TextInputField
                  label={translateMessage("securityManagement.accountActions.temporaryPasswordLabel")}
                  name="temporaryPassword"
                  type="password"
                  autoComplete="new-password"
                  value={temporaryPassword}
                  onChange={(event) => setTemporaryPassword(event.target.value)}
                  hint={translateMessage("securityManagement.accountActions.temporaryPasswordHint")}
                  errorMessage={passwordErrorMessage}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="outline" disabled={isBusy || !isOnline || temporaryPassword.length === 0}>
                    {translateMessage("securityManagement.accountActions.resetPassword")}
                  </Button>
                  <Button type="button" variant="outline" disabled={isBusy || !isOnline} onClick={handleIssueToken}>
                    {translateMessage("securityManagement.accountActions.issueResetToken")}
                  </Button>
                </div>
              </form>
              {issuedToken && (
                <div className="max-w-xl space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">{translateMessage("securityManagement.accountActions.tokenTitle")}</p>
                  <input
                    readOnly
                    value={issuedToken.resetToken}
                    aria-label={translateMessage("securityManagement.accountActions.tokenTitle")}
                    onFocus={(event) => event.currentTarget.select()}
                    className="w-full rounded-md border bg-muted px-2 py-1.5 font-mono text-xs"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    {translateMessage("securityManagement.accountActions.tokenHint", { expiresAt: formatTimestamp(issuedToken.expiresAt, languageCode) })}
                  </p>
                </div>
              )}
            </PermissionGate>

            <PermissionGate requirement={requireAnyPermission(PermissionCodes.USER_ACCOUNT.VIEW_USERS.DELETE)}>
              <Button type="button" variant="destructive" disabled={isBusy || !isOnline} onClick={() => setIsDeleteDialogOpen(true)}>
                {translateMessage("securityManagement.accountActions.delete")}
              </Button>
            </PermissionGate>
          </>
        )}

        <FormResultNotice errorMessage={errorMessage} successMessage={successMessage} />
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        isPending={isBusy}
        titleMessageKey="securityManagement.accountActions.deleteTitle"
        descriptionMessageKey="securityManagement.accountActions.deleteText"
        confirmLabelMessageKey="confirmDialog.deleteConfirm"
      />
    </SectionCard>
  );
}
