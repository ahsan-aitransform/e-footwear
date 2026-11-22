import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { FormField } from "./FormField";

// A labelled text input with its hint and error message. Everything else is passed on to the input.
export function TextInputField({
  label,
  name,
  hint,
  errorMessage,
  ...inputProps
}: { label: string; name: string; hint?: string; errorMessage?: string } & Omit<
  ComponentProps<typeof Input>,
  "id" | "name"
>) {
  return (
    <FormField label={label} name={name} hint={hint} errorMessage={errorMessage} isRequired={inputProps.required}>
      {(controlProps) => <Input {...controlProps} {...inputProps} />}
    </FormField>
  );
}
