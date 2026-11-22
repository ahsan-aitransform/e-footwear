import type { ComponentProps } from "react";
import { FormField } from "@/components/forms/FormField";
import { cn } from "@/lib/utils";

// A labelled multi-line text box with its hint and error message (invoice text, addresses).
export function TextAreaField({
  label,
  name,
  hint,
  errorMessage,
  className,
  ...textAreaProps
}: { label: string; name: string; hint?: string; errorMessage?: string } & Omit<ComponentProps<"textarea">, "id" | "name">) {
  return (
    <FormField label={label} name={name} hint={hint} errorMessage={errorMessage} isRequired={textAreaProps.required}>
      {(controlProps) => (
        <textarea
          {...controlProps}
          {...textAreaProps}
          className={cn(
            "block min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        />
      )}
    </FormField>
  );
}
