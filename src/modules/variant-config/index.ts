export interface VariantDescriptor {
  readonly id: string;
  readonly boardSize: number;
  readonly label: string;
}

export const classicVariant: VariantDescriptor = {
  id: "classic",
  boardSize: 8,
  label: "Classic",
};
