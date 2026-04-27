import { describe, expect, it } from "vitest";

import { coreBoundary } from "./index";

describe("coreBoundary", () => {
  it("exposes stable core engine metadata", () => {
    expect(coreBoundary.id).toBe("core-engine");
    expect(coreBoundary.description.length).toBeGreaterThan(0);
  });
});
