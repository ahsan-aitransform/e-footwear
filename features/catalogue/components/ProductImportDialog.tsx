"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadApiFile, uploadApiFile } from "@/lib/api/fileTransfer";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { showToast } from "@/lib/toast/toastStore";
import type { ProductImportResponse } from "../types/catalogueTypes";

const TEMPLATE_FILE_NAME = "new-products-template.xlsx";

// "Upload Excel" of New Product: download the template, check a filled file (every problem is listed with its row), then create all its
// products at once. Nothing is created while the file has a problem.
export function ProductImportDialog({ onImported }: Readonly<{ onImported: () => void }>) {
  const { translateMessage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProductImportResponse>();
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();

  function forget() {
    setResult(undefined);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
  }

  async function send(path: string) {
    if (!file) return;
    forget();
    setIsWorking(true);
    const answer = await uploadApiFile<ProductImportResponse>(path, file, "POST");
    setIsWorking(false);
    if (!answer.ok) return setErrorMessage(answer.problem.message);
    const created = answer.data.createdProductCount;
    if (created === 0) return setResult(answer.data);
    const message = translateMessage("catalogue.import.created", { count: created });
    setSuccessMessage(message);
    showToast(message, ToneNames.success);
    setFile(null);
    onImported();
  }

  async function downloadTemplate() {
    setErrorMessage(undefined);
    if (!(await downloadApiFile(ApiEndpoints.products.importTemplate, TEMPLATE_FILE_NAME))) setErrorMessage(translateMessage("catalogue.import.templateFailed"));
  }

  const problems = result?.problems ?? [];
  const isReady = result !== undefined && problems.length === 0 && result.products.length > 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setFile(null);
          forget();
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <FileSpreadsheet />
        {translateMessage("catalogue.import.button")}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{translateMessage("catalogue.import.title")}</DialogTitle>
          <DialogDescription>{translateMessage("catalogue.import.description")}</DialogDescription>
        </DialogHeader>
        <Button type="button" variant="outline" className="justify-self-start" onClick={downloadTemplate}>
          <Download />
          {translateMessage("catalogue.import.template")}
        </Button>
        {/* a new element after an import, so that the same file name can be chosen again */}
        <FormField key={successMessage ?? ""} label={translateMessage("catalogue.import.file")} name="catalogueProductImportFile">
          {(controlProps) => (
            <Input
              {...controlProps}
              type="file"
              accept=".xlsx,.csv"
              onChange={(event) => {
                forget();
                setFile(event.target.files?.[0] ?? null);
              }}
            />
          )}
        </FormField>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={!file || isWorking} onClick={() => send(ApiEndpoints.products.importPreview)}>
            {translateMessage("catalogue.import.check")}
          </Button>
          {isReady && (
            <Button type="button" disabled={isWorking} onClick={() => send(ApiEndpoints.products.import)}>
              {translateMessage("catalogue.import.create", { count: result.products.length })}
            </Button>
          )}
        </div>
        <FormResultNotice errorMessage={errorMessage} successMessage={successMessage} />
        {isReady && (
          <>
            <InlineNotice tone={ToneNames.info}>
              {translateMessage("catalogue.import.ready", { products: result.products.length, sizes: result.products.reduce((total, product) => total + product.sizeCount, 0) })}
            </InlineNotice>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translateMessage("catalogue.field.productName")}</TableHead>
                  <TableHead>{translateMessage("catalogue.field.category")}</TableHead>
                  <TableHead className="text-end">{translateMessage("catalogue.import.sizes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.products.map((product) => (
                  <TableRow key={product.name}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.categoryName}</TableCell>
                    <TableCell className="text-end tabular-nums">{product.sizeCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        {problems.length > 0 && (
          <>
            <InlineNotice tone={ToneNames.warning}>{translateMessage("catalogue.import.hasProblems", { count: problems.length })}</InlineNotice>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translateMessage("catalogue.import.row")}</TableHead>
                  <TableHead>{translateMessage("catalogue.field.productName")}</TableHead>
                  <TableHead>{translateMessage("catalogue.field.size")}</TableHead>
                  <TableHead>{translateMessage("catalogue.import.problem")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {problems.map((problem, index) => (
                  <TableRow key={`${problem.rowNumber}-${index}`}>
                    <TableCell className="tabular-nums">{problem.rowNumber}</TableCell>
                    <TableCell>{problem.productName}</TableCell>
                    <TableCell>{problem.sizeCode}</TableCell>
                    <TableCell className="whitespace-normal">{problem.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
