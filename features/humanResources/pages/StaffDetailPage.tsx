"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, Pencil } from "lucide-react";
import { useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { isUuid } from "@/lib/validation/isUuid";
import { StaffTransferDialog } from "../components/StaffTransferDialog";
import { SalaryTermsForm } from "../components/SalaryTermsForm";
import type { SalaryTermResponse, StaffDetailResponse, StaffTransferHistoryItemResponse } from "../types/staffTypes";

function formatTimestamp(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 16).replace("T", " ");
}

// One staff member: profile and pay terms, the salary history (every change of pay, with who made it) and the store history (every move between stores).
// The profile itself (name, designation, joining date) is edited with Edit Staff; the pay terms are edited here.
export function StaffDetailPage({ staffId }: { staffId: string }) {
  const { translateMessage } = useTranslation();
  // A route parameter that is not a UUID is refused before any request is made (decision D-006).
  if (!isUuid(staffId)) return <InlineNotice tone={ToneNames.danger}>{translateMessage("humanResources.detail.notFound")}</InlineNotice>;
  return <StaffDetailContent staffId={staffId} />;
}

function StaffDetailContent({ staffId }: { staffId: string }) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const detail = useApiQuery<StaffDetailResponse>(ApiEndpoints.staff.byId(staffId));
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const mayEditSalary = hasPermission(PermissionCodes.HUMAN_RESOURCES.SALARY_TERMS.EDIT);
  const mayTransfer = hasPermission(PermissionCodes.HUMAN_RESOURCES.STAFF_TRANSFERS.ADD);
  const mayOpenStaff = hasPermission(PermissionCodes.HUMAN_RESOURCES.NEW_STAFF.VIEW);

  const salaryColumns: DataGridColumn<SalaryTermResponse>[] = [
    { key: "effectiveFrom", header: translateMessage("humanResources.salaryHistory.column.effectiveFrom"), render: (term) => <span dir="ltr">{term.effectiveFrom}</span> },
    { key: "baseSalary", header: translateMessage("humanResources.salaryHistory.column.baseSalary"), alignment: "end", render: (term) => <span dir="ltr">{formatWholeRupees(term.baseSalary, { withSymbol: false })}</span> },
    { key: "payFrequency", header: translateMessage("humanResources.salaryHistory.column.payFrequency"), render: (term) => translateMessage(`humanResources.payFrequency.${term.payFrequencyCode}`) },
    { key: "changedBy", header: translateMessage("humanResources.salaryHistory.column.changedBy"), isSecondary: true, render: (term) => term.changedByName ?? translateMessage("humanResources.storeHistory.unknownUser") },
    { key: "changedAt", header: translateMessage("humanResources.salaryHistory.column.changedAt"), isSecondary: true, render: (term) => <span dir="ltr">{formatTimestamp(term.changedAt)}</span> },
  ];

  const storeColumns: DataGridColumn<StaffTransferHistoryItemResponse>[] = [
    { key: "effectiveOn", header: translateMessage("humanResources.storeHistory.column.effectiveOn"), render: (move) => <span dir="ltr">{move.effectiveOn}</span> },
    { key: "fromStore", header: translateMessage("humanResources.storeHistory.column.fromStore"), render: (move) => move.fromStoreName ?? translateMessage("humanResources.storeHistory.firstAssignment") },
    { key: "toStore", header: translateMessage("humanResources.storeHistory.column.toStore"), render: (move) => move.toStoreName },
    { key: "authorisedBy", header: translateMessage("humanResources.storeHistory.column.authorisedBy"), isSecondary: true, render: (move) => move.changedByName ?? translateMessage("humanResources.storeHistory.unknownUser") },
    { key: "recordedAt", header: translateMessage("humanResources.storeHistory.column.recordedAt"), isSecondary: true, render: (move) => <span dir="ltr">{formatTimestamp(move.changedAt)}</span> },
  ];

  const backLink = (
    <Link href={ApplicationRoutes.staffList} className={buttonVariants({ variant: "outline" })}>
      <ArrowLeft className="rtl:rotate-180" />
      {translateMessage("humanResources.detail.back")}
    </Link>
  );

  if (detail.status === "loading") return <LoadingIndicator />;
  if (detail.status === "error" || !detail.data) {
    return (
      <div className="space-y-4">
        <PageHeader title={translateMessage("humanResources.staff.title")} actions={backLink} />
        <InlineNotice tone={ToneNames.danger}>{translateMessage("humanResources.detail.notFound")}</InlineNotice>
      </div>
    );
  }

  const staff = detail.data;
  const profile = staff.profile;
  const payFrequencyLabel = translateMessage(`humanResources.payFrequency.${profile.payFrequencyCode}`);
  const yesNo = (value: boolean) => translateMessage(value ? "humanResources.detail.yes" : "humanResources.detail.no");
  const profileFields: { label: string; value: string }[] = [
    { label: translateMessage("humanResources.detail.field.designation"), value: profile.designation ?? translateMessage("humanResources.detail.notSet") },
    { label: translateMessage("humanResources.detail.field.isManager"), value: yesNo(profile.isManager) },
    { label: translateMessage("humanResources.detail.field.store"), value: profile.currentStoreName },
    { label: translateMessage("humanResources.detail.field.joinedOn"), value: profile.joinedOn ?? translateMessage("humanResources.detail.notSet") },
    { label: translateMessage("humanResources.detail.field.leftOn"), value: profile.leftOn ?? translateMessage("humanResources.detail.notSet") },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${profile.name} (${profile.code})`}
        subtitle={[profile.currentStoreName, formatWholeRupees(profile.baseSalary), payFrequencyLabel].join(", ")}
        actions={
          <div className="flex flex-wrap gap-2">
            {mayOpenStaff && (
              <Link href={ApplicationRoutes.editStaffMember(profile.staffId)} className={buttonVariants({ variant: "outline" })}>
                <Pencil />
                {translateMessage("humanResources.detail.editStaff")}
              </Link>
            )}
            {backLink}
          </div>
        }
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{translateMessage("humanResources.detail.tab.profile")}</TabsTrigger>
          <TabsTrigger value="salaryHistory">{translateMessage("humanResources.detail.tab.salaryHistory")}</TabsTrigger>
          <TabsTrigger value="storeHistory">{translateMessage("humanResources.detail.tab.storeHistory")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <SectionCard>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profileFields.map((field) => (
                <div key={field.label}>
                  <dt className="text-xs text-muted-foreground">{field.label}</dt>
                  <dd className="text-sm font-medium">{field.value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
          <SectionCard title={translateMessage("humanResources.salaryTerms.title")} description={translateMessage("humanResources.salaryTerms.description")}>
            <SalaryTermsForm key={staff.rowVersion} detail={staff} isEditable={mayEditSalary} onSaved={detail.refetch} onConflict={detail.refetch} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="salaryHistory">
          <SectionCard isPadded={false}>
            <DataGridTable
              rows={staff.salaryTerms}
              columns={salaryColumns}
              getRowKey={(term) => term.id}
              caption={translateMessage("humanResources.detail.tab.salaryHistory")}
              emptyTitle={translateMessage("humanResources.salaryHistory.empty.title")}
              emptyText={translateMessage("humanResources.salaryHistory.empty.text")}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="storeHistory" className="space-y-4">
          {mayTransfer && (
            <div className="flex justify-end">
              <Button type="button" onClick={() => setIsTransferOpen(true)}>
                <ArrowRightLeft />
                {translateMessage("humanResources.transfer.button")}
              </Button>
            </div>
          )}
          <SectionCard isPadded={false}>
            <DataGridTable
              rows={staff.transferHistory}
              columns={storeColumns}
              getRowKey={(move) => move.id}
              caption={translateMessage("humanResources.detail.tab.storeHistory")}
              emptyTitle={translateMessage("humanResources.storeHistory.empty.title")}
            />
          </SectionCard>
        </TabsContent>
      </Tabs>

      {isTransferOpen && (
        <StaffTransferDialog
          fixedStaff={{ staffId: profile.staffId, name: profile.name, currentStoreId: profile.currentStoreId }}
          onClose={() => setIsTransferOpen(false)}
          onTransferred={() => {
            setIsTransferOpen(false);
            detail.refetch();
          }}
        />
      )}
    </div>
  );
}
