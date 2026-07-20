import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConfirmDialog from "@/components/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("confirms a destructive action from an accessible dialog", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="Удалить автомобиль?" description="Автомобиль можно восстановить." confirmLabel="В корзину" onConfirm={onConfirm} onCancel={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Удалить автомобиль?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "В корзину" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
