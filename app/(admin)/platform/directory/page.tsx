"use client";

import { DirectoryTree } from "@/components/DirectoryTree";
import { PageTitle } from "@/components/kit";

// One screen for the whole platform: open a company to see its stores, open a store to see its users.
export default function DirectoryPage() {
  return (
    <>
      <PageTitle title="Directory" subtitle="Companies, their stores and the people in each store." />
      <DirectoryTree />
    </>
  );
}
