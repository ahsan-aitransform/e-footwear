import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { Shell } from "@/components/Shell";

// Sign-in for company users. The form runs in the browser; the page itself is static and works offline.
export default function LoginPage() {
  return (
    <Shell title="Sign in" subtitle="Enter your company id, username and password.">
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-zinc-600">
        Platform administrator?{" "}
        <Link href="/platform/login" className="font-medium text-black underline">
          Sign in here
        </Link>
      </p>
    </Shell>
  );
}
