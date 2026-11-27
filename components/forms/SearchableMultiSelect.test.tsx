import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { SearchableMultiSelect } from "./SearchableMultiSelect";

function Example() {
  const [values, setValues] = useState<string[]>([]);
  return (
    <>
      <SearchableMultiSelect aria-describedby={undefined} id="brands" options={[{ value: "1", label: "Bata" }, { value: "2", label: "Servis" }]} values={values} onValuesChange={setValues} />
      <p data-testid="chosen">{values.join(",")}</p>
    </>
  );
}

describe("SearchableMultiSelect", () => {
  it("keeps every chosen item", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Bata" }));
    await user.click(await screen.findByRole("option", { name: "Servis" }));

    expect(screen.getByTestId("chosen")).toHaveTextContent("1,2");
  });
});
