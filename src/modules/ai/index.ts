export interface AiModelDescriptor {
  readonly modelVersion: string;
  readonly trainedFor: "classic" | "variant-conditioned";
}

export const aiBoundary = {
  id: "ai-pipeline",
  description: "Owns model metadata, loading, and inference contracts.",
} as const;
