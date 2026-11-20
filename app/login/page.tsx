"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorAlert } from "@/components/ui/core";
import { Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";
import { fieldError } from "@/components/ui/form";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const [company, setCompany] = useState("");
  const [userName, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const r = await fetch("/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ company, userName, password }) });
      const body = await r.json();
      if (!r.ok) throw new ApiError(r.status, body.code ?? "error", body.title ?? "Sign-in failed", body.errors ?? {});
      router.replace(body.mustChangePassword ? "/account/password" : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-primary-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold"><Icon name="store" size={24} /> FootwearPOS</div>
        <div>
          <h1 className="max-w-md text-3xl font-semibold leading-tight">Every store, one set of books.</h1>
          <p className="mt-3 max-w-md text-primary-100">Sales, stock, purchasing and accounts for multi-store footwear retail — each shop sees its own stock and cash, the owner sees them all.</p>
        </div>
        <p className="text-sm text-primary-200">Secure sign-in · every change is recorded</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4" aria-label="Sign in">
          <div>
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-1 text-muted">Use your company name (or number) and the login your administrator gave you.</p>
          </div>
          <ErrorAlert error={error} />
          <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" autoFocus required error={fieldError(error, "company")} />
          <Input label="User name" value={userName} onChange={(e) => setUser(e.target.value)} autoComplete="username" required error={fieldError(error, "userName")} />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required error={fieldError(error, "password")} />
          <Button type="submit" size="lg" className="w-full" loading={busy}>Sign in</Button>
        </form>
      </div>
    </div>
  );
}
