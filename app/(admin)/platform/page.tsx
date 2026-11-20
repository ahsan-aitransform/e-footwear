"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CreateCompanyForm } from "@/components/CreateCompanyForm";
import { Notice } from "@/components/Notice";
import { clientApi } from "@/lib/client/api";
import { loadSession } from "@/lib/client/session";
import type { Company } from "@/lib/types";

// All companies, and the form that registers a new one with its first store and owner.
export default function PlatformPage() {
  const [companies, setCompanies] = useState<Company[]>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const session = await loadSession();
    if (!session) return;
    const result = await clientApi<Company[]>("/platform/companies", { token: session.token });
    if (result.ok) {
      setCompanies(result.data);
      setError(undefined);
    } else {
      setError(result.offline ? "Platform administration needs a connection." : result.message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Companies</h2>
        {error && <Notice error={error} />}
        {!error && companies === undefined && <p className="text-sm text-zinc-500">Loading...</p>}
        {companies && companies.length === 0 && <p className="text-sm text-zinc-600">No companies yet.</p>}
        {companies && companies.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Id</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Time zone</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2">{company.id}</td>
                    <td className="px-4 py-2">
                      <Link href={`/platform/companies/${company.id}`} className="font-medium underline">
                        {company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{company.status}</td>
                    <td className="px-4 py-2">{company.timezone}</td>
                    <td className="px-4 py-2">{company.createdAt.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Register a company</h2>
        <p className="text-sm text-zinc-600">
          Creates the company, its first store and its owner. The owner signs in with the temporary password you set.
        </p>
        <CreateCompanyForm />
      </section>
    </>
  );
}
