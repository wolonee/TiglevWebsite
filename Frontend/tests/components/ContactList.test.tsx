import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ContactList from "@/components/ContactList";

describe("ContactList", () => {
  it("renders the shared contact details", () => {
    render(<ContactList />);

    expect(screen.getByText("гор. Тольятти, ул. Офицерская, 46")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "8 (800) 500-00-15" })).toHaveAttribute(
      "href",
      "tel:88005000015",
    );
    expect(screen.getByRole("link", { name: "+7 (8482) 750-750" })).toHaveAttribute(
      "href",
      "tel:+78482750750",
    );
    expect(screen.getByRole("link", { name: "tiglev2013@yandex.ru" })).toHaveAttribute(
      "href",
      "mailto:tiglev2013@yandex.ru",
    );

    for (const workHours of [
      "Будние дни: 9:00 — 18:00",
      "Суббота: 9:00 — 17:00",
      "Воскресенье: 10:00 — 14:00",
    ]) {
      expect(screen.getByText(workHours)).toBeInTheDocument();
    }
  });
});
