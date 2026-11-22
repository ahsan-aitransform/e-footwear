"use client";

import { useCallback, useState } from "react";
import type { ApiProblem } from "@/lib/types/apiProblem";
import type { ApiResult } from "../apiResult";
import { apiRequest } from "../apiRequest";
import { createClientTransactionId, type HttpMethod } from "../sendApiRequest";

export type ApiMutationOptions = {
  method?: Exclude<HttpMethod, "GET">;
  authentication?: "session" | "none";
};

export type ApiMutationExecuteOptions = {
  // Pass the same key when the same logical submission is retried (after a timeout, say): the server then
  // returns the first result instead of creating a second record. Without it, each call gets a new key.
  idempotencyKey?: string;
  // Overrides the path given to the hook (for a path that depends on the submitted value).
  path?: string;
};

export type ApiMutationState<TBody, TResult> = {
  execute: (body: TBody, executeOptions?: ApiMutationExecuteOptions) => Promise<ApiResult<TResult>>;
  isPending: boolean;
  problem: ApiProblem | undefined;
  // First server message per field, keyed by camelCase field name, to show next to the form fields.
  fieldErrorMessages: Record<string, string>;
  reset: () => void;
};

// A write (POST by default). Call execute from an event handler (a form submit, a button click).
export function useApiMutation<TBody = void, TResult = void>(
  path: string,
  options: ApiMutationOptions = {},
): ApiMutationState<TBody, TResult> {
  const { method = "POST", authentication } = options;
  const [isPending, setIsPending] = useState(false);
  const [problem, setProblem] = useState<ApiProblem>();

  const execute = useCallback(
    async (body: TBody, executeOptions: ApiMutationExecuteOptions = {}): Promise<ApiResult<TResult>> => {
      setIsPending(true);
      setProblem(undefined);
      const result = await apiRequest<TResult>(executeOptions.path ?? path, {
        method,
        body,
        authentication,
        idempotencyKey: executeOptions.idempotencyKey ?? createClientTransactionId(),
      });
      setIsPending(false);
      if (!result.ok) setProblem(result.problem);
      return result;
    },
    [authentication, method, path],
  );

  const reset = useCallback(() => setProblem(undefined), []);

  return { execute, isPending, problem, fieldErrorMessages: problem?.fieldErrorMessages ?? {}, reset };
}
