"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";

// The button that runs a filtered list or report: choosing a filter only changes the form, pressing this asks the server. It submits the form it
// is in (so Enter works too).
export function SearchButton({ isDisabled, className }: { isDisabled?: boolean; className?: string }) {
  const { translateMessage } = useTranslation();
  return (
    <Button type="submit" disabled={isDisabled} className={className}>
      <Search />
      {translateMessage("common.search")}
    </Button>
  );
}
