"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { RoleBadge } from "@/components/feedback/RoleBadge";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { useCurrentSession } from "@/lib/session/useSessionState";
import type { UserListItemResponse } from "@/lib/types/user";
import { PartialEditPanel } from "../components/PartialEditPanel";
import { formatTimestamp } from "../logic/formatTimestamp";

// Users Account (docx 1.3): everybody of the company the person may see, with sign-in information and status. There is no
// password column. Double-click or Enter opens the full edit; "Edit partially" changes only status and rights; Delete asks first.
export function UsersAccountPage() {
  const { translateMessage, languageCode } = useTranslation();
  const router = useRouter();
  const session = useCurrentSession();
  const usersQuery = useApiQuery<UserListItemResponse[]>(ApiEndpoints.users.list, { offlineCacheName: "users-account-list" });
  const [searchText, setSearchText] = useState("");
  const [partialEditUser, setPartialEditUser] = useState<UserListItemResponse>();
  const [userToDelete, setUserToDelete] = useState<UserListItemResponse>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const text = searchText.trim().toLowerCase();
  const visibleUsers = (usersQuery.data ?? []).filter(
    (user) => text.length === 0 || [user.email, user.fullName, user.roleCode, ...user.storeCodes].some((value) => value.toLowerCase().includes(text)),
  );

  async function handleDelete() {
    if (!userToDelete) return;
    setIsDeleting(true);
    const result = await apiRequest(ApiEndpoints.users.remove(userToDelete.id), { method: "DELETE" });
    setIsDeleting(false);
    if (result.ok) {
      setUserToDelete(undefined);
      usersQuery.refetch();
    } else {
      setErrorMessage(result.problem.message);
      setUserToDelete(undefined);
    }
  }

  const columns: DataGridColumn<UserListItemResponse>[] = [
    { key: "email", header: translateMessage("security.userTable.emailColumn"), render: (user) => <strong>{user.email}</strong> },
    { key: "fullName", header: translateMessage("security.userTable.nameColumn"), render: (user) => user.fullName },
    { key: "roleCode", header: translateMessage("security.userTable.roleColumn"), render: (user) => <RoleBadge roleCode={user.roleCode} /> },
    {
      key: "stores",
      header: translateMessage("security.userTable.storesColumn"),
      isSecondary: true,
      sortValue: (user) => (user.allStores ? "" : user.storeCodes.join(", ")),
      render: (user) => (user.allStores ? translateMessage("common.allStores") : user.storeCodes.join(", ") || translateMessage("common.notAvailable")),
    },
    {
      key: "lastSignInAt",
      header: translateMessage("securityManagement.usersList.lastSignInColumn"),
      isSecondary: true,
      render: (user) => (user.lastSignInAt ? formatTimestamp(user.lastSignInAt, languageCode) : translateMessage("securityManagement.usersList.neverSignedIn")),
    },
    {
      key: "isSignedInNow",
      sortValue: (user) => (user.isSignedInNow ? 0 : 1),
      header: translateMessage("securityManagement.usersList.signedInColumn"),
      render: (user) =>
        user.isSignedInNow ? (
          <ToneBadge tone={ToneNames.success}>{translateMessage("common.yes")}</ToneBadge>
        ) : (
          <span className="text-muted-foreground">{translateMessage("common.no")}</span>
        ),
    },
    {
      key: "status",
      header: translateMessage("security.userTable.statusColumn"),
      render: (user) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusBadge statusCode={user.status} />
          {user.lockedUntil && <ToneBadge tone={ToneNames.warning}>{translateMessage("securityManagement.usersList.lockedBadge")}</ToneBadge>}
          {user.mustChangePassword && <ToneBadge tone={ToneNames.warning}>{translateMessage("common.temporaryPassword")}</ToneBadge>}
        </span>
      ),
    },
    {
      key: "actions",
      header: translateMessage("securityManagement.usersList.actionsColumn"),
      alignment: "end",
      render: (user) => {
        const isOwnAccount = session?.userId === user.id;
        return (
          <span className="inline-flex flex-wrap justify-end gap-1.5">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.USER_ACCOUNT.VIEW_USERS.EDIT)}>
              <Button type="button" variant="outline" size="sm" onClick={() => router.push(ApplicationRoutes.userEdit(user.id))}>
                {translateMessage("securityManagement.usersList.edit")}
              </Button>
              {!isOwnAccount && (
                <Button type="button" variant="outline" size="sm" onClick={() => setPartialEditUser(user)}>
                  {translateMessage("securityManagement.usersList.editPartially")}
                </Button>
              )}
            </PermissionGate>
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.USER_ACCOUNT.VIEW_USERS.DELETE)}>
              {!isOwnAccount && (
                <Button type="button" variant="destructive" size="sm" onClick={() => setUserToDelete(user)}>
                  {translateMessage("securityManagement.usersList.delete")}
                </Button>
              )}
            </PermissionGate>
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("securityManagement.usersList.title")}
        subtitle={translateMessage("securityManagement.usersList.subtitle")}
        actions={
          <PermissionGate requirement={requireAnyPermission(PermissionCodes.USER_ACCOUNT.CREATE_USER.ADD)}>
            <Link href={ApplicationRoutes.usersNew} className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              {translateMessage("securityManagement.usersList.newUser")}
            </Link>
          </PermissionGate>
        }
      />

      {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}
      {partialEditUser && (
        <PartialEditPanel
          key={partialEditUser.id}
          user={partialEditUser}
          onClose={() => setPartialEditUser(undefined)}
          onSaved={() => usersQuery.refetch()}
        />
      )}

      <SectionCard isPadded={false}>
        <div className="border-b p-4">
          <Input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={translateMessage("securityManagement.usersList.searchPlaceholder")}
            aria-label={translateMessage("securityManagement.usersList.searchPlaceholder")}
            className="max-w-sm"
          />
        </div>
        <DataGridTable
          rows={visibleUsers}
          columns={columns}
          getRowKey={(user) => user.id}
          caption={translateMessage("securityManagement.usersList.title")}
          isLoading={usersQuery.status === "loading"}
          errorMessage={usersQuery.status === "error" ? usersQuery.problem?.message : undefined}
          emptyTitle={translateMessage("security.userTable.noUsers")}
          onRowOpen={(user) => router.push(ApplicationRoutes.userEdit(user.id))}
        />
      </SectionCard>

      <ConfirmDialog
        open={userToDelete !== undefined}
        onOpenChange={(open) => !open && setUserToDelete(undefined)}
        onConfirm={handleDelete}
        isPending={isDeleting}
        titleMessageKey="securityManagement.accountActions.deleteTitle"
        descriptionMessageKey="securityManagement.accountActions.deleteText"
      />
    </div>
  );
}
