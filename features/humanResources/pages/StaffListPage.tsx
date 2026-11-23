"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StoreFilterSelect } from "@/features/payroll/components/StoreFilterSelect";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { StaffListItemResponse } from "../types/staffTypes";

// Staff: everyone who works in the stores the person may use, with the store, designation and basic pay. A person is added as a party of type Staff (New Party);
// opening a row shows their pay terms, salary history and store history. Former staff (who have a leaving date in the past) are hidden unless asked for.
export function StaffListPage() {
  const { translateMessage } = useTranslation();
  const router = useRouter();
  const [storeId, setStoreId] = useState("");
  const [includeFormerStaff, setIncludeFormerStaff] = useState(false);

  const columns = useMemo<DataGridColumn<StaffListItemResponse>[]>(
    () => [
      { key: "code", header: translateMessage("humanResources.staff.column.code"), isSortable: true, render: (staff) => <span dir="ltr">{staff.code}</span> },
      { key: "name", header: translateMessage("humanResources.staff.column.name"), isSortable: true, render: (staff) => staff.name },
      { key: "designation", header: translateMessage("humanResources.staff.column.designation"), isSortable: true, isSecondary: true, render: (staff) => staff.designation ?? "" },
      { key: "store", header: translateMessage("humanResources.staff.column.store"), isSortable: true, render: (staff) => staff.currentStoreName },
      { key: "salary", header: translateMessage("humanResources.staff.column.baseSalary"), isSortable: true, alignment: "end", render: (staff) => <span dir="ltr">{formatWholeRupees(staff.baseSalary, { withSymbol: false })}</span> },
      { key: "payFrequency", header: translateMessage("humanResources.staff.column.payFrequency"), isSecondary: true, render: (staff) => translateMessage(`humanResources.payFrequency.${staff.payFrequencyCode}`) },
      { key: "joinedOn", header: translateMessage("humanResources.staff.column.joinedOn"), isSecondary: true, render: (staff) => <span dir="ltr">{staff.joinedOn ?? ""}</span> },
      {
        key: "status",
        header: translateMessage("humanResources.staff.column.status"),
        render: (staff) =>
          staff.leftOn ? (
            <ToneBadge tone={ToneNames.neutral}>{translateMessage("humanResources.staff.status.former")}</ToneBadge>
          ) : (
            <ToneBadge tone={ToneNames.success}>{translateMessage("humanResources.staff.status.current")}</ToneBadge>
          ),
      },
    ],
    [translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("humanResources.staff.title")}
        subtitle={translateMessage("humanResources.staff.subtitle")}
        actions={
          <PermissionGate requirement={requireAnyPermission(PermissionCodes.PARTY.NEW_PARTY.ADD)}>
            <Link href={ApplicationRoutes.newParty} className={buttonVariants()}>
              <UserPlus />
              {translateMessage("humanResources.staff.addStaff")}
            </Link>
          </PermissionGate>
        }
      />
      <SectionCard>
        <div className="grid items-end gap-4 sm:grid-cols-3">
          <StoreFilterSelect
            name="staff-store"
            label={translateMessage("humanResources.staff.filter.store")}
            allStoresLabel={translateMessage("humanResources.staff.filter.allStores")}
            storeId={storeId}
            onStoreIdChange={setStoreId}
          />
          <div className="flex items-center gap-2 pb-2">
            <Switch id="staff-show-former" checked={includeFormerStaff} onCheckedChange={setIncludeFormerStaff} />
            <Label htmlFor="staff-show-former">{translateMessage("humanResources.staff.filter.showFormer")}</Label>
          </div>
        </div>
      </SectionCard>
      <SectionCard isPadded={false}>
        <ServerPaginatedDataGrid<StaffListItemResponse>
          path={ApiEndpoints.staff.list}
          columns={columns}
          getRowKey={(staff) => staff.partyId}
          caption={translateMessage("humanResources.staff.title")}
          emptyTitle={translateMessage("humanResources.staff.empty.title")}
          emptyText={translateMessage("humanResources.staff.empty.text")}
          filters={{ storeId: storeId || undefined, includeFormerStaff: includeFormerStaff || undefined }}
          searchPlaceholder={translateMessage("humanResources.staff.searchPlaceholder")}
          onRowOpen={(staff) => router.push(ApplicationRoutes.staffDetail(staff.partyId))}
          offlineCacheName="staffList"
        />
      </SectionCard>
    </div>
  );
}
