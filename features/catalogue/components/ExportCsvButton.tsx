"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { showToast } from "@/lib/toast/toastStore";
import { buildCsvText, downloadCsvFile, type CsvCell } from "../logic/csvExport";

// The Export button of a report (shown only to people with the Export permission of the screen). `loadTable` returns the
// header and the rows to write, or a message when they could not be read.
export function ExportCsvButton({
  fileName,
  loadTable,
}: {
  fileName: string;
  loadTable: () => Promise<{ headers: string[]; rows: CsvCell[][] } | { errorMessage: string }>;
}) {
  const { translateMessage } = useTranslation();
  const [isWorking, setIsWorking] = useState(false);

  async function handleClick() {
    setIsWorking(true);
    const table = await loadTable();
    setIsWorking(false);
    if ("errorMessage" in table) return showToast(table.errorMessage, ToneNames.danger);
    downloadCsvFile(fileName, buildCsvText(table.headers, table.rows));
  }

  return (
    <Button type="button" variant="outline" className="print:hidden" disabled={isWorking} onClick={handleClick}>
      {isWorking ? <Loader2 className="animate-spin" /> : <Download />}
      {translateMessage("catalogue.action.export")}
    </Button>
  );
}
