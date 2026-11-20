"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CreateStoreForm } from "@/components/CreateStoreForm";
import { CreateUserForm } from "@/components/CreateUserForm";
import { Notice } from "@/components/Notice";
import { Badge, Card, EmptyState, Loading, PageTitle, RoleBadge, StatusBadge, TableShell, Td, Th } from "@/components/kit";
import { clientApi } from "@/lib/client/api";
import { loadSession } from "@/lib/client/session";
import type { CreationOptions, Store, UserRow } from "@/lib/types";
import { roleLabel } from "@/lib/types";

type Detail = { stores: Store[]; users: UserRow[]; options: CreationOptions };

// One company: its stores and users, with the forms to add a store and a store manager or owner.
export default function CompanyPageWrapper() {
  return (
    <Suspense fallback={<Loading />}>
      <CompanyPage />
    </Suspense>
  );
}

function CompanyPage() {
  const params = useParams<{ id: string }>();
  const companyId = Number(params.id);
  const [detail, setDetail] = useState<Detail>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const session = await loadSession();
    if (!session || !Number.isInteger(companyId) || companyId <= 0) return;
    const token = session.token;
    const [stores, users, options] = await Promise.all([
      clientApi<Store[]>(`/platform/companies/${companyId}/stores`, { token }),
      clientApi<UserRow[]>(`/users?companyId=${companyId}`, { token }),
      clientApi<CreationOptions>(`/users/creation-options?companyId=${companyId}`, { token }),
    ]);
    const failed = [stores, users, options].find((r) => !r.ok);
    if (failed && !failed.ok) {
      setError(failed.offline ? "Platform administration needs a connection." : failed.message);
      return;
    }
    if (stores.ok && users.ok && options.ok) {
      setDetail({ stores: stores.data, users: users.data, options: options.data });
      setError(undefined);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div>
        <Link href="/platform" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          ← All companies
        </Link>
      </div>
      <PageTitle title={`Company ${companyId}`} subtitle="Stores and people of this company." />

      {error && <Notice error={error} />}
      {!error && !detail && <Loading />}

      {detail && (
        <>
          <Card title="Stores" padded={false}>
            <TableShell>
              <thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.stores.map((store) => (
                  <tr key={store.id} className="transition hover:bg-slate-50">
                    <Td strong>{store.code}</Td>
                    <Td>{store.name}</Td>
                    <Td>{store.isHeadOffice ? <Badge tone="violet">Head office</Badge> : <Badge>Store</Badge>}</Td>
                    <Td>
                      <Badge tone={store.isActive ? "green" : "red"}>{store.isActive ? "Active" : "Inactive"}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </Card>

          <Card title="Add a store" description="Each store gets its own stock, cash and sales accounts automatically.">
            <CreateStoreForm companyId={companyId} onCreated={load} />
          </Card>

          <Card title="Users" padded={false}>
            {detail.users.length === 0 ? (
              <EmptyState title="No users yet" text="Add the first one below." />
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th>Email</Th>
                    <Th>Name</Th>
                    <Th>Role</Th>
                    <Th>Stores</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detail.users.map((user) => (
                    <tr key={user.id} className="transition hover:bg-slate-50">
                      <Td strong>{user.email}</Td>
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

          <Card title="Add a user" description="Store managers and company owners. They must change the temporary password at first sign-in.">
            <CreateUserForm companyId={companyId} options={detail.options} online onCreated={load} />
          </Card>
        </>
      )}
    </>
  );
}
