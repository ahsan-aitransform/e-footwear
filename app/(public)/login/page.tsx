import { CompanySignInPage } from "@/features/security/pages/CompanySignInPage";

// /login: sign-in for company users. The page itself is static and works offline; the form runs in the browser.
export default function LoginRoutePage() {
  return <CompanySignInPage />;
}
