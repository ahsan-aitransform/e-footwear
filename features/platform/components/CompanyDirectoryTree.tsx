"use client";

import { Building2, ChevronRight, Store as StoreIcon } from "lucide-react";
import { useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UserListTable } from "@/features/security/components/UserListTable";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CompanySummaryResponse } from "@/lib/types/company";
import type { StoreSummaryResponse } from "@/lib/types/store";
import type { UserListItemResponse } from "@/lib/types/user";
import { cn } from "@/lib/utils";

// The platform administrator's directory: companies, each opening to its stores, each store opening to its users.
// A company's stores and users load when it is first opened, so the page stays fast with many companies.
export function CompanyDirectoryTree() {
  const { translateMessage } = useTranslation();
  const companies = useApiQuery<CompanySummaryResponse[]>(ApiEndpoints.platformCompanies.list);

  if (companies.status === "error") {
    return (
      <InlineNotice>
        {companies.isOffline ? translateMessage("platform.directory.needsConnection") : companies.problem?.message}
      </InlineNotice>
    );
  }
  if (companies.status === "loading") return <LoadingIndicator />;
  if (!companies.data || companies.data.length === 0) {
    return <p className="text-sm text-muted-foreground">{translateMessage("platform.directory.noCompanies")}</p>;
  }

  return (
    <ul className="space-y-3">
      {companies.data.map((company) => (
        <li key={company.id}>
          <CompanyNode company={company} />
        </li>
      ))}
    </ul>
  );
}

function CompanyNode({ company }: { company: CompanySummaryResponse }) {
  const { translateMessage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const stores = useApiQuery<StoreSummaryResponse[]>(ApiEndpoints.platformCompanies.storesOfCompany(company.id), {
    enabled: isOpen,
  });
  const users = useApiQuery<UserListItemResponse[]>(ApiEndpoints.users.list, {
    query: { companyId: company.id },
    enabled: isOpen,
  });

  const failed = stores.status === "error" ? stores : users.status === "error" ? users : undefined;
  const isLoaded = stores.status === "success" && users.status === "success";
  const owners = users.data?.filter((user) => user.allStores) ?? [];
  const sellingStores = stores.data?.filter((store) => !store.isHeadOffice) ?? [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3.5 text-start hover:bg-muted/60">
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform rtl:rotate-180", isOpen && "rotate-90 rtl:rotate-90")} />
        <Building2 className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate font-medium">{company.name}</span>
        <span className="text-xs text-muted-foreground">{company.id.slice(0, 8)}</span>
        <StatusBadge statusCode={company.status} />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-3 border-t bg-muted/30 px-4 py-4">
          {failed && <InlineNotice>{failed.problem?.message ?? translateMessage("platform.directory.loadFailed")}</InlineNotice>}
          {!failed && !isLoaded && <LoadingIndicator />}

          {isLoaded && (
            <>
              {owners.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {translateMessage("platform.directory.ownerHeading")}
                  </p>
                  <UserListTable users={owners} caption={translateMessage("platform.directory.ownerHeading")} variant="store" />
                </div>
              )}

              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {translateMessage("platform.directory.storesHeading", { count: sellingStores.length })}
              </p>
              {sellingStores.length === 0 && (
                <p className="text-sm text-muted-foreground">{translateMessage("platform.directory.noStores")}</p>
              )}
              <ul className="space-y-2">
                {sellingStores.map((store) => (
                  <li key={store.id}>
                    <StoreNode store={store} users={(users.data ?? []).filter((user) => user.storeIds.includes(store.id))} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function StoreNode({ store, users }: { store: StoreSummaryResponse; users: UserListItemResponse[] }) {
  const { translateMessage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="overflow-hidden rounded-lg border bg-card">
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-3 py-2.5 text-start hover:bg-muted/60">
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform rtl:rotate-180", isOpen && "rotate-90 rtl:rotate-90")} />
        <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {store.name} <span className="font-normal text-muted-foreground">({store.code})</span>
        </span>
        {!store.isActive && <ToneBadge tone={ToneNames.danger}>{translateMessage("platform.directory.inactive")}</ToneBadge>}
        <span className="text-xs text-muted-foreground">
          {translateMessage(users.length === 1 ? "platform.directory.oneUser" : "platform.directory.manyUsers", {
            count: users.length,
          })}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t">
          {users.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">{translateMessage("platform.directory.noUsersInStore")}</p>
          ) : (
            <UserListTable users={users} caption={store.name} variant="store" />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
