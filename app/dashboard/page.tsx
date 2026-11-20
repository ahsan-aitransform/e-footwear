"use client";

import { useCallback, useEffect, useState } from "react";
import { CreateUserForm } from "@/components/CreateUserForm";
import { Notice } from "@/components/Notice";
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

  if (guard.status === "loading") return <p className="text-sm text-zinc-500">Loading...</p>;

  const savedAt = data ? new Date(data.savedAt).toLocaleString() : "";

  return (
    <>
      <p className="text-sm text-zinc-600">
        {source === "server" && `Up to date (${savedAt}).`}
        {source === "cache" && `Showing saved data from ${savedAt}. It will refresh when you are online.`}
        {source === "none" && "No saved data yet."}
      </p>
      {message && <Notice error={message} />}

      {data && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900">Your stores</h2>
            {data.stores.length === 0 ? (
              <p className="text-sm text-zinc-600">You are not assigned to any store yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                  <thead className="bg-zinc-50 text-left text-zinc-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Code</th>
                      <th className="px-4 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.stores.map((store) => (
                      <tr key={store.id}>
                        <td className="px-4 py-2">{store.code}</td>
                        <td className="px-4 py-2">{store.name}</td>
                        <td className="px-4 py-2">{store.isHeadOffice ? "Head office" : "Store"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900">Users</h2>
            {data.users.length === 0 ? (
              <p className="text-sm text-zinc-600">No users to show.</p>
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
                    {data.users.map((user) => (
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
          </section>

          <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-900">Add a user</h2>
            <CreateUserForm options={data.options} online={guard.status === "ready" && guard.online} onCreated={refresh} />
          </section>
        </>
      )}
    </>
  );
}
