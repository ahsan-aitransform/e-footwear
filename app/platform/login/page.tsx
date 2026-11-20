import Link from "next/link";
import { PlatformLoginForm } from "@/components/PlatformLoginForm";
import { Shell } from "@/components/Shell";

// Sign-in for platform administrators. They have no company and manage all companies.
export default function PlatformLoginPage() {
  return (
    <Shell title="Platform sign-in" subtitle="For platform administrators only.">
      <PlatformLoginForm />
      <p className="text-sm text-slate-500">
        Company user?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign in here
        </Link>
      </p>
    </Shell>
  );
}
