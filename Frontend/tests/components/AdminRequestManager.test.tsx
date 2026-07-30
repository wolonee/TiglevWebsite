import { render, screen } from "@testing-library/react";
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ requests: [customerRequest], pagination: { total: 1 } }), { status: 200 }),
    ));
  });

  it("opens every request on its own details page", async () => {
    render(<AdminRequestManager />);

    expect(await screen.findByRole("link", { name: /продать авто/i })).toHaveAttribute(
      "href",
      "/admin/requests/request-1",
    );
  });
});
