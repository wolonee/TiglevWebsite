import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminNavigation from "@/components/AdminNavigation";

const { push, usePathname } = vi.hoisted(() => ({ push: vi.fn(), usePathname: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname,
  useRouter: () => ({ push }),
}));

describe("AdminNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathname.mockReturnValue("/admin/cars");
  });

  it("marks the current admin section", () => {
    render(<AdminNavigation />);

    expect(screen.getByRole("link", { name: "Автомобили" })).toHaveAttribute("aria-current", "page");
  });

  it("optimistically selects a tab before navigation completes", async () => {
    const user = userEvent.setup();
    render(<AdminNavigation />);

    const requests = screen.getByRole("link", { name: "Заявки" });
    await user.click(requests);

    expect(push).toHaveBeenCalledWith("/admin/requests");
    expect(requests).toHaveAttribute("aria-current", "page");
  });
});
