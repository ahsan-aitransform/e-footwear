import { apiRequest } from "@/lib/api/apiRequest";
import { normalisePagedResponse, type ApiPagedResponse } from "@/lib/api/normalisePagedResponse";
import type { QueryStringParameters } from "@/lib/api/queryString";
import { MAXIMUM_PAGE_SIZE, QueryStringParameterNames } from "@/lib/constants/paginationDefaults";
import type { ApiProblem } from "@/lib/types/apiProblem";

// Reads every page of a list (for an export): the filters stay, the pages are walked at the largest page size.
export async function fetchAllPagesOfList<TRow>(
  path: string,
  filters: QueryStringParameters,
): Promise<{ ok: true; rows: TRow[] } | { ok: false; problem: ApiProblem }> {
  const rows: TRow[] = [];
  for (let page = 1; ; page += 1) {
    const result = await apiRequest<ApiPagedResponse<TRow>>(path, {
      query: { ...filters, [QueryStringParameterNames.page]: page, [QueryStringParameterNames.pageSize]: MAXIMUM_PAGE_SIZE },
    });
    if (!result.ok) return { ok: false, problem: result.problem };
    const paged = normalisePagedResponse(result.data);
    rows.push(...(paged?.items ?? []));
    if (!paged || rows.length >= paged.totalCount || paged.items.length === 0) return { ok: true, rows };
  }
}
