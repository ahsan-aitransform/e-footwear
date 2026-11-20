import type { InputHTMLAttributes } from "react";

// A labelled text input. The label is linked to the input, so keyboard and screen-reader users can use it.
export function Field({
  label,
  name,
  defaultValue,
  ...rest
}: { label: string; name: string; defaultValue?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = `field-${name}`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        {...rest}
      />
    </div>
  );
}
