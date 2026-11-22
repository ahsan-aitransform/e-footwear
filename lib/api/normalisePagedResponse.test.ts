import { describe, expect, it } from "vitest";
import { normalisePagedResponse } from "./normalisePagedResponse";

describe("normalisePagedResponse", () => {
  it("converts the API's list answer (pageNumber, totalItemCount) to the screen shape", () => {
    expect(normalisePagedResponse({ items: [{ id: "1" }], pageNumber: 3, pageSize: 25, totalItemCount: 61 })).toEqual({
      items: [{ id: "1" }],
      page: 3,
      pageSize: 25,
      totalCount: 61,
    });
  });

  it("accepts the screen shape too and fills gaps with safe defaults", () => {
    expect(normalisePagedResponse({ items: [], page: 2, pageSize: 10, totalCount: 5 })).toEqual({ items: [], page: 2, pageSize: 10, totalCount: 5 });
    expect(normalisePagedResponse({ items: [], pageSize: 10 })).toEqual({ items: [], page: 1, pageSize: 10, totalCount: 0 });
    expect(normalisePagedResponse(undefined)).toBeUndefined();
  });
});
