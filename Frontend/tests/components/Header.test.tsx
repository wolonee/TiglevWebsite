import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Header from "@/components/Header";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname }));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathname.mockReturnValue("/");
  });

  it("marks the current navigation item without animated state", () => {
    render(<Header solid />);
    expect(screen.getAllByRole("link", { name: "Главная" })[0]).toHaveAttribute("aria-current", "page");
  });

  it("uses the crisp logo and the TIGLEV.COM wordmark", () => {
    render(<Header solid />);
    // Логотип — заранее уменьшенный PNG, отдаётся как есть (unoptimized).
    expect(screen.getByAltText("")).toHaveAttribute("src", expect.stringContaining("logo-tiglev-192.png"));
    // Надпись «TIGLEV.COM» — инлайновый SVG (TiglevWordmark) с aria-hidden;
    // доступное имя бренда несёт сама ссылка-логотип.
    expect(screen.getByRole("link", { name: "TIGLEV.COM, главная" })).toBeInTheDocument();
  });

  it("links the catalog navigation to the landing page section", () => {
    render(<Header solid />);
    screen.getAllByRole("link", { name: "Каталог" }).forEach((link) => {
      expect(link).toHaveAttribute("href", "/#catalog");
    });
  });

  it("smoothly scrolls only to the catalog section on the landing page", async () => {
    const user = userEvent.setup();
    const catalog = document.createElement("section");
    catalog.id = "catalog";
    const scrollIntoView = vi.mocked(catalog.scrollIntoView);
    scrollIntoView.mockClear();
    document.body.append(catalog);
    render(<Header solid />);

    await user.click(screen.getAllByRole("link", { name: "Каталог" })[0]);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    catalog.remove();
  });
});
