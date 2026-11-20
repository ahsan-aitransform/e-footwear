"use client";

import { Building2, ChevronRight, Store as StoreIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clientApi } from "@/lib/client/api";
import { loadSession } from "@/lib/client/session";
import type { Company, Store, UserRow } from "@/lib/types";
import { roleLabel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Notice } from "./Notice";
import { Loading } from "./kit";

type Detail = { stores: Store[]; users: UserRow[] };

// Platform administrator's directory: companies, each opening to its stores, each store opening to its users.
// A company's stores and users load when it is first opened, so the page stays fast with many companies.
export function DirectoryTree() {
  const [companies, setCompanies] = useState<Company[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (!session) return;
      const result = await clientApi<Company[]>("/platform/companies", { token: session.token });
      if (result.ok) setCompanies(result.data);
      else setError(result.offline ? "The directory needs a connection." : result.message);
    })();
  }, []);

  if (error) return <Notice error={error} />;
  if (!companies) return <Loading />;
  if (companies.length === 0) return <p className="text-sm text-muted-foreground">No companies yet.</p>;

  return (
    <ul className="space-y-3">
      {companies.map((company) => (
        <li key={company.id}>
          <CompanyNode company={company} />
        </li>
      ))}
    </ul>
  );
}

function CompanyNode({ company }: { company: Company }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Detail>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const session = await loadSession();
    if (!session) return;
    const [stores, users] = await Promise.all([
      clientApi<Store[]>(`/platform/companies/${company.id}/stores`, { token: session.token }),
      clientApi<UserRow[]>(`/users?companyId=${company.id}`, { token: session.token }),
    ]);
    if (stores.ok && users.ok) setDetail({ stores: stores.data, users: users.data });
    else {
      const failed = !stores.ok ? stores : !users.ok ? users : undefined;
      setError(failed && !failed.ok ? failed.message : "Could not load this company.");
    }
  }, [company.id]);

  function toggle(next: boolean) {
    setOpen(next);
    if (next && !detail) void load();
  }

  const owners = detail?.users.filter((u) => u.allStores) ?? [];
  const stores = detail?.stores.filter((s) => !s.isHeadOffice) ?? [];

  return (
    <Collapsible open={open} onOpenChange={toggle} className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/60">
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <Building2 className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate font-medium">{company.name}</span>
        <span className="text-xs text-muted-foreground">#{company.id}</span>
        <Badge variant={company.status === "ACTIVE" ? "secondary" : "destructive"}>{company.status.toLowerCase()}</Badge>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-3 border-t bg-muted/30 px-4 py-4">
          {error && <Notice error={error} />}
          {!error && !detail && <Loading />}

          {detail && (
            <>
              {owners.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Company owner
                  </p>
                  <UsersTable users={owners} showStores={false} />
                </div>
              )}

              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Stores ({stores.length})
              </p>
              {stores.length === 0 && <p className="text-sm text-muted-foreground">No stores yet.</p>}
              <ul className="space-y-2">
                {stores.map((store) => (
                  <li key={store.id}>
                    <StoreNode store={store} users={detail.users.filter((u) => u.storeIds.includes(store.id))} />
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

function StoreNode({ store, users }: { store: Store; users: UserRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="overflow-hidden rounded-lg border bg-card">
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60">
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {store.name} <span className="font-normal text-muted-foreground">({store.code})</span>
        </span>
        {!store.isActive && <Badge variant="destructive">inactive</Badge>}
        <span className="text-xs text-muted-foreground">
          {users.length} {users.length === 1 ? "user" : "users"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t">
          {users.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">No users in this store yet.</p>
          ) : (
            <UsersTable users={users} showStores />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function UsersTable({ users, showStores }: { users: UserRow[]; showStores: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            {showStores && <TableHead>Other stores</TableHead>}
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.fullName}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{roleLabel(u.roleCode)}</Badge>
              </TableCell>
              {showStores && <TableCell className="text-muted-foreground">{u.storeCodes.join(", ")}</TableCell>}
              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <Badge variant={u.status === "ACTIVE" ? "secondary" : "destructive"}>{u.status.toLowerCase()}</Badge>
                  {u.mustChangePassword && <Badge variant="outline">temporary password</Badge>}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
