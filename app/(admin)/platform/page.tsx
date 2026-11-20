"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CreateCompanyForm } from "@/components/CreateCompanyForm";
import { Notice } from "@/components/Notice";
import { Badge, Card, EmptyState, Loading, PageTitle, TableShell, Td, Th } from "@/components/kit";
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
      <PageTitle title="Companies" subtitle="Every business registered on the platform." />

      <Card padded={false}>
        {error && (
          <div className="p-5">
            <Notice error={error} />
          </div>
        )}
        {!error && companies === undefined && (
          <div className="px-6">
            <Loading />
          </div>
        )}
        {companies && companies.length === 0 && (
          <EmptyState title="No companies yet" text="Register the first one below." />
        )}
        {companies && companies.length > 0 && (
          <TableShell>
            <thead>
              <tr>
                <Th>Id</Th>
                <Th>Company</Th>
                <Th>Status</Th>
                <Th>Time zone</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => (
                <tr key={company.id} className="transition hover:bg-slate-50">
                  <Td>{company.id}</Td>
                  <Td strong>
                    <Link href={`/platform/companies/${company.id}`} className="text-indigo-600 hover:text-indigo-500">
                      {company.name}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={company.status === "ACTIVE" ? "green" : "amber"}>{company.status.toLowerCase()}</Badge>
                  </Td>
                  <Td>{company.timezone}</Td>
                  <Td>{company.createdAt.slice(0, 10)}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <Card
        title="Register a company"
        description="Creates the company, its first store and its owner. The owner signs in with the temporary password you set."
      >
        <CreateCompanyForm />
      </Card>
    </>
  );
}
