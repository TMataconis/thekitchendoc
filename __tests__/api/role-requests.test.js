import { jest } from "@jest/globals";

// ------------------------------------------------------------------
// Mocks — must be declared before dynamic imports of the route
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
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.unstable_mockModule("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({}) },
  })),
}));

// ------------------------------------------------------------------
// Import the route handlers after mocks are registered
// ------------------------------------------------------------------

const { auth } = await import("@/auth");
const { prisma } = await import("@/lib/prisma");
const { POST, GET } = await import("@/app/api/role-requests/route.js");

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function makePostRequest(body) {
  return new Request("http://localhost/api/role-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VIEWER_SESSION = { user: { id: 1, role: "VIEWER", realRole: "VIEWER" } };
const ADMIN_SESSION  = { user: { id: 2, role: "ADMIN",  realRole: "ADMIN"  } };

const MOCK_USER = { id: 1, email: "viewer@test.com", name: "Viewer", role: "VIEWER" };

// ------------------------------------------------------------------
// POST /api/role-requests
// ------------------------------------------------------------------

describe("POST /api/role-requests", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 for unauthenticated users", async () => {
    auth.mockResolvedValue(null);

    const res = await POST(makePostRequest({ requestedRole: "CONTRIBUTOR" }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 400 for an invalid requestedRole", async () => {
    auth.mockResolvedValue(VIEWER_SESSION);

    const res = await POST(makePostRequest({ requestedRole: "SUPERUSER" }));

    expect(res.status).toBe(400);
  });

  it("allows an authenticated VIEWER to submit a request", async () => {
    auth.mockResolvedValue(VIEWER_SESSION);
    prisma.roleRequest.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(MOCK_USER);
    prisma.roleRequest.create.mockResolvedValue({ id: 42 });

    const res = await POST(makePostRequest({ requestedRole: "CONTRIBUTOR", message: "Please!" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.id).toBe(42);
    expect(prisma.roleRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: MOCK_USER.id,
          requestedRole: "CONTRIBUTOR",
          status: "PENDING",
        }),
      })
    );
  });

  it("blocks a duplicate pending request with 409", async () => {
    auth.mockResolvedValue(VIEWER_SESSION);
    prisma.roleRequest.findFirst.mockResolvedValue({ id: 10, status: "PENDING" });

    const res = await POST(makePostRequest({ requestedRole: "CONTRIBUTOR" }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/pending/i);
    expect(prisma.roleRequest.create).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------
// GET /api/role-requests
// ------------------------------------------------------------------

describe("GET /api/role-requests", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 for a non-ADMIN user", async () => {
    auth.mockResolvedValue(VIEWER_SESSION);

    const res = await GET();

    expect(res.status).toBe(403);
  });

  it("returns 403 when session is null", async () => {
    auth.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(403);
  });

  it("returns all requests for an ADMIN user", async () => {
    auth.mockResolvedValue(ADMIN_SESSION);
    const mockRequests = [
      {
        id: 1,
        userId: 1,
        status: "PENDING",
        requestedRole: "CONTRIBUTOR",
        user: { id: 1, name: "Viewer", email: "viewer@test.com", role: "VIEWER" },
      },
    ];
    prisma.roleRequest.findMany.mockResolvedValue(mockRequests);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].status).toBe("PENDING");
    expect(prisma.roleRequest.findMany).toHaveBeenCalledTimes(1);
  });
});
