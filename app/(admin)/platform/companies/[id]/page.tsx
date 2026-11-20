"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CreateStoreForm } from "@/components/CreateStoreForm";
import { CreateUserForm } from "@/components/CreateUserForm";
import { Notice } from "@/components/Notice";
import { clientApi } from "@/lib/client/api";
import { loadSession } from "@/lib/client/session";
import type { CreationOptions, Store, UserRow } from "@/lib/types";
import { roleLabel } from "@/lib/types";

type Detail = { stores: Store[]; users: UserRow[]; options: CreationOptions };

// One company: its stores and users, with the forms to add a store and a store manager or owner.
export default function CompanyPage() {
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
        <Link href="/platform" className="text-sm underline">
          ← All companies
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900">Company {companyId}</h2>
      </div>

      {error && <Notice error={error} />}
      {!error && !detail && <p className="text-sm text-zinc-500">Loading...</p>}

      {detail && (
        <>
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-zinc-900">Stores</h3>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Code</th>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {detail.stores.map((store) => (
                    <tr key={store.id}>
                      <td className="px-4 py-2">{store.code}</td>
                      <td className="px-4 py-2">{store.name}</td>
                      <td className="px-4 py-2">{store.isHeadOffice ? "Head office" : "Store"}</td>
                      <td className="px-4 py-2">{store.isActive ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h4 className="mb-3 font-medium text-zinc-900">Add a store</h4>
              <CreateStoreForm companyId={companyId} onCreated={load} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-zinc-900">Users</h3>
            {detail.users.length === 0 ? (
              <p className="text-sm text-zinc-600">No users yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                  <thead className="bg-zinc-50 text-left text-zinc-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Username</th>
                      <th className="px-4 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Role</th>
                      <th className="px-4 py-2 font-medium">Stores</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {detail.users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-2">{user.username}</td>
                        <td className="px-4 py-2">{user.fullName}</td>
                        <td className="px-4 py-2">{roleLabel(user.roleCode)}</td>
                        <td className="px-4 py-2">{user.allStores ? "All stores" : user.storeCodes.join(", ") || "-"}</td>
                        <td className="px-4 py-2">
                          {user.status}
                          {user.mustChangePassword && <span className="ml-2 text-xs text-amber-700">temporary password</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
              <h4 className="mb-3 font-medium text-zinc-900">Add a user</h4>
              <CreateUserForm companyId={companyId} options={detail.options} online onCreated={load} />
            </div>
          </section>
        </>
      )}
    </>
  );
}
