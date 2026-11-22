"use client";

import { useParams } from "next/navigation";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { isUuid } from "@/lib/validation/isUuid";
import { EditUserPage } from "./EditUserPage";

// Reads the user id from the address in the browser and refuses anything that is not an id before any request is sent.
export function EditUserRoutePage() {
  const { translateMessage } = useTranslation();
  const parameters = useParams<{ userId: string }>();
  if (!isUuid(parameters.userId)) return <InlineNotice>{translateMessage("securityManagement.editUserPage.invalidId")}</InlineNotice>;
  return <EditUserPage userId={parameters.userId} />;
}
