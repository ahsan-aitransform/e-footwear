import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export type FormFieldControlProps = {
  id: string;
  name: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  "aria-required": true | undefined;
};

// The frame around one input: label, the input itself, a hint, and the error message right next to the input
// (Part 28: errors appear next to the relevant field). The control receives the ids it needs for screen readers.
//
//   <FormField label="Email" name="email" errorMessage={fieldErrorMessages.email}>
//     {(controlProps) => <Input type="email" {...controlProps} />}
//   </FormField>
export function FormField({
  label,
  name,
  hint,
  errorMessage,
  isRequired = false,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  errorMessage?: string;
  isRequired?: boolean;
  children: (controlProps: FormFieldControlProps) => ReactNode;
}) {
  const id = `field-${name}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, errorMessage ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {isRequired && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </Label>
      {children({
        id,
        name,
        "aria-describedby": describedBy,
        "aria-invalid": errorMessage ? true : undefined,
        "aria-required": isRequired ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {errorMessage && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
