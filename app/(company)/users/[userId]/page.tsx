import { Suspense } from "react";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { EditUserRoutePage } from "@/features/security/pages/EditUserRoutePage";

// /users/<userId>: Edit User. The page reads the route parameter in the browser, so it sits inside a Suspense boundary.
export default function EditUserPageRoute() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <EditUserRoutePage />
    </Suspense>
  );
}
