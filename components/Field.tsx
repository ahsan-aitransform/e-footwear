import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// A labelled input (shadcn Input + Label). `hint` is small help text shown under the input.
export function Field({
  label,
  name,
  hint,
  ...rest
}: { label: string; name: string; hint?: string } & ComponentProps<typeof Input>) {
  const id = `field-${name}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
