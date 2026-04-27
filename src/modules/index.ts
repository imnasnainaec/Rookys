import { aiBoundary } from "./ai";
import { coreBoundary } from "./core";
import { networkingBoundary } from "./networking";
import { uiBoundary } from "./ui";

export const architectureModules = [
  { name: coreBoundary.id, description: coreBoundary.description },
  {
    name: "variant-config",
    description: "Defines validated rulesets and toggles.",
  },
  { name: networkingBoundary.id, description: networkingBoundary.description },
  { name: uiBoundary.id, description: uiBoundary.description },
  { name: aiBoundary.id, description: aiBoundary.description },
] as const;
