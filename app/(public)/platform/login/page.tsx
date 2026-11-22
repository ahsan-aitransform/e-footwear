import { PlatformAdministratorSignInPage } from "@/features/security/pages/PlatformAdministratorSignInPage";

// /platform/login: sign-in for platform administrators (super admins). They have no company and manage all companies.
export default function PlatformLoginRoutePage() {
  return <PlatformAdministratorSignInPage />;
}
