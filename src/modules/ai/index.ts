import { recordEvent } from "../telemetry";

export interface AiModelDescriptor {
  readonly modelVersion: string;
  readonly trainedFor: "classic" | "variant-conditioned";
}

export const aiBoundary = {
  id: "ai-pipeline",
  description: "Owns model metadata, loading, and inference contracts.",
} as const;

/**
 * Wraps any async model loader and records a telemetry event on failure.
 * Phase 6 will replace the generic loader with the TensorFlow.js loader.
 */
export async function loadModel<T>(
  loader: () => Promise<T>,
): Promise<T> {
  try {
    return await loader();
  } catch (err) {
    recordEvent("model_load_failure", {
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
