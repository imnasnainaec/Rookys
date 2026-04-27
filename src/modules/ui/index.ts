export interface UiBoundary {
  readonly id: "ui-layer";
  readonly description: string;
}

export const uiBoundary: UiBoundary = {
  id: "ui-layer",
  description: "Owns user interactions, rendering, and accessibility flows.",
};
