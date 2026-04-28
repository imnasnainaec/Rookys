import { describe, expect, it } from "vitest";

import { aiBoundary } from "./ai";
import { coreBoundary } from "./core";
import { architectureModules } from "./index";
import { networkingBoundary } from "./networking";
import { uiBoundary } from "./ui";
import { classicVariant } from "./variant-config";

describe("module boundaries", () => {
  it("publishes expected architecture module ordering and descriptions", () => {
    expect(architectureModules).toEqual([
      { name: coreBoundary.id, description: coreBoundary.description },
      {
        name: "variant-config",
        description: "Defines validated rulesets and toggles.",
      },
      {
        name: networkingBoundary.id,
        description: networkingBoundary.description,
      },
      { name: uiBoundary.id, description: uiBoundary.description },
      { name: aiBoundary.id, description: aiBoundary.description },
    ]);
  });

  it("exports classic variant defaults", () => {
    expect(classicVariant).toEqual({
      id: "classic",
      boardSize: 5,
      label: "Classic",
    });
  });

  it("exports stable boundary metadata constants", () => {
    expect(aiBoundary.id).toBe("ai-pipeline");
    expect(networkingBoundary.id).toBe("p2p-networking");
    expect(uiBoundary.id).toBe("ui-layer");
  });
});
