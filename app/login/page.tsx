import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { Shell } from "@/components/Shell";

// Sign-in for company users. The form runs in the browser; the page itself is static and works offline.
export default function LoginPage() {
  return (
    <Shell title="Welcome back" subtitle="Sign in to your company account.">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-slate-500">
        Platform administrator?{" "}
        <Link href="/platform/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign in here
        </Link>
      </p>
    </Shell>
  );
}
