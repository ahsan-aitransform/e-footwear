"use client";

import { ImageOff, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { fetchApiImageObjectUrl, uploadApiFile } from "@/lib/api/fileTransfer";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CatalogueLimits } from "../logic/catalogueLimits";
import type { ProductImageResponse } from "../types/catalogueTypes";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

function ProductImageSlot({
  productId,
  slot,
  hasImage,
  canEdit,
  onChanged,
}: {
  productId: string;
  slot: number;
  hasImage: boolean;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const { translateMessage } = useTranslation();
  const fileInputReference = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    if (!hasImage) return;
    let isCancelled = false;
    fetchApiImageObjectUrl(ApiEndpoints.products.image(productId, slot)).then((url) => {
      if (isCancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      setImageUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
    });
    return () => {
      isCancelled = true;
    };
  }, [productId, slot, hasImage]);

  async function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setErrorMessage(undefined);
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      input.value = "";
      return setErrorMessage(translateMessage("catalogue.images.wrongType"));
    }
    if (file.size > CatalogueLimits.imageMaximumSizeBytes) {
      input.value = "";
      return setErrorMessage(translateMessage("catalogue.images.tooLarge", { maximumMegabytes: CatalogueLimits.imageMaximumSizeBytes / (1024 * 1024) }));
    }
    setIsWorking(true);
    const result = await uploadApiFile<ProductImageResponse>(ApiEndpoints.products.image(productId, slot), file);
    setIsWorking(false);
    input.value = "";
    if (!result.ok) return setErrorMessage(result.problem.message);
    onChanged();
  }

  async function handleRemove() {
    setIsWorking(true);
    setErrorMessage(undefined);
    const result = await apiRequest<void>(ApiEndpoints.products.image(productId, slot), { method: "DELETE" });
    setIsWorking(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    setImageUrl(null);
    onChanged();
  }

  return (
    <div className="space-y-2">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted">
        {hasImage && imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a temporary object URL of a protected file cannot use next/image
          <img src={imageUrl} alt={translateMessage("catalogue.images.alt", { slot })} className="h-full w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 px-2 text-center text-xs text-muted-foreground">
            <ImageOff className="size-6" aria-hidden="true" />
            {translateMessage("catalogue.images.empty", { slot })}
          </span>
        )}
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <input ref={fileInputReference} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" aria-label={translateMessage("catalogue.images.choose", { slot })} onChange={handleFileChosen} />
          <Button type="button" variant="outline" size="sm" disabled={isWorking} onClick={() => fileInputReference.current?.click()}>
            <Upload />
            {translateMessage(hasImage ? "catalogue.images.replace" : "catalogue.images.upload")}
          </Button>
          {hasImage && (
            <Button type="button" variant="ghost" size="icon-sm" disabled={isWorking} aria-label={translateMessage("catalogue.images.remove", { slot })} onClick={handleRemove}>
              <Trash2 />
            </Button>
          )}
        </div>
      )}
      <FormResultNotice errorMessage={errorMessage} />
    </div>
  );
}

// The Images tab of a product: four picture slots (PNG, JPEG or WEBP, at most 2 MB each; the server checks the real file again).
// Pictures belong to a saved product, so a new product shows a note until it is saved.
export function ProductImagesPanel({
  productId,
  filledSlots,
  canEdit,
  onChanged,
}: {
  productId: string | undefined;
  filledSlots: readonly number[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const { translateMessage } = useTranslation();
  if (!productId) return <p className="text-sm text-muted-foreground">{translateMessage("catalogue.images.saveFirst")}</p>;
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: CatalogueLimits.imageSlotCount }, (_, index) => index + 1).map((slot) => (
        <ProductImageSlot key={slot} productId={productId} slot={slot} hasImage={filledSlots.includes(slot)} canEdit={canEdit} onChanged={onChanged} />
      ))}
    </div>
  );
}
