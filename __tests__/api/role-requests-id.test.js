import { jest } from "@jest/globals";

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

jest.unstable_mockModule("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

jest.unstable_mockModule("@/auth", () => ({
  auth: jest.fn(),
}));

jest.unstable_mockModule("@/lib/prisma", () => ({
  prisma: {
    roleRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

jest.unstable_mockModule("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({}) },
  })),
}));

// ------------------------------------------------------------------
// Import route handler after mocks
// ------------------------------------------------------------------

const { auth } = await import("@/auth");
const { prisma } = await import("@/lib/prisma");
const { PATCH } = await import("@/app/api/role-requests/[id]/route.js");

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function makePatchRequest(body) {
  return new Request("http://localhost/api/role-requests/1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Next.js 16 passes params as a Promise
function makeParams(id) {
  return { params: Promise.resolve({ id: String(id) }) };
}

const VIEWER_SESSION = { user: { id: 99, role: "VIEWER", realRole: "VIEWER" } };
const ADMIN_SESSION  = { user: { id: 1,  role: "ADMIN",  realRole: "ADMIN"  } };

const PENDING_REQUEST = {
  id: 1,
  userId: 2,
  requestedRole: "CONTRIBUTOR",
  status: "PENDING",
  user: { id: 2, name: "Viewer", email: "viewer@test.com", role: "VIEWER" },
};

// ------------------------------------------------------------------
// PATCH /api/role-requests/[id]
// ------------------------------------------------------------------

describe("PATCH /api/role-requests/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 for a non-ADMIN user", async () => {
    auth.mockResolvedValue(VIEWER_SESSION);

    const res = await PATCH(makePatchRequest({ status: "APPROVED" }), makeParams(1));

    expect(res.status).toBe(403);
    expect(prisma.roleRequest.update).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid status value", async () => {
    auth.mockResolvedValue(ADMIN_SESSION);

    const res = await PATCH(makePatchRequest({ status: "MAYBE" }), makeParams(1));

    expect(res.status).toBe(400);
  });

  it("returns 404 when the request does not exist", async () => {
    auth.mockResolvedValue(ADMIN_SESSION);
    prisma.roleRequest.findUnique.mockResolvedValue(null);

    const res = await PATCH(makePatchRequest({ status: "APPROVED" }), makeParams(999));

    expect(res.status).toBe(404);
  });

  it("allows an ADMIN to approve a request", async () => {
    auth.mockResolvedValue(ADMIN_SESSION);
    prisma.roleRequest.findUnique.mockResolvedValue(PENDING_REQUEST);
    prisma.roleRequest.update.mockResolvedValue({ ...PENDING_REQUEST, status: "APPROVED" });

    const res = await PATCH(
      makePatchRequest({ status: "APPROVED", adminComment: "Welcome!" }),
      makeParams(1)
    );

    expect(res.status).toBe(200);
    expect(prisma.roleRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "APPROVED", adminComment: "Welcome!" }),
      })
    );
  });

  it("updates the user role when approving", async () => {
    auth.mockResolvedValue(ADMIN_SESSION);
    prisma.roleRequest.findUnique.mockResolvedValue(PENDING_REQUEST);
    prisma.roleRequest.update.mockResolvedValue({ ...PENDING_REQUEST, status: "APPROVED" });

    await PATCH(makePatchRequest({ status: "APPROVED" }), makeParams(1));

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: PENDING_REQUEST.userId },
      data: { role: PENDING_REQUEST.requestedRole },
    });
  });

  it("allows an ADMIN to deny a request", async () => {
    auth.mockResolvedValue(ADMIN_SESSION);
    prisma.roleRequest.findUnique.mockResolvedValue(PENDING_REQUEST);
    prisma.roleRequest.update.mockResolvedValue({ ...PENDING_REQUEST, status: "DENIED" });

    const res = await PATCH(
      makePatchRequest({ status: "DENIED", adminComment: "Not at this time." }),
      makeParams(1)
    );

    expect(res.status).toBe(200);
    expect(prisma.roleRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DENIED" }),
      })
    );
  });

  it("does not update the user role when denying", async () => {
    auth.mockResolvedValue(ADMIN_SESSION);
    prisma.roleRequest.findUnique.mockResolvedValue(PENDING_REQUEST);
    prisma.roleRequest.update.mockResolvedValue({ ...PENDING_REQUEST, status: "DENIED" });

    await PATCH(makePatchRequest({ status: "DENIED" }), makeParams(1));

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
