import { describe, expect, it } from "vitest";

import { storeBoundary } from "./index";

describe("store boundary", () => {
  it("exposes stable id and descriptive ownership", () => {
    expect(storeBoundary.id).toBe("app-store");
    expect(storeBoundary.description).toContain("Redux Toolkit");
  });
});
