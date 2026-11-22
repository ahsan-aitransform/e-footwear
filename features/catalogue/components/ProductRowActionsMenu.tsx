"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/i18n/useTranslation";

// The actions of one product row (a shadcn dropdown menu). An action is left out when the person lacks its permission.
export function ProductRowActionsMenu({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  const { translateMessage } = useTranslation();
  if (!onEdit && !onDelete) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("common.actions")} />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil />
            {translateMessage("masterData.action.edit")}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            {translateMessage("masterData.action.delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
