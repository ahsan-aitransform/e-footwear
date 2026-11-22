import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Input } from "@/components/ui/input";
import { DateField, isValidIsoDate } from "./DateField";
import { FormField } from "./FormField";
import { PercentageField } from "./PercentageField";
import { QuantityField } from "./QuantityField";
import { SearchableSelect, type SearchableSelectOption } from "./SearchableSelect";
import { WholeRupeeAmountField } from "./WholeRupeeAmountField";

function AmountHarness({ onChange, initial = null }: { onChange: (value: number | null) => void; initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <WholeRupeeAmountField
        label="Price"
        name="price"
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
      <button type="button" onClick={() => setValue(777)}>
        set 777
      </button>
    </>
  );
}

describe("WholeRupeeAmountField", () => {
  it("reports whole rupees as typed, accepting digit grouping, and formats on blur", async () => {
    const onChange = vi.fn();
    render(<AmountHarness onChange={onChange} />);
    const input = screen.getByLabelText("Price");
    await userEvent.type(input, "1250000");
    expect(onChange).toHaveBeenLastCalledWith(1250000);
    await userEvent.tab();
    expect(input).toHaveValue("1,250,000");
  });

  it("shows an inline error next to the field for decimals and does not report them", async () => {
    const onChange = vi.fn();
    render(<AmountHarness onChange={onChange} />);
    const input = screen.getByLabelText("Price");
    await userEvent.type(input, "12.5");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter whole rupees without decimals.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter whole rupees without decimals.");
    expect(onChange).not.toHaveBeenLastCalledWith(12.5);
  });

  it("reports null when emptied and follows a value changed from outside", async () => {
    const onChange = vi.fn();
    render(<AmountHarness onChange={onChange} initial={500} />);
    const input = screen.getByLabelText("Price");
    expect(input).toHaveValue("500");
    await userEvent.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(null);
    await userEvent.click(screen.getByRole("button", { name: "set 777" }));
    expect(input).toHaveValue("777");
  });
});

function ControlledDecimalHarness({
  Field,
  label,
  onChange,
}: {
  Field: typeof QuantityField;
  label: string;
  onChange: (value: number | null) => void;
}) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <Field
      label={label}
      name="field"
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("QuantityField and PercentageField", () => {
  it("QuantityField allows 3 decimals and rejects a fourth", async () => {
    const onChange = vi.fn();
    render(<ControlledDecimalHarness Field={QuantityField} label="Quantity" onChange={onChange} />);
    const input = screen.getByLabelText("Quantity");
    await userEvent.type(input, "1.125");
    expect(onChange).toHaveBeenLastCalledWith(1.125);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.type(input, "9");
    expect(screen.getByRole("alert")).toHaveTextContent("at most 3 decimals");
    expect(onChange).toHaveBeenLastCalledWith(1.125);
  });

  it("is not an error while the decimal point has just been typed", async () => {
    const onChange = vi.fn();
    render(<ControlledDecimalHarness Field={QuantityField} label="Quantity" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Quantity"), "12.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(12);
  });

  it("PercentageField accepts 0 to 100 and rejects values above 100", async () => {
    const onChange = vi.fn();
    render(<ControlledDecimalHarness Field={PercentageField} label="Discount" onChange={onChange} />);
    const input = screen.getByLabelText("Discount");
    await userEvent.type(input, "12.5");
    expect(onChange).toHaveBeenLastCalledWith(12.5);
    await userEvent.clear(input);
    await userEvent.type(input, "101");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a percentage from 0 to 100.");
  });
});

describe("FormField", () => {
  it("links label, hint and error to the control for screen readers, and marks required fields", () => {
    render(
      <FormField label="Email" name="email" hint="They sign in with it." errorMessage="Already in use." isRequired>
        {(controlProps) => <Input {...controlProps} />}
      </FormField>,
    );
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("They sign in with it. Already in use.");
    expect(screen.getByRole("alert")).toHaveTextContent("Already in use.");
  });

  it("shows no error markup when there is no error", () => {
    render(<FormField label="Name" name="name">{(controlProps) => <Input {...controlProps} />}</FormField>);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
  });
});

describe("SearchableSelect", () => {
  const options: SearchableSelectOption<string>[] = [
    { value: "bata", label: "Bata" },
    { value: "servis", label: "Servis" },
    { value: "stylo", label: "Stylo", description: "Lahore" },
  ];

  function Harness({ onChange }: { onChange: (value: string | null) => void }) {
    const [value, setValue] = useState<string | null>(null);
    return (
      <SearchableSelect
        id="brand"
        options={options}
        value={value}
        isClearable
        onValueChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    );
  }

  it("opens on focus, filters while typing and picks with Arrow keys and Enter", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const combobox = screen.getByRole("combobox");
    await userEvent.click(combobox);
    expect(screen.getAllByRole("option")).toHaveLength(3);

    await userEvent.type(combobox, "s");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Servis", "StyloLahore"]);

    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("stylo");
    expect(combobox).toHaveValue("Stylo");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("searches the description too, says when nothing matches, and closes with Escape", async () => {
    render(<Harness onChange={vi.fn()} />);
    const combobox = screen.getByRole("combobox");
    await userEvent.type(combobox, "lahore");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await userEvent.clear(combobox);
    await userEvent.type(combobox, "zzz");
    expect(screen.getByText("No matches")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("picks with the mouse and can be cleared", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "Bata" }));
    expect(onChange).toHaveBeenLastCalledWith("bata");
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe("DateField", () => {
  it("validates calendar dates", () => {
    expect(isValidIsoDate("2026-11-20")).toBe(true);
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("20/11/2026")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
  });

  it("reports the chosen ISO date", async () => {
    const onValueChange = vi.fn();
    render(<DateField label="Date" name="date" value="" onValueChange={onValueChange} />);
    await userEvent.type(screen.getByLabelText("Date"), "2026-11-20");
    expect(onValueChange).toHaveBeenLastCalledWith("2026-11-20");
  });
});
