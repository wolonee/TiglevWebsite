import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Header from "@/components/Header";

const { push, usePathname } = vi.hoisted(() => ({ push: vi.fn(), usePathname: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname, useRouter: () => ({ push }) }));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathname.mockReturnValue("/");
  });

  it("optimistically moves the active navigation state", async () => {
    const user = userEvent.setup();
    render(<Header solid />);
    const catalogLinks = screen.getAllByRole("link", { name: "Каталог" });

    await user.click(catalogLinks[0]);

    expect(push).toHaveBeenCalledWith("/catalog");
    expect(catalogLinks[0]).toHaveAttribute("aria-current", "page");
  });
});
