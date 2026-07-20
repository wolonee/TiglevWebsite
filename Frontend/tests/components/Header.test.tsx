import { render, screen } from "@testing-library/react";
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
});
