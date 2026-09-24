// Tests for the admin navigation model — Phase 6.
//
// The behaviour worth pinning down is section matching: a sidebar that
// highlights the wrong item, or highlights Dashboard on every page, is a
// navigation bug that is easy to introduce and easy to miss by eye.

import { describe, expect, it } from "vitest";

import {
  ADMIN_NAV_ITEMS,
  currentSectionLabel,
  isActiveNavItem,
  type AdminNavItem,
} from "./navigation";

function item(href: string): AdminNavItem {
  const found = ADMIN_NAV_ITEMS.find((candidate) => candidate.href === href);
  if (!found) throw new Error(`No nav item for ${href}`);
  return found;
}

describe("ADMIN_NAV_ITEMS", () => {
  it("exposes Dashboard, Projects and Media as the built sections", () => {
    // Media became available in Phase 8. An item is only listed as available
    // once its route exists — §96: navigation must not lead somewhere broken.
    const available = ADMIN_NAV_ITEMS.filter((navItem) => navItem.status === "available");
    expect(available.map((navItem) => navItem.href)).toEqual([
      "/admin",
      "/admin/projects",
      "/admin/media",
    ]);
  });

  it("keeps every href unique and under /admin", () => {
    const hrefs = ADMIN_NAV_ITEMS.map((navItem) => navItem.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) expect(href.startsWith("/admin")).toBe(true);
  });

  it("names a roadmap phase for every item", () => {
    for (const navItem of ADMIN_NAV_ITEMS) {
      expect(navItem.phase).toMatch(/^Phase \d+$/);
    }
  });
});

describe("isActiveNavItem", () => {
  it("matches a section exactly", () => {
    expect(isActiveNavItem(item("/admin/projects"), "/admin/projects")).toBe(true);
  });

  it("matches a child route", () => {
    expect(isActiveNavItem(item("/admin/projects"), "/admin/projects/the-inevitable")).toBe(true);
  });

  it("does not treat Dashboard as the parent of every admin route", () => {
    // The regression this guards: prefix-matching "/admin" would light up the
    // Dashboard link on every page in the section.
    expect(isActiveNavItem(item("/admin"), "/admin")).toBe(true);
    expect(isActiveNavItem(item("/admin"), "/admin/projects")).toBe(false);
    expect(isActiveNavItem(item("/admin"), "/admin/projects/atdl-assignment")).toBe(false);
  });

  it("requires a path separator at the boundary", () => {
    // "/admin/projectsomething" is not inside "/admin/projects".
    expect(isActiveNavItem(item("/admin/projects"), "/admin/projectsomething")).toBe(false);
  });

  it("ignores a trailing slash", () => {
    expect(isActiveNavItem(item("/admin/projects"), "/admin/projects/")).toBe(true);
    expect(isActiveNavItem(item("/admin"), "/admin/")).toBe(true);
  });

  it("marks nothing active on a path outside the section", () => {
    expect(ADMIN_NAV_ITEMS.some((navItem) => isActiveNavItem(navItem, "/projects"))).toBe(false);
  });
});

describe("currentSectionLabel", () => {
  it("names the section a path belongs to", () => {
    expect(currentSectionLabel("/admin")).toBe("Dashboard");
    expect(currentSectionLabel("/admin/projects")).toBe("Projects");
    expect(currentSectionLabel("/admin/projects/the-inevitable")).toBe("Projects");
  });

  it("falls back to Admin off the map", () => {
    // /admin/login is outside the dashboard shell and has no sidebar entry.
    expect(currentSectionLabel("/admin/login")).toBe("Admin");
  });
});
