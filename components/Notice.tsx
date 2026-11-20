// Shows an error or a success message. role="alert" makes screen readers announce it.
export function Notice({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
        <span aria-hidden="true" className="mt-0.5 font-bold">!</span>
        <span>{error}</span>
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="flex gap-2 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-800">
        <span aria-hidden="true" className="mt-0.5 font-bold">✓</span>
        <span>{message}</span>
      </p>
    );
  }
  return null;
}
