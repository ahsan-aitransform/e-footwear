"use client";

import { RoleBadge } from "@/components/feedback/RoleBadge";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { UserListItemResponse } from "@/lib/types/user";

// The people of a company or store. "company" lists everyone with their stores; "store" is used inside one store of the
// platform directory (the stores column then shows only the person's other stores).
export function UserListTable({
  users,
  caption,
  variant = "company",
}: {
  users: readonly UserListItemResponse[];
  caption: string;
  variant?: "company" | "store";
}) {
  const { translateMessage } = useTranslation();

  const statusColumn: DataGridColumn<UserListItemResponse> = {
    key: "status",
    header: translateMessage("security.userTable.statusColumn"),
    render: (user) => (
      <span className="inline-flex items-center gap-2">
        <StatusBadge statusCode={user.status} />
        {user.mustChangePassword && <ToneBadge tone={ToneNames.warning}>{translateMessage("common.temporaryPassword")}</ToneBadge>}
      </span>
    ),
  };

  const columns: DataGridColumn<UserListItemResponse>[] =
    variant === "company"
      ? [
          { key: "email", header: translateMessage("security.userTable.emailColumn"), render: (user) => <strong>{user.email}</strong> },
          { key: "fullName", header: translateMessage("security.userTable.nameColumn"), render: (user) => user.fullName },
          { key: "roleCode", header: translateMessage("security.userTable.roleColumn"), render: (user) => <RoleBadge roleCode={user.roleCode} /> },
          {
            key: "stores",
            header: translateMessage("security.userTable.storesColumn"),
            render: (user) =>
              user.allStores ? translateMessage("common.allStores") : user.storeCodes.join(", ") || translateMessage("common.notAvailable"),
          },
          statusColumn,
        ]
      : [
          { key: "fullName", header: translateMessage("security.userTable.nameColumn"), render: (user) => <strong>{user.fullName}</strong> },
          { key: "email", header: translateMessage("security.userTable.emailColumn"), render: (user) => user.email },
          { key: "roleCode", header: translateMessage("security.userTable.roleColumn"), render: (user) => <RoleBadge roleCode={user.roleCode} /> },
          {
            key: "otherStores",
            header: translateMessage("security.userTable.otherStoresColumn"),
            render: (user) => user.storeCodes.join(", "),
            isSecondary: true,
          },
          statusColumn,
        ];

  return (
    <DataGridTable
      rows={users}
      columns={columns}
      getRowKey={(user) => user.id}
      caption={caption}
      emptyTitle={translateMessage("security.userTable.noUsers")}
    />
  );
}
