import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageCodes } from "@/lib/constants/languageCodes";
import { resetLanguageStoreForTests, setLanguage } from "@/lib/i18n/languageStore";
import { clearToastsForTests, showToast } from "@/lib/toast/toastStore";
import { ConfirmDialog } from "./ConfirmDialog";
import { InlineNotice } from "./InlineNotice";
import { RoleBadge } from "./RoleBadge";
import { StatusBadge } from "./StatusBadge";
import { ToastProvider } from "./ToastProvider";

afterEach(() => {
  resetLanguageStoreForTests();
  clearToastsForTests();
  vi.useRealTimers();
});

describe("badges", () => {
  it("StatusBadge shows the translated status and falls back to the raw code", () => {
    render(
      <>
        <StatusBadge statusCode="ACTIVE" />
        <StatusBadge statusCode="LOCKED" />
        <StatusBadge statusCode="SOMETHING_NEW" />
      </>,
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Locked")).toBeInTheDocument();
    expect(screen.getByText("SOMETHING_NEW")).toBeInTheDocument();
  });

  it("RoleBadge shows the role name in the active language", () => {
    const { rerender } = render(<RoleBadge roleCode="STORE_MANAGER" />);
    expect(screen.getByText("Store manager")).toBeInTheDocument();
    act(() => setLanguage(LanguageCodes.urdu));
    rerender(<RoleBadge roleCode="STORE_MANAGER" />);
    expect(screen.getByText("اسٹور مینیجر")).toBeInTheDocument();
  });
});

describe("InlineNotice", () => {
  it("announces errors at once (alert) and confirmations politely (status)", () => {
    render(
      <>
        <InlineNotice tone="danger">Something broke</InlineNotice>
        <InlineNotice tone="success">Saved</InlineNotice>
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Something broke");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
});

describe("ConfirmDialog", () => {
  it("asks before a delete: confirm runs the action, cancel does not", async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<ConfirmDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />);

    expect(await screen.findByText("Delete this record?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons while the action is running", async () => {
    render(<ConfirmDialog open onOpenChange={vi.fn()} onConfirm={vi.fn()} isPending />);
    expect(await screen.findByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("renders nothing when closed", () => {
    render(<ConfirmDialog open={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText("Delete this record?")).not.toBeInTheDocument();
  });
});

describe("toasts", () => {
  it("shows a toast, lets the person dismiss it, and removes it by itself after a while", () => {
    vi.useFakeTimers();
    render(<ToastProvider><p>app</p></ToastProvider>);

    act(() => {
      showToast("Saved", "success");
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: "Dismiss" }).click();
    });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();

    act(() => {
      showToast("Gone soon", "info");
    });
    expect(screen.getByText("Gone soon")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.queryByText("Gone soon")).not.toBeInTheDocument();
  });
});
