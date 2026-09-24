// Tests for the managed media endpoint — Phase 8.
//
// This is the only route that serves uploaded bytes, so it is the one place a
// mistake would hand a visitor something the upload path was careful to
// refuse, or leak metadata the admin screens are careful to keep internal.
//
// The repository is mocked: it imports lib/db.ts, which throws without
// DATABASE_URL by design, and `npm test` must stay database-free.

import { beforeEach, describe, expect, it, vi } from "vitest";

const getMediaAssetBytes = vi.fn();

// Only the blob read is mocked. The slot vocabulary (lib/media/slots.ts) and
// the unavailability classifier are pure and are left real — they are part of
// the behaviour under test, and a stub could disagree with the thing shipping.
vi.mock("@/lib/repositories/media-repository.server", () => ({
  getMediaAssetBytes: (slot: string) => getMediaAssetBytes(slot),
}));

const ROUTE = "@/app/media/[slot]/route";

const UPDATED_AT = new Date("2026-09-24T12:00:00.000Z");

function asset(overrides: Record<string, unknown> = {}) {
  return {
    data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]),
    mimeType: "image/png",
    filename: "portrait.png",
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

const params = (slot: string) => Promise.resolve({ slot });

function request(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  getMediaAssetBytes.mockResolvedValue(asset());
});

describe("slot resolution", () => {
  it("serves the two known slots", async () => {
    const { GET } = await import(ROUTE);

    expect((await GET(request("http://x/media/profile-photo"), { params: params("profile-photo") })).status).toBe(200);
    expect(getMediaAssetBytes).toHaveBeenLastCalledWith("profile_photo");

    await GET(request("http://x/media/resume"), { params: params("resume") });
    expect(getMediaAssetBytes).toHaveBeenLastCalledWith("resume");
  });

  it.each([
    "unknown",
    "../../../etc/passwd",
    "..%2f..%2fetc",
    "profile_photo",
    "PROFILE-PHOTO",
    "",
    "profile-photo.jpg",
  ])("404s on %j without querying anything", async (segment) => {
    // The path parameter is a controlled vocabulary, not a lookup key. There
    // is no spelling of it that reaches a filesystem path or a row id.
    const { GET } = await import(ROUTE);

    const response = await GET(request("http://x/media/x"), { params: params(segment) });
    expect(response.status).toBe(404);
    expect(getMediaAssetBytes).not.toHaveBeenCalled();
  });
});

describe("serving bytes", () => {
  it("returns the stored bytes with the stored content type", async () => {
    const { GET } = await import(ROUTE);
    const response = await GET(request("http://x/media/profile-photo"), {
      params: params("profile-photo"),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Length")).toBe("8");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(asset().data);
  });

  it("names the file explicitly rather than letting the browser guess", async () => {
    const { GET } = await import(ROUTE);
    const response = await GET(request("http://x/media/profile-photo"), {
      params: params("profile-photo"),
    });

    expect(response.headers.get("Content-Disposition")).toBe('inline; filename="portrait.png"');
  });

  it("serves an attachment when asked, which is how the resume downloads", async () => {
    const { GET } = await import(ROUTE);
    const response = await GET(request("http://x/media/resume?download=1"), {
      params: params("resume"),
    });

    expect(response.headers.get("Content-Disposition")).toContain("attachment");
  });

  it("404s for an empty slot, which is an ordinary state", async () => {
    getMediaAssetBytes.mockResolvedValue(null);
    const { GET } = await import(ROUTE);

    const response = await GET(request("http://x/media/resume"), { params: params("resume") });
    expect(response.status).toBe(404);
  });
});

describe("response hardening", () => {
  it("forbids content-type sniffing", async () => {
    // These bytes were uploaded. Even though the upload path sniffs the format
    // itself, the browser must not be free to re-interpret a PDF as HTML.
    const { GET } = await import(ROUTE);
    const response = await GET(request("http://x/media/resume"), { params: params("resume") });

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("serves uploaded bytes under a restrictive content security policy", async () => {
    const { GET } = await import(ROUTE);
    const response = await GET(request("http://x/media/resume"), { params: params("resume") });

    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toContain("default-src 'none'");
  });

  it("does not leak internal metadata in any header", async () => {
    // Everything administrative — who uploaded it, when the row was created,
    // its size on disk, the fact that it is in a database at all — stays out
    // of the response.
    getMediaAssetBytes.mockResolvedValue(asset({ filename: "portrait.png" }));
    const { GET } = await import(ROUTE);
    const response = await GET(request("http://x/media/profile-photo"), {
      params: params("profile-photo"),
    });

    const serialized = JSON.stringify([...response.headers.entries()]).toLowerCase();
    expect(serialized).not.toContain("updatedby");
    expect(serialized).not.toContain("admin@");
    expect(serialized).not.toContain("bytea");
    expect(serialized).not.toContain("media_assets");
    expect(serialized).not.toContain("postgres");
  });
});

describe("caching", () => {
  it("caches hard when the version token matches the stored asset", async () => {
    const { GET } = await import(ROUTE);
    const response = await GET(
      request(`http://x/media/profile-photo?v=${UPDATED_AT.getTime()}`),
      { params: params("profile-photo") },
    );

    expect(response.headers.get("Cache-Control")).toContain("immutable");
  });

  it("revalidates every time when the token is absent or stale", async () => {
    // This is what makes a replacement visible immediately: the old URL's
    // token no longer matches, so nothing serves a stale copy.
    const { GET } = await import(ROUTE);

    const noToken = await GET(request("http://x/media/profile-photo"), {
      params: params("profile-photo"),
    });
    expect(noToken.headers.get("Cache-Control")).toContain("must-revalidate");

    const staleToken = await GET(request("http://x/media/profile-photo?v=1"), {
      params: params("profile-photo"),
    });
    expect(staleToken.headers.get("Cache-Control")).toContain("must-revalidate");
  });

  it("changes the ETag when the asset is replaced", async () => {
    const { GET } = await import(ROUTE);

    const before = await GET(request("http://x/media/profile-photo"), {
      params: params("profile-photo"),
    });

    getMediaAssetBytes.mockResolvedValue(
      asset({ updatedAt: new Date("2026-09-25T00:00:00.000Z"), filename: "new.png" }),
    );
    const after = await GET(request("http://x/media/profile-photo"), {
      params: params("profile-photo"),
    });

    expect(after.headers.get("ETag")).not.toBe(before.headers.get("ETag"));
  });

  it("answers a matching conditional request with 304 and no body", async () => {
    const { GET } = await import(ROUTE);
    const etag = `"profile_photo-${UPDATED_AT.getTime()}"`;

    const response = await GET(
      request("http://x/media/profile-photo", { "if-none-match": etag }),
      { params: params("profile-photo") },
    );

    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
  });

  it("does not answer 304 once the asset has changed", async () => {
    const { GET } = await import(ROUTE);
    const staleEtag = '"profile_photo-1"';

    const response = await GET(
      request("http://x/media/profile-photo", { "if-none-match": staleEtag }),
      { params: params("profile-photo") },
    );

    expect(response.status).toBe(200);
  });
});

describe("database outage", () => {
  it("returns 503 without caching, rather than a 404 that looks like deletion", async () => {
    // Shaped the way Prisma actually reports "could not reach the database",
    // so this exercises the real isDatabaseUnavailable rather than a stub.
    const unreachable = new Error("Can't reach database server");
    unreachable.name = "PrismaClientInitializationError";
    getMediaAssetBytes.mockRejectedValue(unreachable);
    const { GET } = await import(ROUTE);

    const response = await GET(request("http://x/media/resume"), { params: params("resume") });
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("lets an unexpected error propagate rather than masking it as a 404", async () => {
    getMediaAssetBytes.mockRejectedValue(new Error("query failed"));
    const { GET } = await import(ROUTE);

    await expect(
      GET(request("http://x/media/resume"), { params: params("resume") }),
    ).rejects.toThrow("query failed");
  });
});
