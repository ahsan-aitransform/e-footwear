"use client";
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "./core";
import type { ApiError } from "@/lib/api";

/** Looks up the server's message for a field name, if the error is a validation error. */
export const fieldError = (err: unknown, name: string): string | undefined => (err as ApiError | undefined)?.fieldErrors?.[name]?.[0];

type FieldProps = { label?: ReactNode; hint?: ReactNode; error?: string; required?: boolean; className?: string };

function Wrap({ label, hint, error, required, className, id, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={cx("block", className)}>
      {label && <label htmlFor={id} className="mb-1 block text-[13px] font-medium">{label}{required && <span className="text-danger-600"> *</span>}</label>}
      {children}
      {error ? <p id={`${id}-e`} role="alert" className="mt-1 text-xs text-danger-600">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

const ctl = "h-9 w-full rounded-md border bg-white px-2.5 text-ink placeholder:text-muted/70 disabled:bg-surface disabled:text-muted";
const border = (e?: string) => (e ? "border-danger-600" : "border-line-strong");

export function Input({ label, hint, error, required, className, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return <Wrap {...{ label, hint, error, required, className, id }}><input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} {...rest} className={cx(ctl, border(error))} /></Wrap>;
}

/** Numeric input that keeps the typed text and reports a number (or null when empty). */
export function NumberInput({ label, hint, error, required, className, value, onValue, min, max, step, ...rest }:
  FieldProps & { value: number | null | undefined; onValue: (v: number | null) => void; min?: number; max?: number; step?: number } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "min" | "max" | "step">) {
  const id = useId();
  return (
    <Wrap {...{ label, hint, error, required, className, id }}>
      <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step ?? "any"} value={value ?? ""} aria-invalid={!!error}
        onChange={(e) => onValue(e.target.value === "" ? null : Number(e.target.value))} {...rest} className={cx(ctl, "num text-right", border(error))} />
    </Wrap>
  );
}

export function Select({ label, hint, error, required, className, children, ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return <Wrap {...{ label, hint, error, required, className, id }}><select id={id} aria-invalid={!!error} {...rest} className={cx(ctl, border(error))}>{children}</select></Wrap>;
}

export function TextArea({ label, hint, error, required, className, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return <Wrap {...{ label, hint, error, required, className, id }}><textarea id={id} rows={3} aria-invalid={!!error} {...rest} className={cx(ctl, "h-auto py-2", border(error))} /></Wrap>;
}

export function Checkbox({ label, className, ...rest }: { label: ReactNode; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-2 text-[13px]", className)}>
      <input type="checkbox" {...rest} className="h-4 w-4 rounded border-line-strong accent-primary-600" />
      <span>{label}</span>
    </label>
  );
}

export function FormGrid({ children, cols = 3 }: { children: ReactNode; cols?: 1 | 2 | 3 | 4 }) {
  return <div className={cx("grid grid-cols-1 gap-3", cols >= 2 && "sm:grid-cols-2", cols >= 3 && "lg:grid-cols-3", cols === 4 && "xl:grid-cols-4")}>{children}</div>;
}
