import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DataGridTable } from "./DataGridTable";
import type { DataGridColumn } from "./dataGridTypes";
import type { SortState } from "@/lib/types/pagination";

type ProductRow = { id: string; name: string; price: number };

const rows: ProductRow[] = [
  { id: "p1", name: "Sandal", price: 1999 },
  { id: "p2", name: "Boot", price: 4999 },
  { id: "p3", name: "Sneaker", price: 3499 },
];

const columns: DataGridColumn<ProductRow>[] = [
  { key: "name", header: "Name", render: (row) => row.name, isSortable: true, totalCell: undefined },
  { key: "price", header: "Price", render: (row) => `Rs ${row.price}`, alignment: "end", isSortable: true, totalCell: "Rs 10,497" },
];

function renderGrid(overrides: Partial<React.ComponentProps<typeof DataGridTable<ProductRow>>> = {}) {
  return render(
    <DataGridTable
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      caption="Products"
      emptyTitle="No products"
      {...overrides}
    />,
  );
}

describe("DataGridTable states", () => {
  it("shows the rows with column headers", () => {
    renderGrid();
    expect(screen.getByRole("table", { name: "Products" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4); // header + 3
    expect(screen.getByText("Boot")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Price/ })).toBeInTheDocument();
  });

  it("shows the empty state when there are no rows", () => {
    renderGrid({ rows: [], emptyTitle: "No products", emptyText: "Add the first one." });
    expect(screen.getByText("No products")).toBeInTheDocument();
    expect(screen.getByText("Add the first one.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the error instead of the rows", () => {
    renderGrid({ errorMessage: "The server said no." });
    expect(screen.getByRole("alert")).toHaveTextContent("The server said no.");
    expect(screen.queryByText("Sandal")).not.toBeInTheDocument();
  });

  it("shows a skeleton while loading, not the empty state", () => {
    renderGrid({ rows: [], isLoading: true });
    expect(screen.queryByText("No products")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("DataGridTable sorting", () => {
  function SortableGrid({ onChange }: { onChange: (sort: SortState | undefined) => void }) {
    const [sort, setSort] = useState<SortState | undefined>();
    return (
      <DataGridTable
        rows={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        caption="Products"
        emptyTitle="none"
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          onChange(next);
        }}
      />
    );
  }

  it("cycles ascending, descending, none and marks the column with aria-sort", async () => {
    const onChange = vi.fn();
    render(<SortableGrid onChange={onChange} />);
    const nameHeader = screen.getByRole("columnheader", { name: /Name/ });
    const sortButton = within(nameHeader).getByRole("button");

    expect(nameHeader).toHaveAttribute("aria-sort", "none");
    await userEvent.click(sortButton);
    expect(onChange).toHaveBeenLastCalledWith({ columnKey: "name", direction: "ascending" });
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute("aria-sort", "ascending");

    await userEvent.click(within(screen.getByRole("columnheader", { name: /Name/ })).getByRole("button"));
    expect(onChange).toHaveBeenLastCalledWith({ columnKey: "name", direction: "descending" });

    await userEvent.click(within(screen.getByRole("columnheader", { name: /Name/ })).getByRole("button"));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it("does not turn headers into buttons when client sorting is switched off and there is no onSortChange", () => {
    renderGrid({ isClientSortDisabled: true });
    expect(within(screen.getByRole("columnheader", { name: /Name/ })).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("DataGridTable keyboard and mouse", () => {
  it("moves between rows with the arrow keys, Home and End", async () => {
    renderGrid({ onRowOpen: vi.fn() });
    const bodyRows = screen.getAllByRole("row").slice(1);
    bodyRows[0].focus();

    await userEvent.keyboard("{ArrowDown}");
    expect(bodyRows[1]).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(bodyRows[2]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}"); // stays on the last row
    expect(bodyRows[2]).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(bodyRows[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(bodyRows[0]).toHaveFocus();
  });

  it("opens a row with Enter and with a double click", async () => {
    const onRowOpen = vi.fn();
    renderGrid({ onRowOpen });
    const bodyRows = screen.getAllByRole("row").slice(1);

    bodyRows[1].focus();
    await userEvent.keyboard("{Enter}");
    expect(onRowOpen).toHaveBeenLastCalledWith(rows[1]);

    await userEvent.dblClick(screen.getByText("Sneaker"));
    expect(onRowOpen).toHaveBeenLastCalledWith(rows[2]);
  });

  it("keeps exactly one row in the tab order (roving tabindex)", () => {
    renderGrid({ onRowOpen: vi.fn() });
    const tabbable = screen.getAllByRole("row").slice(1).filter((row) => row.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
  });
});

describe("DataGridTable selection and totals", () => {
  function SelectableGrid({ onChange }: { onChange: (keys: ReadonlySet<string>) => void }) {
    const [selectedRowKeys, setSelectedRowKeys] = useState<ReadonlySet<string>>(new Set());
    return (
      <DataGridTable
        rows={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        caption="Products"
        emptyTitle="none"
        selection={{
          selectedRowKeys,
          onSelectedRowKeysChange: (next) => {
            setSelectedRowKeys(next);
            onChange(next);
          },
        }}
      />
    );
  }

  it("selects a row with its checkbox and with the Space key", async () => {
    const onChange = vi.fn();
    render(<SelectableGrid onChange={onChange} />);
    const rowCheckboxes = screen.getAllByRole("checkbox", { name: "Select row" });
    await userEvent.click(rowCheckboxes[0]);
    expect([...onChange.mock.lastCall![0]]).toEqual(["p1"]);

    screen.getAllByRole("row")[2].focus();
    await userEvent.keyboard(" ");
    expect([...onChange.mock.lastCall![0]].sort()).toEqual(["p1", "p2"]);
  });

  it("selects and clears every row of the page with the header checkbox", async () => {
    const onChange = vi.fn();
    render(<SelectableGrid onChange={onChange} />);
    const all = screen.getByRole("checkbox", { name: "Select all rows on this page" });
    await userEvent.click(all);
    expect([...onChange.mock.lastCall![0]].sort()).toEqual(["p1", "p2", "p3"]);
    await userEvent.click(all);
    expect([...onChange.mock.lastCall![0]]).toEqual([]);
  });

  it("shows a totals row from the totalCell of each column", () => {
    renderGrid({ showTotalsRow: true });
    const footerRow = screen.getAllByRole("row").at(-1)!;
    expect(within(footerRow).getByText("Total")).toBeInTheDocument();
    expect(within(footerRow).getByText("Rs 10,497")).toBeInTheDocument();
  });
});

describe("DataGridTable client-side sorting", () => {
  const plainColumns: DataGridColumn<ProductRow>[] = [
    { key: "name", header: "Name", render: (row) => row.name },
    { key: "price", header: "Price", render: (row) => `Rs ${row.price}` },
  ];
  const namesInOrder = () => screen.getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);

  it("sorts the given rows by a column, then reverses, then restores the original order", async () => {
    renderGrid({ columns: plainColumns });
    await userEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(namesInOrder()).toEqual(["Boot", "Sandal", "Sneaker"]);
    await userEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(namesInOrder()).toEqual(["Sneaker", "Sandal", "Boot"]);
    await userEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(namesInOrder()).toEqual(["Sandal", "Boot", "Sneaker"]);
  });

  it("sorts numbers as numbers", async () => {
    renderGrid({ columns: plainColumns });
    await userEvent.click(screen.getByRole("button", { name: /Price/ }));
    expect(namesInOrder()).toEqual(["Sandal", "Sneaker", "Boot"]);
  });

  it("offers no sorting when it is switched off", () => {
    renderGrid({ columns: plainColumns, isClientSortDisabled: true });
    expect(screen.queryByRole("button", { name: /Name/ })).toBeNull();
  });
});
