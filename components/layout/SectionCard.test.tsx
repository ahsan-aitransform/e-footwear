import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionCard } from "./SectionCard";

function cardClassNames(container: HTMLElement): string {
  return container.querySelector("[data-slot=card]")?.className ?? "";
}

describe("SectionCard clipping", () => {
  it("does not clip a padded card, so a dropdown list opened in a form can overlap what follows", () => {
    const { container } = render(<SectionCard title="Form">content</SectionCard>);
    const classNames = cardClassNames(container);
    expect(classNames).toContain("overflow-visible");
    expect(classNames).not.toContain("overflow-hidden");
  });

  it("keeps clipping an edge-to-edge card (a table follows the rounded corners)", () => {
    const { container } = render(
      <SectionCard title="Table" isPadded={false}>
        content
      </SectionCard>,
    );
    const classNames = cardClassNames(container);
    expect(classNames).toContain("overflow-hidden");
    expect(classNames).not.toContain("overflow-visible");
  });
});
