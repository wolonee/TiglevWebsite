import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminRequestManager from "@/components/AdminRequestManager";

const customerRequest = {
  id: "request-1",
  kind: "sell" as const,
  status: "new" as const,
  payload: { firstName: "Иван", phone: "+79990000000" },
  photoCount: 0,
  photoUrls: [],
  createdAt: "2026-07-30T12:00:00.000Z",
};

describe("AdminRequestManager", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests: [customerRequest], pagination: { total: 1 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ request: { ...customerRequest, note: "Перезвонить после обеда" } }), { status: 200 })));
  });

  it("saves an administrator note and confirms the result", async () => {
    const user = userEvent.setup();
    render(<AdminRequestManager />);

    await user.click(await screen.findByRole("button", { name: /продать авто/i }));
    await user.type(screen.getByLabelText("Заметка администратора"), "Перезвонить после обеда");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Заметка и статус сохранены"));
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/requests/request-1", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ status: "new", note: "Перезвонить после обеда" }),
    }));
  });
});
