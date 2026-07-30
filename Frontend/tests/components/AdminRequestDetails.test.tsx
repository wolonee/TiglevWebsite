import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminRequestDetails from "@/components/AdminRequestDetails";

const customerRequest = {
  id: "request-1",
  kind: "sell" as const,
  status: "in_progress" as const,
  payload: { firstName: "Иван", phone: "+79990000000", model: "KIA Sportage" },
  photoCount: 1,
  photoUrls: ["https://example.com/car.jpg"],
  note: "Первичная заметка",
  createdAt: "2026-07-30T12:00:00.000Z",
};

describe("AdminRequestDetails", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      request: { ...customerRequest, note: "Перезвонить после обеда" },
    }), { status: 200 })));
  });

  it("shows saved request data, photos and administrator note", () => {
    render(<AdminRequestDetails initialRequest={customerRequest} />);

    expect(screen.getByDisplayValue("Первичная заметка")).toBeInTheDocument();
    expect(screen.getByText("KIA Sportage")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Фотография автомобиля 1" })).toHaveAttribute("href", customerRequest.photoUrls[0]);
  });

  it("persists an edited administrator note", async () => {
    const user = userEvent.setup();
    render(<AdminRequestDetails initialRequest={customerRequest} />);

    const note = screen.getByLabelText("Заметка администратора");
    await user.clear(note);
    await user.type(note, "Перезвонить после обеда");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Заметка и статус сохранены"));
    expect(fetch).toHaveBeenCalledWith("/api/admin/requests/request-1", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress", note: "Перезвонить после обеда" }),
    }));
  });
});
