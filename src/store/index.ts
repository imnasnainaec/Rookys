export interface StoreBoundary {
  readonly id: "app-store";
  readonly description: string;
}

export const storeBoundary: StoreBoundary = {
  id: "app-store",
  description:
    "Redux Toolkit store wiring lands after dependency sync and game slices.",
};
