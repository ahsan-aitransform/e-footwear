"use client";

import { useCallback, useEffect, useState } from "react";
import { CreateUserForm } from "@/components/CreateUserForm";
import { Notice } from "@/components/Notice";
import { Badge, Card, EmptyState, Loading, PageTitle, RoleBadge, StatusBadge, TableShell, Td, Th } from "@/components/ui";
import { loadCompanyData, type CompanyData } from "@/lib/client/companyData";
import { isCompanySession, loadSession } from "@/lib/client/session";
import { useAuthGuard } from "@/lib/client/useAuthGuard";
import { roleLabel } from "@/lib/types";

// What a company user sees: the stores they may work in, the people they may see, and the form to add users.
// The screen shows the last saved data at once, then refreshes it when the server answers.
export default function DashboardPage() {
  const guard = useAuthGuard("company");
  const [data, setData] = useState<CompanyData>();
  const [source, setSource] = useState<"server" | "cache" | "none">();
  const [message, setMessage] = useState<string>();

  const refresh = useCallback(async () => {
    const session = await loadSession();
    if (!session || !isCompanySession(session)) return;
    const result = await loadCompanyData(session);
    if (result.source === "unauthorized") {
      setMessage("Your session has ended. Sign in again.");
      return;
    }
    if (result.source === "none") {
      setSource("none");
      setMessage(result.message);
      return;
    }
    setData(result.data);
    setSource(result.source);
    setMessage(undefined);
  }, []);

  useEffect(() => {
    if (guard.status === "ready") void refresh();
  }, [guard.status, refresh]);

  if (guard.status === "loading") return <Loading />;

  const savedAt = data ? new Date(data.savedAt).toLocaleString() : "";

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Your stores and the people who work in them." />

      {source === "cache" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          You are working offline. Showing saved data from {savedAt}. It refreshes when the connection returns.
        </p>
      )}
      {source === "server" && <p className="text-xs text-slate-500">Up to date · {savedAt}</p>}
      {message && <Notice error={message} />}

      {data && (
        <>
          <Card title="Your stores" padded={false}>
            {data.stores.length === 0 ? (
              <EmptyState title="No stores yet" text="You are not assigned to any store." />
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th>Code</Th>
                    <Th>Name</Th>
                    <Th>Type</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.stores.map((store) => (
                    <tr key={store.id} className="transition hover:bg-slate-50">
                      <Td strong>{store.code}</Td>
                      <Td>{store.name}</Td>
                      <Td>{store.isHeadOffice ? <Badge tone="violet">Head office</Badge> : <Badge>Store</Badge>}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>

          <Card title="People" padded={false}>
            {data.users.length === 0 ? (
              <EmptyState title="No users to show" />
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th>Username</Th>
                    <Th>Name</Th>
                    <Th>Role</Th>
                    <Th>Stores</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.users.map((user) => (
                    <tr key={user.id} className="transition hover:bg-slate-50">
                      <Td strong>{user.username}</Td>
                      <Td>{user.fullName}</Td>
                      <Td>
                        <RoleBadge code={user.roleCode} label={roleLabel(user.roleCode)} />
                      </Td>
                      <Td>{user.allStores ? "All stores" : user.storeCodes.join(", ") || "-"}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-2">
                          <StatusBadge status={user.status} />
                          {user.mustChangePassword && <Badge tone="amber">Temporary password</Badge>}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>

          <Card title="Add a user" description="They must change the temporary password at first sign-in.">
            <CreateUserForm options={data.options} online={guard.status === "ready" && guard.online} onCreated={refresh} />
          </Card>
        </>
      )}
    </>
  );
}
