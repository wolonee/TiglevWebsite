import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppSelect from "@/components/AppSelect";

describe("AppSelect", () => {
  it("returns the selected value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<AppSelect ariaLabel="Марка" placeholder="Все марки" options={["BMW", "KIA", "Toyota"]} onValueChange={onValueChange} />);

    await user.click(screen.getByLabelText("Марка"));
    await user.click(screen.getByText("Toyota"));
    expect(onValueChange).toHaveBeenCalledWith("Toyota");
  });
});
