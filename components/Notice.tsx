// Shows an error or a success message. role="alert" makes screen readers announce it.
export function Notice({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
        {message}
      </p>
    );
  }
  return null;
}
