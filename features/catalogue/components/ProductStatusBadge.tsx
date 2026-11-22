"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ProductStatusCodes } from "../types/catalogueTypes";

// The status of a product or size as a shadcn Badge: Active is filled, anything else is outlined.
export function ProductStatusBadge({ statusCode }: { statusCode: string }) {
  const { translateMessage } = useTranslation();
  const isActive = statusCode === ProductStatusCodes.active;
  return <Badge variant={isActive ? "secondary" : "outline"}>{translateMessage(isActive ? "common.status.active" : "common.status.inactive")}</Badge>;
}
