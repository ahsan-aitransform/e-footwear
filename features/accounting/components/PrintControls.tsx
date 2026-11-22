"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useCurrentSession } from "@/lib/session/useSessionState";
import { todayAsIsoDate } from "../logic/reportDates";

// The Print button of a report (docx: every report prints). It uses the browser's print dialog, which also saves a PDF; the menu, the top bar
// and the filter forms carry print:hidden and stay off the page. Shown only to people with the Print permission of the screen.
export function PrintButton({ label }: { label?: string }) {
  const { translateMessage } = useTranslation();
  return (
    <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}>
      <Printer />
      {label ?? translateMessage("accounting.common.print")}
    </Button>
  );
}

// The heading that exists only on paper: what the report is, and for which company and day it was printed.
export function PrintedReportHeading({ title }: { title: string }) {
  const { translateMessage } = useTranslation();
  const session = useCurrentSession();
  return (
    <div className="hidden space-y-1 border-b pb-3 print:block">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">
        {translateMessage("accounting.common.printedFor", { company: session?.companyName ?? "", date: todayAsIsoDate() })}
      </p>
    </div>
  );
}
